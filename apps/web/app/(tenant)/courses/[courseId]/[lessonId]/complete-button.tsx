'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClientPost } from '@/lib/api-client'

interface CompleteButtonProps {
  courseId: string
  lessonId: string
  token: string | undefined
  isComplete: boolean
}

export function CompleteButton({ courseId, lessonId, token, isComplete: initialIsComplete }: CompleteButtonProps) {
  const router = useRouter()
  const [complete, setComplete] = useState(initialIsComplete)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  async function handleComplete() {
    if (complete || loading || !token) return

    setLoading(true)
    setError('')

    try {
      await apiClientPost(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {})
      setComplete(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (complete) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        <CheckIcon />
        Completed
      </span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleComplete}
        disabled={loading || !token}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <>
            <SpinnerIcon />
            Saving…
          </>
        ) : (
          <>
            <CheckIcon />
            Mark complete
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="20 6 9 17 4 12" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
    </svg>
  )
}
