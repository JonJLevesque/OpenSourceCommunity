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

export const webinarStatusEnum = pgEnum('webinar_status', [
  'draft',
  'scheduled',
  'live',
  'ended',
])

// ---------------------------------------------------------------------------
// webinars
// ---------------------------------------------------------------------------

export const webinars = pgTable('webinars', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  speakerIds: uuid('speaker_ids').array().default([]),
  scheduledAt: timestamp('scheduled_at').notNull(),
  durationMinutes: integer('duration_minutes').default(60),
  streamUrl: text('stream_url'),
  streamConfig: jsonb('stream_config'),
  maxAttendees: integer('max_attendees'),
  status: webinarStatusEnum('status').default('draft'),
  recordingUrl: text('recording_url'),
  recordingChapters: jsonb('recording_chapters'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// webinar_registrations
// ---------------------------------------------------------------------------

export const webinarRegistrations = pgTable(
  'webinar_registrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    webinarId: uuid('webinar_id')
      .notNull()
      .references(() => webinars.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    attendedAt: timestamp('attended_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueRegistration: uniqueIndex(
      'webinar_registrations_tenant_webinar_member_unique',
    ).on(t.tenantId, t.webinarId, t.memberId),
  }),
)

// ---------------------------------------------------------------------------
// webinar_qa
// ---------------------------------------------------------------------------

export const webinarQa = pgTable('webinar_qa', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  webinarId: uuid('webinar_id')
    .notNull()
    .references(() => webinars.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  answer: text('answer'),
  answeredBy: uuid('answered_by').references(() => members.id, {
    onDelete: 'set null',
  }),
  answeredAt: timestamp('answered_at'),
  upvotes: integer('upvotes').default(0),
  isFeatured: boolean('is_featured').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// webinar_polls
// ---------------------------------------------------------------------------

export const webinarPolls = pgTable('webinar_polls', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  webinarId: uuid('webinar_id')
    .notNull()
    .references(() => webinars.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  options: jsonb('options').notNull(),
  results: jsonb('results').default({}),
  isActive: boolean('is_active').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})
