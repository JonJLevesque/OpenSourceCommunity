import Link from 'next/link'
import { Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { IdeasFilters } from './ideas-filters'
import { STATUS_CONFIG } from './ideas-config'
import type { IdeaStatus } from './ideas-config'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Ideas' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface IdeaCategory {
  id: string
  name: string
}

interface Idea {
  id: string
  title: string
  status: IdeaStatus
  voteCount: number
  commentCount: number
  category: string | null
  authorName: string
  createdAt: string
}

type SortOption = 'votes' | 'newest' | 'trending'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; status?: string; category?: string }>
}) {
  const { sort = 'votes', status, category } = await searchParams
  const sortOption = (['votes', 'newest', 'trending'] as const).includes(sort as SortOption)
    ? (sort as SortOption)
    : 'votes'

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let ideas: Idea[] = []
  let categories: IdeaCategory[] = []
  let fetchError = false

  const qs = new URLSearchParams({ sort: sortOption })
  if (status) qs.set('status', status)
  if (category) qs.set('categoryId', category)

  try {
    const [ideasData, catsData] = await Promise.all([
      apiGet<Idea[]>(`/api/ideas?${qs}`, token),
      apiGet<IdeaCategory[]>('/api/ideas/categories', token, 600),
    ])
    ideas = ideasData
    categories = catsData
  } catch {
    fetchError = true
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ideas"
        description="Vote on and submit ideas for this community"
        action={
          <Button asChild>
            <Link href="/ideas/new">Submit idea</Link>
          </Button>
        }
      />

      <IdeasFilters
        sortOption={sortOption}
        status={status}
        category={category}
        categories={categories}
      />

      {fetchError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load ideas. Please try refreshing.
        </div>
      )}

      {!fetchError && ideas.length === 0 && (
        <EmptyState
          icon={<Lightbulb className="h-6 w-6" />}
          title="No ideas yet"
          description="Have a suggestion? Be the first to share it with the community."
          action={
            <Button asChild>
              <Link href="/ideas/new">Submit the first idea →</Link>
            </Button>
          }
        />
      )}

      {ideas.length > 0 && (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function IdeaCard({ idea }: { idea: Idea }) {
  const statusConfig = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.new

  return (
    <Link
      href={`/ideas/${idea.id}`}
      className="flex items-start gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow"
    >
      {/* Vote count */}
      <div className="flex flex-shrink-0 flex-col items-center rounded-lg border border-border px-3 py-2 text-center min-w-[56px]">
        <span className="text-lg font-bold text-surface-foreground">{idea.voteCount}</span>
        <span className="text-xs text-muted-foreground">votes</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span
            className={[
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              statusConfig.className,
            ].join(' ')}
          >
            {statusConfig.label}
          </span>
          {idea.category && (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {idea.category}
            </span>
          )}
        </div>
        <h2 className="text-sm font-semibold text-surface-foreground line-clamp-1">
          {idea.title}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          by {idea.authorName} &middot; {timeAgo(idea.createdAt)} &middot;{' '}
          {idea.commentCount} comment{idea.commentCount !== 1 ? 's' : ''}
        </p>
      </div>
    </Link>
  )
}
