import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Competitors' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeywordGroup {
  id: string
  name: string
  type: 'brand' | 'competitor' | 'custom'
  terms: string[]
  platforms: string[]
  isActive: boolean | null
  createdAt: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  news: 'News',
}

function platformLabel(p: string): string {
  return PLATFORM_LABELS[p] ?? p
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let groups: KeywordGroup[] = []
  try {
    const all = await apiGet<KeywordGroup[]>('/api/intelligence/keyword-groups', token)
    groups = all.filter((g) => g.type === 'competitor')
  } catch {
    // show empty state
  }

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-surface-foreground">Competitor Tracking</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monitor mentions of competitor brands across social platforms and news.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + Add competitor
        </button>
      </div>

      {/* ── Coming-soon notice ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
        <p className="text-sm font-medium text-surface-foreground">Automated mention tracking coming soon</p>
        <p className="mt-0.5 text-xs text-brand">
          Once your crawlers are running, competitor mentions will surface in the Inbox automatically.
          You can set up keyword groups now to be ready.
        </p>
      </div>

      {/* ── Competitor groups ────────────────────────────────────────────────── */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
            🔭
          </div>
          <p className="text-sm font-semibold text-surface-foreground">No competitor groups yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a competitor to start tracking their mentions across platforms.
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
          >
            + Add your first competitor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <CompetitorCard key={group.id} group={group} platformLabel={platformLabel} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Competitor Card ──────────────────────────────────────────────────────────

function CompetitorCard({
  group,
  platformLabel,
}: {
  group: KeywordGroup
  platformLabel: (p: string) => string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Name + status */}
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-surface-foreground truncate">{group.name}</h3>
            <span
              className={[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                group.isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-muted text-muted-foreground border border-border',
              ].join(' ')}
            >
              {group.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          {/* Terms */}
          {group.terms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Terms:</span>
              {group.terms.map((term) => (
                <span
                  key={term}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-surface-foreground border border-border"
                >
                  {term}
                </span>
              ))}
            </div>
          )}

          {/* Platforms */}
          {group.platforms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Platforms:</span>
              {group.platforms.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center rounded-full bg-brand/5 px-2.5 py-0.5 text-xs text-brand border border-brand/20"
                >
                  {platformLabel(p)}
                </span>
              ))}
            </div>
          )}

          {/* Created at */}
          {group.createdAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Added {new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
