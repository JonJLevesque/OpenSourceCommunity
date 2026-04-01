'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RichEditor } from '@/components/editor'
import { apiClientPost } from '@/lib/api-client'

interface CommentFormProps {
  ideaId: string
  token: string
}

export function CommentForm({ ideaId, token }: CommentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // body is HTML — treat empty paragraph as empty
  const isBodyEmpty = !body || body === '<p></p>'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isBodyEmpty) return
    setError(null)

    startTransition(async () => {
      try {
        await apiClientPost(`/api/ideas/${ideaId}/comments`, { body })
        setBody('')
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  if (!token) {
    return (
      <p className="text-sm text-muted-foreground">
        <a href="/login" className="text-brand hover:underline">Sign in</a> to leave a comment.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <RichEditor
        value={body}
        onChange={setBody}
        placeholder="Share your thoughts…"
        minHeight="120px"
        disabled={isPending}
      />
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600">Comment posted!</p>
      )}
      <button
        type="submit"
        disabled={isPending || isBodyEmpty}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Posting…' : 'Post comment'}
      </button>
    </form>
  )
}
