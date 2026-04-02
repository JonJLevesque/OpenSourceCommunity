import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ResolveAlertButton, NotificationPreferences } from './alerts-client'

export const metadata: Metadata = { title: 'Alerts' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Alert {
  id: string
  alertType: string
  payload: Record<string, unknown>
  status: 'open' | 'resolved'
  triggeredAt: string | null
  acknowledgedAt: string | null
}

interface AlertsResponse {
  data: Alert[]
}

interface AlertConfig {
  notificationChannels?: {
    email?: boolean
    slack?: boolean
    inApp?: boolean
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const ALERT_TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  volume_spike: { label: 'Volume Spike', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' },
  negative_surge: { label: 'Negative Surge', badgeClass: 'bg-red-50 text-red-700 border border-red-200' },
  new_mention: { label: 'New Mention', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200' },
  keyword_match: { label: 'Keyword Match', badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200' },
}

function alertTypeBadge(alertType: string) {
  return ALERT_TYPE_CONFIG[alertType] ?? {
    label: alertType.replace(/_/g, ' '),
    badgeClass: 'bg-muted text-muted-foreground border border-border',
  }
}

function payloadSummary(payload: Record<string, unknown>): string {
  if (typeof payload.message === 'string') return payload.message
  return JSON.stringify(payload)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'active' } = await searchParams
  const status = tab === 'resolved' ? 'resolved' : 'open'

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let alerts: Alert[] = []
  try {
    const resp = await apiGet<AlertsResponse>(
      `/api/intelligence/alerts?status=${status}`,
      token,
      0,
    )
    alerts = resp.data ?? []
  } catch {
    // show empty state
  }

  let alertConfig: AlertConfig = {}
  try {
    const resp = await apiGet<{ data: AlertConfig }>('/api/intelligence/alert-config', token, 0)
    alertConfig = resp.data ?? {}
  } catch {
    // use defaults
  }

  const notifChannels = {
    email: alertConfig.notificationChannels?.email ?? true,
    slack: alertConfig.notificationChannels?.slack ?? false,
    inApp: alertConfig.notificationChannels?.inApp ?? true,
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Alerts</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Get notified about unusual mention volume, sentiment spikes, and keyword triggers.
        </p>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        <TabLink href="?tab=active" isActive={tab !== 'resolved'} label="Active" />
        <TabLink href="?tab=resolved" isActive={tab === 'resolved'} label="Resolved" />
      </div>

      {/* ── Alert list ──────────────────────────────────────────────────────── */}
      <AlertList alerts={alerts} isResolved={status === 'resolved'} />

      {/* ── Notification preferences ─────────────────────────────────────────── */}
      <NotificationPreferences initial={notifChannels} />
    </div>
  )
}

// ─── Alert List (server) ─────────────────────────────────────────────────────

function AlertList({ alerts, isResolved }: { alerts: Alert[]; isResolved: boolean }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">🔔</div>
        <p className="text-sm font-semibold text-surface-foreground">
          {isResolved ? 'No resolved alerts' : 'No active alerts'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isResolved
            ? 'Resolved alerts will appear here once you acknowledge active ones.'
            : "You're all caught up. Alerts will appear here when triggered."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} isResolved={isResolved} />
      ))}
    </div>
  )
}

// ─── Tab Link ────────────────────────────────────────────────────────────────

function TabLink({ href, isActive, label }: { href: string; isActive: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={[
        'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-brand text-white shadow-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({ alert, isResolved }: { alert: Alert; isResolved: boolean }) {
  const { label, badgeClass } = alertTypeBadge(alert.alertType)
  const summary = payloadSummary(alert.payload)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize', badgeClass].join(' ')}>
              {label}
            </span>
            {alert.triggeredAt && (
              <span className="text-xs text-muted-foreground">{timeAgo(alert.triggeredAt)}</span>
            )}
          </div>
          <p className="text-sm text-surface-foreground">{summary}</p>
          {isResolved && alert.acknowledgedAt && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Acknowledged {timeAgo(alert.acknowledgedAt)}
            </p>
          )}
        </div>
        {!isResolved && <ResolveAlertButton alertId={alert.id} />}
      </div>
    </div>
  )
}
