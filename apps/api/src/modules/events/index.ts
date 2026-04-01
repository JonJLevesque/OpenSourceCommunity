import type { ModuleDefinition } from '@osc/core'
import { EVENTS_PERMISSIONS, Events } from '@osc/core'
import { registerEventsRoutes } from './routes'

export const eventsModule: ModuleDefinition = {
  id: 'events',
  name: 'Events',
  version: '1.0.0',
  description: 'Community events with RSVPs, recordings, and scheduling',
  dependencies: [],
  registerRoutes: registerEventsRoutes,
  permissions: EVENTS_PERMISSIONS,
  emits: [Events.EVENT_PUBLISHED, Events.EVENT_RSVP],
  listens: {},
}
