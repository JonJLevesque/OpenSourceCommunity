'use client'

import { useState } from 'react'
import { apiClientPost, apiClientPatch, apiClientDelete } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  visibility: 'public' | 'members' | 'restricted'
  sortOrder: number
  isArchived: boolean
  threadCount: number
  postCount: number
  createdAt: string
}

const VISIBILITY_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  public: { label: 'Public', variant: 'default' },
  members: { label: 'Members only', variant: 'secondary' },
  restricted: { label: 'Restricted', variant: 'outline' },
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ─── Add/Edit form ────────────────────────────────────────────────────────────

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<CategoryRow>
  onSave: (data: CategoryRow) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [visibility, setVisibility] = useState<'public' | 'members' | 'restricted'>(
    initial?.visibility ?? 'members',
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleNameChange(val: string) {
    setName(val)
    if (!initial?.id) setSlug(slugify(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      let result: CategoryRow
      if (initial?.id) {
        result = await apiClientPatch(`/api/admin/forums/categories/${initial.id}`, {
          name,
          slug,
          description: description || undefined,
          visibility,
        })
      } else {
        result = await apiClientPost('/api/admin/forums/categories', {
          name,
          slug,
          description: description || undefined,
          visibility,
          sortOrder: 0,
        })
      }
      onSave(result)
    } catch {
      setError('Failed to save. Check that the slug is unique.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-foreground">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. General Discussion"
            required
            className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-surface-foreground">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="general-discussion"
            required
            pattern="^[a-z0-9-]+$"
            className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-surface-foreground">
          Description <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this category for?"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-surface-foreground">Visibility</label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
          className="rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="public">Public — visible to everyone</option>
          <option value="members">Members only — logged-in members</option>
          <option value="restricted">Restricted — specific roles only</option>
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : initial?.id ? 'Update category' : 'Create category'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ForumsSettingsClient({ initialCategories }: { initialCategories: CategoryRow[] }) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [archiving, setArchiving] = useState<string | null>(null)

  function handleSaved(cat: CategoryRow) {
    setCategories((prev) => {
      const idx = prev.findIndex((c) => c.id === cat.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = cat
        return next
      }
      return [cat, ...prev]
    })
    setAdding(false)
    setEditingId(null)
  }

  async function handleArchive(id: string) {
    setArchiving(id)
    try {
      await apiClientDelete(`/api/admin/forums/categories/${id}`)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // ignore — surface could add a toast
    } finally {
      setArchiving(null)
    }
  }

  async function handleMove(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= categories.length) return

    const next = [...categories]
    ;[next[idx], next[newIdx]] = [next[newIdx]!, next[idx]!]
    const reordered = next.map((c, i) => ({ ...c, sortOrder: i }))
    setCategories(reordered)

    try {
      await apiClientPatch('/api/admin/forums/categories/reorder', {
        order: reordered.map((c) => ({ id: c.id, sortOrder: c.sortOrder })),
      })
    } catch {
      // revert on failure
      setCategories(categories)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + Add category
        </button>
      )}

      {/* Add form */}
      {adding && (
        <CategoryForm
          onSave={handleSaved}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Category table */}
      {categories.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No categories yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Category
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">
                  Visibility
                </th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">
                  Threads
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Order
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat, idx) => (
                <>
                  <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      {editingId === cat.id ? null : (
                        <div>
                          <p className="font-medium text-surface-foreground">{cat.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
                          {cat.description && (
                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                              {cat.description}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant={VISIBILITY_LABELS[cat.visibility]?.variant ?? 'secondary'}>
                        {VISIBILITY_LABELS[cat.visibility]?.label ?? cat.visibility}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                      {cat.threadCount}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMove(cat.id, 'up')}
                          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={idx === categories.length - 1}
                          onClick={() => handleMove(cat.id, 'down')}
                          className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === cat.id ? null : cat.id)}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={archiving === cat.id}
                          onClick={() => handleArchive(cat.id)}
                          className="text-xs font-medium text-muted-foreground hover:text-red-600 disabled:opacity-50 transition-colors"
                        >
                          {archiving === cat.id ? 'Archiving…' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === cat.id && (
                    <tr key={`${cat.id}-edit`}>
                      <td colSpan={5} className="px-4 py-3">
                        <CategoryForm
                          initial={cat}
                          onSave={handleSaved}
                          onCancel={() => setEditingId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
