'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl">⚠️</div>
      <h2 className="text-base font-semibold text-surface-foreground">Something went wrong</h2>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand/90 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
