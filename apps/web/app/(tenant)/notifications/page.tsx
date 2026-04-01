import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { MarkAllReadButton } from './mark-all-read-button'

export const metadata: Metadata = { title: 'Notifications' }

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

interface NotificationsResponse {
  data: Notification[]
  meta: { unreadCount: number; page: number; limit: number }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function notificationIcon(type: string) {
  switch (type) {
    case 'reply': return '💬'
    case 'mention': return '@'
    case 'idea_status': return '💡'
    case 'event': return '📅'
    default: return '🔔'
  }
}

function notificationHref(notification: Notification): string | null {
  const p = notification.payload as Record<string, string>
  switch (notification.type) {
    case 'reply':
    case 'thread_reply':
      if (p.categorySlug && p.threadId) return `/forums/${p.categorySlug}/${p.threadId}`
      break
    case 'idea_status':
    case 'idea_comment':
      if (p.ideaId) return `/ideas/${p.ideaId}`
      break
    case 'event':
      if (p.eventId) return `/events/${p.eventId}`
      break
  }
  return null
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const token = session.access_token

  let result: NotificationsResponse | null = null
  try {
    result = await apiGet<NotificationsResponse>('/api/notifications?limit=50', token, 0)
  } catch { /* fall through */ }

  const notifications = result?.data ?? []
  const unreadCount = result?.meta.unreadCount ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your activity and mentions</p>
        </div>
        {unreadCount > 0 && (
          <MarkAllReadButton token={token} />
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground text-xl">
            🔔
          </div>
          <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;ll be notified of replies, mentions, and community activity.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          {notifications.map((n) => {
            const href = notificationHref(n)
            const isUnread = !n.readAt
            const inner = (
              <div className={[
                'flex items-start gap-4 px-5 py-4',
                isUnread ? 'bg-brand/5/40' : '',
              ].join(' ')}>
                {/* Icon */}
                <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm">
                  {notificationIcon(n.type)}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className={['text-sm', isUnread ? 'font-semibold text-surface-foreground' : 'font-medium text-surface-foreground'].join(' ')}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>

                {/* Unread dot */}
                {isUnread && (
                  <div className="flex-shrink-0 mt-2 h-2 w-2 rounded-full bg-brand" />
                )}
              </div>
            )

            return href ? (
              <Link key={n.id} href={href} className="block hover:bg-muted transition-colors">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
