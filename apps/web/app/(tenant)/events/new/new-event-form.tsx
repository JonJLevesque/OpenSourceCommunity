'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type LocationType = 'virtual' | 'irl'

interface EventFormData {
  title: string
  description: string
  startsAt: string
  endsAt: string
  timezone: string
  locationType: LocationType
  virtualUrl: string
  physicalAddress: string
  capacity: string
  coverImageUrl: string
  tags: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Stockholm',
  'Europe/Helsinki',
  'Europe/Warsaw',
  'Europe/Istanbul',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
]

import { apiClientPost } from '@/lib/api-client'

// ─── Component ────────────────────────────────────────────────────────────────

export function NewEventForm({ token: _token }: { token: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Detect user's local timezone as default
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const [form, setForm] = useState<EventFormData>({
    title: '',
    description: '',
    startsAt: '',
    endsAt: '',
    timezone: TIMEZONES.includes(localTz) ? localTz : 'America/New_York',
    locationType: 'virtual',
    virtualUrl: '',
    physicalAddress: '',
    capacity: '',
    coverImageUrl: '',
    tags: '',
  })

  function set(field: keyof EventFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!form.startsAt) {
      setError('Start date & time is required.')
      return
    }

    startTransition(async () => {
      try {
        const description = form.description.trim()
        const payload = {
          title: form.title.trim(),
          body: description
            ? {
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
              }
            : undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt
            ? new Date(form.endsAt).toISOString()
            : new Date(form.startsAt).toISOString(),
          timezone: form.timezone,
          location: {
            type: form.locationType,
            ...(form.locationType === 'virtual' && form.virtualUrl.trim()
              ? { url: form.virtualUrl.trim() }
              : {}),
            ...(form.locationType === 'irl' && form.physicalAddress.trim()
              ? { address: form.physicalAddress.trim() }
              : {}),
          },
          capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
          coverImageUrl: form.coverImageUrl.trim() || undefined,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }

        const data = await apiClientPost<{ id: string }>('/api/events', payload)
        router.push(`/events/${data.id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      }
    })
  }

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-surface-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow'
  const labelClass = 'block text-sm font-medium text-surface-foreground mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Basic information</h2>

        {/* Title */}
        <div>
          <label htmlFor="title" className={labelClass}>
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            placeholder="e.g. Monthly community call"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="Tell attendees what to expect…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className={`${inputClass} resize-y min-h-[120px]`}
          />
        </div>

        {/* Cover image */}
        <div>
          <label htmlFor="coverImageUrl" className={labelClass}>
            Cover image URL
          </label>
          <input
            id="coverImageUrl"
            type="url"
            placeholder="https://example.com/image.jpg"
            value={form.coverImageUrl}
            onChange={(e) => set('coverImageUrl', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="tags" className={labelClass}>
            Tags <span className="text-xs font-normal text-muted-foreground">(comma-separated)</span>
          </label>
          <input
            id="tags"
            type="text"
            placeholder="community, q1, networking"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Date & time */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Date &amp; time</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="startsAt" className={labelClass}>
              Starts at <span className="text-red-500">*</span>
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => set('startsAt', e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="endsAt" className={labelClass}>
              Ends at
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              value={form.endsAt}
              min={form.startsAt}
              onChange={(e) => set('endsAt', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Timezone */}
        <div>
          <label htmlFor="timezone" className={labelClass}>
            Timezone
          </label>
          <select
            id="timezone"
            value={form.timezone}
            onChange={(e) => set('timezone', e.target.value)}
            className={inputClass}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Location</h2>

        {/* Type toggle */}
        <div className="flex items-center rounded-lg border border-border bg-muted p-1 w-fit gap-1">
          <button
            type="button"
            onClick={() => set('locationType', 'virtual')}
            className={[
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              form.locationType === 'virtual'
                ? 'bg-card text-brand shadow-sm'
                : 'text-muted-foreground hover:text-surface-foreground',
            ].join(' ')}
          >
            Virtual
          </button>
          <button
            type="button"
            onClick={() => set('locationType', 'irl')}
            className={[
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              form.locationType === 'irl'
                ? 'bg-card text-brand shadow-sm'
                : 'text-muted-foreground hover:text-surface-foreground',
            ].join(' ')}
          >
            In-person
          </button>
        </div>

        {form.locationType === 'virtual' ? (
          <div>
            <label htmlFor="virtualUrl" className={labelClass}>
              Meeting / stream URL
            </label>
            <input
              id="virtualUrl"
              type="url"
              placeholder="https://zoom.us/j/..."
              value={form.virtualUrl}
              onChange={(e) => set('virtualUrl', e.target.value)}
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="physicalAddress" className={labelClass}>
              Physical address
            </label>
            <textarea
              id="physicalAddress"
              rows={3}
              placeholder="123 Main St, City, State, ZIP"
              value={form.physicalAddress}
              onChange={(e) => set('physicalAddress', e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        )}
      </div>

      {/* Capacity */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-surface-foreground">Capacity</h2>
        <div>
          <label htmlFor="capacity" className={labelClass}>
            Maximum attendees{' '}
            <span className="text-xs font-normal text-muted-foreground">(leave blank for unlimited)</span>
          </label>
          <input
            id="capacity"
            type="number"
            min="1"
            placeholder="e.g. 100"
            value={form.capacity}
            onChange={(e) => set('capacity', e.target.value)}
            className={`${inputClass} max-w-xs`}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating…' : 'Create event'}
        </button>
        <Link
          href="/events"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
