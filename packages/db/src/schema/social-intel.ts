import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  real,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants, members } from './core'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const siKeywordGroupTypeEnum = pgEnum('si_keyword_group_type', [
  'brand',
  'competitor',
  'custom',
])

export const siSentimentEnum = pgEnum('si_sentiment', [
  'positive',
  'negative',
  'neutral',
  'mixed',
])

export const siAlertTypeEnum = pgEnum('si_alert_type', [
  'volume_spike',
  'crisis',
  'competitor_mention',
])

export const siMentionStatusEnum = pgEnum('si_mention_status', [
  'new',
  'reviewed',
  'actioned',
])

// ---------------------------------------------------------------------------
// si_keyword_groups
// ---------------------------------------------------------------------------

export const siKeywordGroups = pgTable('si_keyword_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: siKeywordGroupTypeEnum('type').notNull(),
  terms: text('terms').array().notNull(),
  platforms: text('platforms').array().notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// si_mentions
// ---------------------------------------------------------------------------

export const siMentions = pgTable(
  'si_mentions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    keywordGroupId: uuid('keyword_group_id')
      .notNull()
      .references(() => siKeywordGroups.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    externalId: text('external_id').notNull(),
    authorHandle: text('author_handle').notNull(),
    authorUrl: text('author_url'),
    contentUrl: text('content_url').notNull(),
    textPreview: text('text_preview').notNull(),
    publishedAt: timestamp('published_at').notNull(),
    sentiment: siSentimentEnum('sentiment').notNull(),
    sentimentScore: real('sentiment_score').notNull(),
    sentimentOverridden: boolean('sentiment_overridden').default(false),
    status: siMentionStatusEnum('status').default('new'),
    engagementCount: integer('engagement_count').default(0),
    rawMetadata: jsonb('raw_metadata').default({}),
    linkedMemberId: uuid('linked_member_id').references(() => members.id, {
      onDelete: 'set null',
    }),
    collectedAt: timestamp('collected_at').defaultNow(),
  },
  (t) => ({
    uniqueMention: uniqueIndex(
      'si_mentions_tenant_platform_external_id_unique',
    ).on(t.tenantId, t.platform, t.externalId),
  }),
)

// ---------------------------------------------------------------------------
// si_alerts
// ---------------------------------------------------------------------------

export const siAlerts = pgTable('si_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  alertType: siAlertTypeEnum('alert_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('open'),
  triggeredAt: timestamp('triggered_at').notNull(),
  acknowledgedAt: timestamp('acknowledged_at'),
  acknowledgedBy: uuid('acknowledged_by').references(() => members.id, {
    onDelete: 'set null',
  }),
})

// ---------------------------------------------------------------------------
// si_alert_configs
// ---------------------------------------------------------------------------

export const siAlertConfigs = pgTable('si_alert_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  volumeSpikeMultiplier: real('volume_spike_multiplier').default(3.0),
  crisisNegativeThreshold: real('crisis_negative_threshold').default(0.6),
  crisisMinVolume: integer('crisis_min_volume').default(20),
  notificationChannels: jsonb('notification_channels').default({
    email: true,
    slack: false,
    inApp: true,
  }),
  updatedAt: timestamp('updated_at').defaultNow(),
})
