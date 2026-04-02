'use client'

import { useState, useTransition } from 'react'

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
]

const PLATFORM_LABELS = Object.fromEntries(ALL_PLATFORMS.map(p => [p.value, p.label]))

export interface CompetitorGroup {
  id: string
  name: string
  type: 'brand' | 'competitor' | 'custom'
  terms: string[]
  platforms: string[]
  isActive: boolean | null
  createdAt: string | null
}

// ─── Competitor List (client shell) ──────────────────────────────────────────

export function CompetitorList({ initialGroups }: { initialGroups: CompetitorGroup[] }) {
  const [groups, setGroups] = useState<CompetitorGroup[]>(initialGroups)
  const [editing, setEditing] = useState<CompetitorGroup | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/intelligence/keyword-groups/${id}`, { method: 'DELETE' })
      if (res.ok) setGroups(prev => prev.filter(g => g.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  function handleCreated(g: CompetitorGroup) {
    setGroups(prev => [g, ...prev])
    setShowAdd(false)
  }

  function handleUpdated(g: CompetitorGroup) {
    setGroups(prev => prev.map(x => x.id === g.id ? g : x))
    setEditing(null)
  }

  if (editing) {
    return (
      <CompetitorForm
        initial={editing}
        onSaved={handleUpdated}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-surface-foreground">Competitor Tracking</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Monitor mentions of competitor brands across social platforms.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + Add competitor
        </button>
      </div>

      {showAdd && (
        <CompetitorForm
          onSaved={handleCreated}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {groups.length === 0 && !showAdd ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">🔭</div>
          <p className="text-sm font-semibold text-surface-foreground">No competitor groups yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add a competitor to start tracking their mentions across platforms.
          </p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
          >
            + Add your first competitor
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <CompetitorCard
              key={group.id}
              group={group}
              onEdit={() => setEditing(group)}
              onDelete={() => handleDelete(group.id)}
              isDeleting={deletingId === group.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Competitor Card ──────────────────────────────────────────────────────────

function CompetitorCard({
  group, onEdit, onDelete, isDeleting,
}: {
  group: CompetitorGroup
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-surface-foreground truncate">{group.name}</h3>
            <span className={[
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              group.isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-muted text-muted-foreground border border-border',
            ].join(' ')}>
              {group.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {group.terms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Terms:</span>
              {group.terms.map(term => (
                <span key={term} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-surface-foreground border border-border">
                  {term}
                </span>
              ))}
            </div>
          )}
          {group.platforms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs font-medium text-muted-foreground mr-1">Platforms:</span>
              {group.platforms.map(p => (
                <span key={p} className="inline-flex items-center rounded-full bg-brand/5 px-2.5 py-0.5 text-xs text-brand border border-brand/20">
                  {PLATFORM_LABELS[p] ?? p}
                </span>
              ))}
            </div>
          )}
          {group.createdAt && (
            <p className="mt-2 text-xs text-muted-foreground">
              Added {new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {isDeleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add / Edit Form ──────────────────────────────────────────────────────────

function CompetitorForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: CompetitorGroup
  onSaved: (g: CompetitorGroup) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [termsInput, setTermsInput] = useState(initial?.terms.join(', ') ?? '')
  const [platforms, setPlatforms] = useState<string[]>(initial?.platforms ?? ['twitter', 'reddit'])
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const terms = termsInput.split(/[\n,]/).map(t => t.trim()).filter(Boolean)
    if (!name.trim()) return setError('Name is required.')
    if (terms.length === 0) return setError('Add at least one keyword.')
    if (platforms.length === 0) return setError('Select at least one platform.')

    startTransition(async () => {
      try {
        const url = initial
          ? `/api/intelligence/keyword-groups/${initial.id}`
          : '/api/intelligence/keyword-groups'
        const method = initial ? 'PATCH' : 'POST'
        const body = initial
          ? { name: name.trim(), terms, platforms }
          : { name: name.trim(), type: 'competitor', terms, platforms }

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const json = await res.json() as { error?: string }
          throw new Error(json.error ?? 'Failed to save')
        }
        const { data } = await res.json() as { data: CompetitorGroup }
        onSaved(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="mb-4 text-sm font-semibold text-surface-foreground">
        {initial ? 'Edit competitor' : 'Add competitor'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">Competitor name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Acme Corp"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-card"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">
            Keywords <span className="text-muted-foreground font-normal">(comma or newline separated)</span>
          </label>
          <textarea
            value={termsInput}
            onChange={e => setTermsInput(e.target.value)}
            rows={3}
            placeholder="Acme Corp, @AcmeCorp, #AcmeCorp"
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none bg-card"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-surface-foreground">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {ALL_PLATFORMS.map(p => (
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
            {isPending ? 'Saving…' : initial ? 'Save changes' : 'Add competitor'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
