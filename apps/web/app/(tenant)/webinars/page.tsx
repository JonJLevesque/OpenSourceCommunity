import Link from 'next/link'
import { Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Webinars' }

// ─── Types ────────────────────────────────────────────────────────────────────

export type WebinarStatus = 'draft' | 'scheduled' | 'live' | 'ended'

export interface WebinarSummary {
  webinar: {
    id: string
    title: string
    description: string | null
    scheduledAt: string
    durationMinutes: number | null
    maxAttendees: number | null
    status: WebinarStatus
    createdAt: string
  }
  registrationCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWebinarDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const STATUS_BADGE_VARIANT: Record<WebinarStatus, React.ComponentProps<typeof Badge>['variant']> = {
  draft: 'secondary',
  scheduled: 'default',
  live: 'destructive',
  ended: 'secondary',
}

const STATUS_LABEL: Record<WebinarStatus, string> = {
  draft: 'Draft',
  scheduled: 'Upcoming',
  live: 'Live',
  ended: 'Ended',
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

async function fetchWebinars(
  status: string,
  token: string | undefined,
): Promise<WebinarSummary[]> {
  try {
    const qs = status ? `?status=${status}` : ''
    return await apiGet<WebinarSummary[]>(`/api/webinars${qs}`, token, 0)
  } catch {
    return []
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WebinarsPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const role = (session?.user?.app_metadata?.role as string | undefined) ?? 'member'
  const isAdmin = role === 'org_admin'

  const [upcoming, past, live] = await Promise.all([
    fetchWebinars('scheduled', token),
    fetchWebinars('ended', token),
    fetchWebinars('live', token),
  ])

  return (
    <div className="space-y-8">
      <PageHeader
        title="Webinars"
        description="Live sessions, Q&A, and recordings"
        action={
          isAdmin ? (
            <Button asChild>
              <Link href="/webinars/new">Create webinar</Link>
            </Button>
          ) : undefined
        }
      />

      {/* Live now */}
      {live.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
            Live now
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {live.map((item) => (
              <WebinarCard key={item.webinar.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Upcoming
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<Video className="h-6 w-6" />}
            title="No upcoming webinars"
            description="Check back soon for scheduled sessions."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((item) => (
              <WebinarCard key={item.webinar.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Past webinars
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((item) => (
              <WebinarCard key={item.webinar.id} item={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ─── WebinarCard ──────────────────────────────────────────────────────────────

function WebinarCard({ item }: { item: WebinarSummary }) {
  const { webinar, registrationCount } = item
  const gradient = gradientForId(webinar.id)

  return (
    <Link
      href={`/webinars/${webinar.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      {/* Cover gradient */}
      <div className={`relative h-36 w-full bg-gradient-to-br ${gradient}`}>
        <span className="absolute right-3 top-3">
          <Badge variant={STATUS_BADGE_VARIANT[webinar.status]}>
            {webinar.status === 'live' && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {STATUS_LABEL[webinar.status]}
          </Badge>
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h2 className="text-sm font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors">
          {webinar.title}
        </h2>

        <p className="mt-2 text-xs text-muted-foreground">
          {formatWebinarDate(webinar.scheduledAt)}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          {webinar.durationMinutes != null && (
            <span className="text-xs text-muted-foreground">{formatDuration(webinar.durationMinutes)}</span>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {registrationCount.toLocaleString()} registered
          </span>
        </div>
      </div>
    </Link>
  )
}
