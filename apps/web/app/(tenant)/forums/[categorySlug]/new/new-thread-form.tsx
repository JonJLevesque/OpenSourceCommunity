'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RichEditor } from '@/components/editor'
import { apiClientPost } from '@/lib/api-client'

interface NewThreadFormProps {
  categoryId: string
  categoryName: string
  categorySlug: string
  token: string
}

export function NewThreadForm({ categoryId, categoryName, categorySlug, token: _token }: NewThreadFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow'
  const labelClass = 'block text-sm font-medium text-surface-foreground mb-1'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    const trimmedBody = body.trim()
    if (!trimmedTitle) {
      setError('Title is required.')
      return
    }
    setError(null)

    startTransition(async () => {
      try {
        const data = await apiClientPost<{ id: string }>('/api/forums/threads', {
          title: trimmedTitle,
          body: trimmedBody,
          categoryId,
        })
        router.push(`/forums/${categorySlug}/${data.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">
          Posting in{' '}
          <span className="text-brand">{categoryName}</span>
        </h2>

        {/* Title */}
        <div>
          <label htmlFor="thread-title" className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="thread-title"
            type="text"
            required
            maxLength={500}
            placeholder="What's your discussion about?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Body */}
        <div>
          <label className={labelClass}>Body</label>
          <RichEditor
            value={body}
            onChange={setBody}
            placeholder="Share your thoughts, questions, or ideas…"
            minHeight="300px"
            disabled={isPending}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || !title.trim()}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Posting…' : 'Post thread'}
        </button>
        <Link
          href={`/forums/${categorySlug}`}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
