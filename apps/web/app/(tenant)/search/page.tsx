import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Search, MessageSquare, Lightbulb, Calendar, BookOpen, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'

export const metadata: Metadata = { title: 'Search' }

interface SearchResult {
  id: string
  title: string
  snippet?: string
  subtitle?: string
  href: string
}

interface SearchData {
  threads: SearchResult[]
  ideas: SearchResult[]
  members: SearchResult[]
  events: SearchResult[]
  kb: SearchResult[]
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  threads: { label: 'Thread', icon: MessageSquare, color: 'blue' as const },
  ideas: { label: 'Idea', icon: Lightbulb, color: 'purple' as const },
  events: { label: 'Event', icon: Calendar, color: 'warning' as const },
  kb: { label: 'Article', icon: BookOpen, color: 'success' as const },
  members: { label: 'Member', icon: Users, color: 'secondary' as const },
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>
}) {
  const { q = '', type } = await searchParams

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let results: SearchData = { threads: [], ideas: [], members: [], events: [], kb: [] }

  if (q.trim().length >= 2) {
    const params = new URLSearchParams({ q, limit: '10' })
    if (type) params.set('type', type)
    try {
      results = await apiGet<SearchData>(`/api/search?${params}`, token, 0)
    } catch {}
  }

  const allResults: (SearchResult & { type: string })[] = [
    ...results.threads.map(r => ({ ...r, type: 'threads' })),
    ...results.ideas.map(r => ({ ...r, type: 'ideas' })),
    ...results.events.map(r => ({ ...r, type: 'events' })),
    ...results.kb.map(r => ({ ...r, type: 'kb' })),
    ...results.members.map(r => ({ ...r, type: 'members' })),
  ]

  const tabs = [
    { key: undefined, label: 'All', count: allResults.length },
    { key: 'threads', label: 'Threads', count: results.threads.length },
    { key: 'ideas', label: 'Ideas', count: results.ideas.length },
    { key: 'events', label: 'Events', count: results.events.length },
    { key: 'kb', label: 'Knowledge Base', count: results.kb.length },
    { key: 'members', label: 'Members', count: results.members.length },
  ]

  const displayResults = type
    ? allResults.filter(r => r.type === type)
    : allResults

  return (
    <div className="space-y-6">
      <PageHeader title="Search" />

      {/* Search bar */}
      <form method="GET" action="/search" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search threads, ideas, events, articles…"
            autoFocus={!q}
            className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm text-card-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          />
          {type && <input type="hidden" name="type" value={type} />}
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          Search
        </button>
      </form>

      {q.trim().length >= 2 && (
        <>
          {/* Tab filter */}
          <div className="flex gap-1 overflow-x-auto border-b border-border">
            {tabs.map(tab => {
              const isActive = type === tab.key
              const href = tab.key
                ? `/search?q=${encodeURIComponent(q)}&type=${tab.key}`
                : `/search?q=${encodeURIComponent(q)}`
              return (
                <Link
                  key={tab.label}
                  href={href}
                  className={[
                    'flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted-foreground hover:text-surface-foreground',
                  ].join(' ')}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {tab.count}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          {/* Results */}
          {displayResults.length === 0 ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="No results found"
              description={`Nothing matched "${q}"${type ? ` in ${type}` : ''}. Try different keywords.`}
            />
          ) : (
            <div className="space-y-2">
              {displayResults.map(result => {
                const config = TYPE_CONFIG[result.type]!
                const Icon = config.icon
                return (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-surface-foreground">{result.title}</p>
                        <Badge variant={config.color as 'blue' | 'purple' | 'warning' | 'success' | 'secondary'} className="shrink-0">
                          {config.label}
                        </Badge>
                      </div>
                      {result.subtitle && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{result.subtitle}</p>
                      )}
                      {result.snippet && (
                        <p
                          className="mt-1 text-xs text-muted-foreground line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: result.snippet }}
                        />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {!q.trim() && (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="Start searching"
          description="Search across forum threads, ideas, events, articles, and members."
        />
      )}
    </div>
  )
}
