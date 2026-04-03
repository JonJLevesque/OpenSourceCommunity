import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Events Settings — Admin' }

interface EventRow {
  event: {
    id: string
    title: string
    startsAt: string
    endsAt: string
    status: 'draft' | 'published' | 'cancelled'
    isVirtual: boolean
    isFeatured: boolean
    maxAttendees: number | null
  }
  rsvpCount: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function EventsSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // Fetch all events (admin sees drafts too)
  const result = (await apiGet<{ data: EventRow[] }>('/api/events?limit=50', token, 0)) ?? { data: [] }
  const eventRows = Array.isArray(result) ? result : (result.data ?? [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-surface-foreground">Events Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage community events. Create and edit events from the Events section.
          </p>
        </div>
        <Link
          href="/events/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + New event
        </Link>
      </div>

      {eventRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No events yet.</p>
          <Link href="/events/new" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
            Create your first event →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Event</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Date</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground md:table-cell">Status</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">RSVPs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {eventRows.map(({ event, rsvpCount }) => (
                <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/events/${event.id}`} className="font-medium text-surface-foreground hover:text-brand transition-colors">
                      {event.title}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      {event.isVirtual && <span className="text-xs text-muted-foreground">Virtual</span>}
                      {event.isFeatured && <Badge variant="default" className="text-[10px] py-0">Featured</Badge>}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                    {formatDate(event.startsAt)}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Badge variant={event.status === 'published' ? 'success' : event.status === 'cancelled' ? 'destructive' : 'secondary'}>
                      {event.status}
                    </Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                    {rsvpCount}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-medium text-surface-foreground">Manage events</p>
        <p className="mt-1 text-xs text-muted-foreground">
          To create, edit, or cancel events, visit the{' '}
          <Link href="/events" className="text-brand hover:underline">Events section →</Link>
        </p>
      </div>
    </div>
  )
}
