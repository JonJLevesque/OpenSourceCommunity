import type { ModuleDefinition } from '@osc/core'
import { IDEAS_PERMISSIONS, Events } from '@osc/core'
import { registerIdeasRoutes } from './routes'

export const ideasModule: ModuleDefinition = {
  id: 'ideas',
  name: 'Ideas & Feature Requests',
  version: '1.0.0',
  description: 'Structured product feedback with voting and status tracking',
  dependencies: [],
  registerRoutes: registerIdeasRoutes,
  permissions: IDEAS_PERMISSIONS,
  emits: [Events.IDEA_CREATED, Events.IDEA_VOTED, Events.IDEA_STATUS_CHANGED],
  listens: {
    [Events.SI_MENTION_RECEIVED]: async ({ tenantId, payload }) => {
      // Social intel integration: mentions can be linked to ideas
      console.log(`[ideas] New mention received — can be converted to idea in tenant ${tenantId}`)
    },
  },
}
