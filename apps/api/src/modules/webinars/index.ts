import type { ModuleDefinition } from '@osc/core'
import { registerWebinarsRoutes } from './routes'

export const webinarsModule: ModuleDefinition = {
  id: 'webinars',
  name: 'Webinars',
  version: '1.0.0',
  description: 'Live webinars with Q&A, polls, and recordings',
  dependencies: [],
  registerRoutes: registerWebinarsRoutes,
  permissions: [
    { id: 'webinars:view', description: 'View and register for webinars', defaultRoles: ['org_admin', 'moderator', 'member', 'guest'] },
    { id: 'webinars:manage', description: 'Create and manage webinars', defaultRoles: ['org_admin'] },
  ],
  emits: ['webinars:registered', 'webinars:started', 'webinars:ended'],
  listens: {},
}
