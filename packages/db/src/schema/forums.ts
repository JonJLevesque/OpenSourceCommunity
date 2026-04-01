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

export const forumCategoryVisibilityEnum = pgEnum(
  'forum_category_visibility',
  ['public', 'members', 'restricted'],
)

export const forumThreadStatusEnum = pgEnum('forum_thread_status', [
  'open',
  'resolved',
  'locked',
  'archived',
])

export const forumTargetTypeEnum = pgEnum('forum_target_type', [
  'thread',
  'category',
])

export const forumReportResourceTypeEnum = pgEnum(
  'forum_report_resource_type',
  ['thread', 'post'],
)

export const forumReportStatusEnum = pgEnum('forum_report_status', [
  'pending',
  'reviewed',
  'dismissed',
])

// ---------------------------------------------------------------------------
// forum_categories
// ---------------------------------------------------------------------------

export const forumCategories = pgTable(
  'forum_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),
    sortOrder: integer('sort_order').default(0),
    visibility: forumCategoryVisibilityEnum('visibility').default('members'),
    allowedRoleIds: uuid('allowed_role_ids').array(),
    isArchived: boolean('is_archived').default(false),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueTenantSlug: uniqueIndex('forum_categories_tenant_slug_unique').on(
      t.tenantId,
      t.slug,
    ),
  }),
)

// ---------------------------------------------------------------------------
// forum_threads
// ---------------------------------------------------------------------------

export const forumThreads = pgTable('forum_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => forumCategories.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: jsonb('body').notNull(),
  status: forumThreadStatusEnum('status').default('open'),
  isPinned: boolean('is_pinned').default(false),
  isFeatured: boolean('is_featured').default(false),
  viewCount: integer('view_count').default(0),
  replyCount: integer('reply_count').default(0),
  acceptedAnswerId: uuid('accepted_answer_id'),
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// forum_posts
// ---------------------------------------------------------------------------

export const forumPosts = pgTable('forum_posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  threadId: uuid('thread_id')
    .notNull()
    .references(() => forumThreads.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  body: jsonb('body').notNull(),
  depth: integer('depth').default(0),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// forum_reactions
// ---------------------------------------------------------------------------

export const forumReactions = pgTable(
  'forum_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => forumPosts.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueReaction: uniqueIndex(
      'forum_reactions_tenant_post_member_emoji_unique',
    ).on(t.tenantId, t.postId, t.memberId, t.emoji),
  }),
)

// ---------------------------------------------------------------------------
// forum_follows
// ---------------------------------------------------------------------------

export const forumFollows = pgTable(
  'forum_follows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    targetType: forumTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueFollow: uniqueIndex(
      'forum_follows_tenant_member_target_unique',
    ).on(t.tenantId, t.memberId, t.targetType, t.targetId),
  }),
)

// ---------------------------------------------------------------------------
// forum_reports
// ---------------------------------------------------------------------------

export const forumReports = pgTable('forum_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  resourceType: forumReportResourceTypeEnum('resource_type').notNull(),
  resourceId: uuid('resource_id').notNull(),
  reason: text('reason').notNull(),
  status: forumReportStatusEnum('status').default('pending'),
  reviewedBy: uuid('reviewed_by').references(() => members.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow(),
})
