'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { apiClientPatch } from '@/lib/api-client'

export function MarkAllReadButton({ token: _token }: { token: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await apiClientPatch('/api/notifications/read-all', {})
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
    >
      {isPending ? 'Marking…' : 'Mark all as read'}
    </button>
  )
}
