import type { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import type { HonoEnv } from '@osc/core'
import { getClient } from '@osc/db'
import { tenants, users, members, tenantModules } from '@osc/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getEnv } from '../lib/env'

// ─── Schema ───────────────────────────────────────────────────────────────────

const setupSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  description: z.string().max(500).optional().default(''),
  modules: z.array(z.string()).min(1),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminDisplayName: z.string().min(1).max(200).optional(),
})

// ─── Route ────────────────────────────────────────────────────────────────────

export function setupRoutes(app: Hono<HonoEnv>) {
  /**
   * GET /api/setup/status
   * Returns whether setup has already been completed (any tenant exists).
   */
  app.get('/api/setup/status', async (c) => {
    const env = getEnv(c)
    const db = getClient(env.DATABASE_URL)
    const rows = await db.select({ count: sql<number>`count(*)::int` }).from(tenants)
    const setupComplete = (rows[0]?.count ?? 0) > 0
    return c.json({ data: { setupComplete } })
  })

  /**
   * POST /api/setup
   *
   * Public endpoint (no auth, no tenant required) that bootstraps a new
   * community. Locked after the first tenant is created.
   */
  app.post('/api/setup', zValidator('json', setupSchema), async (c) => {
    const env = getEnv(c)
    const { name, slug, description, modules, primaryColor, adminEmail, adminPassword, adminDisplayName } =
      c.req.valid('json')

    const db = getClient(env.DATABASE_URL)
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

    // 1. Guard: lock after first setup ────────────────────────────────────────
    const existingCount = await db.select({ count: sql<number>`count(*)::int` }).from(tenants)
    if ((existingCount[0]?.count ?? 0) > 0) {
      return c.json({ error: 'Setup already completed. Use the admin panel to manage your community.' }, 403)
    }

    // 2. Check if slug already exists ─────────────────────────────────────────
    const existing = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
      columns: { id: true },
    })

    if (existing) {
      return c.json({ error: `A community with slug "${slug}" already exists.` }, 409)
    }

    // 2. Create the Supabase auth user ─────────────────────────────────────────
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // skip confirmation email for setup admin
      user_metadata: {
        full_name: adminDisplayName ?? adminEmail.split('@')[0],
      },
    })

    if (authError || !authData.user) {
      const msg = authError?.message ?? 'Failed to create admin auth user'
      return c.json({ error: msg }, 422)
    }

    const authUserId = authData.user.id

    try {
      // 3. Create the platform `users` row ────────────────────────────────────
      // Use ON CONFLICT DO UPDATE because the auth trigger may have already
      // inserted the row when createUser fired.
      const displayName = adminDisplayName ?? adminEmail.split('@')[0]!
      const [userRow] = await db
        .insert(users)
        .values({ id: authUserId, email: adminEmail, displayName })
        .onConflictDoUpdate({
          target: users.id,
          set: { displayName, email: adminEmail },
        })
        .returning()

      if (!userRow) throw new Error('Failed to insert user row')

      // 4. Create the `tenants` row ────────────────────────────────────────────
      const [tenantRow] = await db
        .insert(tenants)
        .values({
          slug,
          name,
          primaryColor,
          settings: description ? { description } : {},
        })
        .returning()

      if (!tenantRow) throw new Error('Failed to insert tenant row')

      const tenantId = tenantRow.id

      // 5. Create the `members` row (org_admin) ────────────────────────────────
      // Trigger may have already inserted a 'member' row — upsert to org_admin.
      const [memberRow] = await db
        .insert(members)
        .values({
          tenantId,
          userId: userRow.id,
          role: 'org_admin',
          displayName: userRow.displayName,
        })
        .onConflictDoUpdate({
          target: [members.tenantId, members.userId],
          set: { role: 'org_admin' },
        })
        .returning()

      if (!memberRow) throw new Error('Failed to insert member row')

      // 6. Create `tenantModules` rows ─────────────────────────────────────────
      if (modules.length > 0) {
        await db.insert(tenantModules).values(
          modules.map((moduleId) => ({
            tenantId,
            moduleId,
            enabled: true,
            enabledAt: new Date(),
          })),
        )
      }

      // 7. Return success payload ───────────────────────────────────────────────
      return c.json({
        data: {
          tenantId,
          slug: tenantRow.slug,
          adminUserId: userRow.id,
        },
      })
    } catch (err) {
      // Best-effort cleanup: delete the Supabase auth user so the setup can be
      // retried with the same email.
      await supabase.auth.admin.deleteUser(authUserId).catch(() => {})
      console.error('[setup] rollback after error:', err)
      return c.json({ error: 'Setup failed — please try again.' }, 500)
    }
  })
}
