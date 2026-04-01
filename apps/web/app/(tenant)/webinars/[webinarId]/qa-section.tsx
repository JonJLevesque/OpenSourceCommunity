'use client'

import { useState, useTransition } from 'react'
import type { QaItem } from './page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QaSectionProps {
  webinarId: string
  initialItems: QaItem[]
  isAuthenticated: boolean
  token: string | undefined
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { apiClientPost } from '@/lib/api-client'

async function submitQuestion(webinarId: string, question: string): Promise<QaItem> {
  return apiClientPost<QaItem>(`/api/webinars/${webinarId}/qa`, { question })
}

async function upvoteQuestion(webinarId: string, qaId: string): Promise<QaItem> {
  return apiClientPost<QaItem>(`/api/webinars/${webinarId}/qa/${qaId}/upvote`, {})
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QaSection({ webinarId, initialItems, isAuthenticated, token }: QaSectionProps) {
  const [items, setItems] = useState<QaItem[]>(initialItems)
  const [question, setQuestion] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return

    setSubmitError(null)

    startTransition(async () => {
      try {
        if (!token) throw new Error('Not authenticated')
        const newItem = await submitQuestion(webinarId, trimmed)
        setItems((prev) => [newItem, ...prev])
        setQuestion('')
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Could not submit question.')
      }
    })
  }

  function handleUpvote(qaId: string) {
    // Optimistic: increment upvotes locally
    setItems((prev) =>
      prev.map((item) =>
        item.id === qaId ? { ...item, upvotes: item.upvotes + 1 } : item,
      ),
    )

    startTransition(async () => {
      try {
        if (!token) throw new Error('Not authenticated')
        const updated = await upvoteQuestion(webinarId, qaId)
        setItems((prev) => prev.map((item) => (item.id === qaId ? updated : item)))
      } catch {
        // Roll back optimistic update
        setItems((prev) =>
          prev.map((item) =>
            item.id === qaId ? { ...item, upvotes: Math.max(0, item.upvotes - 1) } : item,
          ),
        )
      }
    })
  }

  // Sort: highest upvotes first, then by createdAt asc
  const sorted = [...items].sort((a, b) => {
    if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes
    return new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
  })

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-sm font-semibold text-surface-foreground">
          Q&amp;A
          {items.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground">({items.length})</span>
          )}
        </h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Question submission form */}
        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              rows={3}
              maxLength={2000}
              disabled={isPending}
              className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60"
            />
            {submitError && (
              <p className="text-xs text-red-600">{submitError}</p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isPending || !question.trim()}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Submit question'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Sign in to ask a question.</p>
        )}

        {/* Q&A list */}
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No questions yet. Be the first to ask!
          </p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((item) => (
              <li key={item.id} className="space-y-2">
                <div className="flex items-start gap-3">
                  {/* Upvote button */}
                  <button
                    type="button"
                    onClick={() => handleUpvote(item.id)}
                    disabled={!isAuthenticated || isPending}
                    className={[
                      'flex flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
                      item.upvotes > 0
                        ? 'border-brand/30 bg-brand/5 text-brand'
                        : 'border-border text-muted-foreground hover:border-brand/30 hover:bg-brand/5 hover:text-brand',
                    ].join(' ')}
                    aria-label="Upvote question"
                  >
                    <ChevronUpIcon />
                    {item.upvotes > 0 && <span>{item.upvotes}</span>}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Question */}
                    <p className="text-sm text-surface-foreground">{item.question}</p>

                    {/* Answer */}
                    {item.answer && (
                      <div className="mt-2 rounded-lg bg-brand/5 px-3 py-2">
                        <p className="mb-1 text-xs font-semibold text-brand">Answer</p>
                        <p className="text-sm text-surface-foreground">{item.answer}</p>
                      </div>
                    )}

                    {/* Meta */}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.createdAt
                        ? new Intl.DateTimeFormat('en', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          }).format(new Date(item.createdAt))
                        : ''}
                      {item.answeredAt && (
                        <span className="ml-2 text-emerald-600">Answered</span>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function ChevronUpIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m18 15-6-6-6 6" />
    </svg>
  )
}
