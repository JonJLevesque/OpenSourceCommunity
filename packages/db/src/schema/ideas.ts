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

export const ideaStatusEnum = pgEnum('idea_status', [
  'new',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'declined',
])

// ---------------------------------------------------------------------------
// ideas
// ---------------------------------------------------------------------------

export const ideas = pgTable('ideas', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: jsonb('body').notNull(),
  status: ideaStatusEnum('status').default('new'),
  voteCount: integer('vote_count').default(0),
  category: text('category'),
  tags: text('tags').array().default([]),
  isMerged: boolean('is_merged').default(false),
  mergedIntoId: uuid('merged_into_id'),
  externalTrackerUrl: text('external_tracker_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// idea_votes
// ---------------------------------------------------------------------------

export const ideaVotes = pgTable(
  'idea_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    ideaId: uuid('idea_id')
      .notNull()
      .references(() => ideas.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueVote: uniqueIndex('idea_votes_tenant_idea_member_unique').on(
      t.tenantId,
      t.ideaId,
      t.memberId,
    ),
  }),
)

// ---------------------------------------------------------------------------
// idea_comments
// ---------------------------------------------------------------------------

export const ideaComments = pgTable('idea_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ideaId: uuid('idea_id')
    .notNull()
    .references(() => ideas.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  body: jsonb('body').notNull(),
  isOfficial: boolean('is_official').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// idea_status_history
// ---------------------------------------------------------------------------

export const ideaStatusHistory = pgTable('idea_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  ideaId: uuid('idea_id')
    .notNull()
    .references(() => ideas.id, { onDelete: 'cascade' }),
  status: ideaStatusEnum('status').notNull(),
  note: text('note').notNull(),
  changedBy: uuid('changed_by')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
})
