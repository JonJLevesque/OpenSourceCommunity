import Link from 'next/link'
import { MessageSquare } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadRow {
  id: string
  title: string
  categorySlug: string
  categoryName: string
  authorName: string
  authorAvatarUrl?: string
  replyCount: number
  createdAt: string
  isAnswered: boolean
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

// ─── Component ────────────────────────────────────────────────────────────────

export default async function HotDiscussions({ token }: { token: string | undefined }) {
  let threads: ThreadRow[] = []

  try {
    const data = await apiGet<{ threads: ThreadRow[] }>('/api/forums/threads?sort=active&limit=5', token, 60)
    threads = data.threads ?? []
  } catch {
    return null
  }

  if (threads.length === 0) return null

  return (
    <WidgetShell
      title="Hot Discussions"
      icon={<MessageSquare className="h-4 w-4" />}
      href="/forums"
      hrefLabel="All discussions"
      size="md"
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/forums/${thread.categorySlug}/${thread.id}`}
              className="group flex items-start gap-4 px-5 py-4 hover:bg-muted transition-colors"
            >
              <Avatar
                src={thread.authorAvatarUrl ?? null}
                name={thread.authorName}
                size="sm"
                className="mt-0.5 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                  {thread.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">{thread.authorName}</span>
                  <span className="text-[11px] text-muted-foreground/50">·</span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(thread.createdAt)}</span>
                  {thread.categoryName && (
                    <>
                      <span className="text-[11px] text-muted-foreground/50">·</span>
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        {thread.categoryName}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {thread.isAnswered && (
                  <Badge variant="success" className="text-[10px] py-0 px-1.5">✓</Badge>
                )}
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {thread.replyCount} {thread.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
