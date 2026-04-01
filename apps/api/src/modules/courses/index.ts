import type { ModuleDefinition } from '@osc/core'
import { registerCoursesRoutes } from './routes'

export const coursesModule: ModuleDefinition = {
  id: 'courses',
  name: 'Courses & Learning',
  version: '1.0.0',
  description: 'Self-paced courses and learning paths for your community',
  dependencies: [],
  registerRoutes: registerCoursesRoutes,
  permissions: [
    { id: 'courses:view', description: 'View and enroll in courses', defaultRoles: ['org_admin', 'moderator', 'member'] },
    { id: 'courses:manage', description: 'Create and manage courses', defaultRoles: ['org_admin'] },
  ],
  emits: ['courses:lesson_completed', 'courses:course_completed'],
  listens: {},
}
