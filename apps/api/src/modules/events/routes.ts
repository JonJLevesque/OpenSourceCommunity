import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import { events, eventRsvps, eventRecordings } from '@osc/db/schema'
import { eq, and, desc, asc, gt, sql } from 'drizzle-orm'
import { Events } from '@osc/core'
import { emitEvent } from '../../lib/emit-event'

export function registerEventsRoutes(app: Hono<HonoEnv>) {
  const eventsRouter = new Hono<HonoEnv>()
  eventsRouter.use('*', requireModule('events'))

  // ---------------------------------------------------------------------------
  // GET /api/events — list upcoming published events
  // ---------------------------------------------------------------------------
  eventsRouter.get('/', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const { view = 'list', page = '1', limit = '20' } = c.req.query()

    const offset = (Number(page) - 1) * Number(limit)
    const now = new Date()

    const rows = await db
      .select({
        event: events,
        rsvpCount: sql<number>`count(${eventRsvps.id})`.as('rsvp_count'),
      })
      .from(events)
      .leftJoin(eventRsvps, and(eq(eventRsvps.eventId, events.id), eq(eventRsvps.tenantId, tenantId)))
      .where(
        and(
          eq(events.tenantId, tenantId),
          eq(events.status, 'published'),
          gt(events.startsAt, now),
        ),
      )
      .groupBy(events.id)
      .orderBy(asc(events.startsAt))
      .limit(Number(limit))
      .offset(offset)

    return c.json({ data: rows, meta: { view, page: Number(page), limit: Number(limit) } })
  })

  // ---------------------------------------------------------------------------
  // GET /api/events/:id — single event with RSVPs and recordings
  // ---------------------------------------------------------------------------
  eventsRouter.get('/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const eventId = c.req.param('id')

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.tenantId, tenantId)),
    })

    if (!event) return c.json({ error: 'Event not found' }, 404)

    const member = c.get('member')

    const [rsvps, recordings] = await Promise.all([
      db.query.eventRsvps.findMany({
        where: and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.tenantId, tenantId)),
      }),
      db.query.eventRecordings.findMany({
        where: and(eq(eventRecordings.eventId, eventId), eq(eventRecordings.tenantId, tenantId)),
        orderBy: [asc(eventRecordings.createdAt)],
      }),
    ])

    const rsvpGoing = rsvps.filter(r => r.status === 'going').length
    const rsvpInterested = rsvps.filter(r => r.status === 'interested').length
    const myRsvpStatus = member ? (rsvps.find(r => r.memberId === member.id)?.status ?? null) : null

    return c.json({ data: { event, recordings, rsvpGoing, rsvpInterested, myRsvpStatus } })
  })

  // ---------------------------------------------------------------------------
  // POST /api/events — create event (moderator or org_admin)
  // ---------------------------------------------------------------------------
  const createEventSchema = z.object({
    title: z.string().min(1).max(500),
    body: z.record(z.unknown()).optional(),
    location: z.object({
      type: z.string(),
      url: z.string().url().optional(),
      address: z.string().optional(),
    }).optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().min(1),
    capacity: z.number().int().positive().optional(),
    coverImageUrl: z.string().url().optional(),
    tags: z.array(z.string()).default([]),
    isRecurring: z.boolean().default(false),
    recurrenceRule: z.string().optional(),
  })

  eventsRouter.post('/', requireAuth('moderator'), zValidator('json', createEventSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const data = c.req.valid('json')

    const [event] = await db.insert(events).values({
      tenantId,
      creatorId: member.id,
      title: data.title,
      body: data.body ?? null,
      location: data.location ?? null,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      timezone: data.timezone,
      capacity: data.capacity ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      tags: data.tags,
      isRecurring: data.isRecurring,
      recurrenceRule: data.recurrenceRule ?? null,
      status: 'draft',
    }).returning()

    return c.json({ data: event }, 201)
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/events/:id — update / publish event
  // ---------------------------------------------------------------------------
  const updateEventSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    body: z.record(z.unknown()).optional(),
    location: z.object({
      type: z.string(),
      url: z.string().url().optional(),
      address: z.string().optional(),
    }).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
    timezone: z.string().min(1).optional(),
    capacity: z.number().int().positive().optional(),
    coverImageUrl: z.string().url().optional(),
    tags: z.array(z.string()).optional(),
    isRecurring: z.boolean().optional(),
    recurrenceRule: z.string().optional(),
    status: z.enum(['draft', 'published', 'cancelled']).optional(),
  })

  eventsRouter.patch('/:id', requireAuth('moderator'), zValidator('json', updateEventSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const eventId = c.req.param('id')
    const data = c.req.valid('json')

    const existing = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Event not found' }, 404)

    const updateValues: Record<string, unknown> = {}
    if (data.title !== undefined) updateValues.title = data.title
    if (data.body !== undefined) updateValues.body = data.body
    if (data.location !== undefined) updateValues.location = data.location
    if (data.startsAt !== undefined) updateValues.startsAt = new Date(data.startsAt)
    if (data.endsAt !== undefined) updateValues.endsAt = new Date(data.endsAt)
    if (data.timezone !== undefined) updateValues.timezone = data.timezone
    if (data.capacity !== undefined) updateValues.capacity = data.capacity
    if (data.coverImageUrl !== undefined) updateValues.coverImageUrl = data.coverImageUrl
    if (data.tags !== undefined) updateValues.tags = data.tags
    if (data.isRecurring !== undefined) updateValues.isRecurring = data.isRecurring
    if (data.recurrenceRule !== undefined) updateValues.recurrenceRule = data.recurrenceRule
    if (data.status !== undefined) updateValues.status = data.status

    const [updated] = await db.update(events)
      .set(updateValues)
      .where(and(eq(events.id, eventId), eq(events.tenantId, tenantId)))
      .returning()

    if (data.status === 'published' && existing.status === 'draft') {
      await emitEvent(c, Events.EVENT_PUBLISHED, { tenantId, eventId, event: updated })
    }

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // POST /api/events/:id/rsvp — upsert RSVP
  // ---------------------------------------------------------------------------
  const rsvpSchema = z.object({
    status: z.enum(['going', 'interested', 'not_going']),
  })

  eventsRouter.post('/:id/rsvp', requireAuth('member'), zValidator('json', rsvpSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const eventId = c.req.param('id')
    const { status } = c.req.valid('json')

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.tenantId, tenantId)),
    })

    if (!event) return c.json({ error: 'Event not found' }, 404)

    const [rsvp] = await db
      .insert(eventRsvps)
      .values({ tenantId, eventId, memberId: member.id, status })
      .onConflictDoUpdate({
        target: [eventRsvps.tenantId, eventRsvps.eventId, eventRsvps.memberId],
        set: { status },
      })
      .returning()

    await emitEvent(c, Events.EVENT_RSVP, { tenantId, eventId, memberId: member.id, status })

    return c.json({ data: rsvp }, 201)
  })

  // ---------------------------------------------------------------------------
  // DELETE /api/events/:id/rsvp — cancel RSVP
  // ---------------------------------------------------------------------------
  eventsRouter.delete('/:id/rsvp', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const eventId = c.req.param('id')

    await db.delete(eventRsvps).where(
      and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.tenantId, tenantId),
        eq(eventRsvps.memberId, member.id),
      ),
    )

    return c.json({ data: { cancelled: true } })
  })

  // ---------------------------------------------------------------------------
  // POST /api/events/:id/recordings — add recording (org_admin)
  // ---------------------------------------------------------------------------
  const addRecordingSchema = z.object({
    title: z.string().min(1).max(500),
    videoUrl: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    durationSeconds: z.number().int().positive().optional(),
  })

  eventsRouter.post('/:id/recordings', requireAuth('org_admin'), zValidator('json', addRecordingSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const eventId = c.req.param('id')
    const data = c.req.valid('json')

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.tenantId, tenantId)),
    })

    if (!event) return c.json({ error: 'Event not found' }, 404)

    const [recording] = await db.insert(eventRecordings).values({
      tenantId,
      eventId,
      title: data.title,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl ?? null,
      durationSeconds: data.durationSeconds ?? null,
    }).returning()

    return c.json({ data: recording }, 201)
  })

  // ---------------------------------------------------------------------------
  // GET /api/events/:id/recordings — list recordings
  // ---------------------------------------------------------------------------
  eventsRouter.get('/:id/recordings', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const eventId = c.req.param('id')

    const event = await db.query.events.findFirst({
      where: and(eq(events.id, eventId), eq(events.tenantId, tenantId)),
    })

    if (!event) return c.json({ error: 'Event not found' }, 404)

    const recordings = await db.query.eventRecordings.findMany({
      where: and(eq(eventRecordings.eventId, eventId), eq(eventRecordings.tenantId, tenantId)),
      orderBy: [asc(eventRecordings.createdAt)],
    })

    return c.json({ data: recordings })
  })

  app.route('/api/events', eventsRouter)
}
