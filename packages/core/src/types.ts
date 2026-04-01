import type { Hono } from 'hono'

// All available module IDs in the platform
export type ModuleId =
  | 'forums'
  | 'ideas'
  | 'events'
  | 'courses'
  | 'webinars'
  | 'kb'
  | 'chat'
  | 'social-intel'
  | 'gamification'    // post-MVP
  | 'attribution'     // post-MVP
  | 'ai-moderation'   // post-MVP
  | 'credentials'     // post-MVP

export type MemberRole = 'org_admin' | 'moderator' | 'member' | 'guest'
export type TenantPlan = 'starter' | 'growth' | 'enterprise'

export interface Tenant {
  id: string
  slug: string
  customDomain: string | null
  name: string
  plan: TenantPlan
  logoUrl: string | null
  primaryColor: string | null
  settings: Record<string, unknown>
}

export interface Member {
  id: string
  tenantId: string
  userId: string
  role: MemberRole
  customRoleId: string | null
  displayName: string
  avatarUrl: string | null
}

export interface PermissionDefinition {
  id: string          // e.g. 'forums:post', 'forums:moderate'
  description: string
  defaultRoles: MemberRole[]  // which built-in roles get this permission by default
}

export interface ModuleEventHandler {
  (event: { type: string; tenantId: string; payload: unknown }): Promise<void>
}

// The contract every module must implement
export interface ModuleDefinition {
  id: ModuleId
  name: string
  version: string
  description: string
  dependencies: ModuleId[]          // other modules required before this one
  registerRoutes: (app: Hono<HonoEnv>) => void
  onEnable?: (tenantId: string) => Promise<void>
  onDisable?: (tenantId: string) => Promise<void>
  permissions: PermissionDefinition[]
  emits: string[]                   // event type strings this module publishes
  listens: Record<string, ModuleEventHandler>  // events this module handles
}

// Hono environment type (shared across all modules)
export interface HonoEnv {
  Bindings: {
    DATABASE_URL: string
    SUPABASE_URL: string
    SUPABASE_SERVICE_ROLE_KEY: string
    SUPABASE_JWT_SECRET: string
    UPSTASH_REDIS_REST_URL: string
    UPSTASH_REDIS_REST_TOKEN: string
    APP_DOMAIN?: string
    DEFAULT_TENANT_SLUG?: string
    CORS_ORIGINS?: string
    EMAIL_PROVIDER?: string     // 'resend' | 'mailgun' (default: 'resend')
    EMAIL_API_KEY?: string
    EMAIL_FROM?: string         // e.g. 'Community <hello@example.com>'
    EMAIL_DOMAIN?: string       // Mailgun domain
    INTERNAL_SECRET?: string    // Shared secret for /internal/* Worker-to-Worker routes
    AI?: Ai                     // Cloudflare Workers AI binding (optional)
  }
  Variables: {
    tenantId: string
    tenant: Tenant
    member: Member | null
    enabledModules: ModuleId[]
  }
}
