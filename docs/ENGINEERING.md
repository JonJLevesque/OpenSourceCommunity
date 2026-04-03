# OpenSourceCommunity — Technical Architecture Document

**Status**: Draft
**Last Updated**: 2026-03-26
**Audience**: Engineering team, technical founders, engineering leadership

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Multi-Tenancy](#4-multi-tenancy)
5. [Module System](#5-module-system)
6. [Data Architecture](#6-data-architecture)
7. [API Layer](#7-api-layer)
8. [Social Listening Pipeline](#8-social-listening-pipeline)
9. [Auth & Identity](#9-auth--identity)
10. [CRM Integration](#10-crm-integration)
11. [Search](#11-search)
12. [Real-Time Layer](#12-real-time-layer)
13. [Infrastructure](#13-infrastructure)
14. [Observability](#14-observability)
15. [Security](#15-security)
16. [Development Phases](#16-development-phases)
17. [Key Engineering Risks](#17-key-engineering-risks)

---

## 1. Architecture Overview

### Style: Modular Monolith + Extracted Social Pipeline

The core platform (forums, ideas, events, courses, webinars, KB, auth, notifications) is a **modular monolith** — a single deployable unit with strict internal module boundaries enforced by TypeScript barrel exports, Turborepo package dependency rules, and a module registry pattern.

The **Social Listening Pipeline** is extracted as a separate service from day one. It has fundamentally different scaling characteristics (high-throughput ingestion from 12+ external APIs), failure modes (external rate limiting, platform policy changes), and data volumes (millions of mentions at scale) compared to core community CRUD operations.

```
┌──────────────────────────────────────────────────────────────────┐
│                   Cloudflare CDN + WAF (edge)                    │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────┴─────────────┐
          │                          │
┌─────────▼──────────┐    ┌──────────▼──────────┐
│  Cloudflare Pages   │    │  Cloudflare Workers  │
│  Next.js frontend   │    │  Hono API            │
│  (apps/web)         │    │  (apps/api)          │
│                     │    │                      │
│  Server Components  │    │  REST + GraphQL      │
│  Client Components  │    │  Module Routers      │
│  Module lazy-load   │    │                      │
└─────────────────────┘    └──────────┬───────────┘
                                      │
          ┌───────────────────────────┼──────────────────────────┐
          │                           │                          │
┌─────────▼──────────┐    ┌───────────▼──────────┐   ┌──────────▼──────┐
│  Supabase           │    │  Upstash Redis        │   │  OpenSearch 2.x  │
│  PostgreSQL 16      │    │  (serverless cache    │   │  (full-text      │
│  + Auth + Realtime  │    │   + Bloom filters)    │   │   + mentions)    │
│  + Storage          │    │                       │   │                  │
└─────────────────────┘    └───────────────────────┘   └─────────────────┘
          │
┌─────────▼────────────────────────────────────────┐
│              Social Listening Pipeline             │
│              (apps/social-pipeline)                │
│                                                    │
│  ┌──────────┐   ┌──────────────────┐   ┌────────────────────┐ │
│  │ Platform │   │  Cloudflare      │   │  Cloudflare        │ │
│  │ Adapters │──▶│  Queues          │──▶│  Workers AI        │ │
│  │ (12+)    │   │  (job passing)   │   │  (edge sentiment)  │ │
│  └──────────┘   └──────────────────┘   └────────────────────┘ │
│                                                    │
│  Scheduled polling via Cloudflare Workers Cron     │
└──────────────────────────────────────────────────┘
          │
┌─────────▼──────┐
│  ClickHouse    │
│  Cloud         │
│  (analytics    │
│   OLAP)        │
└────────────────┘
```

### Why Not Microservices

With a founding team of 5–15 engineers:
- Microservices introduce deployment coordination overhead, distributed tracing complexity, and inter-service network latency
- Engagement modules frequently share data (members, notifications, search) — forcing network calls between services that today share a database transaction
- The modular monolith preserves the option to extract services later (the module boundaries are the extraction seams) while keeping velocity high now
- Single deployment artifact dramatically simplifies CI/CD, local development, and debugging

---

## 2. Tech Stack

### Definitive Technology Choices

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Frontend framework** | Next.js | 15.x | App Router + React Server Components for SEO-critical community content; streaming; large ecosystem |
| **Frontend styling** | Tailwind CSS | 4.x | Utility-first; fastest way to build consistent UI; great tree-shaking |
| **Component library** | shadcn/ui | latest | Radix primitives + Tailwind; components you own, not a dependency; accessible by default |
| **Data fetching** | TanStack Query | 5.x | Best-in-class server state management; stale-while-revalidate; optimistic updates |
| **Rich text editor** | Tiptap | 2.x | ProseMirror-based; extensible; supports markdown, code blocks, mentions, embeds; used in production by Linear, Notion |
| **API framework** | Hono | 4.x | Native deployment target is Cloudflare Workers; 400K req/s; 14KB; first-class TypeScript; built-in OpenAPI via Zod validation |
| **Runtime** | Cloudflare Workers (prod) / Node.js 22 LTS (local dev) | — | CF Workers is the production target; Node.js 22 used locally via `wrangler dev` |
| **ORM** | Drizzle | 0.x | SQL-first; zero binary dependencies; multi-schema aware; excellent RLS support; type-safe queries without magic |
| **Primary database** | Supabase PostgreSQL | 16 | Hosted Postgres with built-in PgBouncer (connection pooling), RLS, Auth, Realtime, and Storage; shared schema + RLS for multi-tenancy |
| **Auth** | Supabase Auth | — | Handles email/password, Google/GitHub/LinkedIn OAuth, SAML 2.0, OIDC SSO out of the box; replaces custom JWT implementation |
| **Realtime** | Supabase Realtime | — | Managed WebSocket broadcast and presence; replaces custom WebSocket hub for notifications and live Q&A |
| **Storage** | Supabase Storage | — | For recordings, course videos, and attachments; S3-compatible API; replaces S3 |
| **Cache** | Upstash Redis | — | Serverless Redis compatible with CF Workers edge runtime; Bloom filters for dedup; token buckets for rate limiting |
| **Job queue** | Cloudflare Queues + Workers Cron Triggers | — | Native CF queue for message passing; Cron Triggers for scheduled platform polling; no separate Redis cluster needed for queuing |
| **Full-text search** | OpenSearch | 2.x | Elasticsearch-compatible; open-source; excellent for community content + social mention indexing |
| **Analytics DB** | ClickHouse Cloud | 24.x | 100B+ rows/sec insert; columnar; perfect for time-series analytics (mentions, engagement trends) |
| **NLP / AI** | Cloudflare Workers AI | — | Edge inference at ~50ms latency; no sidecar service needed for v1; sentiment API fallback for improved accuracy in v2 |
| **Package manager** | pnpm | 9.x | Monorepo workspace support; 2× faster than npm; strict peer dependency resolution |
| **Monorepo build** | Turborepo | 2.x | Intelligent task caching; parallel builds; works perfectly with pnpm workspaces |
| **Infrastructure** | Cloudflare (Workers, Pages, Queues, R2, AI) + Supabase | — | Replaces entire AWS stack; no Kubernetes, no Terraform, no containers to manage for v1 |
| **CI/CD** | GitHub Actions | — | Native to repo; matrix builds; secrets management; 2,000 min/mo free |
| **Error tracking** | Sentry | — | Stack traces with source maps; performance monitoring; alerts |
| **Metrics + logs** | Cloudflare Analytics + Logpush + Sentry | — | Cloudflare-native observability; Logpush to R2 or external SIEM; Grafana/Loki/Tempo as an alternative if deeper tracing is needed |
| **Transactional email** | Resend | — | Developer-friendly; React email templates; excellent deliverability |

---

## 3. Monorepo Structure

```
ultimatecommunity/
├── apps/
│   ├── web/                    # Next.js 15 frontend
│   │   ├── app/                # App Router
│   │   │   ├── (public)/       # Unauthenticated routes (home, login, signup)
│   │   │   ├── (tenant)/       # Authenticated community routes
│   │   │   │   ├── forums/
│   │   │   │   ├── ideas/
│   │   │   │   ├── events/
│   │   │   │   ├── courses/
│   │   │   │   ├── webinars/
│   │   │   │   ├── kb/
│   │   │   │   ├── intelligence/
│   │   │   │   └── admin/
│   │   │   └── api/            # Next.js API routes (thin proxies to Hono)
│   │   └── components/
│   │       ├── modules/        # Per-module UI components (lazy-loaded)
│   │       └── ui/             # Shared primitives (re-exported from packages/ui)
│   │
│   ├── api/                    # Hono API server
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── tenant.ts   # Tenant resolution + RLS context
│   │   │   │   ├── auth.ts     # JWT validation + session
│   │   │   │   └── module.ts   # Module enablement check per tenant
│   │   │   ├── modules/        # One directory per module
│   │   │   │   ├── forums/
│   │   │   │   │   ├── index.ts        # ModuleDefinition export
│   │   │   │   │   ├── routes.ts       # Hono routes
│   │   │   │   │   ├── service.ts      # Business logic
│   │   │   │   │   └── schema.ts       # Drizzle table definitions
│   │   │   │   ├── ideas/
│   │   │   │   ├── events/
│   │   │   │   ├── courses/
│   │   │   │   ├── webinars/
│   │   │   │   ├── kb/
│   │   │   │   └── social-intel/
│   │   │   ├── core/           # Always-on core services
│   │   │   │   ├── auth/
│   │   │   │   ├── members/
│   │   │   │   ├── notifications/
│   │   │   │   ├── search/
│   │   │   │   └── webhooks/
│   │   │   └── index.ts        # App entry point, module registration
│   │
│   └── social-pipeline/        # Social listening service (Cloudflare Workers)
│       └── src/
│           ├── connectors/     # One file per platform
│           │   ├── base.ts     # SocialConnector interface
│           │   ├── twitter.ts
│           │   ├── reddit.ts
│           │   ├── linkedin.ts
│           │   ├── youtube.ts
│           │   ├── tiktok.ts
│           │   ├── discord.ts
│           │   ├── hackernews.ts
│           │   ├── github.ts
│           │   ├── g2.ts
│           │   ├── trustpilot.ts
│           │   └── producthunt.ts
│           ├── queue/          # Cloudflare Queues consumers
│           ├── cron/           # Cloudflare Workers Cron Trigger handlers
│           ├── sentiment.ts    # Cloudflare Workers AI sentiment inference
│           └── index.ts
│
├── packages/
│   ├── core/                   # Module registry + shared types
│   │   └── src/
│   │       ├── module-registry.ts
│   │       ├── types.ts
│   │       └── events.ts       # In-process event bus types
│   │
│   ├── db/                     # Drizzle schema + migrations
│   │   └── src/
│   │       ├── schema/
│   │       │   ├── core.ts     # Tenants, users, memberships
│   │       │   ├── forums.ts
│   │       │   ├── ideas.ts
│   │       │   ├── events.ts
│   │       │   ├── courses.ts
│   │       │   ├── webinars.ts
│   │       │   ├── kb.ts
│   │       │   └── social-intel.ts
│   │       ├── migrations/
│   │       └── client.ts       # Drizzle client factory (injects tenant context)
│   │
│   ├── ui/                     # Shared React components (shadcn/ui wrappers)
│   └── config/                 # Shared ESLint, TypeScript, Tailwind configs
│
├── docs/
│   ├── PRD.md
│   └── ENGINEERING.md
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .gitignore
```

---

## 4. Multi-Tenancy

### Strategy: Shared Schema + PostgreSQL Row-Level Security

All tenant data lives in a single PostgreSQL schema. Every table has a `tenant_id UUID NOT NULL` column. PostgreSQL RLS policies enforce isolation at the database level, independent of application code.

**Why not schema-per-tenant**: PostgreSQL degrades with thousands of schemas (each has its own system catalog entries). Running migrations across 10K+ schemas is operationally painful. Connection pooling with PgBouncer is more complex with schema switching.

**Why not database-per-tenant**: Too expensive at small tenant scale; operational overhead is proportional to tenant count; no economy of resource sharing.

**Scaling escape hatch**: Large tenants (>500K members) can be moved to a dedicated Supabase project. This is a configuration change in the tenant routing table, not a code change.

### RLS Implementation

```sql
-- Example: forums_threads table
CREATE TABLE forums_threads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL,
  author_id   UUID NOT NULL,
  title       TEXT NOT NULL,
  body        JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ...
);

-- Enable RLS
ALTER TABLE forums_threads ENABLE ROW LEVEL SECURITY;

-- Policy: all operations scoped to current tenant
CREATE POLICY tenant_isolation ON forums_threads
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Tenant Middleware (apps/api/src/middleware/tenant.ts)

```typescript
export const tenantMiddleware = async (c: Context, next: Next) => {
  // Resolve tenant from subdomain or custom domain
  const host = c.req.header('host') ?? ''
  const tenant = await resolveTenant(host) // cached in Redis

  if (!tenant) {
    return c.json({ error: 'Tenant not found' }, 404)
  }

  // Set RLS context for this transaction
  await c.get('db').execute(
    sql`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`
  )

  c.set('tenantId', tenant.id)
  c.set('tenant', tenant)

  await next()
}
```

### Tenant Data Model

```typescript
// packages/db/src/schema/core.ts
export const tenants = pgTable('tenants', {
  id:           uuid('id').primaryKey().defaultRandom(),
  slug:         text('slug').unique().notNull(),        // subdomain
  customDomain: text('custom_domain').unique(),
  name:         text('name').notNull(),
  plan:         tenantPlanEnum('plan').notNull().default('starter'),
  settings:     jsonb('settings').notNull().default({}),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
})

export const tenantModules = pgTable('tenant_modules', {
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id),
  moduleId:  text('module_id').notNull(),  // 'forums', 'ideas', 'social-intel', etc.
  enabled:   boolean('enabled').notNull().default(false),
  config:    jsonb('config').notNull().default({}),
  enabledAt: timestamp('enabled_at'),
}, (t) => ({
  pk: primaryKey({ columns: [t.tenantId, t.moduleId] }),
}))
```

---

## 5. Module System

### ModuleDefinition Contract

Each module exports a single `ModuleDefinition` object that declares everything the registry needs to know:

```typescript
// packages/core/src/types.ts
export interface ModuleDefinition {
  id: string                          // 'forums', 'ideas', 'social-intel'
  name: string
  version: string
  dependencies: string[]              // other module IDs required
  routes: (app: HonoApp) => void      // registers HTTP routes
  onEnable?: (tenantId: string) => Promise<void>   // run on module enable
  onDisable?: (tenantId: string) => Promise<void>  // run on module disable
  migrations: string[]                // ordered migration file paths
  permissions: PermissionDefinition[]
  emits: string[]                     // event names this module publishes
  listens: Record<string, EventHandler>  // events this module handles
}
```

### Example: Forums Module

```typescript
// apps/api/src/modules/forums/index.ts
export const forumsModule: ModuleDefinition = {
  id: 'forums',
  name: 'Forums & Discussions',
  version: '1.0.0',
  dependencies: [],  // only requires core
  routes: registerForumRoutes,
  migrations: ['./migrations/001_create_forums_tables.sql'],
  permissions: [
    { id: 'forums:read', description: 'Read forum threads and posts' },
    { id: 'forums:post', description: 'Create threads and replies' },
    { id: 'forums:moderate', description: 'Moderate, pin, lock threads' },
    { id: 'forums:admin', description: 'Manage categories and settings' },
  ],
  emits: ['forums:thread.created', 'forums:post.created', 'forums:thread.resolved'],
  listens: {
    'kb:article.published': async (event) => {
      // Index KB article for forum sidebar suggestions
      await forumSearchIndex.indexKBArticle(event.payload)
    }
  }
}
```

### Module Registry

```typescript
// packages/core/src/module-registry.ts
export class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>()

  register(module: ModuleDefinition) {
    this.validate(module)
    this.modules.set(module.id, module)
  }

  async boot(app: HonoApp) {
    const ordered = this.topologicalSort()  // respects dependencies
    for (const module of ordered) {
      module.routes(app)
      this.bindEventListeners(module)
    }
  }

  private validate(module: ModuleDefinition) {
    for (const dep of module.dependencies) {
      if (!this.modules.has(dep)) {
        throw new Error(`Module '${module.id}' requires '${dep}' which is not registered`)
      }
    }
  }
}
```

### Per-Tenant Module Enablement Middleware

```typescript
// apps/api/src/middleware/module.ts
export const requireModule = (moduleId: string) => async (c: Context, next: Next) => {
  const tenantId = c.get('tenantId')
  const cacheKey = `tenant:${tenantId}:modules`

  let enabledModules = await upstash.smembers(cacheKey)
  if (enabledModules.length === 0) {
    enabledModules = await db.query.tenantModules.findMany({
      where: and(
        eq(tenantModules.tenantId, tenantId),
        eq(tenantModules.enabled, true)
      )
    }).then(rows => rows.map(r => r.moduleId))
    await upstash.sadd(cacheKey, ...enabledModules)
    await upstash.expire(cacheKey, 300)  // 5 min TTL
  }

  if (!enabledModules.includes(moduleId)) {
    return c.json({ error: 'Module not enabled for this workspace' }, 403)
  }

  await next()
}
```

### Frontend Module Loading

```typescript
// apps/web/app/(tenant)/forums/page.tsx
import dynamic from 'next/dynamic'
import { getEnabledModules } from '@/lib/tenant'

// Module components are dynamically imported — disabled module code is never sent to the browser
const ForumsModule = dynamic(() => import('@/components/modules/forums'), {
  loading: () => <ModuleSkeleton />,
})

export default async function ForumsPage() {
  const modules = await getEnabledModules()  // server-side, cached
  if (!modules.includes('forums')) notFound()
  return <ForumsModule />
}
```

---

## 6. Data Architecture

### Core Entity Relationships

```
tenants
  └── members (tenant_id, user_id, role, joined_at)
        └── users (id, email, display_name, avatar_url, social_handles[])

Module Data (all scoped by tenant_id):

forums_categories (tenant_id, name, slug, parent_id, visibility)
  └── forums_threads (tenant_id, category_id, author_id, title, body:jsonb, status)
        └── forums_posts (tenant_id, thread_id, author_id, body:jsonb, parent_id)
              └── forums_reactions (tenant_id, post_id, member_id, emoji)

ideas (tenant_id, author_id, title, body:jsonb, status, vote_count, merged_into_id)
  ├── idea_votes (tenant_id, idea_id, member_id)
  ├── idea_comments (tenant_id, idea_id, author_id, body:jsonb, is_official)
  └── idea_status_history (tenant_id, idea_id, status, note, changed_by, changed_at)

events (tenant_id, creator_id, title, body:jsonb, starts_at, ends_at, location:jsonb)
  ├── event_rsvps (tenant_id, event_id, member_id, status)
  └── event_recordings (tenant_id, event_id, video_url, duration_seconds)

courses (tenant_id, creator_id, title, description, cover_image_url, is_published)
  └── course_lessons (tenant_id, course_id, title, body:jsonb, video_url, sort_order)
        └── course_enrollments (tenant_id, course_id, member_id, completed_lesson_ids[])

webinars (tenant_id, creator_id, title, starts_at, stream_url, status)
  ├── webinar_registrations (tenant_id, webinar_id, member_id)
  ├── webinar_qa (tenant_id, webinar_id, member_id, question, answer, answered_at)
  └── webinar_polls (tenant_id, webinar_id, question, options:jsonb, results:jsonb)

kb_articles (tenant_id, author_id, title, body:jsonb, visibility, category_id)
  └── kb_article_versions (tenant_id, article_id, body:jsonb, version_number, created_by)

social_intel_keywords (tenant_id, term, type: brand|competitor|custom, platforms[])
social_intel_mentions (tenant_id, platform, external_id, author_handle, content_url,
                        published_at, sentiment: positive|negative|neutral|mixed,
                        sentiment_score float, keyword_matched, raw_metadata:jsonb)
social_intel_alerts (tenant_id, alert_type, triggered_at, acknowledged_at, channels:jsonb)

Cross-cutting:
notifications (tenant_id, member_id, type, payload:jsonb, read_at, created_at)
audit_log (tenant_id, actor_id, action, resource_type, resource_id, metadata:jsonb, created_at)
webhooks (tenant_id, url, events[], secret, enabled)
```

### Database Client with Tenant Context

```typescript
// packages/db/src/client.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export function createTenantDb(tenantId: string) {
  return drizzle(pool, {
    schema,
    // Every query executed through this client automatically has tenant context
    // via a connection-level wrapper
  })
}
```

### ClickHouse Analytics Schema

ClickHouse stores time-series analytics data for dashboards and attribution (post-MVP).

```sql
-- Community engagement events (high-volume append-only)
CREATE TABLE community_events (
  tenant_id     UUID,
  member_id     UUID,
  event_type    LowCardinality(String),  -- 'post.created', 'idea.voted', 'event.attended'
  module        LowCardinality(String),  -- 'forums', 'ideas', 'events'
  resource_id   UUID,
  properties    Map(String, String),
  occurred_at   DateTime64(3),
  date          Date MATERIALIZED toDate(occurred_at)
) ENGINE = MergeTree()
PARTITION BY (tenant_id, date)
ORDER BY (tenant_id, occurred_at, member_id);

-- Social intelligence time-series
CREATE TABLE social_mention_hourly (
  tenant_id        UUID,
  platform         LowCardinality(String),
  keyword_group    LowCardinality(String),
  hour             DateTime,
  mention_count    UInt32,
  positive_count   UInt32,
  negative_count   UInt32,
  neutral_count    UInt32,
  avg_sentiment    Float32
) ENGINE = SummingMergeTree()
ORDER BY (tenant_id, platform, keyword_group, hour);
```

---

## 7. API Layer

### Hono with OpenAPI via Zod

```typescript
// apps/api/src/modules/forums/routes.ts
import { createRoute, z } from '@hono/zod-openapi'
import { requireModule } from '../../middleware/module'
import { requireAuth } from '../../middleware/auth'

const createThreadSchema = z.object({
  title:      z.string().min(1).max(500),
  body:       z.any(),            // Tiptap JSON
  categoryId: z.string().uuid(),
})

export const createThreadRoute = createRoute({
  method: 'post',
  path: '/forums/threads',
  middleware: [requireAuth, requireModule('forums')],
  request: { body: { content: { 'application/json': { schema: createThreadSchema } } } },
  responses: {
    201: { description: 'Thread created', content: { 'application/json': { schema: threadResponseSchema } } },
    403: { description: 'Module not enabled or insufficient permissions' },
  },
})
```

### GraphQL (Post-Beta)

A GraphQL layer sits in front of the REST API for complex queries (e.g., fetching a member's full profile including forum posts, idea votes, event attendance, and social mentions in one query). Implemented with `@hono/graphql-server` + `graphql-yoga`.

### API Rate Limiting

Per-tenant rate limits enforced at the API gateway level using Upstash Redis token buckets:
- Starter: 100 req/min per API key
- Growth: 1,000 req/min
- Enterprise: Configurable

---

## 8. Social Listening Pipeline

### Architecture Overview

```
External Platforms (Twitter, Reddit, LinkedIn, etc.)
         │
         │ (HTTP polling / streaming / webhooks)
         ▼
┌─────────────────────┐
│  Platform Adapters  │  (apps/social-pipeline/src/connectors/)
│  (12+ connectors)   │
└────────┬────────────┘
         │ Raw mention data
         ▼
┌─────────────────────┐
│  Ingestion Queue    │  Cloudflare Queues (per-platform)
│  (per-platform)     │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Deduplication      │  Upstash Redis Bloom filter + PostgreSQL unique constraint
└────────┬────────────┘
         │ New mention
         ▼
┌─────────────────────┐
│  NLP Pipeline       │
│  1. Sentiment       │  Cloudflare Workers AI (edge inference, ~50ms, no sidecar)
│  2. Language detect │  (v2 option: Python sidecar for improved model accuracy)
│  3. Entity extract  │
└────────┬────────────┘
         │ Enriched mention
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│  PostgreSQL         │     │  OpenSearch          │
│  (social_intel_     │     │  (mention search     │
│   mentions)         │     │   + social inbox)    │
└────────┬────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  ClickHouse         │
│  (hourly aggregates │
│   for dashboards)   │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Alert Engine       │  Evaluates rules, publishes to notification queue
└─────────────────────┘
```

### SocialConnector Interface

```typescript
// apps/social-pipeline/src/connectors/base.ts
export interface MentionResult {
  externalId:    string
  platform:      Platform
  authorHandle:  string
  authorUrl:     string
  contentUrl:    string
  text:          string
  publishedAt:   Date
  engagementCount?: number
  rawMetadata:   Record<string, unknown>
}

export interface SocialConnector {
  platform: Platform
  fetchMentions(
    keywords: string[],
    since: Date,
    options?: FetchOptions
  ): AsyncGenerator<MentionResult>
  healthCheck(): Promise<boolean>
}
```

### Polling Schedule (Cloudflare Workers Cron Triggers)

| Platform | Poll Interval | Rationale |
|----------|--------------|-----------|
| Twitter/X | 5 min | High volume, time-sensitive; API allows |
| Reddit | 10 min | Moderate volume; subreddit polling |
| Hacker News | 15 min | Algolia search API; generous rate limits |
| GitHub Discussions | 15 min | GraphQL API; moderate rate limits |
| LinkedIn | 30 min | Strict API limits; focus on brand pages |
| YouTube | 30 min | Comment polling; Data API v3 |
| G2 / Trustpilot | 60 min | Review sites; lower update frequency |
| TikTok | 60 min | API access restricted; scrape public data |
| Product Hunt | 60 min | RSS + API |

### Deduplication

```typescript
// Two-stage deduplication
// Stage 1: Bloom filter for fast pre-check (O(1), ~0.1% false positive rate)
// Uses Upstash Redis (serverless Redis, compatible with CF Workers edge runtime)
const bloomKey = `bloom:mentions:${tenantId}`
const mentionFingerprint = `${platform}:${externalId}`
const probablyExists = await redis.bf.exists(bloomKey, mentionFingerprint)
if (probablyExists) return  // skip likely duplicate

// Stage 2: PostgreSQL unique constraint as source of truth
try {
  await db.insert(socialIntelMentions).values(mention)
  await redis.bf.add(bloomKey, mentionFingerprint)
} catch (e) {
  if (isUniqueConstraintError(e)) return  // confirmed duplicate
  throw e
}
```

### NLP — Cloudflare Workers AI (v1)

Sentiment inference runs directly in the Cloudflare Worker using the Workers AI binding — no sidecar service, no separate deployment, ~50ms edge latency.

```typescript
// apps/social-pipeline/src/sentiment.ts
export async function classifySentiment(
  env: Env,
  texts: string[]
): Promise<SentimentResult[]> {
  const results = await Promise.all(
    texts.map((text) =>
      env.AI.run('@cf/huggingface/distilbert-sst-2-int8', { text })
    )
  )
  return results.map((r) => ({
    label: r.label.toLowerCase() as 'positive' | 'negative' | 'neutral',
    score: r.score,
  }))
}
```

**v2 upgrade path**: If model accuracy on B2B domain text requires improvement, a Python sidecar (FastAPI + ONNX Runtime, `cardiffnlp/twitter-roberta-base-sentiment`) can be introduced as an external service and called via HTTP. The `classifySentiment` interface stays the same — only the implementation changes.

### Alert Engine

Alerts are evaluated after each batch of mentions is ingested:

```typescript
// Spike detection: compare current hour to rolling 7-day average
async function evaluateSpikeAlert(tenantId: string, platform: Platform) {
  const currentHour = await getMentionCountForHour(tenantId, platform, new Date())
  const avgHour = await getRollingAvgMentionCount(tenantId, platform, 7)  // days

  const alertConfig = await getAlertConfig(tenantId, 'volume_spike')
  if (currentHour > avgHour * alertConfig.multiplierThreshold) {
    await createAlert(tenantId, 'volume_spike', { platform, currentHour, avgHour })
    await notifyChannels(tenantId, alertConfig.channels, alert)
  }
}

// Crisis detection: negative sentiment ratio in rolling window
async function evaluateCrisisAlert(tenantId: string) {
  const window = await getMentionSentimentWindow(tenantId, 4)  // hours
  const negativeRatio = window.negative / window.total
  const alertConfig = await getAlertConfig(tenantId, 'crisis')
  if (negativeRatio > alertConfig.negativeThreshold && window.total > alertConfig.minVolume) {
    await createAlert(tenantId, 'crisis', { negativeRatio, window })
    await notifyChannels(tenantId, alertConfig.channels, alert)
  }
}
```

---

## 9. Auth & Identity

### Authentication Methods

Auth is fully delegated to **Supabase Auth** — no custom JWT implementation.

1. **Email/password** — Managed by Supabase Auth; email verification, password reset, rate limiting included
2. **Social login** — Google, GitHub, LinkedIn OAuth via Supabase Auth (OAuth 2.0 PKCE flow); configured per-project in Supabase dashboard
3. **SSO: SAML 2.0** — Available via Supabase Auth (Enterprise tier); per-tenant IdP configuration; JIT provisioning
4. **SSO: OIDC** — Available via Supabase Auth (Enterprise tier); standard code flow
5. **API keys** — For M2M and integrations; scoped permissions; per-tenant (custom implementation on top of Supabase)

### Session Management

- Supabase Auth issues JWTs (RS256-signed); verified via Supabase JWKS endpoint
- Session cookies managed by `@supabase/ssr` in the Next.js app (server-side cookie handling)
- Cloudflare Worker validates Supabase JWTs by fetching the JWKS from `https://<project>.supabase.co/auth/v1/.well-known/jwks.json`
- No Redis required for session storage — Supabase Auth manages token lifecycle

```typescript
// apps/api/src/middleware/auth.ts — Supabase JWT validation in CF Worker
import { createClient } from '@supabase/supabase-js'

export const authMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) return c.json({ error: 'Invalid token' }, 401)

  c.set('userId', user.id)
  c.set('userEmail', user.email)
  await next()
}
```

### Multi-Tenant RBAC

```typescript
// Permission check pattern — every protected operation uses this
async function requirePermission(
  tenantId: string,
  memberId: string,
  permission: string,
  resourceId?: string
) {
  const memberRoles = await getRolesForMember(tenantId, memberId, resourceId)
  const permissions = await getPermissionsForRoles(tenantId, memberRoles)

  if (!permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`)
  }
}

// Usage in route handler:
await requirePermission(tenantId, memberId, 'forums:post')
```

---

## 10. CRM Integration

### Bidirectional Sync Engine

```
Salesforce/HubSpot                OpenSourceCommunity
─────────────────                 ──────────────────
Contact created/updated  ──────▶  Upsert member profile
Account updated          ──────▶  Update member's account metadata

Member joined community  ──────▶  Create/update Contact in CRM
Post created             ──────▶  Log activity on Contact
Idea voted               ──────▶  Log activity on Contact
Event attended           ──────▶  Log activity on Contact
Sentiment score updated  ──────▶  Update custom CRM field
```

### Implementation

- **Change detection (CRM → UC)**: CRM webhooks (Salesforce Outbound Messages, HubSpot webhook subscriptions) → ingest queue → upsert processing
- **Change detection (UC → CRM)**: Supabase database triggers emit events → Cloudflare Queue → CRM sync Worker processes with retry + backoff
- **Conflict resolution**: Last-write-wins per field, with configurable field ownership (CRM owns "Account Name"; UC owns "Community Engagement Score")
- **Field mapping config**: Per-tenant UI where admins map CRM fields to UC member fields
- **Rate limiting**: Salesforce API rate limits (15K calls/day for standard orgs) enforced via token bucket in Upstash Redis

---

## 11. Search

### OpenSearch Index Structure

```
uc-{tenantId}-content          # Community content (forums, ideas, KB, events, courses)
  Fields: type, title, body_text, author_id, module, tags, created_at, visibility

uc-{tenantId}-members          # Member directory
  Fields: display_name, bio, roles[], linked_handles[], joined_at

uc-{tenantId}-mentions         # Social Intelligence mentions
  Fields: platform, text, author_handle, sentiment, published_at, keyword_matched
```

### Search Architecture

- **Indexing**: Drizzle triggers → Cloudflare Queues indexing worker → OpenSearch bulk API (batched, 500ms debounce)
- **Query routing**: Unified search bar executes one cross-index query; module-specific search queries single index with module filter
- **Autocomplete**: OpenSearch completion suggester on title fields
- **Tenant isolation**: Separate index per tenant (`uc-{tenantId}-*`); no cross-tenant queries possible by index naming

---

## 12. Real-Time Layer

### Supabase Realtime

Real-time events are delivered via **Supabase Realtime** — a managed WebSocket broadcast and presence layer backed by PostgreSQL logical replication. This replaces the custom WebSocket hub and Redis pub/sub approach.

```typescript
// apps/web/src/lib/realtime.ts — subscribing to tenant-scoped notifications
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Subscribe to new notifications for the current member
supabase
  .channel(`notifications:${tenantId}:${memberId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `member_id=eq.${memberId}`,
    },
    (payload) => handleNewNotification(payload.new)
  )
  .subscribe()

// Live webinar Q&A — broadcast channel
supabase
  .channel(`webinar-qa:${webinarId}`)
  .on('broadcast', { event: 'qa.new' }, ({ payload }) => appendQuestion(payload))
  .subscribe()
```

Events are published from the Cloudflare Worker API via Supabase's Realtime broadcast API or by inserting rows that trigger PostgreSQL → Realtime change feeds.

### Real-Time Use Cases

| Feature | Mechanism |
|---------|-----------|
| Notifications (in-app) | Supabase Realtime — postgres_changes on `notifications` table |
| Social inbox new mentions | Supabase Realtime — postgres_changes on `social_intel_mentions` |
| Live webinar Q&A | Supabase Realtime broadcast channel per webinar |
| Live poll results | Supabase Realtime broadcast channel per webinar |
| Moderation queue updates | Supabase Realtime — postgres_changes scoped to moderator role |
| Crisis alert | Supabase Realtime push to admins + email/Slack via Resend |

---

## 13. Infrastructure

### Cloudflare + Supabase Architecture

No Kubernetes, no Terraform, no containers to manage for v1.

```
Cloudflare (CDN + WAF + DDoS)
    │
    ├── Cloudflare Pages          — Next.js frontend (push to git → auto deploy)
    ├── Cloudflare Workers        — Hono API (deployed via wrangler.toml)
    ├── Cloudflare Queues         — Job queue for social pipeline
    ├── Cloudflare Workers Cron   — Scheduled platform polling
    ├── Cloudflare Workers AI     — Edge sentiment inference
    └── Cloudflare R2             — Overflow object storage (optional; Supabase Storage used first)
         │
Supabase (hosted, managed)
    ├── PostgreSQL 16             — Primary OLTP database
    ├── PgBouncer                 — Connection pooling (managed by Supabase)
    ├── Supabase Auth             — All authentication flows
    ├── Supabase Realtime         — WebSocket broadcast + presence
    └── Supabase Storage          — Recordings, course videos, attachments
         │
Upstash Redis                     — Serverless Redis (caching, Bloom filters, rate limiting)
ClickHouse Cloud                  — Analytics OLAP
OpenSearch                        — Full-text search + mention indexing
```

### Deployment

**Frontend (Cloudflare Pages)**
```bash
# push to main → Cloudflare Pages auto-deploys via GitHub integration
# Preview deployments on every PR branch
git push origin main
```

**API (Cloudflare Workers)**
```toml
# apps/api/wrangler.toml
name = "ultimatecommunity-api"
main = "src/index.ts"
compatibility_date = "2025-09-01"

[[queues.producers]]
queue = "social-pipeline"
binding = "SOCIAL_QUEUE"

[ai]
binding = "AI"
```

```bash
wrangler deploy          # deploy to production
wrangler deploy --env staging  # deploy to staging
```

**Supabase**
```bash
supabase link --project-ref <project-id>
supabase db push         # push local migrations to remote
supabase functions deploy  # deploy edge functions (if any)
```

### Why Cloudflare Pages over Vercel

- **Cloudflare Pages**: Free for unlimited deployments; no build-minute charges; bandwidth is free at the edge
- **Vercel**: Build minutes are expensive at scale; charges per GB of bandwidth served; serverless function invocations at $0.60/1M (vs. Cloudflare Workers at $0.50/1M after the included 10M/mo on the $5 plan)
- **Cloudflare Workers**: $5/mo flat for 10M requests included — Vercel Serverless charges $0.60/1M invocations with no free tier above hobby limits
- For a bootstrapped or early-stage product, Cloudflare's pricing model eliminates surprise bills and scales predictably

---

## 14. Observability

### Three Pillars

**Metrics**: Cloudflare Analytics (Workers Analytics Engine)
- Request rate, error rate, latency (p50/p95/p99) per API route via CF Workers Analytics Engine
- Social pipeline ingestion rate, queue depth, Workers AI inference latency
- Supabase dashboard: database connection pool utilization, query duration
- Per-tenant engagement events per minute (ClickHouse queries)

**Logs**: Cloudflare Logpush + Sentry
- Cloudflare Logpush streams Worker logs to R2 or an external SIEM
- All API requests: `{tenantId, method, path, statusCode, durationMs, memberId}`
- Social pipeline: `{platform, batchSize, mentionsIngested, aiDurationMs, errors}`
- Sentry captures exceptions with full stack trace and request context
- (Alternative: Grafana + Loki + Tempo if deeper tracing is needed at scale)

**Traces**: Sentry Performance / OpenTelemetry
- Distributed traces from API request → database query → external API calls
- Especially important for social pipeline: trace a mention from connector fetch → Workers AI → write → alert

### Key Dashboards

1. **Platform Health**: request throughput, error rate, p99 latency, active tenants
2. **Social Pipeline**: ingestion rate by platform, queue depth, NLP latency, alert trigger rate
3. **Business Metrics**: new tenants, DAU/MAU, posts/day, mentions/day (ClickHouse queries)
4. **Tenant Health**: per-tenant engagement metrics for customer success team

### Alerting Rules

- Error rate >1% for 5 minutes → PagerDuty (P1)
- API p99 latency >2s for 5 minutes → PagerDuty (P2)
- Social pipeline queue depth >10K for 15 minutes → Slack (P3)
- Database CPU >80% for 10 minutes → Slack (P2)
- Workers AI error rate >5% for 10 minutes → PagerDuty (P2)

---

## 15. Security

### Defense in Depth

| Layer | Controls |
|-------|---------|
| Edge (Cloudflare) | WAF, DDoS protection, rate limiting, bot mitigation |
| API | JWT validation, rate limiting per tenant, input validation (Zod) |
| Application | Permission checks on every operation, tenant context injection |
| Database | PostgreSQL RLS, parameterized queries (Drizzle), no raw SQL strings |
| Infrastructure | Cloudflare Zero Trust; Supabase project-level access controls; encrypted storage (Supabase + R2); no public DB exposure |
| Data | Encryption at rest (AES-256), encryption in transit (TLS 1.3+) |

### Automated Security Tests

```typescript
// CI: Tenant isolation test suite
// Creates two tenants, creates data in each, asserts zero cross-leakage

describe('tenant isolation', () => {
  let tenantA: Tenant, tenantB: Tenant

  beforeAll(async () => {
    tenantA = await createTestTenant()
    tenantB = await createTestTenant()
    await createForumThread(tenantA, 'secret thread A')
    await createForumThread(tenantB, 'secret thread B')
  })

  test('tenant B cannot read tenant A threads', async () => {
    const response = await apiClient
      .as(tenantB)
      .get('/forums/threads')
    expect(response.body.data).not.toContainEqual(
      expect.objectContaining({ title: 'secret thread A' })
    )
  })

  // Repeat for every resource type...
})
```

### SOC 2 Type II Readiness Checklist (Target: v2.0)

- [ ] Audit logging: all admin actions, all data access logged to immutable log store
- [ ] Access control review: quarterly access review process documented
- [ ] Incident response: documented IR plan, tabletop exercise completed
- [ ] Penetration testing: annual external pen test, critical/high findings resolved before GA
- [ ] Vendor security review: Salesforce, HubSpot, Supabase, Cloudflare, Upstash reviewed
- [ ] GDPR: DPIA completed, DPA agreements with all processors, DPO designated

---

## 16. Development Phases

### Phase 1: Foundation

**Goal**: Core infrastructure + Forums + Knowledge Base running in production with design partners.

**Work streams**:

*Infrastructure*
- [ ] Turborepo monorepo setup with `pnpm workspaces`
- [ ] `packages/db`: Drizzle schema for tenants, users, members, tenant_modules
- [ ] Supabase project setup (supabase CLI); PostgreSQL with RLS policies + test suite for tenant isolation
- [ ] Cloudflare Workers project setup (`wrangler.toml`); Cloudflare Pages connected to GitHub repo
- [ ] Upstash Redis instance provisioned; Cloudflare Queues configured
- [ ] GitHub Actions CI: build, test, lint pipeline
- [ ] Cloudflare setup: CDN, custom domain routing, Workers AI binding

*Core Platform*
- [ ] Hono API server (Cloudflare Workers) with tenant middleware + Supabase JWT validation middleware
- [ ] Email/password auth + Google/GitHub/LinkedIn social login via Supabase Auth
- [ ] Session management via `@supabase/ssr` in Next.js; Supabase Auth handles token lifecycle
- [ ] RBAC: 4 built-in roles, permission check middleware
- [ ] Tenant management API (create, update settings, module enable/disable)
- [ ] Notification system (in-app + email via Resend)
- [ ] Webhook system (create, configure, delivery + retry)
- [ ] REST API with OpenAPI spec generation

*Next.js App*
- [ ] App Router setup with tenant resolution (subdomain → tenant context)
- [ ] Auth pages (login, signup, email verification)
- [ ] Module layout system (sidebar nav, dynamic module loading)
- [ ] Admin: tenant settings, branding, module enable/disable

*Forums Module*
- [ ] Database schema + migrations
- [ ] Categories, threads, posts CRUD API
- [ ] Rich text editor (Tiptap) with code blocks, mentions, embeds
- [ ] Thread moderation queue
- [ ] Reactions, accepted answer, following
- [ ] Search indexing to OpenSearch

*Knowledge Base Module*
- [ ] Database schema + versioning
- [ ] Article creation + version history
- [ ] Category tree management
- [ ] Full-text search + article feedback
- [ ] Forum sidebar integration (KB suggestions in threads)

*Beta Launch*
- [ ] 10–15 design partners onboarded
- [ ] Feedback collection process in place
- [ ] On-call rotation established

---

### Phase 2: Core Differentiation

**Goal**: Ideas module + Events + Social Intelligence MVP + analytics infrastructure.

*Ideas Module*
- [ ] Database schema (ideas, votes, comments, status history)
- [ ] Voting system (idempotent, one vote per member)
- [ ] Status workflow + notifications on status change
- [ ] Merge duplicates, official responses
- [ ] Sort by vote velocity (trending)

*Events Module*
- [ ] Database schema + RSVP system
- [ ] Calendar export (.ics, Google Calendar push)
- [ ] Email reminders (Cloudflare Workers Cron Triggers + Resend)
- [ ] Recording upload + on-demand playback
- [ ] Event analytics

*Social Intelligence — MVP*
- [ ] `apps/social-pipeline` service scaffolding
- [ ] `SocialConnector` interface + base class
- [ ] Twitter/X connector (Elevated API access required)
- [ ] Reddit connector (Pushshift/search API)
- [ ] Hacker News connector (Algolia search API)
- [ ] GitHub Discussions connector (GraphQL API)
- [ ] LinkedIn connector (API access + page monitoring)
- [ ] Ingestion queue + deduplication (Upstash Redis Bloom filter + PG unique constraint)
- [ ] Cloudflare Workers AI sentiment inference (edge, ~50ms, no sidecar for v1)
- [ ] Social Inbox UI + filtering
- [ ] Sentiment trend dashboard
- [ ] Volume spike alerts
- [ ] Keyword configuration admin

*Analytics Infrastructure*
- [ ] ClickHouse setup + community_events schema
- [ ] Event instrumentation (community actions → ClickHouse)
- [ ] Per-module analytics dashboards in Admin
- [ ] social_mention_hourly materialized views

*SAML/OIDC SSO*
- [ ] Enable Supabase Auth Enterprise tier (SAML 2.0 + OIDC built-in)
- [ ] Per-tenant IdP configuration UI (map tenant → Supabase SSO provider)
- [ ] JIT provisioning (Supabase Auth handles first-login member creation)
- [ ] SSO config admin UI
- [ ] Test with Okta, Azure AD, Google Workspace

---

### Phase 3: Full Suite

**Goal**: Full module suite, all social platforms.

*Courses Module*
- [ ] Course + lesson creation (video embed, quizzes)
- [ ] Learning paths (ordered course sequences)
- [ ] Enrollment + progress tracking
- [ ] Certificate generation (PDF via React PDF)
- [ ] Course analytics

*Webinars Module*
- [ ] Webinar creation + Zoom Webinar / YouTube Live integration
- [ ] Registration + calendar integration
- [ ] Live Q&A (WebSocket)
- [ ] Live polls (WebSocket)
- [ ] Recording + on-demand with Q&A transcript
- [ ] Webinar analytics

*Social Intelligence — Full*
- [ ] Remaining platform connectors: YouTube, TikTok, Discord, G2, Trustpilot, Product Hunt
- [ ] Competitor monitoring + share-of-voice UI
- [ ] Advocate identification algorithm + profile cards
- [ ] Advocate action panel (invite, assign)
- [ ] Crisis alert (negative sentiment threshold)
- [ ] Unified member profiles (community + social activity)
- [ ] One-click content creation from mentions

*Custom Domains + White-Label*
- [ ] Custom domain provisioning via Cloudflare API
- [ ] Automatic TLS certificate issuance
- [ ] Audit logging (all admin actions to immutable log)

---

## 17. Key Engineering Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Twitter/X API cost or restriction | High | Platform adapter abstraction; fallback to aggregator APIs; graceful degradation |
| PostgreSQL RLS performance overhead | Medium | RLS adds ~5-15% query overhead; acceptable; mitigate with Upstash Redis caching of hot data; Supabase read replicas for analytics |
| Social pipeline overwhelms primary DB | Medium | Writes go to ClickHouse for analytics; PostgreSQL only stores deduplicated mention records; Cloudflare Queues rate limiting |
| NLP model accuracy on B2B domain text | Medium | CF Workers AI covers v1; Python sidecar upgrade path ready; human correction loop; confidence thresholds |
| Monolith extraction latency when we scale | Low-Medium | Module boundaries are the extraction seams; extract if a module's resource profile diverges significantly from others |
| ClickHouse operational complexity | Low | Start with ClickHouse Cloud (managed); self-host only if cost becomes a driver at scale |

---

## Appendix A: Critical Files to Build First

The following files unlock the most parallelism and unblock all subsequent work:

1. **`packages/db/src/schema/core.ts`** — Tenants, users, members, tenant_modules. Everything depends on this.
2. **`apps/api/src/middleware/tenant.ts`** — Tenant resolution, RLS context injection. Multi-tenancy is worthless without this.
3. **`packages/core/src/module-registry.ts`** — Module registration, dependency validation, route mounting. The plug-and-play backbone.
4. **`apps/social-pipeline/src/connectors/base.ts`** — `SocialConnector` interface. All 12 platform connectors implement this.
5. **`turbo.json` + `pnpm-workspace.yaml`** — Turborepo monorepo configuration. Gets the build system working so all squads can move.

## Appendix B: Local Development

**Prerequisites**: Supabase CLI, Node.js 22, pnpm 9, Wrangler CLI

```bash
# Clone and install
git clone https://github.com/your-org/ultimatecommunity
cd ultimatecommunity
corepack enable && pnpm install

# Start local Supabase stack (PostgreSQL 16 + Auth + Realtime + Storage + Studio)
supabase start
# Supabase Studio: http://localhost:54323
# PostgreSQL:      localhost:54322
# Auth:            http://localhost:54321

# Push schema / run migrations
supabase db push   # or: pnpm --filter db migrate

# Start all apps in parallel via Turborepo
pnpm dev
# web: http://localhost:3000  (Next.js via @cloudflare/next-on-pages, wrangler pages dev)
# api: http://localhost:3001  (Hono on CF Workers, wrangler dev)

# Run tests
pnpm test         # all packages
pnpm test:ci      # with coverage + tenant isolation suite

# Stop local Supabase
supabase stop
```
