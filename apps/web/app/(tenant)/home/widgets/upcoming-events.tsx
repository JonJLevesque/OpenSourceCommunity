import Link from 'next/link'
import { Calendar, MapPin, Video, Users } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRow {
  event: {
    id: string
    title: string
    startsAt: string
    endsAt: string
    timezone: string
    coverImageUrl?: string
    location: { type: 'virtual' | 'irl'; url?: string; address?: string }
    tags: string[]
    status: string
  }
  rsvpCount: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GRADIENTS = [
  'from-brand/60 to-violet-500/80',
  'from-rose-400 to-orange-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
]

function gradientForId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}

function formatEventDate(iso: string, tz: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: tz,
    })
  } catch {
    return new Date(iso).toLocaleDateString()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function UpcomingEvents({ token }: { token: string | undefined }) {
  let rows: EventRow[] = []

  try {
    rows = await apiGet<EventRow[]>('/api/events', token, 120)
  } catch {
    return null
  }

  if (rows.length === 0) return null

  const events = rows.slice(0, 3)

  return (
    <WidgetShell
      title="Upcoming Events"
      icon={<Calendar className="h-4 w-4" />}
      href="/events"
      hrefLabel="All events"
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map(({ event, rsvpCount }) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border hover:border-brand/30 hover:shadow-md transition-all"
          >
            {/* Cover */}
            <div className="relative h-28 overflow-hidden">
              {event.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.coverImageUrl}
                  alt={event.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className={`h-full w-full bg-gradient-to-br ${gradientForId(event.id)}`} />
              )}
              {/* Location badge overlay */}
              <div className="absolute bottom-2 left-2">
                <Badge
                  variant={event.location.type === 'virtual' ? 'blue' : 'success'}
                  className="text-[10px] gap-1"
                >
                  {event.location.type === 'virtual'
                    ? <><Video className="h-2.5 w-2.5" />Virtual</>
                    : <><MapPin className="h-2.5 w-2.5" />In-Person</>
                  }
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="text-xs text-muted-foreground">
                {formatEventDate(event.startsAt, event.timezone)}
              </p>
              <p className="text-sm font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors leading-snug">
                {event.title}
              </p>
              <div className="mt-auto flex items-center gap-1 pt-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  {rsvpCount} {rsvpCount === 1 ? 'RSVP' : 'RSVPs'}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </WidgetShell>
  )
}
