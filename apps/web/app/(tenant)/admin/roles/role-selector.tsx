'use client'
import { useState } from 'react'
import { apiClientPatch } from '@/lib/api-client'

type MemberRole = 'guest' | 'member' | 'moderator' | 'org_admin'

export function RoleSelector({
  memberId,
  currentRole,
  token: _token,
}: {
  memberId: string
  currentRole: MemberRole
  token: string
}) {
  const [role, setRole] = useState<MemberRole>(currentRole)
  const [saving, setSaving] = useState(false)

  async function handleChange(newRole: MemberRole) {
    if (newRole === role) return
    setSaving(true)
    try {
      await apiClientPatch(`/api/admin/members/${memberId}/role`, { role: newRole })
      setRole(newRole)
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value as MemberRole)}
      disabled={saving}
      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    >
      <option value="guest">Guest</option>
      <option value="member">Member</option>
      <option value="moderator">Moderator</option>
      <option value="org_admin">Admin</option>
    </select>
  )
}
