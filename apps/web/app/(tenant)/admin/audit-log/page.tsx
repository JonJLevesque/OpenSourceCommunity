import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Log' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string
  actorName: string
  action: string
  resourceType: string | null
  resourceId: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

const ACTION_CONFIG: Record<string, { label: string; badge: string }> = {
  'module.enabled':       { label: 'Module enabled',        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'module.disabled':      { label: 'Module disabled',       badge: 'bg-muted text-muted-foreground border-border' },
  'member.role_changed':  { label: 'Role changed',          badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  'report.removed':       { label: 'Content removed',       badge: 'bg-red-50 text-red-700 border-red-200' },
  'report.dismissed':     { label: 'Report dismissed',      badge: 'bg-muted text-muted-foreground border-border' },
  'branding.updated':     { label: 'Branding updated',      badge: 'bg-brand/5 text-brand border-brand/20' },
  'invite.sent':          { label: 'Invite sent',           badge: 'bg-blue-50 text-blue-700 border-blue-200' },
}

function actionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { label: action, badge: 'bg-muted text-muted-foreground border-border' }
}

function metadataSummary(action: string, meta: Record<string, unknown>): string | null {
  if (action === 'module.enabled' || action === 'module.disabled') return null
  if (action === 'member.role_changed') {
    return `${meta.from ?? '?'} → ${meta.to ?? '?'}`
  }
  if (action === 'report.removed' || action === 'report.dismissed') {
    return meta.contentType ? `${meta.contentType}` : null
  }
  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AuditLogPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {}
  if (!isAdmin) redirect('/home')

  let entries: AuditEntry[] = []
  try {
    entries = await apiGet<AuditEntry[]>('/api/admin/audit-log?limit=100', token, 0)
  } catch {}

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Audit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">Record of all admin actions in this community</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          ← Back
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">📋</div>
          <p className="text-sm font-medium text-muted-foreground">No audit entries yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Admin actions like enabling modules and changing member roles will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Resource</th>
                <th className="hidden px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Detail</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {entries.map((entry) => {
                const cfg = actionConfig(entry.action)
                const detail = metadataSummary(entry.action, entry.metadata)
                return (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', cfg.badge].join(' ')}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-surface-foreground whitespace-nowrap">
                      {entry.actorName}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground whitespace-nowrap md:table-cell">
                      {entry.resourceType && (
                        <span className="font-mono text-[10px] bg-muted rounded px-1.5 py-0.5">
                          {entry.resourceType}:{entry.resourceId?.slice(0, 8) ?? '?'}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
                      {detail ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {entry.createdAt ? formatDateTime(entry.createdAt) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
