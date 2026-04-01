import type { MiddlewareHandler } from 'hono'
import type { HonoEnv } from '@osc/core'
import { createClient } from '@supabase/supabase-js'
import { getClient } from '@osc/db'
import { members } from '@osc/db/schema'
import { and, eq } from 'drizzle-orm'

export const authMiddleware: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const authorization = c.req.header('Authorization')

  if (!authorization?.startsWith('Bearer ')) {
    c.set('member', null)
    return next()
  }

  const token = authorization.slice(7)

  // Validate JWT with Supabase
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    c.set('member', null)
    return next()
  }

  // Look up the member record for this tenant
  const db = getClient(c.env.DATABASE_URL)
  const tenantId = c.get('tenantId')

  const member = await db.query.members.findFirst({
    where: and(
      eq(members.tenantId, tenantId),
      eq(members.userId, user.id)
    ),
  })

  c.set('member', member ?? null)
  return next()
}

// Middleware factory: require authentication + optional minimum role
export function requireAuth(minRole?: 'org_admin' | 'moderator' | 'member') {
  return (async (c, next) => {
    const member = c.get('member')
    if (!member) {
      return c.json({ error: 'Authentication required' }, 401)
    }
    if (minRole) {
      const roleOrder: Record<string, number> = { guest: 0, member: 1, moderator: 2, org_admin: 3 }
      if ((roleOrder[member.role] ?? 0) < (roleOrder[minRole] ?? 0)) {
        return c.json({ error: 'Insufficient permissions' }, 403)
      }
    }
    return next()
  }) as MiddlewareHandler<HonoEnv>
}
