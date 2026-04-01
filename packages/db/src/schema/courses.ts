import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants, members } from './core'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const courseStatusEnum = pgEnum('course_status', [
  'draft',
  'published',
  'archived',
])

export const enrollmentStatusEnum = pgEnum('enrollment_status', [
  'enrolled',
  'completed',
  'dropped',
])

// ---------------------------------------------------------------------------
// courses
// ---------------------------------------------------------------------------

export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  coverImageUrl: text('cover_image_url'),
  status: courseStatusEnum('status').default('draft'),
  requiresEnrollment: boolean('requires_enrollment').default(true),
  accessRoles: text('access_roles').array().default([]),
  certificateTemplate: jsonb('certificate_template'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// course_lessons
// ---------------------------------------------------------------------------

export const courseLessons = pgTable('course_lessons', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  courseId: uuid('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: jsonb('body').notNull(),
  videoUrl: text('video_url'),
  durationMinutes: integer('duration_minutes'),
  sortOrder: integer('sort_order').notNull(),
  isPublished: boolean('is_published').default(false),
  quiz: jsonb('quiz'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// learning_paths
// ---------------------------------------------------------------------------

export const learningPaths = pgTable('learning_paths', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  courseIds: uuid('course_ids').array().notNull(),
  isPublished: boolean('is_published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// course_enrollments
// ---------------------------------------------------------------------------

export const courseEnrollments = pgTable(
  'course_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    status: enrollmentStatusEnum('status').default('enrolled'),
    completedLessonIds: uuid('completed_lesson_ids').array().default([]),
    completedAt: timestamp('completed_at'),
    certificateIssuedAt: timestamp('certificate_issued_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueEnrollment: uniqueIndex(
      'course_enrollments_tenant_course_member_unique',
    ).on(t.tenantId, t.courseId, t.memberId),
  }),
)
