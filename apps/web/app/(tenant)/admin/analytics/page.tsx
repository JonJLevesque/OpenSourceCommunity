import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelinePoint {
  date: string
  members: number
  posts: number
}

interface Contributor {
  memberId: string
  name: string
  avatarUrl: string | null
  posts: number
}

interface AnalyticsData {
  timeline: TimelinePoint[]
  baseCount: number
  days: number
  topContributors: Contributor[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ days?: string }>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {}
  if (!isAdmin) redirect('/home')

  const { days = '30' } = await searchParams
  const daysNum = ['7', '30', '90'].includes(days) ? days : '30'

  let data: AnalyticsData | null = null
  try {
    data = await apiGet<AnalyticsData>(`/api/admin/analytics?days=${daysNum}`, token, 60)
  } catch {}

  const timeline = data?.timeline ?? []
  const baseCount = data?.baseCount ?? 0
  const contributors = data?.topContributors ?? []

  // Compute cumulative member totals
  let running = baseCount
  const cumulative = timeline.map((p) => {
    running += p.members
    return { ...p, total: running }
  })

  const maxTotal = Math.max(...cumulative.map((p) => p.total), 1)
  const maxPosts = Math.max(...timeline.map((p) => p.posts), 1)
  const totalNewMembers = timeline.reduce((s, p) => s + p.members, 0)
  const totalPosts = timeline.reduce((s, p) => s + p.posts, 0)

  // Thin out labels to avoid crowding (show every ~7th for 30d, every 14th for 90d)
  const labelEvery = Number(daysNum) <= 7 ? 1 : Number(daysNum) <= 30 ? 5 : 14

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Community growth and activity</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          ← Back
        </Link>
      </div>

      {/* Days toggle */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
        {(['7', '30', '90'] as const).map((d) => (
          <Link
            key={d}
            href={`?days=${d}`}
            className={[
              'rounded-lg px-4 py-1.5 text-xs font-medium transition-colors',
              daysNum === d
                ? 'bg-brand text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
            ].join(' ')}
          >
            {d === '7' ? '7 days' : d === '30' ? '30 days' : '90 days'}
          </Link>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`New members (${daysNum}d)`} value={totalNewMembers} delta={null} />
        <StatCard label="Total members" value={baseCount + totalNewMembers} delta={null} />
        <StatCard label={`Forum posts (${daysNum}d)`} value={totalPosts} delta={null} />
      </div>

      {/* Member growth chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-surface-foreground">Member growth</h2>
        <p className="mb-5 text-xs text-muted-foreground">Cumulative total over the last {daysNum} days</p>

        {timeline.length === 0 ? (
          <EmptyChart label="No member data yet" />
        ) : (
          <svg viewBox={`0 0 ${timeline.length * 14} 100`} className="w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
              <line key={frac} x1="0" x2={timeline.length * 14} y1={90 - frac * 80} y2={90 - frac * 80} stroke="currentColor" strokeWidth="0.5" className="text-border" />
            ))}
            {/* Area fill */}
            <defs>
              <linearGradient id="memberGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-brand, #6366f1)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--color-brand, #6366f1)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline
              points={cumulative.map((p, i) => `${i * 14 + 7},${90 - (p.total / maxTotal) * 80}`).join(' ')}
              fill="none"
              stroke="var(--color-brand, #6366f1)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* X-axis labels */}
            {cumulative.map((p, i) =>
              i % labelEvery === 0 ? (
                <text
                  key={p.date}
                  x={i * 14 + 7}
                  y="100"
                  textAnchor="middle"
                  fontSize="6"
                  fill="currentColor"
                  className="text-muted-foreground"
                >
                  {formatDate(p.date)}
                </text>
              ) : null
            )}
          </svg>
        )}
      </div>

      {/* Forum activity chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-surface-foreground">Forum activity</h2>
        <p className="mb-5 text-xs text-muted-foreground">Posts per day over the last {daysNum} days</p>

        {timeline.length === 0 ? (
          <EmptyChart label="No post data yet" />
        ) : (
          <svg viewBox={`0 0 ${timeline.length * 14} 100`} className="w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
              <line key={frac} x1="0" x2={timeline.length * 14} y1={90 - frac * 80} y2={90 - frac * 80} stroke="currentColor" strokeWidth="0.5" className="text-border" />
            ))}
            {timeline.map((p, i) => {
              const barH = Math.max(1, (p.posts / maxPosts) * 78)
              const x = i * 14 + 3
              return (
                <rect
                  key={p.date}
                  x={x}
                  y={90 - barH}
                  width={8}
                  height={barH}
                  rx="1.5"
                  fill="var(--color-brand, #6366f1)"
                  opacity="0.7"
                />
              )
            })}
            {timeline.map((p, i) =>
              i % labelEvery === 0 ? (
                <text key={p.date} x={i * 14 + 7} y="100" textAnchor="middle" fontSize="6" fill="currentColor" className="text-muted-foreground">
                  {formatDate(p.date)}
                </text>
              ) : null
            )}
          </svg>
        )}
      </div>

      {/* Top contributors */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-surface-foreground">Top contributors</h2>
        {contributors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No forum activity in this period.</p>
        ) : (
          <div className="space-y-3">
            {contributors.map((c, i) => {
              const initials = c.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={c.memberId} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-bold text-muted-foreground tabular-nums text-right">{i + 1}</span>
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt={c.name} className="h-7 w-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-[10px] font-semibold text-brand">
                      {initials}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-surface-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{c.posts} post{c.posts !== 1 ? 's' : ''}</span>
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand/60"
                      style={{ width: `${(c.posts / (contributors[0]?.posts ?? 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, delta }: { label: string; value: number; delta: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-surface-foreground">{value.toLocaleString()}</p>
      {delta !== null && (
        <p className={['mt-0.5 text-xs font-medium', delta >= 0 ? 'text-emerald-600' : 'text-red-600'].join(' ')}>
          {delta >= 0 ? '+' : ''}{delta}%
        </p>
      )}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
