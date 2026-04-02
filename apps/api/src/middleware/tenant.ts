import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '@osc/core'
import { getClient } from '@osc/db'
import { tenants, tenantModules } from '@osc/db/schema'
import { eq, and } from 'drizzle-orm'

// Resolve tenant from subdomain or custom domain header
// Caches result in Worker's in-memory cache (per isolate, short-lived but effective)
const tenantCache = new Map<string, { tenant: HonoEnv['Variables']['tenant']; enabledModules: string[]; cachedAt: number }>()
const CACHE_TTL_MS = 60_000  // 1 minute

export const tenantMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const host = c.req.header('host') ?? ''
  // X-Tenant-Slug header takes highest priority (sent by web app for single-domain deployments)
  const headerSlug = c.req.header('x-tenant-slug')
  const slug = headerSlug || extractSlug(host, c.env.APP_DOMAIN ?? 'localhost', c.env.DEFAULT_TENANT_SLUG)

  if (!slug) {
    return c.json({ error: 'Tenant not found' }, 404)
  }

  // Check cache
  const cached = tenantCache.get(slug)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    c.set('tenantId', cached.tenant.id)
    c.set('tenant', cached.tenant)
    c.set('enabledModules', cached.enabledModules as any)
    return next()
  }

  // Fetch from database
  const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)

  let resolvedTenant = await db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  })

  if (!resolvedTenant) {
    // Try custom domain fallback
    resolvedTenant = await db.query.tenants.findFirst({
      where: eq(tenants.customDomain, host),
    }) ?? undefined
  }

  if (!resolvedTenant) {
    return c.json({ error: 'Tenant not found' }, 404)
  }

  const enabledModuleRows = await db.query.tenantModules.findMany({
    where: and(
      eq(tenantModules.tenantId, resolvedTenant.id),
      eq(tenantModules.enabled, true)
    ),
  })

  const enabledModules = enabledModuleRows.map(r => r.moduleId)

  const tenantForCache = { ...resolvedTenant, settings: (resolvedTenant.settings ?? {}) as Record<string, unknown> }

  // Cache it
  tenantCache.set(slug, {
    tenant: tenantForCache,
    enabledModules,
    cachedAt: Date.now(),
  })

  c.set('tenantId', resolvedTenant.id)
  c.set('tenant', tenantForCache)
  c.set('enabledModules', enabledModules as any)

  return next()
}

function extractSlug(host: string, appDomain = 'localhost', defaultSlug?: string): string | null {
  // Handle: acme.<APP_DOMAIN> -> 'acme'
  // Handle: localhost (any port) -> default slug or 'dev' for local dev
  if (host.includes('localhost') || appDomain === 'localhost') {
    if (host.includes('localhost')) return defaultSlug ?? 'dev'
  }
  const parts = host.split('.')
  if (parts.length >= 3) return parts[0] ?? null
  // Single-domain deployment (e.g. example.com with 2 parts) — use DEFAULT_TENANT_SLUG
  return defaultSlug ?? null
}
