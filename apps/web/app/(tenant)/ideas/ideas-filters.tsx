'use client'

import { useRouter } from 'next/navigation'
import type { IdeaStatus } from './ideas-config'
import { STATUS_CONFIG } from './ideas-config'

interface IdeaCategory {
  id: string
  name: string
}

type SortOption = 'votes' | 'newest' | 'trending'

interface IdeasFiltersProps {
  sortOption: SortOption
  status: string | undefined
  category: string | undefined
  categories: IdeaCategory[]
}

function buildHref({
  sort,
  status,
  category,
}: {
  sort?: string | undefined
  status?: string | undefined
  category?: string | undefined
}): string {
  const qs = new URLSearchParams()
  if (sort) qs.set('sort', sort)
  if (status) qs.set('status', status)
  if (category) qs.set('category', category)
  const str = qs.toString()
  return `/ideas${str ? `?${str}` : ''}`
}

const sortLabels: Record<SortOption, string> = {
  votes: 'Most votes',
  newest: 'Newest',
  trending: 'Trending',
}

export function IdeasFilters({ sortOption, status, category, categories }: IdeasFiltersProps) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Sort */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
        {(['votes', 'newest', 'trending'] as const).map((s) => (
          <a
            key={s}
            href={buildHref({ sort: s, status, category })}
            className={[
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              sortOption === s
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {sortLabels[s]}
          </a>
        ))}
      </div>

      {/* Status filter */}
      <select
        className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        value={status ?? ''}
        onChange={(e) => {
          const val = e.target.value
          router.push(buildHref({ sort: sortOption, status: val || undefined, category }))
        }}
      >
        <option value="">All statuses</option>
        {(Object.keys(STATUS_CONFIG) as IdeaStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_CONFIG[s]!.label}
          </option>
        ))}
      </select>

      {/* Category filter */}
      {categories.length > 0 && (
        <select
          className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          value={category ?? ''}
          onChange={(e) => {
            const val = e.target.value
            router.push(buildHref({ sort: sortOption, status, category: val || undefined }))
          }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
