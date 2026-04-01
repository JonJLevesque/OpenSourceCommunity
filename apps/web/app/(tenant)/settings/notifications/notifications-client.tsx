'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { apiClientPut } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EventPref {
  eventType: string
  enabled: boolean
  frequency: 'instant' | 'daily' | 'weekly' | 'never'
}

interface Props {
  initialPrefs: Record<string, EventPref>
  token: string
  apiUrl: string
}

const EVENT_GROUPS = [
  {
    label: 'Forums',
    events: [
      { value: 'forums:post.created', label: 'New reply to your thread' },
      { value: 'forums:thread.resolved', label: 'Your thread is resolved' },
    ],
  },
  {
    label: 'Ideas',
    events: [
      { value: 'ideas:idea.status_changed', label: 'Your idea status changes' },
      { value: 'ideas:idea.voted', label: 'Someone votes on your idea' },
    ],
  },
  {
    label: 'Events',
    events: [
      { value: 'events:event.published', label: 'New event published' },
    ],
  },
  {
    label: 'Knowledge Base',
    events: [
      { value: 'kb:article.published', label: 'New article published' },
    ],
  },
  {
    label: 'Community',
    events: [
      { value: 'core:member.joined', label: 'New member joins' },
    ],
  },
]

const FREQ_OPTIONS: { value: 'instant' | 'daily' | 'weekly' | 'never'; label: string }[] = [
  { value: 'instant', label: 'Instantly' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never' },
]

export function NotificationsClient({ initialPrefs, token: _token, apiUrl: _apiUrl }: Props) {
  const [prefs, setPrefs] = useState<Record<string, EventPref>>(() => {
    const defaults: Record<string, EventPref> = {}
    for (const group of EVENT_GROUPS) {
      for (const ev of group.events) {
        defaults[ev.value] = initialPrefs[ev.value] ?? {
          eventType: ev.value,
          enabled: true,
          frequency: 'instant',
        }
      }
    }
    return defaults
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setFrequency(eventType: string, frequency: 'instant' | 'daily' | 'weekly' | 'never') {
    setPrefs(prev => ({
      ...prev,
      [eventType]: { ...prev[eventType]!, eventType, enabled: frequency !== 'never', frequency },
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await apiClientPut('/api/me/email-preferences', { preferences: Object.values(prefs) })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {saved && (
        <Alert variant="success">
          <AlertDescription>Notification preferences saved.</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {EVENT_GROUPS.map(group => (
        <Card key={group.label}>
          <CardHeader>
            <CardTitle>{group.label}</CardTitle>
            <CardDescription>Choose how you want to be notified about {group.label.toLowerCase()} activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.events.map(ev => {
                const pref = prefs[ev.value]!
                return (
                  <div key={ev.value} className="flex items-center justify-between gap-4">
                    <p className="text-sm text-surface-foreground">{ev.label}</p>
                    <select
                      value={pref.frequency}
                      onChange={e => setFrequency(ev.value, e.target.value as 'instant' | 'daily' | 'weekly' | 'never')}
                      className="rounded-lg border border-input bg-card px-3 py-1.5 text-sm text-card-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {FREQ_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </div>
    </div>
  )
}
