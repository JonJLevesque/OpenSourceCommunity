import type { MemberRole, PermissionDefinition } from './types'

// Built-in permissions per module
export const CORE_PERMISSIONS: PermissionDefinition[] = [
  { id: 'core:members.read', description: 'View member profiles', defaultRoles: ['org_admin','moderator','member','guest'] },
  { id: 'core:members.manage', description: 'Invite, remove, change roles', defaultRoles: ['org_admin'] },
  { id: 'core:settings.manage', description: 'Manage workspace settings', defaultRoles: ['org_admin'] },
  { id: 'core:modules.manage', description: 'Enable/disable modules', defaultRoles: ['org_admin'] },
  { id: 'core:integrations.manage', description: 'Configure SSO, CRM, webhooks', defaultRoles: ['org_admin'] },
]

export const FORUMS_PERMISSIONS: PermissionDefinition[] = [
  { id: 'forums:read', description: 'View threads and posts', defaultRoles: ['org_admin','moderator','member','guest'] },
  { id: 'forums:post', description: 'Create threads and replies', defaultRoles: ['org_admin','moderator','member'] },
  { id: 'forums:moderate', description: 'Pin, lock, archive, move threads', defaultRoles: ['org_admin','moderator'] },
  { id: 'forums:admin', description: 'Manage categories and settings', defaultRoles: ['org_admin'] },
]

export const IDEAS_PERMISSIONS: PermissionDefinition[] = [
  { id: 'ideas:read', description: 'View ideas', defaultRoles: ['org_admin','moderator','member','guest'] },
  { id: 'ideas:create', description: 'Submit ideas', defaultRoles: ['org_admin','moderator','member'] },
  { id: 'ideas:vote', description: 'Vote on ideas', defaultRoles: ['org_admin','moderator','member'] },
  { id: 'ideas:manage', description: 'Change status, merge, respond officially', defaultRoles: ['org_admin'] },
]

export const EVENTS_PERMISSIONS: PermissionDefinition[] = [
  { id: 'events:read', description: 'View events', defaultRoles: ['org_admin','moderator','member','guest'] },
  { id: 'events:rsvp', description: 'RSVP to events', defaultRoles: ['org_admin','moderator','member'] },
  { id: 'events:create', description: 'Create and publish events', defaultRoles: ['org_admin','moderator'] },
  { id: 'events:admin', description: 'Manage all events', defaultRoles: ['org_admin'] },
]

export const KB_PERMISSIONS: PermissionDefinition[] = [
  { id: 'kb:read', description: 'View knowledge base articles', defaultRoles: ['org_admin','moderator','member','guest'] },
  { id: 'kb:write', description: 'Create and edit articles', defaultRoles: ['org_admin','moderator'] },
  { id: 'kb:publish', description: 'Publish articles', defaultRoles: ['org_admin'] },
]

// Helper: check if a role has a permission by default
export function roleHasPermission(role: MemberRole, permissionId: string, allPermissions: PermissionDefinition[]): boolean {
  const perm = allPermissions.find(p => p.id === permissionId)
  return perm?.defaultRoles.includes(role) ?? false
}
