import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invite Member' }

export default function InviteMemberPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-surface-foreground">Invite member</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Member invitations coming soon.</p>
      </div>
    </div>
  )
}
