import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import { siKeywordGroups, siMentions, siAlerts, siAlertConfigs, members } from '@osc/db/schema'
import { eq, and, desc, sql, gte, count, isNull, ilike } from 'drizzle-orm'

// ─── Validators ─────────────────────────────────────────────────────────────

const updateMentionStatusSchema = z.object({
  status: z.enum(['reviewed', 'actioned']),
})

const updateKeywordGroupSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  terms: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

const createKeywordGroupSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['brand', 'competitor', 'custom']).default('custom'),
  terms: z.array(z.string()).min(1),
  platforms: z.array(z.string()).min(1),
})

// ─── Route Registration ───────────────────────────────────────────────────────

export function registerSocialIntelRoutes(app: Hono<HonoEnv>) {
  const router = new Hono<HonoEnv>()
  router.use('*', requireModule('social-intel'))

  // ─── GET /api/intelligence/mentions ─────────────────────────────────────────
  router.get('/mentions', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')

    const { page = '1', limit = '20', platform, sentiment, status = 'new', author } = c.req.query()

    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const offset = (pageNum - 1) * limitNum

    const conditions = [
      eq(siMentions.tenantId, tenantId),
      eq(siMentions.status, status as 'new' | 'reviewed' | 'actioned'),
    ]

    if (platform) conditions.push(eq(siMentions.platform, platform))
    if (sentiment) {
      conditions.push(eq(siMentions.sentiment, sentiment as 'positive' | 'negative' | 'neutral' | 'mixed'))
    }
    if (author) conditions.push(ilike(siMentions.authorHandle, author))

    const whereClause = and(...conditions)

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: siMentions.id,
          tenantId: siMentions.tenantId,
          keywordGroupId: siMentions.keywordGroupId,
          platform: siMentions.platform,
          externalId: siMentions.externalId,
          authorHandle: siMentions.authorHandle,
          authorUrl: siMentions.authorUrl,
          contentUrl: siMentions.contentUrl,
          textPreview: siMentions.textPreview,
          publishedAt: siMentions.publishedAt,
          sentiment: siMentions.sentiment,
          sentimentScore: siMentions.sentimentScore,
          status: siMentions.status,
          engagementCount: siMentions.engagementCount,
          linkedMemberId: siMentions.linkedMemberId,
          linkedMemberName: members.displayName,
          linkedMemberAvatarUrl: members.avatarUrl,
          collectedAt: siMentions.collectedAt,
        })
        .from(siMentions)
        .leftJoin(members, eq(siMentions.linkedMemberId, members.id))
        .where(whereClause)
        .orderBy(desc(siMentions.collectedAt))
        .limit(limitNum)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(siMentions).where(whereClause),
    ])

    return c.json({ data: rows, total: Number(countRows[0]?.count ?? 0), page: pageNum })
  })

  // ─── PATCH /api/intelligence/mentions/:id ────────────────────────────────────
  router.patch('/mentions/:id', requireAuth('moderator'), zValidator('json', updateMentionStatusSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const mentionId = c.req.param('id')
    const { status } = c.req.valid('json')

    const existing = await db.query.siMentions.findFirst({
      where: and(eq(siMentions.id, mentionId), eq(siMentions.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Mention not found' }, 404)

    const [updated] = await db
      .update(siMentions)
      .set({ status })
      .where(and(eq(siMentions.id, mentionId), eq(siMentions.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ─── GET /api/intelligence/sentiment ─────────────────────────────────────────
  router.get('/sentiment', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')

    const { days = '30' } = c.req.query()
    const daysNum = Math.min(365, Math.max(1, Number(days)))
    const since = new Date()
    since.setDate(since.getDate() - daysNum)

    const whereClause = and(
      eq(siMentions.tenantId, tenantId),
      gte(siMentions.collectedAt, since),
    )

    // Totals by sentiment
    const sentimentRows = await db
      .select({ sentiment: siMentions.sentiment, cnt: sql<number>`count(*)` })
      .from(siMentions)
      .where(whereClause)
      .groupBy(siMentions.sentiment)

    const sentimentMap: Record<string, number> = {}
    for (const row of sentimentRows) {
      sentimentMap[row.sentiment] = Number(row.cnt)
    }
    const pos = sentimentMap['positive'] ?? 0
    const neg = sentimentMap['negative'] ?? 0
    const neu = sentimentMap['neutral'] ?? 0
    const totalMentions = pos + neg + neu
    const netSentimentScore = totalMentions > 0
      ? ((pos - neg) / totalMentions) * 100
      : 0

    // Platform breakdown: group by (platform, sentiment)
    const platformSentimentRows = await db
      .select({ platform: siMentions.platform, sentiment: siMentions.sentiment, cnt: sql<number>`count(*)` })
      .from(siMentions)
      .where(whereClause)
      .groupBy(siMentions.platform, siMentions.sentiment)

    const platformMap = new Map<string, { positive: number; negative: number; neutral: number; total: number }>()
    for (const row of platformSentimentRows) {
      const entry = platformMap.get(row.platform) ?? { positive: 0, negative: 0, neutral: 0, total: 0 }
      const n = Number(row.cnt)
      entry.total += n
      if (row.sentiment === 'positive') entry.positive += n
      else if (row.sentiment === 'negative') entry.negative += n
      else entry.neutral += n
      platformMap.set(row.platform, entry)
    }

    const platformBreakdown = Array.from(platformMap.entries()).map(([platform, s]) => ({
      platform,
      mentions: s.total,
      positivePercent: s.total > 0 ? (s.positive / s.total) * 100 : 0,
      negativePercent: s.total > 0 ? (s.negative / s.total) * 100 : 0,
      neutralPercent: s.total > 0 ? (s.neutral / s.total) * 100 : 0,
    }))

    // Member vs non-member breakdown
    const memberBreakdownRows = await db
      .select({
        isMember: sql<string>`(${siMentions.linkedMemberId} IS NOT NULL)`,
        sentiment: siMentions.sentiment,
        cnt: sql<number>`count(*)`,
      })
      .from(siMentions)
      .where(whereClause)
      .groupBy(sql`(${siMentions.linkedMemberId} IS NOT NULL)`, siMentions.sentiment)

    const mBreak = { memberMentions: 0, memberPositive: 0, memberNegative: 0, memberNeutral: 0 }
    const nmBreak = { nonMemberMentions: 0, nonMemberPositive: 0, nonMemberNegative: 0, nonMemberNeutral: 0 }
    for (const row of memberBreakdownRows) {
      const n = Number(row.cnt)
      if (row.isMember === 't' || row.isMember === 'true') {
        mBreak.memberMentions += n
        if (row.sentiment === 'positive') mBreak.memberPositive += n
        else if (row.sentiment === 'negative') mBreak.memberNegative += n
        else mBreak.memberNeutral += n
      } else {
        nmBreak.nonMemberMentions += n
        if (row.sentiment === 'positive') nmBreak.nonMemberPositive += n
        else if (row.sentiment === 'negative') nmBreak.nonMemberNegative += n
        else nmBreak.nonMemberNeutral += n
      }
    }

    // Fix advocatesIdentified — count distinct linked members with positive sentiment
    const advocateRows = await db
      .selectDistinct({ memberId: siMentions.linkedMemberId })
      .from(siMentions)
      .where(and(whereClause, sql`${siMentions.linkedMemberId} IS NOT NULL`, eq(siMentions.sentiment, 'positive')))

    const advocatesIdentified = advocateRows.length

    // Daily sentiment trend
    const trendRows = await db
      .select({
        day: sql<string>`date_trunc('day', ${siMentions.collectedAt})::date`,
        sentiment: siMentions.sentiment,
        cnt: sql<number>`count(*)`,
      })
      .from(siMentions)
      .where(whereClause)
      .groupBy(sql`date_trunc('day', ${siMentions.collectedAt})::date`, siMentions.sentiment)
      .orderBy(sql`date_trunc('day', ${siMentions.collectedAt})::date`)

    const trendMap = new Map<string, { positive: number; negative: number; neutral: number }>()
    for (const row of trendRows) {
      const entry = trendMap.get(row.day) ?? { positive: 0, negative: 0, neutral: 0 }
      const n = Number(row.cnt)
      if (row.sentiment === 'positive') entry.positive += n
      else if (row.sentiment === 'negative') entry.negative += n
      else entry.neutral += n
      trendMap.set(row.day, entry)
    }
    const trend = Array.from(trendMap.entries()).map(([date, s]) => ({ date, ...s }))

    return c.json({
      data: {
        totalMentions,
        netSentimentScore,
        advocatesIdentified,
        platformBreakdown,
        memberSentiment: { ...mBreak, ...nmBreak },
        trend,
      },
    })
  })

  // ─── GET /api/intelligence/alerts ────────────────────────────────────────────
  router.get('/alerts', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const { status = 'open' } = c.req.query()

    const rows = await db
      .select()
      .from(siAlerts)
      .where(and(eq(siAlerts.tenantId, tenantId), eq(siAlerts.status, status)))
      .orderBy(desc(siAlerts.triggeredAt))

    return c.json({ data: rows })
  })

  // ─── PATCH /api/intelligence/alerts/:id/resolve ───────────────────────────────
  router.patch('/alerts/:id/resolve', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const alertId = c.req.param('id')

    const existing = await db.query.siAlerts.findFirst({
      where: and(eq(siAlerts.id, alertId), eq(siAlerts.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Alert not found' }, 404)
    if (existing.status === 'resolved') return c.json({ error: 'Alert is already resolved' }, 409)

    const [updated] = await db
      .update(siAlerts)
      .set({ status: 'resolved', acknowledgedAt: new Date(), acknowledgedBy: member.id })
      .where(and(eq(siAlerts.id, alertId), eq(siAlerts.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ─── GET /api/intelligence/keyword-groups ─────────────────────────────────────
  router.get('/keyword-groups', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')

    const rows = await db
      .select()
      .from(siKeywordGroups)
      .where(eq(siKeywordGroups.tenantId, tenantId))
      .orderBy(desc(siKeywordGroups.createdAt))

    return c.json({ data: rows })
  })

  // ─── POST /api/intelligence/keyword-groups ────────────────────────────────────
  router.post('/keyword-groups', requireAuth('org_admin'), zValidator('json', createKeywordGroupSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const { name, type, terms, platforms } = c.req.valid('json')

    const [created] = await db
      .insert(siKeywordGroups)
      .values({ tenantId, name, type, terms, platforms, isActive: true })
      .returning()

    return c.json({ data: created }, 201)
  })

  // ─── PATCH /api/intelligence/keyword-groups/:id ───────────────────────────────
  router.patch('/keyword-groups/:id', requireAuth('org_admin'), zValidator('json', updateKeywordGroupSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const groupId = c.req.param('id')
    const body = c.req.valid('json')

    const existing = await db.query.siKeywordGroups.findFirst({
      where: and(eq(siKeywordGroups.id, groupId), eq(siKeywordGroups.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Keyword group not found' }, 404)

    const patch: Record<string, unknown> = {}
    if (body.name !== undefined) patch.name = body.name
    if (body.terms !== undefined) patch.terms = body.terms
    if (body.platforms !== undefined) patch.platforms = body.platforms
    if (body.isActive !== undefined) patch.isActive = body.isActive

    const [updated] = await db
      .update(siKeywordGroups)
      .set(patch)
      .where(and(eq(siKeywordGroups.id, groupId), eq(siKeywordGroups.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ─── DELETE /api/intelligence/keyword-groups/:id ──────────────────────────────
  router.delete('/keyword-groups/:id', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const groupId = c.req.param('id')

    const existing = await db.query.siKeywordGroups.findFirst({
      where: and(eq(siKeywordGroups.id, groupId), eq(siKeywordGroups.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Keyword group not found' }, 404)

    await db.delete(siKeywordGroups)
      .where(and(eq(siKeywordGroups.id, groupId), eq(siKeywordGroups.tenantId, tenantId)))

    return c.json({ data: { deleted: true } })
  })

  // ─── POST /api/intelligence/link-mentions ────────────────────────────────────
  router.post('/link-mentions', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')

    // 1. Fetch all members with non-empty socialHandles
    const membersWithHandles = await db
      .select({ id: members.id, socialHandles: members.socialHandles })
      .from(members)
      .where(and(
        eq(members.tenantId, tenantId),
        sql`${members.socialHandles} != '{}'::jsonb`,
      ))

    // 2. Build lookup: "platform:handle" -> memberId
    const lookup = new Map<string, string>()
    for (const m of membersWithHandles) {
      const handles = m.socialHandles as Record<string, string> | null
      if (!handles) continue
      for (const [platform, handle] of Object.entries(handles)) {
        if (handle) lookup.set(`${platform}:${handle.toLowerCase()}`, m.id)
      }
    }

    if (lookup.size === 0) return c.json({ data: { matched: 0, unmatched: 0 } })

    // 3. Fetch unlinked mentions for this tenant
    const unlinked = await db
      .select({ id: siMentions.id, platform: siMentions.platform, authorHandle: siMentions.authorHandle })
      .from(siMentions)
      .where(and(eq(siMentions.tenantId, tenantId), isNull(siMentions.linkedMemberId)))

    // 4. Match and update
    let matched = 0
    for (const mention of unlinked) {
      const key = `${mention.platform}:${mention.authorHandle.toLowerCase()}`
      const memberId = lookup.get(key)
      if (memberId) {
        await db.update(siMentions)
          .set({ linkedMemberId: memberId })
          .where(eq(siMentions.id, mention.id))
        matched++
      }
    }

    return c.json({ data: { matched, unmatched: unlinked.length - matched } })
  })

  // ─── GET /api/intelligence/alert-config ──────────────────────────────────────
  router.get('/alert-config', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')

    const [row] = await db
      .select()
      .from(siAlertConfigs)
      .where(eq(siAlertConfigs.tenantId, tenantId))
      .limit(1)

    // Return defaults if not yet configured
    const config = row ?? {
      notificationChannels: { email: true, slack: false, inApp: true },
    }

    return c.json({ data: config })
  })

  // ─── PATCH /api/intelligence/alert-config ─────────────────────────────────────
  router.patch('/alert-config', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const body = await c.req.json() as {
      notificationChannels?: { email?: boolean; slack?: boolean; inApp?: boolean }
    }

    const [existing] = await db
      .select()
      .from(siAlertConfigs)
      .where(eq(siAlertConfigs.tenantId, tenantId))
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(siAlertConfigs)
        .set({ notificationChannels: body.notificationChannels, updatedAt: new Date() })
        .where(eq(siAlertConfigs.tenantId, tenantId))
        .returning()
      return c.json({ data: updated })
    } else {
      const [created] = await db
        .insert(siAlertConfigs)
        .values({ tenantId, notificationChannels: body.notificationChannels })
        .returning()
      return c.json({ data: created }, 201)
    }
  })

  app.route('/api/intelligence', router)
}
