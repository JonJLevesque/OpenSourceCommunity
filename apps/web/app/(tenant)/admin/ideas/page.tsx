import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Ideas Settings — Admin' }

interface IdeaRow {
  id: string
  title: string
  status: 'new' | 'under_review' | 'planned' | 'in_progress' | 'shipped' | 'declined'
  category: string | null
  voteCount: number
  commentCount: number
  createdAt: string
}

const STATUS_META: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'destructive' | 'warning' }> = {
  new:          { label: 'New',           variant: 'secondary' },
  under_review: { label: 'Under Review',  variant: 'default' },
  planned:      { label: 'Planned',       variant: 'default' },
  in_progress:  { label: 'In Progress',   variant: 'warning' },
  shipped:      { label: 'Shipped',       variant: 'success' },
  declined:     { label: 'Declined',      variant: 'destructive' },
}

export default async function IdeasSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const ideas = (await apiGet<IdeaRow[]>('/api/ideas?limit=50', token, 0)) ?? []
  const categories = (await apiGet<{ id: string; name: string }[]>('/api/ideas/categories', token, 0)) ?? []

  const counts = ideas.reduce<Record<string, number>>((acc, idea) => {
    acc[idea.status] = (acc[idea.status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Ideas Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of community ideas. Manage status and categories from the Ideas board.
        </p>
      </div>

      {/* Status overview */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-surface-foreground">Status Overview</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(STATUS_META).map(([status, meta]) => (
            <div key={status} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-black text-surface-foreground">{counts[status] ?? 0}</p>
              <Badge variant={meta.variant} className="mt-1 text-[10px]">{meta.label}</Badge>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-surface-foreground">Categories in Use</h3>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge key={cat.id} variant="secondary">{cat.name}</Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Categories are set by members when submitting ideas. You can relabel or merge ideas
              from the{' '}
              <Link href="/ideas" className="text-brand hover:underline">
                Ideas board →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* Recent ideas table */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-foreground">Recent Ideas</h3>
          <Link href="/ideas" className="text-xs font-medium text-brand hover:underline">
            View all →
          </Link>
        </div>
        {ideas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-8 py-10 text-center">
            <p className="text-sm text-muted-foreground">No ideas submitted yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Title</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Votes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ideas.slice(0, 20).map((idea) => (
                  <tr key={idea.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/ideas/${idea.id}`} className="font-medium text-surface-foreground hover:text-brand transition-colors">
                        {idea.title}
                      </Link>
                      {idea.category && (
                        <span className="ml-2 text-xs text-muted-foreground">{idea.category}</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant={STATUS_META[idea.status]?.variant ?? 'secondary'}>
                        {STATUS_META[idea.status]?.label ?? idea.status}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                      {idea.voteCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
