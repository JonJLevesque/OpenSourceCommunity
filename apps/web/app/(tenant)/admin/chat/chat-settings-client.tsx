'use client'

import { useState } from 'react'
import { apiClientPost, apiClientPatch, apiClientDelete } from '@/lib/api-client'
import { Badge } from '@/components/ui/badge'

interface ChatChannel {
  id: string
  name: string
  slug: string
  description: string | null
  isPrivate: boolean
  createdAt: string
}

function slugify(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function ChannelForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ChatChannel>
  onSave: (channel: ChatChannel) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [isPrivate, setIsPrivate] = useState(initial?.isPrivate ?? false)
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
      let result: ChatChannel
      if (initial?.id) {
        result = await apiClientPatch(`/api/chat/channels/${initial.id}`, {
          name, slug, description: description || undefined, isPrivate,
        })
      } else {
        result = await apiClientPost('/api/chat/channels', {
          name, slug, description: description || undefined, isPrivate,
        })
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
            placeholder="e.g. general"
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
            placeholder="general"
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
          placeholder="What is this channel for?"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="rounded border-border"
        />
        <span className="text-sm text-surface-foreground">Private channel</span>
        <span className="text-xs text-muted-foreground">(invite-only)</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : initial?.id ? 'Update channel' : 'Create channel'}
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

export function ChatSettingsClient({ initialChannels }: { initialChannels: ChatChannel[] }) {
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function handleSaved(channel: ChatChannel) {
    setChannels((prev) => {
      const idx = prev.findIndex((c) => c.id === channel.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = channel
        return next
      }
      return [channel, ...prev]
    })
    setAdding(false)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await apiClientDelete(`/api/chat/channels/${id}`)
      setChannels((prev) => prev.filter((c) => c.id !== id))
    } catch {
      // surface error if needed
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
        >
          + Add channel
        </button>
      )}

      {adding && (
        <ChannelForm onSave={handleSaved} onCancel={() => setAdding(false)} />
      )}

      {channels.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-8 py-12 text-center">
          <p className="text-sm text-muted-foreground">No channels yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Channel</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Visibility</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channels.map((channel) => (
                <>
                  <tr key={channel.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-surface-foreground">#{channel.name}</p>
                      {channel.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{channel.description}</p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <Badge variant={channel.isPrivate ? 'outline' : 'secondary'}>
                        {channel.isPrivate ? 'Private' : 'Public'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(editingId === channel.id ? null : channel.id)}
                          className="text-xs font-medium text-brand hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === channel.id}
                          onClick={() => handleDelete(channel.id)}
                          className="text-xs font-medium text-muted-foreground hover:text-red-600 disabled:opacity-50 transition-colors"
                        >
                          {deletingId === channel.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === channel.id && (
                    <tr key={`${channel.id}-edit`}>
                      <td colSpan={3} className="px-4 py-3">
                        <ChannelForm
                          initial={channel}
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
