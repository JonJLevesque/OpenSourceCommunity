import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import { webinars, webinarRegistrations, webinarQa, webinarPolls } from '@osc/db/schema'
import { eq, and, desc, asc, sql, ne } from 'drizzle-orm'

export function registerWebinarsRoutes(app: Hono<HonoEnv>) {
  const router = new Hono<HonoEnv>()
  router.use('*', requireModule('webinars'))

  // ---------------------------------------------------------------------------
  // GET /api/webinars
  // ---------------------------------------------------------------------------
  router.get('/', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const { status, page = '1', limit = '20' } = c.req.query()

    const offset = (Number(page) - 1) * Number(limit)
    const isAdmin = member?.role === 'org_admin'

    const conditions = [eq(webinars.tenantId, tenantId)]

    if (status) {
      conditions.push(eq(webinars.status, status as 'draft' | 'scheduled' | 'live' | 'ended'))
    } else if (!isAdmin) {
      conditions.push(ne(webinars.status, 'draft'))
    }

    const orderBy = status === 'ended' ? desc(webinars.scheduledAt) : asc(webinars.scheduledAt)

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          webinar: webinars,
          registrationCount: sql<number>`count(${webinarRegistrations.id})`.as('registration_count'),
        })
        .from(webinars)
        .leftJoin(
          webinarRegistrations,
          and(eq(webinarRegistrations.webinarId, webinars.id), eq(webinarRegistrations.tenantId, tenantId)),
        )
        .where(and(...conditions))
        .groupBy(webinars.id)
        .orderBy(orderBy)
        .limit(Number(limit))
        .offset(offset),
      db.select({ total: sql<number>`count(*)` }).from(webinars).where(and(...conditions)),
    ])

    const total = totalResult[0]?.total ?? 0
    return c.json({ data: rows, total: Number(total) })
  })

  // ---------------------------------------------------------------------------
  // GET /api/webinars/:id
  // ---------------------------------------------------------------------------
  router.get('/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const webinarId = c.req.param('id')
    const isAdmin = member?.role === 'org_admin'

    const webinar = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!webinar) return c.json({ error: 'Webinar not found' }, 404)
    if (webinar.status === 'draft' && !isAdmin) return c.json({ error: 'Webinar not found' }, 404)

    const [regCountRow] = await db
      .select({ registrationCount: sql<number>`count(*)` })
      .from(webinarRegistrations)
      .where(and(eq(webinarRegistrations.webinarId, webinarId), eq(webinarRegistrations.tenantId, tenantId)))
    const registrationCount = regCountRow?.registrationCount ?? 0

    let isRegistered = false
    if (member) {
      const existing = await db.query.webinarRegistrations.findFirst({
        where: and(
          eq(webinarRegistrations.webinarId, webinarId),
          eq(webinarRegistrations.tenantId, tenantId),
          eq(webinarRegistrations.memberId, member.id),
        ),
      })
      isRegistered = !!existing
    }

    return c.json({ data: { ...webinar, registrationCount: Number(registrationCount), isRegistered } })
  })

  // ---------------------------------------------------------------------------
  // POST /api/webinars — create webinar (org_admin)
  // ---------------------------------------------------------------------------
  const createWebinarSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    scheduledAt: z.string().datetime(),
    durationMinutes: z.number().int().positive(),
    streamUrl: z.string().url().optional(),
    maxAttendees: z.number().int().positive().optional(),
  })

  router.post('/', requireAuth('org_admin'), zValidator('json', createWebinarSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const data = c.req.valid('json')

    const [webinar] = await db
      .insert(webinars)
      .values({
        tenantId,
        creatorId: member.id,
        title: data.title,
        description: data.description ?? null,
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: data.durationMinutes,
        streamUrl: data.streamUrl ?? null,
        maxAttendees: data.maxAttendees ?? null,
        status: 'draft',
      })
      .returning()

    return c.json({ data: webinar }, 201)
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/webinars/:id — update webinar (org_admin)
  // ---------------------------------------------------------------------------
  const updateWebinarSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().optional(),
    scheduledAt: z.string().datetime().optional(),
    durationMinutes: z.number().int().positive().optional(),
    streamUrl: z.string().url().optional(),
    maxAttendees: z.number().int().positive().optional(),
    status: z.enum(['draft', 'scheduled', 'live', 'ended']).optional(),
  })

  router.patch('/:id', requireAuth('org_admin'), zValidator('json', updateWebinarSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const webinarId = c.req.param('id')
    const data = c.req.valid('json')

    const existing = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Webinar not found' }, 404)

    const updateValues: Record<string, unknown> = {}
    if (data.title !== undefined) updateValues.title = data.title
    if (data.description !== undefined) updateValues.description = data.description
    if (data.scheduledAt !== undefined) updateValues.scheduledAt = new Date(data.scheduledAt)
    if (data.durationMinutes !== undefined) updateValues.durationMinutes = data.durationMinutes
    if (data.streamUrl !== undefined) updateValues.streamUrl = data.streamUrl
    if (data.maxAttendees !== undefined) updateValues.maxAttendees = data.maxAttendees
    if (data.status !== undefined) updateValues.status = data.status

    const [updated] = await db
      .update(webinars)
      .set(updateValues)
      .where(and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // POST /api/webinars/:id/register
  // ---------------------------------------------------------------------------
  router.post('/:id/register', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const webinarId = c.req.param('id')

    const webinar = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!webinar) return c.json({ error: 'Webinar not found' }, 404)
    if (webinar.status === 'live' || webinar.status === 'ended') {
      return c.json({ error: 'Cannot register for a webinar that is live or ended' }, 400)
    }

    const existing = await db.query.webinarRegistrations.findFirst({
      where: and(
        eq(webinarRegistrations.webinarId, webinarId),
        eq(webinarRegistrations.tenantId, tenantId),
        eq(webinarRegistrations.memberId, member.id),
      ),
    })

    if (existing) return c.json({ error: 'Already registered for this webinar' }, 409)

    if (webinar.maxAttendees != null) {
      const [capacityRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(webinarRegistrations)
        .where(and(eq(webinarRegistrations.webinarId, webinarId), eq(webinarRegistrations.tenantId, tenantId)))
      if (Number(capacityRow?.count ?? 0) >= webinar.maxAttendees) {
        return c.json({ error: 'Webinar is at full capacity' }, 400)
      }
    }

    const [registration] = await db
      .insert(webinarRegistrations)
      .values({ tenantId, webinarId, memberId: member.id })
      .returning()

    return c.json({ data: registration }, 201)
  })

  // ---------------------------------------------------------------------------
  // DELETE /api/webinars/:id/register — cancel registration
  // ---------------------------------------------------------------------------
  router.delete('/:id/register', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const webinarId = c.req.param('id')

    await db.delete(webinarRegistrations).where(
      and(
        eq(webinarRegistrations.webinarId, webinarId),
        eq(webinarRegistrations.tenantId, tenantId),
        eq(webinarRegistrations.memberId, member.id),
      ),
    )

    return c.json({ data: { cancelled: true } })
  })

  // ---------------------------------------------------------------------------
  // GET /api/webinars/:id/qa
  // ---------------------------------------------------------------------------
  router.get('/:id/qa', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const webinarId = c.req.param('id')

    const webinar = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!webinar) return c.json({ error: 'Webinar not found' }, 404)

    const questions = await db.query.webinarQa.findMany({
      where: and(eq(webinarQa.webinarId, webinarId), eq(webinarQa.tenantId, tenantId)),
      orderBy: [desc(webinarQa.upvotes), asc(webinarQa.createdAt)],
    })

    return c.json({ data: questions })
  })

  // ---------------------------------------------------------------------------
  // POST /api/webinars/:id/qa — submit question
  // ---------------------------------------------------------------------------
  const submitQuestionSchema = z.object({
    question: z.string().min(1).max(2000),
  })

  router.post('/:id/qa', requireAuth('member'), zValidator('json', submitQuestionSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const webinarId = c.req.param('id')
    const { question } = c.req.valid('json')

    const webinar = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!webinar) return c.json({ error: 'Webinar not found' }, 404)

    const [qa] = await db
      .insert(webinarQa)
      .values({ tenantId, webinarId, memberId: member.id, question })
      .returning()

    return c.json({ data: qa }, 201)
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/webinars/:id/qa/:qaId — answer a question (moderator+)
  // ---------------------------------------------------------------------------
  const answerQuestionSchema = z.object({ answer: z.string().min(1) })

  router.patch('/:id/qa/:qaId', requireAuth('moderator'), zValidator('json', answerQuestionSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const webinarId = c.req.param('id')
    const qaId = c.req.param('qaId')
    const { answer } = c.req.valid('json')

    const existing = await db.query.webinarQa.findFirst({
      where: and(eq(webinarQa.id, qaId), eq(webinarQa.webinarId, webinarId), eq(webinarQa.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Question not found' }, 404)

    const [updated] = await db
      .update(webinarQa)
      .set({ answer, answeredBy: member.id, answeredAt: new Date() })
      .where(and(eq(webinarQa.id, qaId), eq(webinarQa.webinarId, webinarId), eq(webinarQa.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // POST /api/webinars/:id/qa/:qaId/upvote — increment upvotes
  // ---------------------------------------------------------------------------
  router.post('/:id/qa/:qaId/upvote', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const webinarId = c.req.param('id')
    const qaId = c.req.param('qaId')

    const existing = await db.query.webinarQa.findFirst({
      where: and(eq(webinarQa.id, qaId), eq(webinarQa.webinarId, webinarId), eq(webinarQa.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Question not found' }, 404)

    const [updated] = await db
      .update(webinarQa)
      .set({ upvotes: sql`${webinarQa.upvotes} + 1` })
      .where(and(eq(webinarQa.id, qaId), eq(webinarQa.webinarId, webinarId), eq(webinarQa.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // GET /api/webinars/:id/polls
  // ---------------------------------------------------------------------------
  router.get('/:id/polls', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const webinarId = c.req.param('id')

    const webinar = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!webinar) return c.json({ error: 'Webinar not found' }, 404)

    const polls = await db.query.webinarPolls.findMany({
      where: and(eq(webinarPolls.webinarId, webinarId), eq(webinarPolls.tenantId, tenantId)),
      orderBy: [asc(webinarPolls.createdAt)],
    })

    return c.json({ data: polls })
  })

  // ---------------------------------------------------------------------------
  // POST /api/webinars/:id/polls — create poll (org_admin)
  // ---------------------------------------------------------------------------
  const createPollSchema = z.object({
    question: z.string().min(1).max(500),
    options: z.array(z.string().min(1)).min(2).max(10),
  })

  router.post('/:id/polls', requireAuth('org_admin'), zValidator('json', createPollSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const webinarId = c.req.param('id')
    const data = c.req.valid('json')

    const webinar = await db.query.webinars.findFirst({
      where: and(eq(webinars.id, webinarId), eq(webinars.tenantId, tenantId)),
    })

    if (!webinar) return c.json({ error: 'Webinar not found' }, 404)

    const [poll] = await db
      .insert(webinarPolls)
      .values({ tenantId, webinarId, question: data.question, options: data.options, isActive: false })
      .returning()

    return c.json({ data: poll }, 201)
  })

  app.route('/api/webinars', router)
}
