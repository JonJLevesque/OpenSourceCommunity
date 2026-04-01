import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'
import { tenants, members } from './core'

// ---------------------------------------------------------------------------
// audit_logs — immutable record of admin actions
// ---------------------------------------------------------------------------

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => members.id, { onDelete: 'set null' }),
  actorName: text('actor_name').notNull(),       // denormalized so it survives member deletion
  action: text('action').notNull(),              // e.g. 'module.enabled', 'member.role_changed'
  resourceType: text('resource_type'),           // e.g. 'module', 'member', 'content_report'
  resourceId: text('resource_id'),               // the affected entity's ID (string for flexibility)
  metadata: jsonb('metadata').default({}),       // before/after values, extra context
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// content_reports — member-submitted reports + AI moderation flags
// ---------------------------------------------------------------------------

export const contentReportStatusEnum = pgEnum('content_report_status', [
  'pending',
  'reviewing',
  'removed',
  'dismissed',
])

export const contentReportReasonEnum = pgEnum('content_report_reason', [
  'spam',
  'harassment',
  'hate_speech',
  'misinformation',
  'off_topic',
  'other',
])

export const contentReports = pgTable('content_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  reporterId: uuid('reporter_id').references(() => members.id, { onDelete: 'set null' }),
  contentType: text('content_type').notNull(),   // 'thread' | 'post' | 'idea' | 'comment' | 'chat_message'
  contentId: text('content_id').notNull(),
  contentPreview: text('content_preview'),       // denormalized snippet for the queue
  contentAuthorName: text('content_author_name'),
  reason: contentReportReasonEnum('reason').notNull(),
  notes: text('notes'),                          // reporter's additional context
  status: contentReportStatusEnum('status').notNull().default('pending'),
  // AI moderation
  aiFlag: text('ai_flag'),                       // 'safe' | 'unsafe' | 'uncertain' | null (not yet analysed)
  aiReasoning: text('ai_reasoning'),
  // Resolution
  resolvedBy: uuid('resolved_by').references(() => members.id, { onDelete: 'set null' }),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow(),
})
