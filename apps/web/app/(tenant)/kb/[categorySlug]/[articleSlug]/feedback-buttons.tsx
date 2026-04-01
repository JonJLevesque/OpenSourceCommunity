'use client'

import { useState, useTransition } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackButtonsProps {
  articleId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { apiClientPost } from '@/lib/api-client'

async function submitFeedback(articleId: string, helpful: boolean): Promise<void> {
  await apiClientPost(`/api/kb/articles/${articleId}/feedback`, { isHelpful: helpful })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FeedbackButtons({ articleId }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFeedback(helpful: boolean) {
    setError(null)
    startTransition(async () => {
      try {
        await submitFeedback(articleId, helpful)
        setSubmitted(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-emerald-500">
          <CheckCircleIcon />
        </span>
        Thanks for your feedback!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-surface-foreground">Was this article helpful?</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleFeedback(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-surface-foreground transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60"
        >
          <ThumbUpIcon />
          Yes
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleFeedback(false)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-surface-foreground transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
        >
          <ThumbDownIcon />
          No
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {isPending && <p className="text-xs text-muted-foreground">Submitting&hellip;</p>}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ThumbUpIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
    </svg>
  )
}

function ThumbDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 11 3 3L22 4" />
    </svg>
  )
}
