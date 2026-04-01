import type { ModuleDefinition } from '@osc/core'
import { KB_PERMISSIONS, Events } from '@osc/core'
import { registerKbRoutes } from './routes'

export const kbModule: ModuleDefinition = {
  id: 'kb',
  name: 'Knowledge Base',
  version: '1.0.0',
  description: 'Versioned knowledge base articles with categories, search, and feedback',
  dependencies: [],
  registerRoutes: registerKbRoutes,
  permissions: KB_PERMISSIONS,
  emits: [Events.KB_ARTICLE_PUBLISHED],
  listens: {},
}
