import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { NotificationsClient } from './notifications-client'

export const metadata: Metadata = { title: 'Notification Preferences' }

interface EmailPref {
  eventType: string
  enabled: boolean
  frequency: 'instant' | 'daily' | 'weekly' | 'never'
}

export default async function NotificationPreferencesPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let prefs: EmailPref[] = []
  try {
    prefs = await apiGet<EmailPref[]>('/api/me/email-preferences', token, 0)
  } catch {}

  const prefMap = Object.fromEntries(prefs.map(p => [p.eventType, p]))
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email notifications"
        description="Choose which events send you an email, and how often."
      />
      <NotificationsClient
        initialPrefs={prefMap}
        token={token ?? ''}
        apiUrl={apiUrl}
      />
    </div>
  )
}
