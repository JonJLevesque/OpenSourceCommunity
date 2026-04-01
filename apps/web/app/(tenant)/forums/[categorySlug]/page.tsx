import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string | null
}

interface Thread {
  id: string
  title: string
  authorName: string
  authorAvatarUrl: string | null
  replyCount: number
  viewCount: number
  isAnswered: boolean
  isPinned: boolean
  lastActivityAt: string | null
  createdAt: string
}

type SortOption = 'newest' | 'active'

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}): Promise<Metadata> {
  const { categorySlug } = await params
  return { title: `Forums — ${categorySlug}` }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ categorySlug: string }>
  searchParams: Promise<{ sort?: string }>
}) {
  const { categorySlug } = await params
  const { sort = 'newest' } = await searchParams
  const sortOption = (['newest', 'active'] as const).includes(sort as SortOption)
    ? (sort as SortOption)
    : 'newest'

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  // Resolve category by slug from the list endpoint
  let category: ForumCategory | null = null
  let threads: Thread[] = []

  try {
    const categories = await apiGet<ForumCategory[]>('/api/forums/categories', token)
    category = categories.find((c) => c.slug === categorySlug) ?? null
  } catch {
    notFound()
  }

  if (!category) notFound()

  try {
    threads = await apiGet<Thread[]>(
      `/api/forums/threads?categoryId=${category.id}&sort=${sortOption}`,
      token,
    )
  } catch {
    // threads stays empty — show empty state
  }

  const sortLabels: Record<SortOption, string> = {
    newest: 'Newest',
    active: 'Most active',
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-muted-foreground">Forums</Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">{category.name}</span>
      </nav>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">{category.name}</h1>
          {category.description && (
            <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
          )}
        </div>
        <Link
          href={`/forums/${categorySlug}/new`}
          className="flex-shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          New thread
        </Link>
      </div>

      {/* ── Sort controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {(['newest', 'active'] as const).map((s) => (
          <Link
            key={s}
            href={`/forums/${categorySlug}?sort=${s}`}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortOption === s
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {sortLabels[s]}
          </Link>
        ))}
      </div>

      {/* ── Thread list ───────────────────────────────────────────────────── */}
      {threads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No threads yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                categorySlug={categorySlug}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  categorySlug,
}: {
  thread: Thread
  categorySlug: string
}) {
  return (
    <li>
      <Link
        href={`/forums/${categorySlug}/${thread.id}`}
        className="flex items-start gap-4 px-6 py-4 hover:bg-muted transition-colors"
      >
        {/* Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {thread.authorAvatarUrl ? (
            <img
              src={thread.authorAvatarUrl}
              alt={thread.authorName}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {thread.authorName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {thread.isPinned && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Pinned
              </span>
            )}
            {thread.isAnswered && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                Answered
              </span>
            )}
          </div>
          <h3 className="mt-1 text-sm font-semibold text-surface-foreground line-clamp-1">
            {thread.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            by {thread.authorName} &middot; {timeAgo(thread.createdAt)}
          </p>
        </div>

        {/* Stats */}
        <div className="hidden flex-shrink-0 text-right text-xs text-muted-foreground sm:block">
          <p className="font-semibold text-surface-foreground">{thread.replyCount} replies</p>
          <p>{thread.viewCount.toLocaleString()} views</p>
          {thread.lastActivityAt && (
            <p className="text-muted-foreground">
              Active {timeAgo(thread.lastActivityAt)}
            </p>
          )}
        </div>
      </Link>
    </li>
  )
}
