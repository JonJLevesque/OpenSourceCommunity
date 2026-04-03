import Link from 'next/link'
import { Video, Clock, Users } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebinarRow {
  webinar: {
    id: string
    title: string
    description?: string
    scheduledAt: string
    durationMinutes: number
    maxAttendees?: number
    status: 'draft' | 'scheduled' | 'live' | 'ended'
  }
  registrationCount: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function UpcomingWebinars({ token }: { token: string | undefined }) {
  let rows: WebinarRow[] = []

  try {
    rows = (await apiGet<WebinarRow[]>('/api/webinars?status=scheduled', token, 0)) ?? []
  } catch {
    return null
  }

  const webinars = rows.slice(0, 3)
  if (webinars.length === 0) return null

  return (
    <WidgetShell
      title="Webinars"
      icon={<Video className="h-4 w-4" />}
      href="/webinars"
      hrefLabel="All webinars"
      size="md"
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {webinars.map(({ webinar, registrationCount }) => (
          <li key={webinar.id}>
            <Link
              href={`/webinars/${webinar.id}`}
              className="group flex items-start gap-4 px-5 py-4 hover:bg-muted transition-colors"
            >
              {/* Date block */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center rounded-lg bg-brand/10 px-2.5 py-2 min-w-[44px] text-center">
                <span className="text-[10px] font-semibold uppercase text-brand">
                  {new Date(webinar.scheduledAt).toLocaleDateString('en-US', { month: 'short' })}
                </span>
                <span className="text-lg font-black text-brand leading-none">
                  {new Date(webinar.scheduledAt).getDate()}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                  {webinar.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    {webinar.durationMinutes}m
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Users className="h-2.5 w-2.5" />
                    {registrationCount} registered
                  </span>
                </div>
              </div>

              {webinar.status === 'live' && (
                <Badge variant="destructive" className="flex-shrink-0 gap-1 text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  Live
                </Badge>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
