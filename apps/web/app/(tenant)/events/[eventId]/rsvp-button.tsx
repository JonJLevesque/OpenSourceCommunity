'use client'

import { useState, useTransition } from 'react'
import type { RsvpStatus } from './page'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RsvpButtonProps {
  eventId: string
  initialStatus: RsvpStatus
  goingCount: number
  interestedCount: number
  token: string | undefined
}

type RsvpOption = 'going' | 'interested' | 'not_going'

// ─── Helpers ──────────────────────────────────────────────────────────────────

import { apiClientPost, apiClientDelete } from '@/lib/api-client'

async function upsertRsvp(eventId: string, status: RsvpOption): Promise<void> {
  await apiClientPost(`/api/events/${eventId}/rsvp`, { status })
}

async function cancelRsvp(eventId: string): Promise<void> {
  await apiClientDelete(`/api/events/${eventId}/rsvp`)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RsvpButton({
  eventId,
  initialStatus,
  goingCount,
  interestedCount,
  token,
}: RsvpButtonProps) {
  const [status, setStatus] = useState<RsvpStatus>(initialStatus)
  const [going, setGoing] = useState(goingCount)
  const [interested, setInterested] = useState(interestedCount)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function delta(prev: RsvpStatus, next: RsvpOption): number {
    // Returns +1 or -1 for count adjustment
    if (prev === next) return -1 // toggling off
    return 1
  }

  async function handleRsvp(option: RsvpOption) {
    const prevStatus = status
    const prevGoing = going
    const prevInterested = interested

    // Optimistic update
    const next: RsvpStatus = status === option ? null : option
    setStatus(next)
    if (option === 'going') {
      setGoing((n) => n + delta(prevStatus, option))
      if (prevStatus === 'interested') setInterested((n) => n - 1)
    } else if (option === 'interested') {
      setInterested((n) => n + delta(prevStatus, option))
      if (prevStatus === 'going') setGoing((n) => n - 1)
    } else {
      // not_going: remove from both
      if (prevStatus === 'going') setGoing((n) => n - 1)
      if (prevStatus === 'interested') setInterested((n) => n - 1)
    }
    setError(null)

    startTransition(async () => {
      try {
        if (!token) throw new Error('Not authenticated')
        if (next === null) {
          await cancelRsvp(eventId)
        } else {
          await upsertRsvp(eventId, option)
        }
      } catch (err) {
        // Roll back
        setStatus(prevStatus)
        setGoing(prevGoing)
        setInterested(prevInterested)
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  const options: { key: RsvpOption; label: string; activeClass: string; icon: React.ReactNode }[] = [
    {
      key: 'going',
      label: `Going${going > 0 ? ` (${going})` : ''}`,
      activeClass: 'bg-brand text-white border-brand',
      icon: <CheckIcon />,
    },
    {
      key: 'interested',
      label: `Interested${interested > 0 ? ` (${interested})` : ''}`,
      activeClass: 'bg-amber-500 text-white border-amber-500',
      icon: <StarIcon />,
    },
    {
      key: 'not_going',
      label: 'Not going',
      activeClass: 'bg-surface-foreground text-card border-surface-foreground',
      icon: <XIcon />,
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            disabled={isPending}
            onClick={() => handleRsvp(opt.key)}
            className={[
              'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60',
              status === opt.key
                ? opt.activeClass
                : 'border-border text-surface-foreground hover:bg-muted',
            ].join(' ')}
          >
            <span className="flex-shrink-0">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {isPending && (
        <p className="text-xs text-muted-foreground">Saving&hellip;</p>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polygon strokeLinecap="round" strokeLinejoin="round" points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
