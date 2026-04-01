import Link from 'next/link'
import { LayoutGrid, Calendar, Globe, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Events' }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventItem {
  id: string
  title: string
  body: Record<string, unknown> | null
  location: { type: 'virtual' | 'irl'; url?: string; address?: string } | null
  startsAt: string
  endsAt: string
  timezone: string
  capacity: number | null
  coverImageUrl: string | null
  tags: string[]
  status: 'draft' | 'published' | 'cancelled'
}

interface EventListRow {
  event: EventItem
  rsvpCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(new Date(iso))
}

function getMonthYear(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function groupByMonth(rows: EventListRow[]): Map<string, EventListRow[]> {
  const map = new Map<string, EventListRow[]>()
  for (const row of rows) {
    const key = getMonthYear(row.event.startsAt)
    const existing = map.get(key) ?? []
    existing.push(row)
    map.set(key, existing)
  }
  return map
}

const COVER_GRADIENTS = [
  'from-brand/60 to-violet-500/80',
  'from-rose-400 to-orange-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
]

function gradientForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length] ?? COVER_GRADIENTS[0] ?? ''
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view = 'grid' } = await searchParams
  const calendarView = view === 'calendar'

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  const role = (session?.user?.app_metadata?.role as string | undefined) ?? 'member'
  const canCreate = role === 'org_admin' || role === 'moderator'

  let rows: EventListRow[] = []
  let fetchError = false

  try {
    rows = await apiGet<EventListRow[]>('/api/events', token)
  } catch {
    fetchError = true
  }

  const grouped = groupByMonth(rows)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        description="Upcoming events in your community"
        action={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center rounded-lg border border-border bg-card p-1">
              <Link
                href="/events?view=grid"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  !calendarView ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Grid
              </Link>
              <Link
                href="/events?view=calendar"
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  calendarView ? 'bg-brand text-white' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                Calendar
              </Link>
            </div>

            {canCreate && (
              <Button asChild>
                <Link href="/events/new">Create event</Link>
              </Button>
            )}
          </div>
        }
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load events. Please try refreshing the page.
        </div>
      )}

      {!fetchError && rows.length === 0 && (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No upcoming events"
          description={
            canCreate
              ? 'Create the first event to get the community together.'
              : "Check back soon — events will appear here when they're scheduled."
          }
          action={
            canCreate ? (
              <Button asChild>
                <Link href="/events/new">Create event</Link>
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Grid view */}
      {!fetchError && rows.length > 0 && !calendarView && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <EventCard key={row.event.id} row={row} />
          ))}
        </div>
      )}

      {/* Calendar view (grouped by month) */}
      {!fetchError && rows.length > 0 && calendarView && (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([month, monthRows]) => (
            <section key={month}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {month}
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                {monthRows.map((row) => (
                  <EventRow key={row.event.id} row={row} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Event Card (Grid view) ────────────────────────────────────────────────────

function EventCard({ row }: { row: EventListRow }) {
  const { event, rsvpCount } = row
  const gradient = gradientForId(event.id)
  const locationType = event.location?.type ?? 'virtual'

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Cover */}
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className={`h-40 w-full bg-gradient-to-br ${gradient}`} />
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        <h2 className="text-sm font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors">
          {event.title}
        </h2>

        <p className="mt-2 text-xs text-muted-foreground">
          {formatEventDate(event.startsAt, event.timezone)}
        </p>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-3">
          <Badge variant={locationType === 'virtual' ? 'blue' : 'success'}>
            {locationType === 'virtual' ? (
              <><Globe className="h-3 w-3 mr-1" />Virtual</>
            ) : (
              <><MapPin className="h-3 w-3 mr-1" />In-person</>
            )}
          </Badge>

          {rsvpCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {rsvpCount.toLocaleString()} attending
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

// ─── Event Row (Calendar view) ────────────────────────────────────────────────

function EventRow({ row }: { row: EventListRow }) {
  const { event, rsvpCount } = row
  const d = new Date(event.startsAt)
  const locationType = event.location?.type ?? 'virtual'
  const day = d.toLocaleDateString('en', { day: 'numeric', timeZone: event.timezone })
  const weekday = d.toLocaleDateString('en', { weekday: 'short', timeZone: event.timezone })
  const time = d.toLocaleTimeString('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  })

  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors"
    >
      {/* Date pill */}
      <div className="flex w-12 flex-shrink-0 flex-col items-center rounded-lg bg-brand/10 py-1.5 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">{weekday}</span>
        <span className="text-lg font-black text-brand leading-none">{day}</span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-surface-foreground line-clamp-1">
          {event.title}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {time} · <span className={locationType === 'virtual' ? 'text-brand' : 'text-emerald-600'}>
            {locationType === 'virtual' ? 'Virtual' : 'In-person'}
          </span>
        </p>
      </div>

      {event.tags.slice(0, 2).map((tag) => (
        <Badge key={tag} variant="secondary" className="hidden sm:inline-flex">
          {tag}
        </Badge>
      ))}

      <span className="text-xs text-muted-foreground flex-shrink-0">
        {rsvpCount.toLocaleString()} RSVPs
      </span>
    </Link>
  )
}
