import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import { kbCategories, kbArticles, kbArticleVersions, kbArticleFeedback } from '@osc/db/schema'
import { eq, and, desc, asc, sql, or } from 'drizzle-orm'
import { Events } from '@osc/core'
import { emitEvent } from '../../lib/emit-event'

export function registerKbRoutes(app: Hono<HonoEnv>) {
  const kbRouter = new Hono<HonoEnv>()
  kbRouter.use('*', requireModule('kb'))

  // ---------------------------------------------------------------------------
  // GET /api/kb/categories
  // ---------------------------------------------------------------------------
  kbRouter.get('/categories', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')

    const categories = await db.query.kbCategories.findMany({
      where: eq(kbCategories.tenantId, tenantId),
      orderBy: [asc(kbCategories.sortOrder), asc(kbCategories.name)],
    })

    return c.json({ data: categories })
  })

  // ---------------------------------------------------------------------------
  // POST /api/kb/categories
  // ---------------------------------------------------------------------------
  const createCategorySchema = z.object({
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
    parentId: z.string().uuid().optional(),
    sortOrder: z.number().int().default(0),
  })

  kbRouter.post('/categories', requireAuth('org_admin'), zValidator('json', createCategorySchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const data = c.req.valid('json')

    const [category] = await db.insert(kbCategories).values({
      tenantId,
      name: data.name,
      slug: data.slug,
      parentId: data.parentId ?? null,
      sortOrder: data.sortOrder,
    }).returning()

    return c.json({ data: category }, 201)
  })

  // ---------------------------------------------------------------------------
  // GET /api/kb/search
  // ---------------------------------------------------------------------------
  kbRouter.get('/search', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const { q } = c.req.query()

    if (!q || q.trim().length === 0) return c.json({ data: [] })

    const isAuthenticated = !!member
    const visibilityCondition = isAuthenticated
      ? or(eq(kbArticles.visibility, 'public'), eq(kbArticles.visibility, 'members'))
      : eq(kbArticles.visibility, 'public')

    const results = await db
      .select()
      .from(kbArticles)
      .where(
        and(
          eq(kbArticles.tenantId, tenantId),
          eq(kbArticles.isPublished, true),
          visibilityCondition,
          sql`to_tsvector('english', ${kbArticles.title} || ' ' || ${kbArticles.body}::text) @@ plainto_tsquery('english', ${q})`,
        ),
      )
      .orderBy(desc(kbArticles.viewCount))
      .limit(20)

    return c.json({ data: results })
  })

  // ---------------------------------------------------------------------------
  // GET /api/kb/articles
  // ---------------------------------------------------------------------------
  kbRouter.get('/articles', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const { categoryId, visibility, published, page = '1', limit = '20' } = c.req.query()

    const offset = (Number(page) - 1) * Number(limit)
    const isAuthenticated = !!member

    const conditions: ReturnType<typeof eq>[] = [
      eq(kbArticles.tenantId, tenantId),
      (isAuthenticated
        ? or(eq(kbArticles.visibility, 'public'), eq(kbArticles.visibility, 'members'))
        : eq(kbArticles.visibility, 'public')) as ReturnType<typeof eq>,
    ]

    if (categoryId) conditions.push(eq(kbArticles.categoryId, categoryId))
    if (visibility) conditions.push(eq(kbArticles.visibility, visibility as 'public' | 'members' | 'restricted'))
    if (published !== undefined) conditions.push(eq(kbArticles.isPublished, published === 'true'))

    const articles = await db.query.kbArticles.findMany({
      where: and(...conditions),
      orderBy: [desc(kbArticles.updatedAt)],
      limit: Number(limit),
      offset,
    })

    return c.json({ data: articles, meta: { page: Number(page), limit: Number(limit) } })
  })

  // ---------------------------------------------------------------------------
  // GET /api/kb/articles/:id
  // ---------------------------------------------------------------------------
  kbRouter.get('/articles/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const articleId = c.req.param('id')

    const article = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)),
    })

    if (!article) return c.json({ error: 'Article not found' }, 404)

    if (article.visibility === 'members' && !member) {
      return c.json({ error: 'Authentication required' }, 401)
    }
    if (article.visibility === 'restricted' && (!member || member.role === 'guest')) {
      return c.json({ error: 'Not authorized' }, 403)
    }

    await db.update(kbArticles)
      .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
      .where(eq(kbArticles.id, articleId))

    return c.json({ data: article })
  })

  // ---------------------------------------------------------------------------
  // POST /api/kb/articles
  // ---------------------------------------------------------------------------
  const createArticleSchema = z.object({
    title: z.string().min(1).max(500),
    slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
    body: z.record(z.unknown()),
    excerpt: z.string().max(500).optional(),
    categoryId: z.string().uuid(),
    tags: z.array(z.string()).default([]),
    visibility: z.enum(['public', 'members', 'restricted']).default('members'),
  })

  kbRouter.post('/articles', requireAuth('moderator'), zValidator('json', createArticleSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const data = c.req.valid('json')

    const [article] = await db.insert(kbArticles).values({
      tenantId,
      authorId: member.id,
      categoryId: data.categoryId,
      title: data.title,
      slug: data.slug,
      body: data.body,
      excerpt: data.excerpt ?? null,
      tags: data.tags,
      visibility: data.visibility,
      isPublished: false,
      currentVersion: 1,
    }).returning() as [typeof kbArticles.$inferSelect, ...typeof kbArticles.$inferSelect[]]

    await db.insert(kbArticleVersions).values({
      tenantId,
      articleId: article.id,
      versionNumber: 1,
      body: data.body,
      createdBy: member.id,
    })

    return c.json({ data: article }, 201)
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/kb/articles/:id
  // ---------------------------------------------------------------------------
  const updateArticleSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    body: z.record(z.unknown()).optional(),
    excerpt: z.string().max(500).optional(),
    categoryId: z.string().uuid().optional(),
    tags: z.array(z.string()).optional(),
    visibility: z.enum(['public', 'members', 'restricted']).optional(),
    isPublished: z.boolean().optional(),
  })

  kbRouter.patch('/articles/:id', requireAuth('moderator'), zValidator('json', updateArticleSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const articleId = c.req.param('id')
    const data = c.req.valid('json')

    const existing = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Article not found' }, 404)

    if (data.body) {
      await db.insert(kbArticleVersions).values({
        tenantId,
        articleId,
        versionNumber: existing.currentVersion ?? 1,
        body: existing.body,
        createdBy: member.id,
      })
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updateValues.title = data.title
    if (data.body !== undefined) {
      updateValues.body = data.body
      updateValues.currentVersion = sql`${kbArticles.currentVersion} + 1`
    }
    if (data.excerpt !== undefined) updateValues.excerpt = data.excerpt
    if (data.categoryId !== undefined) updateValues.categoryId = data.categoryId
    if (data.tags !== undefined) updateValues.tags = data.tags
    if (data.visibility !== undefined) updateValues.visibility = data.visibility
    if (data.isPublished !== undefined) updateValues.isPublished = data.isPublished

    const isPublishing = data.isPublished === true && !existing.isPublished
    if (isPublishing) updateValues.publishedAt = new Date()

    const [updated] = await db.update(kbArticles)
      .set(updateValues)
      .where(and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)))
      .returning()

    if (isPublishing) {
      await emitEvent(c, Events.KB_ARTICLE_PUBLISHED, { tenantId, articleId, article: updated })
    }

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // DELETE /api/kb/articles/:id (unpublish + soft-delete)
  // ---------------------------------------------------------------------------
  kbRouter.delete('/articles/:id', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const articleId = c.req.param('id')

    const existing = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Article not found' }, 404)

    await db.update(kbArticles)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)))

    return c.json({ data: { deleted: true } })
  })

  // ---------------------------------------------------------------------------
  // GET /api/kb/articles/:id/versions
  // ---------------------------------------------------------------------------
  kbRouter.get('/articles/:id/versions', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const articleId = c.req.param('id')

    const existing = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Article not found' }, 404)

    const versions = await db.query.kbArticleVersions.findMany({
      where: and(eq(kbArticleVersions.articleId, articleId), eq(kbArticleVersions.tenantId, tenantId)),
      orderBy: [desc(kbArticleVersions.versionNumber)],
    })

    return c.json({ data: versions })
  })

  // ---------------------------------------------------------------------------
  // POST /api/kb/articles/:id/feedback
  // ---------------------------------------------------------------------------
  const feedbackSchema = z.object({
    isHelpful: z.boolean(),
    comment: z.string().max(1000).optional(),
  })

  kbRouter.post('/articles/:id/feedback', zValidator('json', feedbackSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const articleId = c.req.param('id')
    const { isHelpful, comment } = c.req.valid('json')

    const existing = await db.query.kbArticles.findFirst({
      where: and(eq(kbArticles.id, articleId), eq(kbArticles.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Article not found' }, 404)

    await db.insert(kbArticleFeedback).values({
      tenantId,
      articleId,
      memberId: member?.id ?? null,
      isHelpful,
      comment: comment ?? null,
    })

    if (isHelpful) {
      await db.update(kbArticles)
        .set({ helpfulCount: sql`${kbArticles.helpfulCount} + 1` })
        .where(eq(kbArticles.id, articleId))
    } else {
      await db.update(kbArticles)
        .set({ notHelpfulCount: sql`${kbArticles.notHelpfulCount} + 1` })
        .where(eq(kbArticles.id, articleId))
    }

    return c.json({ data: { recorded: true } }, 201)
  })

  app.route('/api/kb', kbRouter)
}
