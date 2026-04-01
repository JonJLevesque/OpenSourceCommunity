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

export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'cancelled',
])

export const eventRsvpStatusEnum = pgEnum('event_rsvp_status', [
  'going',
  'interested',
  'not_going',
])

// ---------------------------------------------------------------------------
// events
// ---------------------------------------------------------------------------

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  creatorId: uuid('creator_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: jsonb('body'),
  location: jsonb('location'),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  timezone: text('timezone').notNull(),
  capacity: integer('capacity'),
  coverImageUrl: text('cover_image_url'),
  tags: text('tags').array().default([]),
  isRecurring: boolean('is_recurring').default(false),
  recurrenceRule: text('recurrence_rule'),
  parentEventId: uuid('parent_event_id'),
  status: eventStatusEnum('status').default('draft'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// event_rsvps
// ---------------------------------------------------------------------------

export const eventRsvps = pgTable(
  'event_rsvps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    status: eventRsvpStatusEnum('status').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueRsvp: uniqueIndex('event_rsvps_tenant_event_member_unique').on(
      t.tenantId,
      t.eventId,
      t.memberId,
    ),
  }),
)

// ---------------------------------------------------------------------------
// event_recordings
// ---------------------------------------------------------------------------

export const eventRecordings = pgTable('event_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  eventId: uuid('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  videoUrl: text('video_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  durationSeconds: integer('duration_seconds'),
  viewCount: integer('view_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})
