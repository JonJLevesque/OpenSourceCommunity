import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import type { Platform } from '../inbox/page'

export const metadata: Metadata = { title: 'Brand Advocates' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mention {
  id: string
  platform: Platform
  authorHandle: string
  authorUrl: string | null
  textPreview: string
  contentUrl: string
  sentiment: 'positive' | 'negative' | 'neutral'
  engagementCount: number
  publishedAt: string
  keywordGroupId: string
}

interface MentionsResponse {
  data: Mention[]
  total: number
  page: number
}

interface AdvocateRow {
  handle: string
  authorUrl: string | null
  platforms: Set<Platform>
  mentionCount: number
  totalEngagement: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  youtube: 'YouTube',
  hackernews: 'HackerNews',
  github: 'GitHub',
  g2: 'G2',
  trustpilot: 'Trustpilot',
  producthunt: 'Product Hunt',
  news: 'News',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdvocatesPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let mentions: Mention[] = []
  try {
    const resp = await apiGet<MentionsResponse>(
      '/api/intelligence/mentions?sentiment=positive&limit=100&status=new',
      token,
    )
    mentions = resp.data ?? []
  } catch {
    // fall through to empty state
  }

  // Also fetch reviewed positive mentions
  let reviewedMentions: Mention[] = []
  try {
    const resp = await apiGet<MentionsResponse>(
      '/api/intelligence/mentions?sentiment=positive&limit=100&status=reviewed',
      token,
    )
    reviewedMentions = resp.data ?? []
  } catch {
    // ignore
  }

  const allPositive = [...mentions, ...reviewedMentions]

  // Group by authorHandle
  const advocateMap = new Map<string, AdvocateRow>()
  for (const m of allPositive) {
    const existing = advocateMap.get(m.authorHandle)
    if (existing) {
      existing.mentionCount += 1
      existing.totalEngagement += m.engagementCount
      existing.platforms.add(m.platform)
    } else {
      advocateMap.set(m.authorHandle, {
        handle: m.authorHandle,
        authorUrl: m.authorUrl,
        platforms: new Set([m.platform]),
        mentionCount: 1,
        totalEngagement: m.engagementCount,
      })
    }
  }

  // Sort by total engagement desc
  const advocates = Array.from(advocateMap.values()).sort(
    (a, b) => b.totalEngagement - a.totalEngagement,
  )

  // Compute metrics
  const totalAdvocates = advocates.length
  const avgEngagement =
    totalAdvocates > 0
      ? Math.round(
          advocates.reduce((sum, a) => sum + a.totalEngagement, 0) / totalAdvocates,
        )
      : 0
  const platformCounts = new Map<Platform, number>()
  for (const a of advocates) {
    for (const p of a.platforms) {
      platformCounts.set(p, (platformCounts.get(p) ?? 0) + 1)
    }
  }
  const topPlatform =
    platformCounts.size > 0
      ? ([...platformCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)
      : null

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Brand Advocates</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Members who consistently speak positively about your brand across social platforms.
        </p>
      </div>

      {/* ── Metric cards ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Advocates Identified"
          value={totalAdvocates.toLocaleString()}
          description="Unique positive authors"
          color="indigo"
        />
        <MetricCard
          title="Avg Engagement"
          value={avgEngagement.toLocaleString()}
          description="Per mention, across advocates"
          color="emerald"
        />
        <MetricCard
          title="Top Platform"
          value={topPlatform ? (PLATFORM_LABELS[topPlatform] ?? topPlatform) : '—'}
          description="Most advocate activity"
          color="violet"
        />
      </div>

      {/* ── Advocates list ──────────────────────────────────────────────────── */}
      {advocates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
            ⭐
          </div>
          <p className="text-sm font-semibold text-surface-foreground">No advocates found yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Advocates are identified from positive mentions. Start tracking keywords to surface them.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-sm font-semibold text-surface-foreground">
              Top Advocates <span className="ml-1.5 rounded-full bg-brand/5 px-2 py-0.5 text-xs font-medium text-brand">{advocates.length}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Author
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Platforms
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mentions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total Engagement
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {advocates.map((advocate) => (
                  <tr key={advocate.handle} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-3">
                      {advocate.authorUrl ? (
                        <a
                          href={advocate.authorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-brand hover:underline"
                        >
                          {advocate.handle}
                        </a>
                      ) : (
                        <span className="font-medium text-surface-foreground">{advocate.handle}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(advocate.platforms).map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {PLATFORM_LABELS[p]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-surface-foreground">
                      {advocate.mentionCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {advocate.totalEngagement.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/intelligence/inbox?author=${encodeURIComponent(advocate.handle)}`}
                        className="rounded-md bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10 transition-colors"
                      >
                        View mentions
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

type CardColor = 'indigo' | 'emerald' | 'violet'

function MetricCard({
  title,
  value,
  description,
  color,
}: {
  title: string
  value: string
  description: string
  color: CardColor
}) {
  const colorMap: Record<CardColor, { bg: string; text: string }> = {
    indigo: { bg: 'bg-brand/5', text: 'text-brand' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-500' },
  }
  const { bg, text } = colorMap[color]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${text}`}>
          <StarIcon />
        </div>
      </div>
      <p className="text-2xl font-bold text-surface-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polygon strokeLinecap="round" strokeLinejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
