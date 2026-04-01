import { createClient } from './client'
import { tenants, tenantModules } from './schema/core'

// ---------------------------------------------------------------------------
// Seed configuration
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const DEV_TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

const DEV_TENANT = {
  id: DEV_TENANT_ID,
  slug: 'dev',
  name: 'Acme Community (Dev)',
  plan: 'growth' as const,
  customDomain: null,
  primaryColor: '#6366f1',
  settings: {},
}

const MVP_MODULES = [
  'forums',
  'ideas',
  'events',
  'courses',
  'webinars',
  'kb',
  'social-intel',
] as const

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

async function seed() {
  const db = createClient(DATABASE_URL!)

  await db
    .insert(tenants)
    .values(DEV_TENANT)
    .onConflictDoNothing()

  const moduleRows = MVP_MODULES.map((moduleId) => ({
    tenantId: DEV_TENANT_ID,
    moduleId,
    enabled: true,
    enabledAt: new Date(),
  }))

  await db
    .insert(tenantModules)
    .values(moduleRows)
    .onConflictDoNothing()

  console.log("Seed complete: tenant 'dev' created with 7 modules enabled")
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
