import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  integer,
} from 'drizzle-orm/pg-core'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const planEnum = pgEnum('plan', ['starter', 'growth', 'enterprise'])

export const memberRoleEnum = pgEnum('member_role', [
  'org_admin',
  'moderator',
  'member',
  'guest',
])

export const ssoProviderEnum = pgEnum('sso_provider', ['saml', 'oidc'])

export const crmProviderEnum = pgEnum('crm_provider', ['salesforce', 'hubspot'])

// ---------------------------------------------------------------------------
// tenants
// ---------------------------------------------------------------------------

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').unique().notNull(),
  customDomain: text('custom_domain').unique(),
  name: text('name').notNull(),
  plan: planEnum('plan').notNull().default('starter'),
  logoUrl: text('logo_url'),
  primaryColor: text('primary_color'),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// users  (platform-level identity — one per human across all tenants)
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// custom_roles  (defined before members so members can FK to it)
// ---------------------------------------------------------------------------

export const customRoles = pgTable('custom_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  permissions: text('permissions').array().notNull().default([]),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// members  (tenant-scoped membership)
// ---------------------------------------------------------------------------

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: memberRoleEnum('role').notNull().default('member'),
    customRoleId: uuid('custom_role_id').references(() => customRoles.id, {
      onDelete: 'set null',
    }),
    displayName: text('display_name').notNull().default(''),
    username: text('username'),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    language: text('language'),
    createdAt: timestamp('created_at').defaultNow(),
    lastActiveAt: timestamp('last_active_at'),
    socialHandles: jsonb('social_handles').default({}),
    metadata: jsonb('metadata').default({}),
  },
  (t) => ({
    uniqueTenantUser: uniqueIndex('members_tenant_user_unique').on(
      t.tenantId,
      t.userId,
    ),
  }),
)

// ---------------------------------------------------------------------------
// tenant_modules
// ---------------------------------------------------------------------------

export const tenantModules = pgTable('tenant_modules', {
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  moduleId: text('module_id').notNull(),
  enabled: boolean('enabled').default(false),
  config: jsonb('config').default({}),
  enabledAt: timestamp('enabled_at'),
})

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  payload: jsonb('payload').default({}),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// webhooks
// ---------------------------------------------------------------------------

export const webhooks = pgTable('webhooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').array().notNull(),
  secret: text('secret').notNull(),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// email_preferences
// ---------------------------------------------------------------------------

export const emailPreferences = pgTable(
  'email_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(), // specific event type or '*' for all
    enabled: boolean('enabled').notNull().default(true),
    frequency: text('frequency').notNull().default('instant'), // instant | daily | weekly | never
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (t) => ({
    uniquePref: uniqueIndex('email_preferences_unique').on(t.tenantId, t.memberId, t.eventType),
  })
)

// ---------------------------------------------------------------------------
// email_queue
// ---------------------------------------------------------------------------

export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  toEmail: text('to_email').notNull(),
  eventType: text('event_type').notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text'),
  status: text('status').notNull().default('pending'), // pending | sent | failed
  sendAfter: timestamp('send_after').defaultNow(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// webhook_deliveries
// ---------------------------------------------------------------------------

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  webhookId: uuid('webhook_id')
    .notNull()
    .references(() => webhooks.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('pending'), // pending | success | failed
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at'),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// audit_log
// ---------------------------------------------------------------------------

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => members.id, {
    onDelete: 'set null',
  }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// invitations
// ---------------------------------------------------------------------------

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: memberRoleEnum('role').notNull().default('member'),
  invitedBy: uuid('invited_by')
    .notNull()
    .references(() => members.id, { onDelete: 'cascade' }),
  token: text('token').unique().notNull(),
  acceptedAt: timestamp('accepted_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// sso_configs
// ---------------------------------------------------------------------------

export const ssoConfigs = pgTable('sso_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  provider: ssoProviderEnum('provider').notNull(),
  config: jsonb('config').notNull(),
  enabled: boolean('enabled').default(false),
  createdAt: timestamp('created_at').defaultNow(),
})

// ---------------------------------------------------------------------------
// crm_integrations
// ---------------------------------------------------------------------------

export const crmIntegrations = pgTable('crm_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  provider: crmProviderEnum('provider').notNull(),
  credentials: jsonb('credentials').notNull(),
  fieldMappings: jsonb('field_mappings').default({}),
  syncEnabled: boolean('sync_enabled').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  createdAt: timestamp('created_at').defaultNow(),
})
