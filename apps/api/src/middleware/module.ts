import type { MiddlewareHandler } from 'hono'
import type { HonoEnv, ModuleId } from '@osc/core'

// Middleware factory: reject request if module is not enabled for this tenant
export function requireModule(moduleId: ModuleId): MiddlewareHandler<HonoEnv> {
  return async (c, next) => {
    const enabledModules = c.get('enabledModules') as ModuleId[]
    if (!enabledModules.includes(moduleId)) {
      return c.json({
        error: `Module '${moduleId}' is not enabled for this workspace`,
        code: 'MODULE_DISABLED',
      }, 403)
    }
    return next()
  }
}
