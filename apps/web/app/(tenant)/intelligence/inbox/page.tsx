import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { InboxFilters } from './inbox-filters'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Social Inbox' }

// ─── Types ────────────────────────────────────────────────────────────────────

export type Platform = 'twitter' | 'reddit' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'news' | 'hackernews' | 'github' | 'g2' | 'trustpilot' | 'producthunt'
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed'

export interface Mention {
  id: string
  platform: Platform
  authorHandle: string
  authorUrl: string | null
  textPreview: string
  contentUrl: string
  sentiment: Sentiment
  engagementCount: number
  publishedAt: string
  keywordGroupId: string
  linkedMemberId?: string | null
  linkedMemberName?: string | null
  linkedMemberAvatarUrl?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const PLATFORM_CONFIG: Record<
  string,
  { icon: string; label: string; badgeClass: string }
> = {
  twitter: { icon: '𝕏', label: 'Twitter / X', badgeClass: 'bg-neutral-900 text-white' },
  reddit: { icon: '🤖', label: 'Reddit', badgeClass: 'bg-orange-500 text-white' },
  linkedin: { icon: '💼', label: 'LinkedIn', badgeClass: 'bg-blue-600 text-white' },
  facebook: { icon: '📘', label: 'Facebook', badgeClass: 'bg-blue-500 text-white' },
  instagram: { icon: '📸', label: 'Instagram', badgeClass: 'bg-pink-500 text-white' },
  youtube: { icon: '▶️', label: 'YouTube', badgeClass: 'bg-red-600 text-white' },
  hackernews: { icon: '🔶', label: 'HackerNews', badgeClass: 'bg-amber-600 text-white' },
  github: { icon: '⚙️', label: 'GitHub', badgeClass: 'bg-neutral-800 text-white' },
  g2: { icon: '⭐', label: 'G2', badgeClass: 'bg-red-600 text-white' },
  trustpilot: { icon: '✅', label: 'Trustpilot', badgeClass: 'bg-emerald-600 text-white' },
  producthunt: { icon: '🚀', label: 'Product Hunt', badgeClass: 'bg-rose-500 text-white' },
  news: { icon: '📰', label: 'News', badgeClass: 'bg-neutral-700 text-white' },
}

const SENTIMENT_CONFIG: Record<string, { label: string; className: string }> = {
  positive: { label: 'Positive', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  negative: { label: 'Negative', className: 'bg-red-50 text-red-700 border border-red-200' },
  neutral: { label: 'Neutral', className: 'bg-muted text-muted-foreground border border-border' },
  mixed: { label: 'Mixed', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{
    platform?: string | string[]
    sentiment?: string | string[]
    from?: string
    to?: string
    page?: string
    status?: string
    author?: string
  }>
}

export default async function IntelligenceInboxPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const params = await searchParams

  // Build query string from searchParams
  const qs = new URLSearchParams()
  qs.set('limit', '20')
  qs.set('status', params.status ?? 'new')
  if (params.page) qs.set('page', params.page)

  const platforms = Array.isArray(params.platform)
    ? params.platform
    : params.platform
    ? [params.platform]
    : []
  const sentiments = Array.isArray(params.sentiment)
    ? params.sentiment
    : params.sentiment
    ? [params.sentiment]
    : []

  // The API accepts single platform/sentiment filter; if multiple selected, skip filter (show all)
  if (platforms.length === 1) qs.set('platform', platforms[0]!)
  if (sentiments.length === 1) qs.set('sentiment', sentiments[0]!)
  if (params.author) qs.set('author', params.author)

  let mentions: Mention[] = []
  let total = 0
  let isError = false

  try {
    // apiGet unwraps envelope.data — for total we need the raw envelope.
    // Use fetch() directly so we get both data and total from the response.
    const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
    const res = await fetch(`${API_URL}/api/intelligence/mentions?${qs.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const envelope = await res.json() as { data: Mention[]; total: number }
    mentions = envelope.data
    total = envelope.total
  } catch {
    isError = true
  }

  // Client-side filter for multi-select platform/sentiment (API only supports single value)
  if (platforms.length > 1) {
    mentions = mentions.filter((m) => platforms.includes(m.platform))
  }
  if (sentiments.length > 1) {
    mentions = mentions.filter((m) => sentiments.includes(m.sentiment))
  }
  // Date range filter (client-side)
  if (params.from) {
    const fromDate = new Date(params.from)
    mentions = mentions.filter((m) => new Date(m.publishedAt) >= fromDate)
  }
  if (params.to) {
    const toDate = new Date(params.to)
    toDate.setHours(23, 59, 59, 999)
    mentions = mentions.filter((m) => new Date(m.publishedAt) <= toDate)
  }

  return (
    <div className="flex gap-6">
      {/* ── Filter sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden w-56 flex-shrink-0 lg:block">
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-4 animate-pulse h-96" />}>
          <InboxFilters />
        </Suspense>
      </aside>

      {/* ── Main feed ──────────────────────────────────────────────────────── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Status tabs */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1 w-fit">
          {(['new', 'reviewed', 'actioned'] as const).map((s) => (
            <Link
              key={s}
              href={`/intelligence/inbox?status=${s}`}
              className={[
                'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                (params.status ?? 'new') === s
                  ? 'bg-card text-surface-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-surface-foreground',
              ].join(' ')}
            >
              {s}
            </Link>
          ))}
        </div>

        {/* Count */}
        {!isError && (
          <p className="text-xs text-muted-foreground">
            {total.toLocaleString()} mention{total !== 1 ? 's' : ''}
          </p>
        )}

        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">Could not load mentions</p>
            <p className="mt-0.5 text-xs text-amber-700">
              Check that the social-intel module is enabled and the pipeline has collected data.
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isError && mentions.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
              🔍
            </div>
            <p className="text-sm font-medium text-muted-foreground">No mentions found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try adjusting your filters or check back after the pipeline runs.
            </p>
          </div>
        )}

        {/* Mention cards */}
        {!isError && mentions.map((mention) => (
          <MentionCard key={mention.id} mention={mention} />
        ))}
      </div>
    </div>
  )
}

// ─── Mention Card ─────────────────────────────────────────────────────────────

function MentionCard({ mention }: { mention: Mention }) {
  const platformCfg = PLATFORM_CONFIG[mention.platform] ?? {
    icon: '🌐',
    label: mention.platform,
    badgeClass: 'bg-muted text-muted-foreground',
  }
  const sentimentCfg = SENTIMENT_CONFIG[mention.sentiment] ?? SENTIMENT_CONFIG.neutral!

  const forumHref = `/forums/new?prefill=${encodeURIComponent(
    JSON.stringify({
      title: `Mention from ${platformCfg.label}`,
      body: mention.textPreview,
      sourceUrl: mention.contentUrl,
    }),
  )}`

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-sm transition-shadow">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className={[
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            platformCfg.badgeClass,
          ].join(' ')}
        >
          <span aria-hidden>{platformCfg.icon}</span>
          {platformCfg.label}
        </span>

        {mention.authorUrl ? (
          <a
            href={mention.authorUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand hover:underline"
          >
            {mention.authorHandle}
          </a>
        ) : (
          <span className="text-xs font-medium text-surface-foreground">{mention.authorHandle}</span>
        )}

        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(mention.publishedAt)}</span>
      </div>

      {/* Mention text */}
      <p className="text-sm text-surface-foreground line-clamp-3">{mention.textPreview}</p>

      {/* Footer row */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            sentimentCfg.className,
          ].join(' ')}
        >
          {sentimentCfg.label}
        </span>

        {mention.engagementCount > 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <HeartIcon />
            {mention.engagementCount.toLocaleString()}
          </span>
        )}

        {mention.linkedMemberId && (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/5 border border-brand/30 px-2 py-0.5 text-xs font-medium text-brand">
            <MemberIcon />
            {mention.linkedMemberName ?? 'Member'}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <a
            href={mention.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-muted-foreground hover:text-surface-foreground transition-colors"
          >
            View original &rarr;
          </a>
          <Link
            href={forumHref}
            className="rounded-md bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10 transition-colors"
          >
            Create forum post
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function HeartIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function MemberIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
