import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Intelligence' }

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleKey = 'forums' | 'ideas' | 'events' | 'courses' | 'webinars' | 'kb' | 'intelligence'

interface ModuleConfig {
  key: ModuleKey
  enabled: boolean
}

interface AdminOverview {
  modules: ModuleConfig[]
  memberCount: number
  pendingModeration: number
}

interface SentimentData {
  totalMentions: number
  netSentimentScore: number
  advocatesIdentified: number
  platformBreakdown: Array<{
    platform: string
    mentions: number
    positivePercent: number
    negativePercent: number
    neutralPercent: number
  }>
}

interface Mention {
  id: string
  platform: string
  authorHandle: string
  authorUrl: string | null
  textPreview: string
  contentUrl: string
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed'
  engagementCount: number
  publishedAt: string
  keywordGroupId: string
  linkedMemberId?: string | null
  linkedMemberName?: string | null
}

interface KeywordGroup {
  id: string
  name: string
  type: string
  terms: string[]
  platforms: string[]
  isActive: boolean
}

// ─── Platform display config ──────────────────────────────────────────────────

const PLATFORM_BAR_COLOR: Record<string, string> = {
  twitter: '#0ea5e9',
  reddit: '#f97316',
  linkedin: '#1d4ed8',
  hackernews: '#d97706',
  github: '#6366f1',
  g2: '#ef4444',
  trustpilot: '#10b981',
  producthunt: '#f43f5e',
  youtube: '#dc2626',
  news: '#64748b',
}

const PLATFORM_BADGE: Record<string, { label: string; badgeClass: string }> = {
  twitter: { label: 'X', badgeClass: 'bg-neutral-900 text-white' },
  reddit: { label: 'Reddit', badgeClass: 'bg-orange-500 text-white' },
  linkedin: { label: 'LinkedIn', badgeClass: 'bg-blue-600 text-white' },
  hackernews: { label: 'HN', badgeClass: 'bg-amber-600 text-white' },
  github: { label: 'GitHub', badgeClass: 'bg-neutral-800 text-white' },
  g2: { label: 'G2', badgeClass: 'bg-red-600 text-white' },
  trustpilot: { label: 'Trustpilot', badgeClass: 'bg-emerald-600 text-white' },
  producthunt: { label: 'PH', badgeClass: 'bg-rose-500 text-white' },
  youtube: { label: 'YouTube', badgeClass: 'bg-red-600 text-white' },
  news: { label: 'News', badgeClass: 'bg-neutral-700 text-white' },
}

const SENTIMENT_BADGE: Record<string, { label: string; className: string }> = {
  positive: { label: 'Positive', className: 'bg-emerald-50 text-emerald-700' },
  neutral: { label: 'Neutral', className: 'bg-muted text-muted-foreground' },
  negative: { label: 'Negative', className: 'bg-red-50 text-red-700' },
  mixed: { label: 'Mixed', className: 'bg-amber-50 text-amber-700' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IntelligencePage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  let intelligenceEnabled = false

  try {
    const overview = await apiGet<AdminOverview>('/api/admin/overview', token, 30)
    isAdmin = true
    const intelligenceMod = overview.modules.find((m) => m.key === 'intelligence')
    intelligenceEnabled = intelligenceMod?.enabled ?? false
  } catch {
    // Not admin or request failed
  }

  if (!isAdmin || !intelligenceEnabled) {
    redirect('/home')
  }

  // ── Fetch real data ──────────────────────────────────────────────────────────
  let sentimentData: SentimentData | null = null
  let recentMentions: Mention[] = []
  let keywordGroups: KeywordGroup[] = []

  try {
    const [sent, mentions, groups] = await Promise.all([
      apiGet<SentimentData>('/api/intelligence/sentiment?days=7', token, 60),
      apiGet<Mention[]>('/api/intelligence/mentions?limit=5&status=new', token, 30),
      apiGet<KeywordGroup[]>('/api/intelligence/keyword-groups', token, 60),
    ])
    sentimentData = sent
    recentMentions = mentions
    keywordGroups = groups
  } catch {
    // API failed — show empty state
  }

  const hasData = (sentimentData?.totalMentions ?? 0) > 0
  const hasKeywordGroups = keywordGroups.length > 0

  // Derive sentiment percentages
  const totalMentions = sentimentData?.totalMentions ?? 0
  const netScore = sentimentData?.netSentimentScore ?? 0
  const platforms = sentimentData?.platformBreakdown ?? []
  const maxPlatformMentions = Math.max(...platforms.map((p) => p.mentions), 1)

  // Compute positive/neutral/negative totals from platform breakdown
  let posSum = 0, negSum = 0, neuSum = 0
  for (const p of platforms) {
    posSum += (p.positivePercent / 100) * p.mentions
    negSum += (p.negativePercent / 100) * p.mentions
    neuSum += (p.neutralPercent / 100) * p.mentions
  }
  const sentTotal = posSum + negSum + neuSum || 1
  const posPct = Math.round((posSum / sentTotal) * 100)
  const negPct = Math.round((negSum / sentTotal) * 100)
  const neuPct = 100 - posPct - negPct

  return (
    <div className="space-y-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Social listening &amp; community insights
          </p>
        </div>
        <Link
          href="/intelligence/inbox"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
        >
          Open inbox
        </Link>
      </div>

      {/* ── No keyword groups — onboarding CTA ──────────────────────────────── */}
      {!hasKeywordGroups && (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-3xl">
            🔍
          </div>
          <p className="text-base font-semibold text-surface-foreground">No keyword groups configured</p>
          <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
            Add your brand name, competitor names, or product keywords to start tracking mentions across Reddit, Twitter, HackerNews, and more.
          </p>
          <Link
            href="/intelligence/keywords"
            className="mt-5 inline-flex items-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
          >
            Add keyword group
          </Link>
        </div>
      )}

      {/* ── Keyword groups set up but no data yet ─────────────────────────── */}
      {hasKeywordGroups && !hasData && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">Pipeline is running.</span>{' '}
          {keywordGroups.length} keyword group{keywordGroups.length !== 1 ? 's' : ''} configured.
          Mentions will appear here once the pipeline collects data — usually within 15 minutes.
        </div>
      )}

      {/* ── Stats row (only when we have data) ─────────────────────────────── */}
      {hasData && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total mentions (7d)" value={totalMentions.toLocaleString()} />
          <StatCard
            label="Net sentiment"
            value={`${netScore >= 0 ? '+' : ''}${netScore.toFixed(0)}`}
            valueClass={netScore >= 0 ? 'text-emerald-600' : 'text-red-600'}
          />
          <StatCard
            label="Advocates identified"
            value={(sentimentData?.advocatesIdentified ?? 0).toString()}
          />
          <StatCard label="Platforms tracked" value={platforms.length.toString()} />
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────────────────────── */}
      {hasData && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Platform breakdown chart */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-surface-foreground">Mentions by platform — last 7 days</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{totalMentions.toLocaleString()} total mentions</p>
            <div className="mt-6 space-y-3">
              {platforms.length === 0 && (
                <p className="text-sm text-muted-foreground">No platform data yet.</p>
              )}
              {platforms.slice(0, 8).map((p) => {
                const cfg = PLATFORM_BADGE[p.platform] ?? { label: p.platform, badgeClass: 'bg-muted text-muted-foreground' }
                const color = PLATFORM_BAR_COLOR[p.platform] ?? '#94a3b8'
                const pct = Math.round((p.mentions / maxPlatformMentions) * 100)
                return (
                  <div key={p.platform}>
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={[
                          'inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold min-w-[40px]',
                          cfg.badgeClass,
                        ].join(' ')}
                      >
                        {cfg.label}
                      </span>
                      <div className="flex-1 h-5 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
                        {p.mentions}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sentiment breakdown */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-surface-foreground">Sentiment breakdown</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Based on {totalMentions.toLocaleString()} analysed mention{totalMentions !== 1 ? 's' : ''}
            </p>
            <div className="mt-6 space-y-4">
              <SentimentBar label="Positive" pct={posPct} color="bg-emerald-500" textColor="text-emerald-700" />
              <SentimentBar label="Neutral" pct={neuPct} color="bg-muted/60" textColor="text-muted-foreground" />
              <SentimentBar label="Negative" pct={negPct} color="bg-red-400" textColor="text-red-700" />
            </div>
            {/* Stacked bar */}
            <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full">
              <div className="bg-emerald-500" style={{ width: `${posPct}%` }} />
              <div className="bg-muted/60" style={{ width: `${neuPct}%` }} />
              <div className="bg-red-400" style={{ width: `${negPct}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Recent mentions ──────────────────────────────────────────────────── */}
      {hasData && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-foreground">Recent mentions</h2>
            <Link
              href="/intelligence/inbox"
              className="text-xs font-medium text-brand hover:underline"
            >
              View all →
            </Link>
          </div>

          {recentMentions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No new mentions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Platform</th>
                    <th className="pb-2 text-left font-medium">Author</th>
                    <th className="pb-2 text-left font-medium">Mention</th>
                    <th className="pb-2 text-left font-medium">Sentiment</th>
                    <th className="pb-2 text-left font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {recentMentions.map((m) => {
                    const pCfg = PLATFORM_BADGE[m.platform] ?? { label: m.platform, badgeClass: 'bg-muted text-muted-foreground' }
                    const sBadge = SENTIMENT_BADGE[m.sentiment] ?? { label: m.sentiment, className: 'bg-muted text-muted-foreground' }
                    return (
                      <tr key={m.id} className="align-top">
                        <td className="py-3 pr-3">
                          <span className={['inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold', pCfg.badgeClass].join(' ')}>
                            {pCfg.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 text-xs font-medium text-surface-foreground whitespace-nowrap">
                          {m.authorUrl ? (
                            <a href={m.authorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-brand hover:underline">
                              {m.authorHandle}
                            </a>
                          ) : m.authorHandle}
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground max-w-[260px]">
                          <p className="line-clamp-2">{m.textPreview}</p>
                        </td>
                        <td className="py-3 pr-3">
                          <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', sBadge.className].join(' ')}>
                            {sBadge.label}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {timeAgo(m.publishedAt)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Keyword groups summary ───────────────────────────────────────────── */}
      {hasKeywordGroups && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-foreground">Keyword groups</h2>
            <Link
              href="/intelligence/keywords"
              className="text-xs font-medium text-brand hover:underline"
            >
              Manage →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywordGroups.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2"
              >
                <span
                  className={[
                    'inline-block h-2 w-2 rounded-full flex-shrink-0',
                    g.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                  ].join(' ')}
                />
                <span className="text-xs font-medium text-surface-foreground">{g.name}</span>
                <span className="text-xs text-muted-foreground">
                  {g.terms.length} term{g.terms.length !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  valueClass = 'text-surface-foreground',
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={['mt-1 text-2xl font-bold tabular-nums', valueClass].join(' ')}>{value}</p>
    </div>
  )
}

function SentimentBar({
  label,
  pct,
  color,
  textColor,
}: {
  label: string
  pct: number
  color: string
  textColor: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={['h-3 w-3 flex-shrink-0 rounded-full', color].join(' ')} />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-surface-foreground">{label}</span>
          <span className={['text-xs font-bold', textColor].join(' ')}>{pct}%</span>
        </div>
      </div>
    </div>
  )
}
