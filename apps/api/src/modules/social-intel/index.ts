import type { ModuleDefinition } from '@osc/core'
import { registerSocialIntelRoutes } from './routes'

export const socialIntelModule: ModuleDefinition = {
  id: 'social-intel',
  name: 'Social Intelligence',
  version: '1.0.0',
  description: 'Cross-platform social listening, sentiment analysis, and alerts',
  dependencies: [],
  registerRoutes: registerSocialIntelRoutes,
  permissions: [
    { id: 'social-intel:view', description: 'View mentions and sentiment', defaultRoles: ['org_admin', 'moderator'] },
    { id: 'social-intel:manage', description: 'Manage keyword groups and resolve alerts', defaultRoles: ['org_admin'] },
  ],
  emits: ['social-intel:alert_triggered', 'social-intel:mention_actioned'],
  listens: {},
}
