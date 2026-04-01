import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import { courses, courseLessons, courseEnrollments } from '@osc/db/schema'
import { eq, and, asc, sql, count } from 'drizzle-orm'

export function registerCoursesRoutes(app: Hono<HonoEnv>) {
  const coursesRouter = new Hono<HonoEnv>()
  coursesRouter.use('*', requireModule('courses'))

  // ---------------------------------------------------------------------------
  // GET /api/courses/my-enrollments — registered BEFORE /:id to avoid conflict
  // ---------------------------------------------------------------------------
  coursesRouter.get('/my-enrollments', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!

    const enrollments = await db
      .select({ enrollment: courseEnrollments, course: courses })
      .from(courseEnrollments)
      .innerJoin(courses, eq(courses.id, courseEnrollments.courseId))
      .where(and(eq(courseEnrollments.tenantId, tenantId), eq(courseEnrollments.memberId, member.id)))
      .orderBy(asc(courseEnrollments.createdAt))

    return c.json({ data: enrollments })
  })

  // ---------------------------------------------------------------------------
  // GET /api/courses — list courses
  // ---------------------------------------------------------------------------
  coursesRouter.get('/', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const { page = '1', limit = '20' } = c.req.query()

    const offset = (Number(page) - 1) * Number(limit)
    const isAdmin = member?.role === 'org_admin'

    const baseCondition = isAdmin
      ? eq(courses.tenantId, tenantId)
      : and(eq(courses.tenantId, tenantId), eq(courses.status, 'published'))

    const rows = await db
      .select({
        course: courses,
        lessonCount: sql<number>`count(distinct ${courseLessons.id})`.as('lesson_count'),
        enrollmentCount: sql<number>`count(distinct ${courseEnrollments.id})`.as('enrollment_count'),
      })
      .from(courses)
      .leftJoin(courseLessons, eq(courseLessons.courseId, courses.id))
      .leftJoin(courseEnrollments, eq(courseEnrollments.courseId, courses.id))
      .where(baseCondition)
      .groupBy(courses.id)
      .orderBy(asc(courses.createdAt))
      .limit(Number(limit))
      .offset(offset)

    const [totalRow] = await db.select({ total: count() }).from(courses).where(baseCondition)
    const total = totalRow?.total ?? 0

    return c.json({ data: rows, total })
  })

  // ---------------------------------------------------------------------------
  // GET /api/courses/:id — course with lessons and enrollment status
  // ---------------------------------------------------------------------------
  coursesRouter.get('/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const courseId = c.req.param('id')
    const isAdmin = member?.role === 'org_admin'

    const course = await db.query.courses.findFirst({
      where: isAdmin
        ? and(eq(courses.id, courseId), eq(courses.tenantId, tenantId))
        : and(eq(courses.id, courseId), eq(courses.tenantId, tenantId), eq(courses.status, 'published')),
    })

    if (!course) return c.json({ error: 'Course not found' }, 404)

    const lessons = await db.query.courseLessons.findMany({
      where: and(eq(courseLessons.courseId, courseId), eq(courseLessons.tenantId, tenantId)),
      orderBy: [asc(courseLessons.sortOrder)],
    })

    let enrollment = null
    if (member) {
      enrollment = await db.query.courseEnrollments.findFirst({
        where: and(
          eq(courseEnrollments.courseId, courseId),
          eq(courseEnrollments.tenantId, tenantId),
          eq(courseEnrollments.memberId, member.id),
        ),
      })
    }

    return c.json({ data: { course, lessons, enrollment: enrollment ?? null } })
  })

  // ---------------------------------------------------------------------------
  // POST /api/courses — create course (org_admin)
  // ---------------------------------------------------------------------------
  const createCourseSchema = z.object({
    title: z.string().min(1).max(500),
    description: z.string().optional(),
    coverImageUrl: z.string().url().optional(),
  })

  coursesRouter.post('/', requireAuth('org_admin'), zValidator('json', createCourseSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const data = c.req.valid('json')

    const [course] = await db.insert(courses).values({
      tenantId,
      creatorId: member.id,
      title: data.title,
      description: data.description ?? null,
      coverImageUrl: data.coverImageUrl ?? null,
      status: 'draft',
    }).returning()

    return c.json({ data: course }, 201)
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/courses/:id — update course (org_admin)
  // ---------------------------------------------------------------------------
  const updateCourseSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().optional(),
    coverImageUrl: z.string().url().optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
  })

  coursesRouter.patch('/:id', requireAuth('org_admin'), zValidator('json', updateCourseSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const courseId = c.req.param('id')
    const data = c.req.valid('json')

    const existing = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)),
    })

    if (!existing) return c.json({ error: 'Course not found' }, 404)

    const updateValues: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updateValues.title = data.title
    if (data.description !== undefined) updateValues.description = data.description
    if (data.coverImageUrl !== undefined) updateValues.coverImageUrl = data.coverImageUrl
    if (data.status !== undefined) updateValues.status = data.status

    const [updated] = await db
      .update(courses)
      .set(updateValues)
      .where(and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)))
      .returning()

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // POST /api/courses/:id/lessons — create lesson (org_admin)
  // ---------------------------------------------------------------------------
  const createLessonSchema = z.object({
    title: z.string().min(1).max(500),
    body: z.record(z.unknown()).optional(),
    videoUrl: z.string().url().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })

  coursesRouter.post('/:id/lessons', requireAuth('org_admin'), zValidator('json', createLessonSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const courseId = c.req.param('id')
    const data = c.req.valid('json')

    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.tenantId, tenantId)),
    })

    if (!course) return c.json({ error: 'Course not found' }, 404)

    const [maxOrderRow] = await db
      .select({ maxOrder: sql<number>`coalesce(max(${courseLessons.sortOrder}), 0)` })
      .from(courseLessons)
      .where(and(eq(courseLessons.courseId, courseId), eq(courseLessons.tenantId, tenantId)))
    const maxOrder = maxOrderRow?.maxOrder ?? 0

    const [lesson] = await db.insert(courseLessons).values({
      tenantId,
      courseId,
      title: data.title,
      body: data.body ?? {},
      videoUrl: data.videoUrl ?? null,
      durationMinutes: data.durationMinutes ?? null,
      sortOrder: (maxOrder ?? 0) + 1,
      isPublished: false,
    }).returning()

    return c.json({ data: lesson }, 201)
  })

  // ---------------------------------------------------------------------------
  // PATCH /api/courses/:id/lessons/:lessonId — update lesson (org_admin)
  // ---------------------------------------------------------------------------
  const updateLessonSchema = z.object({
    title: z.string().min(1).max(500).optional(),
    body: z.record(z.unknown()).optional(),
    videoUrl: z.string().url().optional(),
    durationMinutes: z.number().int().positive().optional(),
    sortOrder: z.number().int().positive().optional(),
    isPublished: z.boolean().optional(),
  })

  coursesRouter.patch('/:id/lessons/:lessonId', requireAuth('org_admin'), zValidator('json', updateLessonSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const courseId = c.req.param('id')
    const lessonId = c.req.param('lessonId')
    const data = c.req.valid('json')

    const existing = await db.query.courseLessons.findFirst({
      where: and(
        eq(courseLessons.id, lessonId),
        eq(courseLessons.courseId, courseId),
        eq(courseLessons.tenantId, tenantId),
      ),
    })

    if (!existing) return c.json({ error: 'Lesson not found' }, 404)

    const updateValues: Record<string, unknown> = {}
    if (data.title !== undefined) updateValues.title = data.title
    if (data.body !== undefined) updateValues.body = data.body
    if (data.videoUrl !== undefined) updateValues.videoUrl = data.videoUrl
    if (data.durationMinutes !== undefined) updateValues.durationMinutes = data.durationMinutes
    if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder
    if (data.isPublished !== undefined) updateValues.isPublished = data.isPublished

    const [updated] = await db
      .update(courseLessons)
      .set(updateValues)
      .where(and(
        eq(courseLessons.id, lessonId),
        eq(courseLessons.courseId, courseId),
        eq(courseLessons.tenantId, tenantId),
      ))
      .returning()

    return c.json({ data: updated })
  })

  // ---------------------------------------------------------------------------
  // DELETE /api/courses/:id/lessons/:lessonId — delete lesson (org_admin)
  // ---------------------------------------------------------------------------
  coursesRouter.delete('/:id/lessons/:lessonId', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const courseId = c.req.param('id')
    const lessonId = c.req.param('lessonId')

    const existing = await db.query.courseLessons.findFirst({
      where: and(
        eq(courseLessons.id, lessonId),
        eq(courseLessons.courseId, courseId),
        eq(courseLessons.tenantId, tenantId),
      ),
    })

    if (!existing) return c.json({ error: 'Lesson not found' }, 404)

    await db.delete(courseLessons).where(
      and(
        eq(courseLessons.id, lessonId),
        eq(courseLessons.courseId, courseId),
        eq(courseLessons.tenantId, tenantId),
      ),
    )

    return c.json({ data: { deleted: true } })
  })

  // ---------------------------------------------------------------------------
  // POST /api/courses/:id/enroll — enroll current user
  // ---------------------------------------------------------------------------
  coursesRouter.post('/:id/enroll', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const courseId = c.req.param('id')

    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.tenantId, tenantId), eq(courses.status, 'published')),
    })

    if (!course) return c.json({ error: 'Course not found' }, 404)

    const existing = await db.query.courseEnrollments.findFirst({
      where: and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.tenantId, tenantId),
        eq(courseEnrollments.memberId, member.id),
      ),
    })

    if (existing) return c.json({ error: 'Already enrolled in this course' }, 409)

    const [enrollment] = await db.insert(courseEnrollments).values({
      tenantId,
      courseId,
      memberId: member.id,
      status: 'enrolled',
      completedLessonIds: [],
    }).returning()

    return c.json({ data: enrollment }, 201)
  })

  // ---------------------------------------------------------------------------
  // POST /api/courses/:id/lessons/:lessonId/complete — mark lesson complete
  // ---------------------------------------------------------------------------
  coursesRouter.post('/:id/lessons/:lessonId/complete', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const courseId = c.req.param('id')
    const lessonId = c.req.param('lessonId')

    const enrollment = await db.query.courseEnrollments.findFirst({
      where: and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.tenantId, tenantId),
        eq(courseEnrollments.memberId, member.id),
      ),
    })

    if (!enrollment) return c.json({ error: 'Not enrolled in this course' }, 403)

    const lesson = await db.query.courseLessons.findFirst({
      where: and(
        eq(courseLessons.id, lessonId),
        eq(courseLessons.courseId, courseId),
        eq(courseLessons.tenantId, tenantId),
      ),
    })

    if (!lesson) return c.json({ error: 'Lesson not found' }, 404)

    const completedIds = enrollment.completedLessonIds ?? []
    if (completedIds.includes(lessonId)) return c.json({ data: enrollment })

    const updatedIds = [...completedIds, lessonId]

    const allLessons = await db.query.courseLessons.findMany({
      where: and(eq(courseLessons.courseId, courseId), eq(courseLessons.tenantId, tenantId)),
    })

    const allComplete = allLessons.length > 0 && allLessons.every((l) => updatedIds.includes(l.id))

    const [updated] = await db
      .update(courseEnrollments)
      .set({
        completedLessonIds: updatedIds,
        status: allComplete ? 'completed' : 'enrolled',
        completedAt: allComplete ? new Date() : null,
      })
      .where(and(
        eq(courseEnrollments.courseId, courseId),
        eq(courseEnrollments.tenantId, tenantId),
        eq(courseEnrollments.memberId, member.id),
      ))
      .returning()

    return c.json({ data: updated })
  })

  app.route('/api/courses', coursesRouter)
}
