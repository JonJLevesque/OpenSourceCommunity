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

export const kbVisibilityEnum = pgEnum('kb_visibility', [
  'public',
  'members',
  'restricted',
])

// ---------------------------------------------------------------------------
// kb_categories
// ---------------------------------------------------------------------------

export const kbCategories = pgTable(
  'kb_categories',
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
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => ({
    uniqueTenantSlug: uniqueIndex('kb_categories_tenant_slug_unique').on(
      t.tenantId,
      t.slug,
    ),
  }),
)

// ---------------------------------------------------------------------------
// kb_articles
// ---------------------------------------------------------------------------

export const kbArticles = pgTable('kb_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => kbCategories.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  body: jsonb('body').notNull(),
  excerpt: text('excerpt'),
  tags: text('tags').array().default([]),
  visibility: kbVisibilityEnum('visibility').default('members'),
  allowedRoleIds: uuid('allowed_role_ids').array(),
  helpfulCount: integer('helpful_count').default(0),
  notHelpfulCount: integer('not_helpful_count').default(0),
  viewCount: integer('view_count').default(0),
  currentVersion: integer('current_version').default(1),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// kb_article_versions
// ---------------------------------------------------------------------------

export const kbArticleVersions = pgTable('kb_article_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id')
    .notNull()
    .references(() => kbArticles.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  body: jsonb('body').notNull(),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// kb_article_feedback
// ---------------------------------------------------------------------------

export const kbArticleFeedback = pgTable('kb_article_feedback', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id')
    .notNull()
    .references(() => kbArticles.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id').references(() => members.id, {
    onDelete: 'set null',
  }),
  isHelpful: boolean('is_helpful').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
})
