import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { getClient } from '@osc/db'
import {
  members,
  forumThreads,
  forumPosts,
  ideas,
  events as eventsTable,
  auditLogs,
  contentReports,
} from '@osc/db/schema'
import { eq, and, desc, gte, sql, count } from 'drizzle-orm'

// ─── Validators ───────────────────────────────────────────────────────────────

const reportSchema = z.object({
  contentType: z.enum(['thread', 'post', 'idea', 'comment', 'chat_message']),
  contentId: z.string().uuid(),
  contentPreview: z.string().max(500).optional(),
  contentAuthorName: z.string().max(200).optional(),
  reason: z.enum(['spam', 'harassment', 'hate_speech', 'misinformation', 'off_topic', 'other']),
  notes: z.string().max(1000).optional(),
})

const resolveReportSchema = z.object({
  status: z.enum(['removed', 'dismissed']),
})

const auditLogSchema = z.object({
  action: z.string().min(1),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

// ─── Route registration ───────────────────────────────────────────────────────

export function registerAdminRoutes(app: Hono<HonoEnv>) {
  // ─── GET /api/admin/analytics ─────────────────────────────────────────────────
  // Member growth + content activity over the last N days (for charts)
  app.get('/api/admin/analytics', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const { days = '30' } = c.req.query()
    const daysNum = Math.min(90, Math.max(7, Number(days)))

    const since = new Date()
    since.setDate(since.getDate() - daysNum)
    since.setHours(0, 0, 0, 0)

    // Generate day series + member join counts in one go via SQL
    const memberGrowthRows = await db
      .select({
        day: sql<string>`date_trunc('day', ${members.createdAt})::date::text`,
        count: sql<number>`count(*)`,
      })
      .from(members)
      .where(and(eq(members.tenantId, tenantId), gte(members.createdAt, since)))
      .groupBy(sql`date_trunc('day', ${members.createdAt})`)
      .orderBy(sql`date_trunc('day', ${members.createdAt})`)

    // Content activity: forum posts per day
    const postActivityRows = await db
      .select({
        day: sql<string>`date_trunc('day', ${forumPosts.createdAt})::date::text`,
        count: sql<number>`count(*)`,
      })
      .from(forumPosts)
      .where(and(eq(forumPosts.tenantId, tenantId), gte(forumPosts.createdAt, since)))
      .groupBy(sql`date_trunc('day', ${forumPosts.createdAt})`)
      .orderBy(sql`date_trunc('day', ${forumPosts.createdAt})`)

    // Build day buckets for the full range
    const dayMap = new Map<string, { members: number; posts: number }>()
    for (let i = 0; i < daysNum; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      dayMap.set(key, { members: 0, posts: 0 })
    }
    for (const row of memberGrowthRows) {
      const key = row.day.slice(0, 10)
      const existing = dayMap.get(key)
      if (existing) existing.members = Number(row.count)
    }
    for (const row of postActivityRows) {
      const key = row.day.slice(0, 10)
      const existing = dayMap.get(key)
      if (existing) existing.posts = Number(row.count)
    }

    const timeline = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      members: data.members,
      posts: data.posts,
    }))

    // Cumulative member count at the start of the period
    const [baseRow] = await db
      .select({ cnt: count() })
      .from(members)
      .where(and(eq(members.tenantId, tenantId), sql`${members.createdAt} < ${since}`))

    const baseCount = Number(baseRow?.cnt ?? 0)

    // Top contributors: most active posters this period
    const topContributors = await db
      .select({
        authorId: forumPosts.authorId,
        authorName: members.displayName,
        avatarUrl: members.avatarUrl,
        posts: sql<number>`count(*)`,
      })
      .from(forumPosts)
      .innerJoin(members, eq(forumPosts.authorId, members.id))
      .where(and(eq(forumPosts.tenantId, tenantId), gte(forumPosts.createdAt, since)))
      .groupBy(forumPosts.authorId, members.displayName, members.avatarUrl)
      .orderBy(desc(sql`count(*)`))
      .limit(5)

    return c.json({
      data: {
        timeline,
        baseCount,
        days: daysNum,
        topContributors: topContributors.map((r) => ({
          memberId: r.authorId,
          name: r.authorName,
          avatarUrl: r.avatarUrl ?? null,
          posts: Number(r.posts),
        })),
      },
    })
  })

  // ─── GET /api/admin/audit-log ─────────────────────────────────────────────────
  app.get('/api/admin/audit-log', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const { limit = '50', before } = c.req.query()
    const limitNum = Math.min(100, Math.max(1, Number(limit)))

    const conditions = [eq(auditLogs.tenantId, tenantId)]
    if (before) {
      conditions.push(sql`${auditLogs.createdAt} < ${new Date(before)}`)
    }

    const rows = await db
      .select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limitNum)

    return c.json({ data: rows })
  })

  // ─── POST /api/admin/audit-log ────────────────────────────────────────────────
  // Internal — called by route handlers when admins perform actions
  app.post('/api/admin/audit-log', requireAuth('org_admin'), zValidator('json', auditLogSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const { action, resourceType, resourceId, metadata } = c.req.valid('json')

    const [row] = await db.insert(auditLogs).values({
      tenantId,
      actorId: member.id,
      actorName: member.displayName,
      action,
      ...(resourceType !== undefined ? { resourceType } : {}),
      ...(resourceId !== undefined ? { resourceId } : {}),
      metadata: metadata ?? {},
    }).returning()

    return c.json({ data: row }, 201)
  })

  // ─── GET /api/admin/reports ───────────────────────────────────────────────────
  app.get('/api/admin/reports', requireAuth('moderator'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const { status = 'pending', limit = '20' } = c.req.query()
    const limitNum = Math.min(100, Number(limit))

    const rows = await db
      .select()
      .from(contentReports)
      .where(and(
        eq(contentReports.tenantId, tenantId),
        eq(contentReports.status, status as 'pending' | 'reviewing' | 'removed' | 'dismissed'),
      ))
      .orderBy(desc(contentReports.createdAt))
      .limit(limitNum)

    return c.json({ data: rows })
  })

  // ─── POST /api/reports ────────────────────────────────────────────────────────
  // Members submit reports on content
  app.post('/api/reports', requireAuth(), zValidator('json', reportSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const body = c.req.valid('json')

    const [created] = await db.insert(contentReports).values({
      tenantId,
      reporterId: member.id,
      contentType: body.contentType,
      contentId: body.contentId,
      ...(body.contentPreview !== undefined ? { contentPreview: body.contentPreview } : {}),
      ...(body.contentAuthorName !== undefined ? { contentAuthorName: body.contentAuthorName } : {}),
      reason: body.reason,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    }).returning()

    // Queue AI analysis (non-blocking)
    if (c.env.AI && created?.id) {
      c.executionCtx.waitUntil(
        analyseWithAI(c.env.AI, db, created.id, body.contentPreview ?? '')
      )
    }

    return c.json({ data: { id: created?.id } }, 201)
  })

  // ─── PATCH /api/admin/reports/:id ────────────────────────────────────────────
  app.patch('/api/admin/reports/:id', requireAuth('moderator'), zValidator('json', resolveReportSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const reportId = c.req.param('id')
    const { status } = c.req.valid('json')

    const existing = await db.query.contentReports.findFirst({
      where: and(eq(contentReports.id, reportId), eq(contentReports.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Report not found' }, 404)

    const [updated] = await db
      .update(contentReports)
      .set({ status, resolvedBy: member.id, resolvedAt: new Date() })
      .where(eq(contentReports.id, reportId))
      .returning()

    // Write audit log
    await db.insert(auditLogs).values({
      tenantId,
      actorId: member.id,
      actorName: member.displayName,
      action: `report.${status}`,
      resourceType: 'content_report',
      resourceId: reportId,
      metadata: { contentType: existing.contentType, contentId: existing.contentId },
    })

    return c.json({ data: updated })
  })
}

// ─── AI moderation helper ─────────────────────────────────────────────────────

type DrizzleClient = ReturnType<typeof getClient>

async function analyseWithAI(
  ai: Ai,
  db: DrizzleClient,
  reportId: string,
  text: string,
): Promise<void> {
  if (!text.trim()) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (ai as any).run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'You are a content moderation assistant. Classify the following text as: "safe", "unsafe", or "uncertain". Reply with ONLY a JSON object: {"flag": "safe"|"unsafe"|"uncertain", "reasoning": "<one sentence>"}.',
        },
        { role: 'user', content: text.slice(0, 1000) },
      ],
    }) as { response: string }

    const parsed = JSON.parse(result.response) as { flag: string; reasoning: string }
    await db.update(contentReports)
      .set({ aiFlag: parsed.flag, aiReasoning: parsed.reasoning })
      .where(eq(contentReports.id, reportId))
  } catch {
    // AI analysis is best-effort — don't fail the request
  }
}
