'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClientPost } from '@/lib/api-client'

interface EnrollButtonProps {
  courseId: string
  token: string | undefined
}

export function EnrollButton({ courseId, token }: EnrollButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'loading' | 'enrolled' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')

  async function handleEnroll() {
    if (!token) {
      router.push('/login')
      return
    }

    setState('loading')
    setErrorMessage('')

    try {
      try {
        await apiClientPost(`/api/courses/${courseId}/enroll`, {})
      } catch (err: unknown) {
        // 409 = already enrolled — treat as success
        if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409) {
          setState('enrolled')
          router.refresh()
          return
        }
        throw err
      }

      setState('enrolled')
      router.refresh()
    } catch (err) {
      setState('error')
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (state === 'enrolled') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
        <CheckIcon />
        Enrolled!
      </span>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleEnroll}
        disabled={state === 'loading'}
        className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'loading' ? (
          <>
            <SpinnerIcon />
            Enrolling…
          </>
        ) : (
          'Enroll now'
        )}
      </button>
      {state === 'error' && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
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
