import type { ModuleDefinition } from '@osc/core'
import { FORUMS_PERMISSIONS, Events } from '@osc/core'
import { registerForumsRoutes } from './routes'

export const forumsModule: ModuleDefinition = {
  id: 'forums',
  name: 'Forums & Discussions',
  version: '1.0.0',
  description: 'Threaded discussions organized by category',
  dependencies: [],
  registerRoutes: registerForumsRoutes,
  permissions: FORUMS_PERMISSIONS,
  emits: [Events.FORUM_THREAD_CREATED, Events.FORUM_POST_CREATED, Events.FORUM_THREAD_RESOLVED],
  listens: {
    [Events.KB_ARTICLE_PUBLISHED]: async ({ tenantId, payload }) => {
      // When a KB article is published, it can be indexed for forum suggestions
      // (cross-module enhancement — gracefully handled if KB is disabled)
      console.log(`[forums] KB article published in tenant ${tenantId}, indexing for suggestions`)
    },
  },
}
