'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'
import { RichEditor } from '@/components/editor'

interface ThreadActionsProps {
  threadId: string
  categorySlug: string
  token: string
}

export function ThreadActions({ threadId, categorySlug: _categorySlug, token }: ThreadActionsProps) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // body is HTML — treat empty paragraph as empty
  const isBodyEmpty = !body || body === '<p></p>'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isBodyEmpty) return

    setSubmitting(true)
    setError(null)

    try {
      await apiPost(
        `/api/forums/threads/${threadId}/posts`,
        { body },
        token,
      )
      setBody('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Please{' '}
        <a href="/login" className="text-brand hover:underline">
          sign in
        </a>{' '}
        to reply to this thread.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="mb-4 text-base font-semibold text-surface-foreground">Post a reply</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <RichEditor
          value={body}
          onChange={setBody}
          placeholder="Write your reply…"
          minHeight="150px"
          disabled={submitting}
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || isBodyEmpty}
            className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            Post reply
          </button>
        </div>
      </form>
    </div>
  )
}
