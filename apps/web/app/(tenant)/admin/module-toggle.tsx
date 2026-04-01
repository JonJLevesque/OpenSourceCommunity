'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPatch } from '@/lib/api'

interface ModuleToggleProps {
  moduleKey: string
  enabled: boolean
  token: string
}

export function ModuleToggle({ moduleKey, enabled: initial, token }: ModuleToggleProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    const newValue = !enabled
    setEnabled(newValue)
    setLoading(true)

    try {
      await apiPatch(
        '/api/admin/modules',
        { moduleId: moduleKey, enabled: newValue },
        token,
      )
      router.refresh()
    } catch {
      // Revert on error
      setEnabled(!newValue)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? 'Disable' : 'Enable'} module`}
      onClick={handleToggle}
      disabled={loading}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-60',
        enabled ? 'bg-brand' : 'bg-muted',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
