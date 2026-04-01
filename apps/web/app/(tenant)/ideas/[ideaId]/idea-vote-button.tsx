'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost } from '@/lib/api'

interface IdeaVoteButtonProps {
  ideaId: string
  voteCount: number
  hasVoted: boolean
  token: string
}

export function IdeaVoteButton({
  ideaId,
  voteCount: initialCount,
  hasVoted: initialVoted,
  token,
}: IdeaVoteButtonProps) {
  const router = useRouter()
  const [voted, setVoted] = useState(initialVoted)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    if (!token) {
      window.location.href = '/login'
      return
    }

    // Optimistic update
    const newVoted = !voted
    setVoted(newVoted)
    setCount((c) => c + (newVoted ? 1 : -1))
    setLoading(true)

    try {
      // API is a toggle: POST always, server determines vote/unvote
      await apiPost(`/api/ideas/${ideaId}/vote`, {}, token)
      router.refresh()
    } catch {
      // Revert on failure
      setVoted(!newVoted)
      setCount((c) => c + (newVoted ? -1 : 1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={[
        'inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60',
        voted
          ? 'border-brand bg-brand text-white hover:opacity-90'
          : 'border-border bg-card text-surface-foreground hover:border-brand/30 hover:bg-brand/5',
      ].join(' ')}
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill={voted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
        />
      </svg>
      {voted ? 'Voted' : 'Vote'} &middot; {count.toLocaleString()}
    </button>
  )
}
