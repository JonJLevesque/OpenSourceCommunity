'use client'

import { useState } from 'react'
import { apiClientPost, apiClientPatch, apiClientDelete } from '@/lib/api-client'

interface KbCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
  sortOrder: number
  createdAt: string
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function CategoryForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<KbCategory>
  onSave: (cat: KbCategory) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
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
      let result: KbCategory
      if (initial?.id) {
        result = await apiClientPatch(`/api/kb/categories/${initial.id}`, { name, slug })
      } else {
        result = await apiClientPost('/api/kb/categories', { name, slug, sortOrder: 0 })
      }
      onSave(result)
    } catch {
      setError('Failed to save. Ensure the slug is unique.')
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
            placeholder="e.g. Getting Started"
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
            placeholder="getting-started"
            required
            pattern="^[a-z0-9-]+$"
            className="w-full rounded-lg border border-border px-3 py-2 font-mono text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : initial?.id ? 'Update' : 'Create category'}
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

export function KbSettingsClient({ initialCategories }: { initialCategories: KbCategory[] }) {
  const [categories, setCategories] = useState<KbCategory[]>(initialCategories)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSaved(cat: KbCategory) {
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

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await apiClientDelete(`/api/kb/categories/${id}`)
      setCategories((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // surface error if needed
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-foreground">Categories</h3>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-lg bg-brand px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-colors"
          >
            + Add category
          </button>
        )}
      </div>

      {adding && (
        <CategoryForm onSave={handleSaved} onCancel={() => setAdding(false)} />
      )}

      {categories.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-10 text-center">
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat) => (
                <>
                  <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{cat.slug}</p>
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
                          disabled={deletingId === cat.id}
                          onClick={() => handleDelete(cat.id)}
                          className="text-xs font-medium text-muted-foreground hover:text-red-600 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === cat.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === cat.id && (
                    <tr key={`${cat.id}-edit`}>
                      <td colSpan={2} className="px-4 py-3">
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
    </section>
  )
}
