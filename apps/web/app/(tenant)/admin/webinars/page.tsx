import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Webinars Settings — Admin' }

interface WebinarRow {
  webinar: {
    id: string
    title: string
    scheduledAt: string
    duration: number
    status: 'draft' | 'scheduled' | 'live' | 'ended' | 'cancelled'
    streamUrl: string | null
    maxRegistrations: number | null
  }
  registrationCount: number
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline' }> = {
  draft:     { label: 'Draft',     variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'default' },
  live:      { label: 'Live',      variant: 'success' },
  ended:     { label: 'Ended',     variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function WebinarsSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const result = (await apiGet<{ data: WebinarRow[]; total: number }>('/api/webinars?limit=50', token, 0)) ?? { data: [], total: 0 }
  const webinarRows: WebinarRow[] = Array.isArray(result) ? result : (result.data ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-foreground">Webinars Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage webinars and live sessions. Stream URLs support Zoom, YouTube Live, or any RTMP link.
          </p>
        </div>
        <Link
          href="/webinars/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + New webinar
        </Link>
      </div>

      {/* Stream URL info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-surface-foreground">Stream Integration</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Each webinar accepts a stream URL — paste a Zoom meeting link, YouTube Live URL, or any
          RTMP/embed URL. Members click through to join. No platform-specific configuration required.
        </p>
      </div>

      {webinarRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No webinars yet.</p>
          <Link href="/webinars/new" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Schedule your first webinar →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Webinar</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Scheduled</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Registrations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {webinarRows.map(({ webinar, registrationCount }) => (
                <tr key={webinar.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/webinars/${webinar.id}`} className="font-medium text-surface-foreground hover:text-brand transition-colors">
                      {webinar.title}
                    </Link>
                    {webinar.streamUrl && (
                      <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">
                        {webinar.streamUrl}
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {formatDate(webinar.scheduledAt)}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Badge variant={STATUS_META[webinar.status]?.variant ?? 'secondary'}>
                      {STATUS_META[webinar.status]?.label ?? webinar.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                    {registrationCount}{webinar.maxRegistrations ? ` / ${webinar.maxRegistrations}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
