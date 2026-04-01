import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import { forumThreads, forumPosts, forumCategories, forumReactions } from '@osc/db/schema'
import { members } from '@osc/db/schema'
import { eq, and, desc, asc, sql, max, inArray } from 'drizzle-orm'
import { Events } from '@osc/core'
import { emitEvent } from '../../lib/emit-event'
import { sendEmailNotification } from '../../lib/email/notification-listener'

export function registerForumsRoutes(app: Hono<HonoEnv>) {
  const forumsRouter = new Hono<HonoEnv>()
  forumsRouter.use('*', requireModule('forums'))

  // GET /api/forums/categories — list all categories with thread stats
  forumsRouter.get('/categories', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')

    const categories = await db.query.forumCategories.findMany({
      where: and(eq(forumCategories.tenantId, tenantId), eq(forumCategories.isArchived, false)),
      orderBy: [asc(forumCategories.sortOrder)],
    })

    // Aggregate thread stats per category
    const statsRows = await db
      .select({
        categoryId: forumThreads.categoryId,
        threadCount: sql<number>`count(${forumThreads.id})`.as('thread_count'),
        postCount: sql<number>`sum(${forumThreads.replyCount})`.as('post_count'),
        lastActivityAt: max(forumThreads.lastActivityAt).as('last_activity_at'),
      })
      .from(forumThreads)
      .where(eq(forumThreads.tenantId, tenantId))
      .groupBy(forumThreads.categoryId)

    const statsMap = new Map(statsRows.map((r) => [r.categoryId, r]))

    // Latest thread per category with author name
    const latestThreadRows = await db
      .select({
        categoryId: forumThreads.categoryId,
        id: forumThreads.id,
        title: forumThreads.title,
        authorName: members.displayName,
      })
      .from(forumThreads)
      .innerJoin(members, eq(members.id, forumThreads.authorId))
      .where(eq(forumThreads.tenantId, tenantId))
      .orderBy(desc(forumThreads.createdAt))

    // Keep only the first (most recent) thread per category
    const latestThreadMap = new Map<string, { id: string; title: string; authorName: string }>()
    for (const row of latestThreadRows) {
      if (!latestThreadMap.has(row.categoryId)) {
        latestThreadMap.set(row.categoryId, { id: row.id, title: row.title, authorName: row.authorName })
      }
    }

    const enriched = categories.map((cat) => {
      const stats = statsMap.get(cat.id)
      return {
        ...cat,
        threadCount: Number(stats?.threadCount ?? 0),
        postCount: Number(stats?.postCount ?? 0),
        lastActivityAt: stats?.lastActivityAt?.toISOString() ?? null,
        lastThread: latestThreadMap.get(cat.id) ?? null,
      }
    })

    return c.json({ data: enriched })
  })

  // GET /api/forums/threads — list threads with pagination and author names
  forumsRouter.get('/threads', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const { categoryId, sort = 'newest', page = '1', limit = '20' } = c.req.query()

    const offset = (Number(page) - 1) * Number(limit)
    const threads = await db.query.forumThreads.findMany({
      where: and(
        eq(forumThreads.tenantId, tenantId),
        categoryId ? eq(forumThreads.categoryId, categoryId) : undefined,
      ),
      orderBy: sort === 'newest' ? [desc(forumThreads.createdAt)] : [desc(forumThreads.lastActivityAt)],
      limit: Number(limit),
      offset,
    })

    // Enrich with author names
    const authorIds = [...new Set(threads.map((t) => t.authorId))]
    const authorsData = authorIds.length > 0
      ? await db.select({ id: members.id, displayName: members.displayName, avatarUrl: members.avatarUrl })
          .from(members)
          .where(inArray(members.id, authorIds))
      : []
    const authorMap = new Map(authorsData.map((a) => [a.id, a]))

    const enriched = threads.map((t) => {
      const author = authorMap.get(t.authorId)
      return {
        ...t,
        authorName: author?.displayName ?? '',
        authorAvatarUrl: author?.avatarUrl ?? null,
        isAnswered: t.acceptedAnswerId !== null,
      }
    })

    return c.json({ data: enriched })
  })

  // GET /api/forums/threads/:id — get single thread with posts, enriched with author info
  forumsRouter.get('/threads/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const threadId = c.req.param('id')

    const thread = await db.query.forumThreads.findFirst({
      where: and(eq(forumThreads.id, threadId), eq(forumThreads.tenantId, tenantId)),
    })

    if (!thread) return c.json({ error: 'Thread not found' }, 404)

    const [rawPosts, category, threadAuthor] = await Promise.all([
      db.query.forumPosts.findMany({
        where: and(
          eq(forumPosts.threadId, threadId),
          eq(forumPosts.tenantId, tenantId),
          eq(forumPosts.isDeleted, false),
        ),
        orderBy: [asc(forumPosts.createdAt)],
      }),
      db.query.forumCategories.findFirst({
        where: eq(forumCategories.id, thread.categoryId),
        columns: { id: true, name: true, slug: true },
      }),
      db.query.members.findFirst({
        where: eq(members.id, thread.authorId),
        columns: { id: true, displayName: true, avatarUrl: true, role: true },
      }),
    ])

    // Enrich posts with author info
    const postAuthorIds = [...new Set(rawPosts.map((p) => p.authorId))]
    const postAuthors = postAuthorIds.length > 0
      ? await db.select({ id: members.id, displayName: members.displayName, avatarUrl: members.avatarUrl, role: members.role })
          .from(members)
          .where(inArray(members.id, postAuthorIds))
      : []
    const postAuthorMap = new Map(postAuthors.map((a) => [a.id, a]))

    const posts = rawPosts.map((p) => {
      const author = postAuthorMap.get(p.authorId)
      return {
        ...p,
        authorName: author?.displayName ?? '',
        authorAvatarUrl: author?.avatarUrl ?? null,
        authorRole: author?.role ?? 'member',
        isAnswer: thread.acceptedAnswerId === p.id,
      }
    })

    // Increment view count
    await db.update(forumThreads)
      .set({ viewCount: sql`${forumThreads.viewCount} + 1` })
      .where(eq(forumThreads.id, threadId))

    return c.json({
      data: {
        thread: {
          ...thread,
          authorName: threadAuthor?.displayName ?? '',
          authorAvatarUrl: threadAuthor?.avatarUrl ?? null,
          isAnswered: thread.acceptedAnswerId !== null,
          categoryName: category?.name ?? '',
          categorySlug: category?.slug ?? '',
        },
        posts,
      },
    })
  })

  // POST /api/forums/threads — create thread
  const createThreadSchema = z.object({
    title: z.string().min(1).max(500),
    body: z.union([z.string(), z.record(z.unknown())]), // HTML string or Tiptap JSON
    categoryId: z.string().uuid(),
  })

  forumsRouter.post('/threads', requireAuth('member'), zValidator('json', createThreadSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const { title, body, categoryId } = c.req.valid('json')

    const [thread] = await db.insert(forumThreads).values({
      tenantId,
      categoryId,
      authorId: member.id,
      title,
      body,
      lastActivityAt: new Date(),
    }).returning()

    await emitEvent(c, Events.FORUM_THREAD_CREATED, { tenantId, thread })

    return c.json({ data: thread }, 201)
  })

  // POST /api/forums/threads/:id/posts — reply to thread
  const createPostSchema = z.object({
    body: z.union([z.string(), z.record(z.unknown())]), // HTML string or Tiptap JSON
    parentId: z.string().uuid().optional(),
  })

  forumsRouter.post('/threads/:id/posts', requireAuth('member'), zValidator('json', createPostSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const threadId = c.req.param('id')
    const { body, parentId } = c.req.valid('json')

    // Verify thread exists and belongs to tenant
    const thread = await db.query.forumThreads.findFirst({
      where: and(eq(forumThreads.id, threadId), eq(forumThreads.tenantId, tenantId)),
    })

    if (!thread) return c.json({ error: 'Thread not found' }, 404)

    // Determine depth
    let depth = 0
    if (parentId) {
      const parent = await db.query.forumPosts.findFirst({
        where: and(eq(forumPosts.id, parentId), eq(forumPosts.tenantId, tenantId)),
      })
      depth = Math.min((parent?.depth ?? 0) + 1, 3)
    }

    const [post] = await db.insert(forumPosts).values({
      tenantId,
      threadId,
      authorId: member.id,
      body,
      parentId,
      depth,
    }).returning()

    // Update thread reply count and last activity
    await db.update(forumThreads)
      .set({
        replyCount: sql`${forumThreads.replyCount} + 1`,
        lastActivityAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId))

    await emitEvent(c, Events.FORUM_POST_CREATED, { tenantId, post, threadId })
    c.executionCtx.waitUntil(
      sendEmailNotification(c, Events.FORUM_POST_CREATED, { tenantId, post, threadId })
    )

    return c.json({ data: post }, 201)
  })

  // POST /api/forums/threads/:id/resolve — mark thread as resolved
  forumsRouter.post('/threads/:id/resolve', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const threadId = c.req.param('id')
    const { acceptedPostId } = await c.req.json()

    const thread = await db.query.forumThreads.findFirst({
      where: and(eq(forumThreads.id, threadId), eq(forumThreads.tenantId, tenantId)),
    })

    if (!thread) return c.json({ error: 'Thread not found' }, 404)
    // Only author or moderator can resolve
    if (thread.authorId !== member.id && member.role === 'member') {
      return c.json({ error: 'Not authorized' }, 403)
    }

    await db.update(forumThreads)
      .set({ status: 'resolved', acceptedAnswerId: acceptedPostId })
      .where(eq(forumThreads.id, threadId))

    await emitEvent(c, Events.FORUM_THREAD_RESOLVED, { tenantId, threadId })

    return c.json({ data: { resolved: true } })
  })

  // DELETE /api/forums/posts/:id — soft delete a post
  forumsRouter.delete('/posts/:id', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const postId = c.req.param('id')

    const post = await db.query.forumPosts.findFirst({
      where: and(eq(forumPosts.id, postId), eq(forumPosts.tenantId, tenantId)),
    })

    if (!post) return c.json({ error: 'Post not found' }, 404)
    if (post.authorId !== member.id && member.role === 'member') {
      return c.json({ error: 'Not authorized' }, 403)
    }

    await db.update(forumPosts)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(forumPosts.id, postId))

    return c.json({ data: { deleted: true } })
  })

  app.route('/api/forums', forumsRouter)
}
