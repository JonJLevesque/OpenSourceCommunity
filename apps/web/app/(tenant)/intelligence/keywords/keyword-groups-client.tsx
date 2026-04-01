'use client'

import { useState, useTransition } from 'react'

export type GroupType = 'brand' | 'competitor' | 'custom'

const ALL_PLATFORMS = [
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

const TYPE_LABELS: Record<GroupType, string> = {
  brand: 'Brand',
  competitor: 'Competitor',
  custom: 'Custom',
}

const TYPE_COLORS: Record<GroupType, string> = {
  brand: 'bg-brand/10 text-brand border-brand/20',
  competitor: 'bg-red-50 text-red-700 border-red-200',
  custom: 'bg-violet-50 text-violet-700 border-violet-200',
}

export interface KeywordGroup {
  id: string
  name: string
  type: GroupType
  terms: string[]
  platforms: string[]
  isActive: boolean | null
  createdAt: string | null
}

// ─── Create Form ──────────────────────────────────────────────────────────────

export function CreateGroupForm({ onCreated }: { onCreated: (g: KeywordGroup) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<GroupType>('brand')
  const [termsInput, setTermsInput] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['twitter', 'reddit', 'hackernews'])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function togglePlatform(p: string) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const terms = termsInput
      .split(/[\n,]/)
      .map((t) => t.trim())
      .filter(Boolean)

    if (!name.trim()) return setError('Name is required.')
    if (terms.length === 0) return setError('Add at least one keyword.')
    if (platforms.length === 0) return setError('Select at least one platform.')

    startTransition(async () => {
      try {
        const res = await fetch('/api/intelligence/keyword-groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), type, terms, platforms }),
        })
        if (!res.ok) {
          const body = await res.json() as { error?: string }
          throw new Error(body.error ?? 'Failed to create group')
        }
        const { data } = await res.json() as { data: KeywordGroup }
        onCreated(data)
        setName('')
        setTermsInput('')
        setType('brand')
        setPlatforms(['twitter', 'reddit', 'hackernews'])
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        Add keyword group
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-surface-foreground">New keyword group</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">
            Group name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brand mentions"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-card"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">Type</label>
          <div className="flex gap-2">
            {(['brand', 'competitor', 'custom'] as GroupType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={[
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  type === t
                    ? TYPE_COLORS[t]
                    : 'border-border text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Keywords */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">
            Keywords <span className="text-muted-foreground font-normal">(comma or newline separated)</span>
          </label>
          <textarea
            value={termsInput}
            onChange={(e) => setTermsInput(e.target.value)}
            rows={3}
            placeholder="OpenSourceCommunity, @OSCommunity, #OSCommunity"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-card"
          />
          {termsInput && (
            <p className="mt-1 text-xs text-muted-foreground">
              {termsInput.split(/[\n,]/).filter((t) => t.trim()).length} keyword
              {termsInput.split(/[\n,]/).filter((t) => t.trim()).length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Platforms */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={[
                  'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  platforms.includes(p.value)
                    ? 'border-brand/30 bg-brand/10 text-brand'
                    : 'border-border text-muted-foreground hover:bg-muted',
                ].join(' ')}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Creating…' : 'Create group'}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Group List ───────────────────────────────────────────────────────────────

export function KeywordGroupList({ initialGroups }: { initialGroups: KeywordGroup[] }) {
  const [groups, setGroups] = useState<KeywordGroup[]>(initialGroups)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function handleCreated(g: KeywordGroup) {
    setGroups((prev) => [g, ...prev])
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/intelligence/keyword-groups/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setGroups((prev) => prev.filter((g) => g.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function handleToggle(group: KeywordGroup) {
    setTogglingId(group.id)
    try {
      const res = await fetch(`/api/intelligence/keyword-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !group.isActive }),
      })
      if (res.ok) {
        const { data } = await res.json() as { data: KeywordGroup }
        setGroups((prev) => prev.map((g) => (g.id === group.id ? data : g)))
      }
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-surface-foreground">Keyword groups</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define what to monitor across social platforms.
          </p>
        </div>
        <CreateGroupForm onCreated={handleCreated} />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-14 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">
            🔍
          </div>
          <p className="text-sm font-medium text-muted-foreground">No keyword groups yet</p>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            Add your brand name, competitor names, or product keywords to start tracking mentions.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className={[
                'rounded-xl border bg-card p-5 transition-opacity',
                !group.isActive ? 'opacity-60' : '',
              ].join(' ')}
              style={{ borderColor: group.isActive ? undefined : undefined }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-sm text-surface-foreground">{group.name}</span>
                    <span
                      className={[
                        'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                        TYPE_COLORS[group.type],
                      ].join(' ')}
                    >
                      {TYPE_LABELS[group.type]}
                    </span>
                    {!group.isActive && (
                      <span className="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Paused
                      </span>
                    )}
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {group.terms.map((term) => (
                      <span
                        key={term}
                        className="rounded-md bg-muted border border-border px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {term}
                      </span>
                    ))}
                  </div>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-1.5">
                    {group.platforms.map((p) => {
                      const label = ALL_PLATFORMS.find((x) => x.value === p)?.label ?? p
                      return (
                        <span
                          key={p}
                          className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                          {label}
                        </span>
                      )
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(group)}
                    disabled={togglingId === group.id}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {togglingId === group.id
                      ? '…'
                      : group.isActive
                      ? 'Pause'
                      : 'Resume'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(group.id)}
                    disabled={deletingId === group.id}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === group.id ? '…' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
