import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { registry } from '@osc/core'
import type { HonoEnv } from '@osc/core'
import { tenantMiddleware } from './middleware/tenant'
import { authMiddleware } from './middleware/auth'
// Module imports
import { forumsModule } from './modules/forums'
import { ideasModule } from './modules/ideas'
import { eventsModule } from './modules/events'
import { kbModule } from './modules/kb'
import { socialIntelModule } from './modules/social-intel'
import { coursesModule } from './modules/courses'
import { webinarsModule } from './modules/webinars'
import { coreRoutes } from './core/routes'
import { setupRoutes } from './core/setup'
import { registerInternalRoutes } from './core/internal-routes'
import { registerChatRoutes } from './modules/chat'
import { registerAdminRoutes } from './modules/admin/routes'
import { processEmailDigest } from './lib/email/digest-worker'

const app = new Hono<HonoEnv>()

// Global middleware
app.use('*', logger())
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = c.env.CORS_ORIGINS?.split(',').map((s: string) => s.trim())
      ?? ['http://localhost:3001', 'http://localhost:3000']
    if (!origin) return allowed[0]!
    return allowed.some((a: string) => origin === a || (a.startsWith('*.') && origin.endsWith(a.slice(1))))
      ? origin : allowed[0]!
  },
}))

// Public setup endpoint — must be registered BEFORE tenantMiddleware
setupRoutes(app)

// Internal Worker-to-Worker routes (validated by shared secret, not user JWT)
registerInternalRoutes(app)

app.use('*', tenantMiddleware)
app.use('/api/*', authMiddleware)

// Register modules
registry.register(forumsModule)
registry.register(ideasModule)
registry.register(eventsModule)
registry.register(kbModule)
registry.register(socialIntelModule)
registry.register(coursesModule)
registry.register(webinarsModule)
// Mount all registered module routes
registry.mountRoutes(app)

// Core routes (always active)
coreRoutes(app)

// Chat routes (always active — tenant module guard is handled client-side via sidebar)
registerChatRoutes(app)

// Admin routes (analytics, audit log, content reports)
registerAdminRoutes(app)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))

// Error handler
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default {
  fetch: app.fetch.bind(app),
  async scheduled(_event: ScheduledEvent, env: HonoEnv['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(processEmailDigest(env))
  },
}

export { app }
