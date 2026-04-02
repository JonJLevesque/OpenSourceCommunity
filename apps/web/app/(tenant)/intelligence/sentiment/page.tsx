import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sentiment Overview' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberSentimentBreakdown {
  memberMentions: number
  memberPositive: number
  memberNegative: number
  memberNeutral: number
  nonMemberMentions: number
  nonMemberPositive: number
  nonMemberNegative: number
  nonMemberNeutral: number
}

interface TrendPoint {
  date: string
  positive: number
  negative: number
  neutral: number
}

interface SentimentStats {
  totalMentions: number
  netSentimentScore: number  // percentage: positive% - negative%
  advocatesIdentified: number
  platformBreakdown: PlatformRow[]
  memberSentiment?: MemberSentimentBreakdown
  trend?: TrendPoint[]
}

interface PlatformRow {
  platform: string
  mentions: number
  positivePercent: number
  negativePercent: number
  neutralPercent: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

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

const DAYS_OPTIONS = [
  { label: '7 days', value: '7' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
]

// ─── Placeholder data (shown while API is not yet wired) ──────────────────────

const PLACEHOLDER_STATS: SentimentStats = {
  totalMentions: 0,
  netSentimentScore: 0,
  advocatesIdentified: 0,
  platformBreakdown: [],
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SentimentPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days = '30' } = await searchParams
  const daysNum = ['7', '30', '90'].includes(days) ? days : '30'

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let stats: SentimentStats = PLACEHOLDER_STATS
  let isError = false

  try {
    const res = await apiGet<{ data: SentimentStats }>(`/api/intelligence/sentiment?days=${daysNum}`, token, 0)
    stats = res.data
  } catch {
    isError = true
  }
  const isComingSoon = isError

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-surface-foreground">Sentiment Overview</h2>

        {/* Days toggle */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
          {DAYS_OPTIONS.map((opt) => (
            <a
              key={opt.value}
              href={`?days=${opt.value}`}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                daysNum === opt.value
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
              ].join(' ')}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>

      {/* Coming-soon notice */}
      {isComingSoon && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Sentiment analytics coming soon</p>
          <p className="mt-0.5 text-xs text-amber-700">
            The analytics API is being built. Real data will populate the cards and chart below once it&apos;s ready.
          </p>
        </div>
      )}

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Mentions"
          value={isComingSoon ? '—' : stats.totalMentions.toLocaleString()}
          description="This period"
          icon={<MentionIcon />}
          color="indigo"
          isLoading={isComingSoon}
        />
        <StatCard
          title="Net Sentiment Score"
          value={isComingSoon ? '—' : formatPercent(stats.netSentimentScore)}
          description="Positive % minus negative %"
          icon={<SentimentIcon />}
          color={
            isComingSoon
              ? 'slate'
              : stats.netSentimentScore >= 0
              ? 'emerald'
              : 'red'
          }
          isLoading={isComingSoon}
        />
        <StatCard
          title="Advocates Identified"
          value={isComingSoon ? '—' : stats.advocatesIdentified.toLocaleString()}
          description="High-engagement positive authors"
          icon={<StarIcon />}
          color="violet"
          isLoading={isComingSoon}
        />
      </div>

      {/* ── Sentiment trend chart ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-surface-foreground">Sentiment trend</h3>
        <SentimentTrendChart trend={stats.trend ?? []} />
      </div>

      {/* ── Platform breakdown table ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <h3 className="text-sm font-semibold text-surface-foreground">Platform breakdown</h3>
        </div>

        {isComingSoon || stats.platformBreakdown.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {isComingSoon
                ? 'Platform data will appear here once the API is ready.'
                : 'No platform data for this period.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted text-left">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mentions
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    Positive
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-red-500">
                    Negative
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Neutral
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.platformBreakdown.map((row) => (
                  <tr key={row.platform} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-3 font-medium text-surface-foreground">
                      {PLATFORM_LABELS[row.platform] ?? row.platform}
                    </td>
                    <td className="px-4 py-3 text-right text-surface-foreground">
                      {row.mentions.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-700 font-medium">
                      {row.positivePercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">
                      {row.negativePercent.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.neutralPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Member vs Non-Member ─────────────────────────────────────────── */}
      {stats.memberSentiment && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold text-surface-foreground">Member vs Non-Member Sentiment</h2>
          <p className="mb-5 text-xs text-muted-foreground">
            {stats.memberSentiment.memberMentions > 0 && stats.memberSentiment.nonMemberMentions > 0 ? (
              (() => {
                const mPos = stats.memberSentiment!.memberMentions > 0
                  ? (stats.memberSentiment!.memberPositive / stats.memberSentiment!.memberMentions) * 100
                  : 0
                const nmPos = stats.memberSentiment!.nonMemberMentions > 0
                  ? (stats.memberSentiment!.nonMemberPositive / stats.memberSentiment!.nonMemberMentions) * 100
                  : 0
                const diff = mPos - nmPos
                if (Math.abs(diff) < 2) return 'Members and non-members have similar sentiment'
                return diff > 0
                  ? `Members are ${Math.abs(diff).toFixed(0)}% more positive than non-members`
                  : `Non-members are ${Math.abs(diff).toFixed(0)}% more positive than members`
              })()
            ) : 'Link social handles to member profiles to see this breakdown'}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <SentimentBreakdownPanel
              title="Community Members"
              badge={{ label: `${stats.memberSentiment.memberMentions} mentions`, color: 'bg-brand/10 text-brand' }}
              positive={stats.memberSentiment.memberPositive}
              neutral={stats.memberSentiment.memberNeutral}
              negative={stats.memberSentiment.memberNegative}
              total={stats.memberSentiment.memberMentions}
            />
            <SentimentBreakdownPanel
              title="Non-Members"
              badge={{ label: `${stats.memberSentiment.nonMemberMentions} mentions`, color: 'bg-muted text-muted-foreground' }}
              positive={stats.memberSentiment.nonMemberPositive}
              neutral={stats.memberSentiment.nonMemberNeutral}
              negative={stats.memberSentiment.nonMemberNegative}
              total={stats.memberSentiment.nonMemberMentions}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sentiment Trend Chart (inline SVG, no deps) ─────────────────────────────

function SentimentTrendChart({ trend }: { trend: TrendPoint[] }) {
  if (trend.length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-border bg-muted">
        <div className="text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ChartIcon />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No data yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Trend will appear once mentions are collected.</p>
        </div>
      </div>
    )
  }

  const W = 600
  const H = 160
  const PAD = { top: 12, right: 12, bottom: 24, left: 36 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = Math.max(1, ...trend.map(d => d.positive + d.negative + d.neutral))
  const n = trend.length

  function xPos(i: number) { return PAD.left + (i / Math.max(n - 1, 1)) * chartW }
  function yPos(val: number) { return PAD.top + chartH - (val / maxVal) * chartH }

  function polyline(vals: number[]) {
    return vals.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ')
  }

  const positives = trend.map(d => d.positive)
  const negatives = trend.map(d => d.negative)
  const neutrals = trend.map(d => d.neutral)

  // Y-axis ticks
  const yTicks = [0, Math.round(maxVal / 2), maxVal]

  // X-axis: show first, middle, last date label
  const xLabels: { i: number; label: string }[] = []
  if (n >= 1) xLabels.push({ i: 0, label: new Date(trend[0]!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
  if (n >= 3) xLabels.push({ i: Math.floor((n - 1) / 2), label: new Date(trend[Math.floor((n - 1) / 2)]!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
  if (n >= 2) xLabels.push({ i: n - 1, label: new Date(trend[n - 1]!.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" aria-hidden>
        {/* Grid lines */}
        {yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={PAD.left} y1={yPos(tick)}
              x2={W - PAD.right} y2={yPos(tick)}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
            />
            <text x={PAD.left - 6} y={yPos(tick) + 4} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.4}>
              {tick}
            </text>
          </g>
        ))}

        {/* Neutral line */}
        <polyline
          points={polyline(neutrals)}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.6}
        />
        {/* Negative line */}
        <polyline
          points={polyline(negatives)}
          fill="none"
          stroke="#f87171"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Positive line */}
        <polyline
          points={polyline(positives)}
          fill="none"
          stroke="#34d399"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* X-axis labels */}
        {xLabels.map(({ i, label }) => (
          <text key={i} x={xPos(i)} y={H - 2} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.4}>
            {label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-5 rounded-full bg-emerald-400" />
          Positive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-5 rounded-full bg-red-400" />
          Negative
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-5 rounded-full bg-slate-300" />
          Neutral
        </span>
      </div>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

type CardColor = 'indigo' | 'emerald' | 'red' | 'violet' | 'slate'

function StatCard({
  title,
  value,
  description,
  icon,
  color,
  isLoading,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  color: CardColor
  isLoading?: boolean
}) {
  const colorMap: Record<CardColor, { bg: string; text: string }> = {
    indigo: { bg: 'bg-brand/5', text: 'text-brand' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
    red: { bg: 'bg-red-50', text: 'text-red-500' },
    violet: { bg: 'bg-violet-50', text: 'text-violet-500' },
    slate: { bg: 'bg-muted', text: 'text-muted-foreground' },
  }
  const { bg, text } = colorMap[color]

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${text}`}>
          {icon}
        </div>
      </div>
      <p
        className={[
          'text-2xl font-bold',
          isLoading ? 'text-muted-foreground' : 'text-surface-foreground',
        ].join(' ')}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function MentionIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  )
}

function SentimentIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M8 13s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" strokeLinecap="round" strokeWidth={3} />
      <line x1="15" y1="9" x2="15.01" y2="9" strokeLinecap="round" strokeWidth={3} />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polygon strokeLinecap="round" strokeLinejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

// ─── Sentiment Breakdown Panel ────────────────────────────────────────────────

function SentimentBreakdownPanel({
  title,
  badge,
  positive,
  neutral,
  negative,
  total,
}: {
  title: string
  badge: { label: string; color: string }
  positive: number
  neutral: number
  negative: number
  total: number
}) {
  const posP = total > 0 ? (positive / total) * 100 : 0
  const neuP = total > 0 ? (neutral / total) * 100 : 0
  const negP = total > 0 ? (negative / total) * 100 : 0
  return (
    <div className="rounded-xl border border-border bg-muted p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold text-surface-foreground">{title}</p>
        <span className={['rounded-full px-2 py-0.5 text-xs font-medium', badge.color].join(' ')}>
          {badge.label}
        </span>
      </div>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No data yet</p>
      ) : (
        <div className="space-y-2">
          <BreakdownBar label="Positive" pct={posP} color="bg-emerald-500" textColor="text-emerald-700" />
          <BreakdownBar label="Neutral" pct={neuP} color="bg-muted/60" textColor="text-muted-foreground" />
          <BreakdownBar label="Negative" pct={negP} color="bg-red-400" textColor="text-red-700" />
          {/* Stacked bar */}
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full">
            <div className="bg-emerald-500 transition-all" style={{ width: `${posP}%` }} />
            <div className="bg-muted/60 transition-all" style={{ width: `${neuP}%` }} />
            <div className="bg-red-400 transition-all" style={{ width: `${negP}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function BreakdownBar({ label, pct, color, textColor }: { label: string; pct: number; color: string; textColor: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-xs text-muted-foreground flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={[color, 'h-full rounded-full transition-all'].join(' ')} style={{ width: `${pct}%` }} />
      </div>
      <span className={['w-9 text-right text-xs font-medium', textColor].join(' ')}>{pct.toFixed(0)}%</span>
    </div>
  )
}
