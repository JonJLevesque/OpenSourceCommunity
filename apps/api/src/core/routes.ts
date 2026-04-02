import type { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../middleware/auth'
import { getClient } from '@osc/db'
import { members, tenants, tenantModules, forumThreads, forumPosts, forumCategories, ideas, events, notifications, webhooks, webhookDeliveries, kbArticles, emailPreferences, auditLogs, contentReports } from '@osc/db/schema'
import { eq, and, ilike, or, count, desc, sql, gte, inArray, isNull } from 'drizzle-orm'

// In-memory tenant cache reference — we need to bust it on module toggle
// This module is in the same Worker isolate as tenant.ts, so we can share state
// via a simple exported map or a helper. Here we re-use the same pattern of
// letting the next request repopulate the cache naturally by simply not caching
// the invalidated slug. A proper production approach could use Upstash.
declare const globalThis: {
  __tenantCache?: Map<string, unknown>
}

function bustTenantCache(slug: string) {
  // The tenantCache is local to tenant.ts. In a single isolate this works;
  // across isolates the TTL (1 min) naturally handles staleness.
  // We expose a named export from tenant.ts to invalidate directly:
  try {
    // Dynamic import not available at Worker runtime for side-effects like this;
    // instead, we write to a shared WeakRef-style global that tenant.ts checks.
    // For now, clearing is best-effort within this isolate.
    if (globalThis.__tenantCache) {
      globalThis.__tenantCache.delete(slug)
    }
  } catch {
    // swallow — cache will expire on TTL
  }
}

const updateModulesSchema = z.object({
  moduleId: z.string().min(1),
  enabled: z.boolean(),
})

const membersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.enum(['guest', 'member', 'moderator', 'org_admin']).optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
})

export function coreRoutes(app: Hono<HonoEnv>) {
  // ─── GET /api/me ──────────────────────────────────────────────────────────────
  // Returns the current member's profile within this tenant
  app.get('/api/me', requireAuth(), async (c) => {
    const member = c.get('member')!
    // member is already loaded by authMiddleware — return it directly
    return c.json({ data: member })
  })

  // ─── GET /api/tenant ──────────────────────────────────────────────────────────
  // Returns current tenant info + list of enabled module IDs (flat shape)
  app.get('/api/tenant', async (c) => {
    const tenant = c.get('tenant')
    const enabledModules = c.get('enabledModules') as string[]
    return c.json({
      data: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
        logoUrl: tenant.logoUrl ?? undefined,
        primaryColor: tenant.primaryColor ?? undefined,
        enabledModules,
        settings: (tenant.settings ?? {}) as Record<string, unknown>,
      },
    })
  })

  // ─── GET /api/members ─────────────────────────────────────────────────────────
  // Member directory — searchable, filterable by role, paginated
  app.get('/api/members', requireAuth(), zValidator('query', membersQuerySchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const { search, role, page, limit } = c.req.valid('query')

    const offset = (Number(page) - 1) * Number(limit)

    const conditions = [eq(members.tenantId, tenantId)]

    if (role) {
      conditions.push(eq(members.role, role))
    }

    if (search) {
      conditions.push(
        or(
          ilike(members.displayName, `%${search}%`),
          ilike(members.username, `%${search}%`),
        )!
      )
    }

    const rows = await db.query.members.findMany({
      where: and(...conditions),
      columns: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        // Exclude PII fields like userId, email from directory
      },
      orderBy: (m, { asc }) => [asc(m.displayName)],
      limit: Number(limit),
      offset,
    })

    return c.json({ data: rows, meta: { page: Number(page), limit: Number(limit) } })
  })

  // ─── GET /api/members/:id ─────────────────────────────────────────────────────
  // Public-ish member profile — no auth required but scoped to tenant
  app.get('/api/members/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const memberId = c.req.param('id')

    const member = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.tenantId, tenantId)),
      columns: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    })

    if (!member) return c.json({ error: 'Member not found' }, 404)

    return c.json({ data: member })
  })

  // ─── GET /api/admin/overview ──────────────────────────────────────────────────
  // Admin dashboard overview: member count, module states, pending moderation
  app.get('/api/admin/overview', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const enabledModules = c.get('enabledModules') as string[]

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const [memberCountRow, threadCountRow, ideaCountRow, eventCountRow, newMembersRow, pendingReportsRow] = await Promise.all([
      db.select({ cnt: count() }).from(members).where(eq(members.tenantId, tenantId)),
      db.select({ cnt: count() }).from(forumThreads).where(eq(forumThreads.tenantId, tenantId)),
      db.select({ cnt: count() }).from(ideas).where(eq(ideas.tenantId, tenantId)),
      db.select({ cnt: count() }).from(events).where(eq(events.tenantId, tenantId)),
      db.select({ cnt: count() }).from(members).where(and(eq(members.tenantId, tenantId), gte(members.createdAt, weekAgo))),
      db.select({ cnt: count() }).from(contentReports).where(and(eq(contentReports.tenantId, tenantId), eq(contentReports.status, 'pending'))),
    ])

    const allModules = ['forums', 'ideas', 'events', 'courses', 'webinars', 'kb', 'chat', 'social-intel'] as const
    const moduleList = allModules.map((key) => ({
      key: key === 'social-intel' ? 'intelligence' : key,
      enabled: enabledModules.includes(key),
    }))

    return c.json({
      data: {
        modules: moduleList,
        memberCount: Number(memberCountRow[0]?.cnt ?? 0),
        newMembersThisWeek: Number(newMembersRow[0]?.cnt ?? 0),
        threadCount: Number(threadCountRow[0]?.cnt ?? 0),
        ideaCount: Number(ideaCountRow[0]?.cnt ?? 0),
        eventCount: Number(eventCountRow[0]?.cnt ?? 0),
        pendingModeration: Number(pendingReportsRow[0]?.cnt ?? 0),
      },
    })
  })

  // ─── PATCH /api/admin/modules ─────────────────────────────────────────────────
  // Enable or disable a module for this tenant (org_admin only)
  app.patch('/api/admin/modules', requireAuth('org_admin'), zValidator('json', updateModulesSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const tenant = c.get('tenant')
    const { moduleId, enabled } = c.req.valid('json')

    // Upsert the tenant_modules row
    const existing = await db.query.tenantModules.findFirst({
      where: and(
        eq(tenantModules.tenantId, tenantId),
        eq(tenantModules.moduleId, moduleId),
      ),
    })

    if (existing) {
      await db.update(tenantModules)
        .set({ enabled })
        .where(and(
          eq(tenantModules.tenantId, tenantId),
          eq(tenantModules.moduleId, moduleId),
        ))
    } else {
      await db.insert(tenantModules).values({
        tenantId,
        moduleId,
        enabled,
      })
    }

    bustTenantCache(tenant.slug)

    // Audit log
    const member = c.get('member')
    if (member) {
      await db.insert(auditLogs).values({
        tenantId,
        actorId: member.id,
        actorName: member.displayName,
        action: enabled ? 'module.enabled' : 'module.disabled',
        resourceType: 'module',
        resourceId: moduleId,
        metadata: {},
      })
    }

    return c.json({ data: { moduleId, enabled } })
  })

  // ─── GET /api/stats ───────────────────────────────────────────────────────────
  // Community-level stats for the home dashboard
  app.get('/api/stats', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      [memberRow],
      [postsRow],
      [threadsRow],
      [eventsRow],
    ] = await Promise.all([
      db.select({ n: count() }).from(members).where(eq(members.tenantId, tenantId)),
      db.select({ n: count() }).from(forumPosts)
        .where(and(eq(forumPosts.tenantId, tenantId), gte(forumPosts.createdAt, weekAgo))),
      db.select({ n: count() }).from(forumThreads)
        .where(and(eq(forumThreads.tenantId, tenantId), eq(forumThreads.status, 'open'))),
      db.select({ n: count() }).from(events)
        .where(and(eq(events.tenantId, tenantId), eq(events.status, 'published'), gte(events.startsAt, new Date()))),
    ])

    return c.json({
      data: {
        memberCount: Number(memberRow?.n ?? 0),
        postsThisWeek: Number(postsRow?.n ?? 0),
        activeThreads: Number(threadsRow?.n ?? 0),
        upcomingEvents: Number(eventsRow?.n ?? 0),
      },
    })
  })

  // ─── GET /api/activity ────────────────────────────────────────────────────────
  // Recent activity feed: latest threads + ideas + events
  app.get('/api/activity', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? '20')))

    const [threads, ideaRows, eventRows] = await Promise.all([
      db.select({
        id: forumThreads.id,
        title: forumThreads.title,
        authorId: forumThreads.authorId,
        createdAt: forumThreads.createdAt,
        categorySlug: forumCategories.slug,
      })
        .from(forumThreads)
        .leftJoin(forumCategories, eq(forumThreads.categoryId, forumCategories.id))
        .where(eq(forumThreads.tenantId, tenantId))
        .orderBy(desc(forumThreads.createdAt))
        .limit(limit),
      db.select({
        id: ideas.id,
        title: ideas.title,
        authorId: ideas.authorId,
        createdAt: ideas.createdAt,
      })
        .from(ideas)
        .where(eq(ideas.tenantId, tenantId))
        .orderBy(desc(ideas.createdAt))
        .limit(limit),
      db.select({
        id: events.id,
        title: events.title,
        createdAt: events.createdAt,
      })
        .from(events)
        .where(and(eq(events.tenantId, tenantId), eq(events.status, 'published')))
        .orderBy(desc(events.createdAt))
        .limit(limit),
    ])

    // Fetch member display names for thread + idea authors
    const authorIds = [
      ...new Set([
        ...threads.map((t) => t.authorId).filter(Boolean),
        ...ideaRows.map((i) => i.authorId).filter(Boolean),
      ]),
    ] as string[]

    const authorMap = new Map<string, { displayName: string; avatarUrl: string | null }>()
    if (authorIds.length > 0) {
      const authorRows = await db
        .select({ id: members.id, displayName: members.displayName, avatarUrl: members.avatarUrl })
        .from(members)
        .where(and(eq(members.tenantId, tenantId), inArray(members.id, authorIds)))
      for (const a of authorRows) authorMap.set(a.id, { displayName: a.displayName, avatarUrl: a.avatarUrl })
    }

    type ActivityItem = {
      id: string
      type: 'post' | 'idea' | 'event'
      title: string
      authorName: string
      authorAvatarUrl?: string
      createdAt: string
      href: string
    }

    const toAvatarProp = (url: string | null | undefined) =>
      url ? { authorAvatarUrl: url } : {}

    const items: ActivityItem[] = [
      ...threads.map((t) => ({
        id: `thread-${t.id}`,
        type: 'post' as const,
        title: t.title,
        authorName: authorMap.get(t.authorId!)?.displayName ?? 'Community member',
        ...toAvatarProp(authorMap.get(t.authorId!)?.avatarUrl),
        createdAt: (t.createdAt ?? new Date()).toISOString(),
        href: `/forums/${t.categorySlug ?? 'general'}/${t.id}`,
      })),
      ...ideaRows.map((i) => ({
        id: `idea-${i.id}`,
        type: 'idea' as const,
        title: i.title,
        authorName: authorMap.get(i.authorId!)?.displayName ?? 'Community member',
        ...toAvatarProp(authorMap.get(i.authorId!)?.avatarUrl),
        createdAt: (i.createdAt ?? new Date()).toISOString(),
        href: `/ideas/${i.id}`,
      })),
      ...eventRows.map((e) => ({
        id: `event-${e.id}`,
        type: 'event' as const,
        title: e.title,
        authorName: 'Team',
        createdAt: (e.createdAt ?? new Date()).toISOString(),
        href: `/events/${e.id}`,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)

    return c.json({ data: items })
  })

  // ─── PATCH /api/me ────────────────────────────────────────────────────────────
  // Update own profile (displayName, username, bio, avatarUrl)
  const updateProfileSchema = z.object({
    displayName: z.string().min(1).max(200).optional(),
    username: z.string().min(2).max(50).regex(/^[a-z0-9_-]+$/, 'Lowercase letters, numbers, underscores, and hyphens only').optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    socialHandles: z.record(z.string(), z.string()).optional(),
  })

  app.patch('/api/me', requireAuth(), zValidator('json', updateProfileSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const data = c.req.valid('json')

    const updateValues: Record<string, unknown> = {}
    if (data.displayName !== undefined) updateValues.displayName = data.displayName
    if (data.username !== undefined) updateValues.username = data.username || null
    if (data.bio !== undefined) updateValues.bio = data.bio || null
    if (data.avatarUrl !== undefined) updateValues.avatarUrl = data.avatarUrl || null
    if (data.socialHandles !== undefined) updateValues.socialHandles = data.socialHandles

    if (Object.keys(updateValues).length === 0) {
      return c.json({ data: member })
    }

    const [updated] = await db
      .update(members)
      .set(updateValues)
      .where(and(eq(members.id, member.id), eq(members.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ─── GET /api/notifications ───────────────────────────────────────────────────
  // List notifications for the current member
  app.get('/api/notifications', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const unreadOnly = c.req.query('unread_only') === 'true'
    const page = Math.max(1, Number(c.req.query('page') ?? '1'))
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? '30')))
    const offset = (page - 1) * limit

    const conditions = [
      eq(notifications.tenantId, tenantId),
      eq(notifications.memberId, member.id),
    ]
    if (unreadOnly) conditions.push(isNull(notifications.readAt))

    const [rows, [unreadRow]] = await Promise.all([
      db.query.notifications.findMany({
        where: and(...conditions),
        orderBy: (n, { desc }) => [desc(n.createdAt)],
        limit,
        offset,
      }),
      db.select({ n: count() })
        .from(notifications)
        .where(and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.memberId, member.id),
          isNull(notifications.readAt),
        )),
    ])

    // Wrap in the standard envelope so apiGet<NotificationsResponse> unwraps correctly
    return c.json({
      data: {
        data: rows,
        meta: { unreadCount: Number(unreadRow?.n ?? 0), page, limit },
      },
    })
  })

  // ─── PATCH /api/notifications/read-all ────────────────────────────────────────
  app.patch('/api/notifications/read-all', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.memberId, member.id),
        isNull(notifications.readAt),
      ))

    return c.json({ data: { ok: true } })
  })

  // ─── PATCH /api/notifications/:id/read ───────────────────────────────────────
  app.patch('/api/notifications/:id/read', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const notifId = c.req.param('id')

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(
        eq(notifications.id, notifId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.memberId, member.id),
      ))

    return c.json({ data: { ok: true } })
  })

  // ─── GET /api/search ──────────────────────────────────────────────────────────
  // Upgraded from ILIKE to PostgreSQL FTS with ts_rank relevance ordering and
  // ts_headline snippet extraction. KB articles added to results.
  app.get('/api/search', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const q = c.req.query('q')?.trim() ?? ''
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? '10')))
    const type = c.req.query('type') // threads | ideas | events | kb | members | undefined = all

    if (q.length < 2) {
      return c.json({ data: { threads: [], ideas: [], members: [], events: [], kb: [] } })
    }

    const pattern = `%${q}%`

    const [threads, ideaRows, memberRows, eventRows, kbRows] = await Promise.all([
      (!type || type === 'threads')
        ? db.select({
            id: forumThreads.id,
            title: forumThreads.title,
            categoryId: forumThreads.categoryId,
            rank: sql<number>`ts_rank(to_tsvector('english', coalesce(${forumThreads.title}, '') || ' ' || coalesce(${forumThreads.body}::text, '')), plainto_tsquery('english', ${q}))`,
            snippet: sql<string>`ts_headline('english', coalesce(${forumThreads.title}, '') || ' ' || coalesce(${forumThreads.body}::text, ''), plainto_tsquery('english', ${q}), 'MaxFragments=1,MaxWords=30,MinWords=10')`,
          })
            .from(forumThreads)
            .where(and(
              eq(forumThreads.tenantId, tenantId),
              sql`to_tsvector('english', coalesce(${forumThreads.title}, '') || ' ' || coalesce(${forumThreads.body}::text, '')) @@ plainto_tsquery('english', ${q})`,
            ))
            .orderBy(sql`rank DESC`)
            .limit(limit)
        : Promise.resolve([]),
      (!type || type === 'ideas')
        ? db.select({
            id: ideas.id,
            title: ideas.title,
            rank: sql<number>`ts_rank(to_tsvector('english', coalesce(${ideas.title}, '') || ' ' || coalesce(${ideas.body}::text, '')), plainto_tsquery('english', ${q}))`,
            snippet: sql<string>`ts_headline('english', coalesce(${ideas.title}, '') || ' ' || coalesce(${ideas.body}::text, ''), plainto_tsquery('english', ${q}), 'MaxFragments=1,MaxWords=30,MinWords=10')`,
          })
            .from(ideas)
            .where(and(
              eq(ideas.tenantId, tenantId),
              eq(ideas.isMerged, false),
              sql`to_tsvector('english', coalesce(${ideas.title}, '') || ' ' || coalesce(${ideas.body}::text, '')) @@ plainto_tsquery('english', ${q})`,
            ))
            .orderBy(sql`rank DESC`)
            .limit(limit)
        : Promise.resolve([]),
      (!type || type === 'members')
        ? db.select({ id: members.id, displayName: members.displayName, username: members.username })
            .from(members)
            .where(and(
              eq(members.tenantId, tenantId),
              or(ilike(members.displayName, pattern), ilike(members.username, pattern))!,
            ))
            .limit(limit)
        : Promise.resolve([]),
      (!type || type === 'events')
        ? db.select({
            id: events.id,
            title: events.title,
            rank: sql<number>`ts_rank(to_tsvector('english', coalesce(${events.title}, '') || ' ' || coalesce(${events.body}::text, '')), plainto_tsquery('english', ${q}))`,
            snippet: sql<string>`ts_headline('english', coalesce(${events.title}, '') || ' ' || coalesce(${events.body}::text, ''), plainto_tsquery('english', ${q}), 'MaxFragments=1,MaxWords=30,MinWords=10')`,
          })
            .from(events)
            .where(and(
              eq(events.tenantId, tenantId),
              eq(events.status, 'published'),
              sql`to_tsvector('english', coalesce(${events.title}, '') || ' ' || coalesce(${events.body}::text, '')) @@ plainto_tsquery('english', ${q})`,
            ))
            .orderBy(sql`rank DESC`)
            .limit(limit)
        : Promise.resolve([]),
      (!type || type === 'kb')
        ? db.select({
            id: kbArticles.id,
            title: kbArticles.title,
            rank: sql<number>`ts_rank(to_tsvector('english', coalesce(${kbArticles.title}, '') || ' ' || coalesce(${kbArticles.body}::text, '')), plainto_tsquery('english', ${q}))`,
            snippet: sql<string>`ts_headline('english', coalesce(${kbArticles.title}, '') || ' ' || coalesce(${kbArticles.body}::text, ''), plainto_tsquery('english', ${q}), 'MaxFragments=1,MaxWords=30,MinWords=10')`,
          })
            .from(kbArticles)
            .where(and(
              eq(kbArticles.tenantId, tenantId),
              eq(kbArticles.isPublished, true),
              sql`to_tsvector('english', coalesce(${kbArticles.title}, '') || ' ' || coalesce(${kbArticles.body}::text, '')) @@ plainto_tsquery('english', ${q})`,
            ))
            .orderBy(sql`rank DESC`)
            .limit(limit)
        : Promise.resolve([]),
    ])

    // For threads, get category slugs
    const categoryIds = [...new Set(threads.map(t => t.categoryId))]
    const catSlugMap = new Map<string, string>()
    if (categoryIds.length > 0) {
      const cats = await db
        .select({ id: forumCategories.id, slug: forumCategories.slug })
        .from(forumCategories)
        .where(and(eq(forumCategories.tenantId, tenantId), inArray(forumCategories.id, categoryIds)))
      for (const c of cats) catSlugMap.set(c.id, c.slug)
    }

    return c.json({
      data: {
        threads: threads.map(t => ({
          id: t.id,
          title: t.title,
          snippet: 'snippet' in t ? t.snippet : undefined,
          href: `/forums/${catSlugMap.get(t.categoryId) ?? 'general'}/${t.id}`,
        })),
        ideas: ideaRows.map(i => ({ id: i.id, title: i.title, snippet: 'snippet' in i ? i.snippet : undefined, href: `/ideas/${i.id}` })),
        members: memberRows.map(m => ({
          id: m.id,
          title: m.displayName,
          subtitle: m.username ? `@${m.username}` : undefined,
          href: `/members/${m.id}`,
        })),
        events: eventRows.map(e => ({ id: e.id, title: e.title, snippet: 'snippet' in e ? e.snippet : undefined, href: `/events/${e.id}` })),
        kb: kbRows.map(k => ({ id: k.id, title: k.title, snippet: 'snippet' in k ? k.snippet : undefined, href: `/kb/${k.id}` })),
      },
    })
  })

  // ─── PATCH /api/admin/branding ────────────────────────────────────────────────
  // Update tenant name, logo, and primary colour (org_admin only)
  app.patch('/api/admin/branding', requireAuth('org_admin'), zValidator('json', z.object({
    name: z.string().min(1).max(100).optional(),
    logoUrl: z.string().url().or(z.literal('')).optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  })), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const body = c.req.valid('json')

    const patch: {
      updatedAt: Date
      name?: string
      logoUrl?: string | null
      primaryColor?: string
    } = { updatedAt: new Date() }
    if (body.name !== undefined) patch.name = body.name
    if (body.logoUrl !== undefined) patch.logoUrl = body.logoUrl || null
    if (body.primaryColor !== undefined) patch.primaryColor = body.primaryColor

    const [updated] = await db.update(tenants).set(patch).where(eq(tenants.id, tenantId)).returning()
    return c.json({ data: updated })
  })

  // ─── GET /api/admin/webhooks ──────────────────────────────────────────────────
  app.get('/api/admin/webhooks', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const rows = await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.tenantId, tenantId))
      .orderBy(desc(webhooks.createdAt))
    return c.json({ data: rows })
  })

  // ─── POST /api/admin/webhooks ─────────────────────────────────────────────────
  app.post('/api/admin/webhooks', requireAuth('org_admin'), zValidator('json', z.object({
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    secret: z.string().min(8).optional(),
    enabled: z.boolean().optional().default(true),
  })), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const body = c.req.valid('json')

    // Auto-generate secret if not provided
    const secret = body.secret ?? Array.from(
      crypto.getRandomValues(new Uint8Array(24)),
      b => b.toString(16).padStart(2, '0')
    ).join('')

    const [webhook] = await db.insert(webhooks).values({
      tenantId,
      url: body.url,
      events: body.events,
      secret,
      enabled: body.enabled ?? true,
    }).returning()

    return c.json({ data: webhook }, 201)
  })

  // ─── PUT /api/admin/webhooks/:id ──────────────────────────────────────────────
  app.put('/api/admin/webhooks/:id', requireAuth('org_admin'), zValidator('json', z.object({
    url: z.string().url().optional(),
    events: z.array(z.string()).min(1).optional(),
    enabled: z.boolean().optional(),
  })), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const body = c.req.valid('json')

    const existing = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Webhook not found' }, 404)

    const patch: Partial<typeof webhooks.$inferInsert> = {}
    if (body.url !== undefined) patch.url = body.url
    if (body.events !== undefined) patch.events = body.events
    if (body.enabled !== undefined) patch.enabled = body.enabled

    const [updated] = await db.update(webhooks).set(patch)
      .where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ─── DELETE /api/admin/webhooks/:id ──────────────────────────────────────────
  app.delete('/api/admin/webhooks/:id', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')

    const existing = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Webhook not found' }, 404)

    await db.delete(webhooks).where(and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)))
    return c.json({ data: { ok: true } })
  })

  // ─── GET /api/admin/webhooks/:id/deliveries ───────────────────────────────────
  app.get('/api/admin/webhooks/:id/deliveries', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const id = c.req.param('id')
    const limit = Math.min(50, Number(c.req.query('limit') ?? '20'))

    const existing = await db.query.webhooks.findFirst({
      where: and(eq(webhooks.id, id), eq(webhooks.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Webhook not found' }, 404)

    const deliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(and(
        eq(webhookDeliveries.webhookId, id),
        eq(webhookDeliveries.tenantId, tenantId),
      ))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit)

    return c.json({ data: deliveries })
  })

  // ─── GET /api/me/email-preferences ───────────────────────────────────────────
  app.get('/api/me/email-preferences', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!

    const prefs = await db
      .select()
      .from(emailPreferences)
      .where(and(eq(emailPreferences.memberId, member.id), eq(emailPreferences.tenantId, tenantId)))

    return c.json({ data: prefs })
  })

  // ─── PUT /api/me/email-preferences ───────────────────────────────────────────
  app.put('/api/me/email-preferences', requireAuth(), zValidator('json', z.object({
    preferences: z.array(z.object({
      eventType: z.string(),
      enabled: z.boolean(),
      frequency: z.enum(['instant', 'daily', 'weekly', 'never']),
    })),
  })), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const { preferences } = c.req.valid('json')

    // Upsert each preference
    await Promise.all(preferences.map(pref =>
      db.insert(emailPreferences).values({
        tenantId,
        memberId: member.id,
        eventType: pref.eventType,
        enabled: pref.enabled,
        frequency: pref.frequency,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [emailPreferences.tenantId, emailPreferences.memberId, emailPreferences.eventType],
        set: { enabled: pref.enabled, frequency: pref.frequency, updatedAt: new Date() },
      })
    ))

    const updated = await db
      .select()
      .from(emailPreferences)
      .where(and(eq(emailPreferences.memberId, member.id), eq(emailPreferences.tenantId, tenantId)))

    return c.json({ data: updated })
  })

  // ─── POST /api/me/email-preferences/unsubscribe ───────────────────────────────
  // One-click unsubscribe via signed token (CAN-SPAM compliance)
  app.post('/api/me/email-preferences/unsubscribe', async (c) => {
    const token = c.req.query('token') ?? ''
    const [memberId, signature] = token.split('.')
    if (!memberId || !signature) return c.json({ error: 'Invalid token' }, 400)

    const secret = c.env.SUPABASE_JWT_SECRET
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const tenantId = c.get('tenantId')
    const expectedSig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${memberId}:${tenantId}`))
    const expectedHex = Array.from(new Uint8Array(expectedSig)).map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature !== expectedHex) return c.json({ error: 'Invalid token' }, 400)

    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    // Set all preferences to never for this member
    await db.update(emailPreferences)
      .set({ enabled: false, frequency: 'never', updatedAt: new Date() })
      .where(and(eq(emailPreferences.memberId, memberId), eq(emailPreferences.tenantId, tenantId)))

    return c.json({ data: { ok: true, message: 'Unsubscribed from all email notifications' } })
  })

  // ─── PATCH /api/admin/members/:id/role ───────────────────────────────────────
  // Change a member's role (org_admin only)
  app.patch('/api/admin/members/:id/role', requireAuth('org_admin'), zValidator('json', z.object({
    role: z.enum(['guest', 'member', 'moderator', 'org_admin']),
  })), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const memberId = c.req.param('id')
    const { role } = c.req.valid('json')

    const existing = await db.query.members.findFirst({
      where: and(eq(members.id, memberId), eq(members.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Member not found' }, 404)

    const [updated] = await db
      .update(members)
      .set({ role })
      .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })
}
