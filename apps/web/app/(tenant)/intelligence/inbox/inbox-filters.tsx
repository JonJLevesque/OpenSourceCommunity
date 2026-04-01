'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

type Platform = 'twitter' | 'reddit' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'news' | 'hackernews' | 'github' | 'g2' | 'trustpilot' | 'producthunt'
type Sentiment = 'positive' | 'negative' | 'neutral'

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'hackernews', label: 'HackerNews' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'g2', label: 'G2' },
  { value: 'trustpilot', label: 'Trustpilot' },
  { value: 'producthunt', label: 'Product Hunt' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'news', label: 'News' },
]

const SENTIMENTS: { value: Sentiment; label: string }[] = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
]

export function InboxFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activePlatforms = searchParams.getAll('platform')
  const activeSentiments = searchParams.getAll('sentiment')
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''

  const updateParams = useCallback(
    (updates: Record<string, string | string[] | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        params.delete(key)
        if (Array.isArray(value)) {
          for (const v of value) params.append(key, v)
        } else if (value !== null) {
          params.set(key, value)
        }
      }
      // Reset page when filters change
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  function togglePlatform(platform: Platform) {
    const next = activePlatforms.includes(platform)
      ? activePlatforms.filter((p) => p !== platform)
      : [...activePlatforms, platform]
    updateParams({ platform: next.length ? next : [] })
  }

  function toggleSentiment(sentiment: Sentiment) {
    const next = activeSentiments.includes(sentiment)
      ? activeSentiments.filter((s) => s !== sentiment)
      : [...activeSentiments, sentiment]
    updateParams({ sentiment: next.length ? next : [] })
  }

  function clearAll() {
    router.push(pathname)
  }

  const hasFilters = activePlatforms.length > 0 || activeSentiments.length > 0 || from || to

  return (
    <div className="sticky top-24 space-y-5 rounded-xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Filters
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-[10px] font-medium text-brand hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Platform */}
      <div>
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Platform
        </p>
        <div className="space-y-1.5">
          {PLATFORMS.map((p) => (
            <label key={p.value} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={activePlatforms.length === 0 || activePlatforms.includes(p.value)}
                onChange={() => togglePlatform(p.value)}
                className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sentiment */}
      <div className="border-t border-border pt-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Sentiment
        </p>
        <div className="space-y-1.5">
          {SENTIMENTS.map((s) => (
            <label key={s.value} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={activeSentiments.length === 0 || activeSentiments.includes(s.value)}
                onChange={() => toggleSentiment(s.value)}
                className="h-3.5 w-3.5 rounded border-border text-brand focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date range */}
      <div className="border-t border-border pt-4">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Date range
        </p>
        <div className="space-y-2">
          <input
            type="date"
            value={from}
            onChange={(e) => updateParams({ from: e.target.value || null })}
            className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring bg-card"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => updateParams({ to: e.target.value || null })}
            className="w-full rounded-lg border border-border px-2.5 py-1.5 text-xs text-surface-foreground focus:outline-none focus:ring-1 focus:ring-ring bg-card"
          />
        </div>
      </div>
    </div>
  )
}
