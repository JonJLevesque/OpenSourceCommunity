'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { apiClientPost } from '@/lib/api-client'

interface NewWebinarFormProps {
  token: string
}

export function NewWebinarForm({ token: _token }: NewWebinarFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [streamUrl, setStreamUrl] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow'
  const labelClass = 'block text-sm font-medium text-surface-foreground mb-1'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    if (!scheduledAt) { setError('Scheduled date & time is required.'); return }
    const duration = parseInt(durationMinutes, 10)
    if (!duration || duration < 1) { setError('Duration must be at least 1 minute.'); return }
    setError(null)

    startTransition(async () => {
      try {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: duration,
        }
        if (description.trim()) payload.description = description.trim()
        if (streamUrl.trim()) payload.streamUrl = streamUrl.trim()
        if (maxAttendees) payload.maxAttendees = parseInt(maxAttendees, 10)

        const data = await apiClientPost<{ id: string }>('/api/webinars', payload)
        router.push(`/webinars/${data.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Basic information</h2>

        <div>
          <label htmlFor="webinar-title" className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="webinar-title"
            type="text"
            required
            maxLength={500}
            placeholder="e.g. Q2 Product Roadmap Preview"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="webinar-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="webinar-description"
            rows={5}
            placeholder="Tell attendees what to expect…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-y min-h-[120px]`}
          />
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Schedule</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="webinar-scheduled-at" className={labelClass}>
              Date &amp; time <span className="text-red-500">*</span>
            </label>
            <input
              id="webinar-scheduled-at"
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="webinar-duration" className={labelClass}>
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              id="webinar-duration"
              type="number"
              min="1"
              required
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
          </div>
        </div>
      </div>

      {/* Stream & capacity */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Stream &amp; capacity</h2>

        <div>
          <label htmlFor="webinar-stream-url" className={labelClass}>
            Stream URL{' '}
            <span className="text-xs font-normal text-muted-foreground">(optional — can be added later)</span>
          </label>
          <input
            id="webinar-stream-url"
            type="url"
            placeholder="https://youtube.com/live/..."
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="webinar-max-attendees" className={labelClass}>
            Max attendees{' '}
            <span className="text-xs font-normal text-muted-foreground">(leave blank for unlimited)</span>
          </label>
          <input
            id="webinar-max-attendees"
            type="number"
            min="1"
            placeholder="e.g. 500"
            value={maxAttendees}
            onChange={(e) => setMaxAttendees(e.target.value)}
            className={`${inputClass} max-w-xs`}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating…' : 'Create webinar'}
        </button>
        <Link
          href="/webinars"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
