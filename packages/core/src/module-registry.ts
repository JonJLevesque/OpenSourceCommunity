import type { Hono } from 'hono'
import type { ModuleDefinition, ModuleId, HonoEnv } from './types'
import { eventBus } from './events'

export class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>()

  register(module: ModuleDefinition): this {
    this.validateDependencies(module)
    this.modules.set(module.id, module)
    return this
  }

  getModule(id: ModuleId): ModuleDefinition | undefined {
    return this.modules.get(id)
  }

  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  // Mount all module routes onto the Hono app in dependency order
  mountRoutes(app: Hono<HonoEnv>): void {
    const ordered = this.topologicalSort()
    for (const module of ordered) {
      module.registerRoutes(app)
      this.bindEventListeners(module)
      console.log(`[ModuleRegistry] Mounted module: ${module.id} v${module.version}`)
    }
  }

  // Validate a tenant's requested modules are all registered and deps are met
  validateTenantModules(enabledModuleIds: ModuleId[]): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    for (const id of enabledModuleIds) {
      const module = this.modules.get(id)
      if (!module) {
        errors.push(`Unknown module: ${id}`)
        continue
      }
      for (const dep of module.dependencies) {
        if (!enabledModuleIds.includes(dep)) {
          errors.push(`Module '${id}' requires '${dep}' to also be enabled`)
        }
      }
    }
    return { valid: errors.length === 0, errors }
  }

  private validateDependencies(module: ModuleDefinition): void {
    for (const dep of module.dependencies) {
      if (!this.modules.has(dep)) {
        throw new Error(
          `Cannot register module '${module.id}': dependency '${dep}' is not registered. ` +
          `Register '${dep}' first.`
        )
      }
    }
  }

  private bindEventListeners(module: ModuleDefinition): void {
    for (const [eventType, handler] of Object.entries(module.listens)) {
      eventBus.on(eventType, async (payload) => {
        try {
          await handler({ type: eventType, tenantId: '', payload })
        } catch (err) {
          console.error(`[ModuleRegistry] Error in ${module.id} handler for ${eventType}:`, err)
        }
      })
    }
  }

  // Topological sort respecting module.dependencies
  private topologicalSort(): ModuleDefinition[] {
    const visited = new Set<string>()
    const result: ModuleDefinition[] = []

    const visit = (id: string) => {
      if (visited.has(id)) return
      const module = this.modules.get(id)
      if (!module) return
      for (const dep of module.dependencies) visit(dep)
      visited.add(id)
      result.push(module)
    }

    for (const id of this.modules.keys()) visit(id)
    return result
  }
}

// Singleton registry used across the application
export const registry = new ModuleRegistry()
