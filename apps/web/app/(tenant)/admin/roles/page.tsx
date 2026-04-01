import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { RoleSelector } from './role-selector'

export const metadata: Metadata = { title: 'Roles \u2014 Admin' }

type MemberRole = 'guest' | 'member' | 'moderator' | 'org_admin'

interface Member {
  id: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  role: MemberRole
  createdAt: string
}

const ROLE_BADGE: Record<MemberRole, { label: string; className: string }> = {
  guest: { label: 'Guest', className: 'bg-muted text-muted-foreground' },
  member: { label: 'Member', className: 'bg-blue-50 text-blue-700' },
  moderator: { label: 'Moderator', className: 'bg-amber-50 text-amber-700' },
  org_admin: { label: 'Admin', className: 'bg-brand/5 text-brand' },
}

export default async function RolesPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let members: Member[] = []
  try {
    members = await apiGet<Member[]>('/api/members?limit=100', token, 30)
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Roles &amp; Permissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign roles to members. Admins can manage modules and members. Moderators can review flagged content.
        </p>
      </div>

      {/* Role descriptions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {([
          { role: 'org_admin', label: 'Admin', desc: 'Full access to all settings', className: 'border-brand/30 bg-brand/5' },
          { role: 'moderator', label: 'Moderator', desc: 'Can review and remove content', className: 'border-amber-200 bg-amber-50' },
          { role: 'member', label: 'Member', desc: 'Standard community access', className: 'border-blue-200 bg-blue-50' },
          { role: 'guest', label: 'Guest', desc: 'Read-only, limited access', className: 'border-border bg-muted' },
        ] as const).map((r) => (
          <div key={r.role} className={['rounded-xl border p-4', r.className].join(' ')}>
            <p className="text-sm font-semibold text-surface-foreground">{r.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Members table */}
      {members.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted text-xs text-muted-foreground">
                <th className="py-3 pl-5 pr-3 text-left font-medium">Member</th>
                <th className="px-3 py-3 text-left font-medium">Current role</th>
                <th className="py-3 pl-3 pr-5 text-right font-medium">Change role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((member) => {
                const badge = ROLE_BADGE[member.role] ?? ROLE_BADGE.member
                return (
                  <tr key={member.id} className="hover:bg-muted transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt={member.displayName} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand flex-shrink-0">
                            {member.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-surface-foreground">{member.displayName}</p>
                          {member.username && <p className="text-xs text-muted-foreground">@{member.username}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', badge.className].join(' ')}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <RoleSelector memberId={member.id} currentRole={member.role} token={token ?? ''} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}
