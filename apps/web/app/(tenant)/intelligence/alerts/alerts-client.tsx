'use client'

import { useState, useTransition } from 'react'

// ─── Resolve Button ───────────────────────────────────────────────────────────

export function ResolveAlertButton({ alertId }: { alertId: string }) {
  const [isPending, startTransition] = useTransition()
  const [resolved, setResolved] = useState(false)

  function handleResolve() {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/intelligence/alerts/${alertId}/resolve`, { method: 'PATCH' })
        if (res.ok) setResolved(true)
      } catch {
        // ignore
      }
    })
  }

  if (resolved) {
    return <span className="flex-shrink-0 text-xs text-emerald-600 font-medium">Resolved ✓</span>
  }

  return (
    <button
      type="button"
      onClick={handleResolve}
      disabled={isPending}
      className="flex-shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
    >
      {isPending ? '…' : 'Resolve'}
    </button>
  )
}

// ─── Notification Preferences ─────────────────────────────────────────────────

interface NotifChannels {
  email: boolean
  slack: boolean
  inApp: boolean
}

export function NotificationPreferences({ initial }: { initial: NotifChannels }) {
  const [channels, setChannels] = useState<NotifChannels>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function toggle(key: keyof NotifChannels) {
    const updated = { ...channels, [key]: !channels[key] }
    setChannels(updated)
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/intelligence/alert-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationChannels: updated }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const rows: { key: keyof NotifChannels; label: string; description: string }[] = [
    { key: 'email', label: 'Email notifications', description: 'Receive alerts via email when triggered' },
    { key: 'slack', label: 'Slack notifications', description: 'Post alerts to a Slack channel' },
    { key: 'inApp', label: 'In-app notifications', description: 'Show a banner inside the platform' },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-foreground">Notification Preferences</h3>
        {saved && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium text-surface-foreground">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={channels[row.key]}
              onClick={() => toggle(row.key)}
              disabled={saving}
              className={[
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60',
                channels[row.key] ? 'bg-brand' : 'bg-muted',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-3.5 w-3.5 rounded-full bg-card shadow-sm transition-transform',
                  channels[row.key] ? 'translate-x-4' : 'translate-x-0.5',
                ].join(' ')}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
