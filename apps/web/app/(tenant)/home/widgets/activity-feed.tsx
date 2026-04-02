import Link from 'next/link'
import { Plus } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'
import type { BadgeProps } from '@/components/ui/badge'
import { Activity } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'post' | 'idea' | 'event' | 'comment'
  title: string
  authorName: string
  authorAvatarUrl?: string
  createdAt: string
  href: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const BADGE_VARIANT: Record<ActivityItem['type'], BadgeProps['variant']> = {
  post:    'default',
  idea:    'warning',
  event:   'success',
  comment: 'secondary',
}

const BADGE_LABEL: Record<ActivityItem['type'], string> = {
  post:    'Post',
  idea:    'Idea',
  event:   'Event',
  comment: 'Reply',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function ActivityFeed({ token }: { token: string | undefined }) {
  let activity: ActivityItem[] = []

  try {
    activity = await apiGet<ActivityItem[]>('/api/activity?limit=10', token, 60)
  } catch {
    return null
  }

  return (
    <WidgetShell
      title="Recent Activity"
      icon={<Activity className="h-4 w-4" />}
      href="/forums"
      hrefLabel="View all"
      size="sm"
      contentClassName="p-0"
    >
      {activity.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
            <Plus className="h-4 w-4 text-brand" />
          </div>
          <p className="mt-3 text-sm font-medium text-surface-foreground">No activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Be the first to post!</p>
          <Link
            href="/forums/new"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          >
            Start a discussion
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {activity.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 px-5 py-3.5 hover:bg-muted transition-colors"
              >
                <Avatar src={item.authorAvatarUrl ?? null} name={item.authorName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {item.authorName} · {timeAgo(item.createdAt)}
                  </p>
                </div>
                <Badge variant={BADGE_VARIANT[item.type]} className="flex-shrink-0 text-[10px]">
                  {BADGE_LABEL[item.type]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetShell>
  )
}
