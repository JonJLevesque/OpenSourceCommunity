import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { RsvpButton } from './rsvp-button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventId: string }>
}): Promise<Metadata> {
  const { eventId } = await params
  return { title: `Event ${eventId}` }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RsvpStatus = 'going' | 'interested' | 'not_going' | null

interface EventObj {
  id: string
  title: string
  body: Record<string, unknown> | null
  location: { type: 'virtual' | 'irl'; url?: string; address?: string } | null
  startsAt: string
  endsAt: string
  timezone: string
  capacity: number | null
  coverImageUrl: string | null
  tags: string[]
  status: 'draft' | 'published' | 'cancelled'
}

interface Recording {
  id: string
  title: string
  videoUrl: string
  thumbnailUrl: string | null
  durationSeconds: number | null
}

interface EventDetailResponse {
  event: EventObj
  recordings: Recording[]
  rsvpGoing: number
  rsvpInterested: number
  myRsvpStatus: RsvpStatus
}

// ─── Tiptap renderer ──────────────────────────────────────────────────────────

function renderNode(node: Record<string, unknown>): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const children = content.map((child) => renderNode(child)).join('')

  switch (type) {
    case 'doc': return children
    case 'paragraph': return `<p>${children || '<br>'}</p>`
    case 'heading': {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList': return `<ul>${children}</ul>`
    case 'orderedList': return `<ol>${children}</ol>`
    case 'listItem': return `<li>${children}</li>`
    case 'blockquote': return `<blockquote>${children}</blockquote>`
    case 'codeBlock': return `<pre><code>${children}</code></pre>`
    case 'text': {
      let text = (node.text as string | undefined) ?? ''
      const marks = (node.marks as Array<{ type: string }> | undefined) ?? []
      for (const mark of marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'underline') text = `<u>${text}</u>`
        if (mark.type === 'strike') text = `<s>${text}</s>`
        if (mark.type === 'code') text = `<code>${text}</code>`
      }
      return text
    }
    default: return children
  }
}

function renderBody(body: Record<string, unknown>): string {
  try { return renderNode(body) } catch { return '' }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLongDate(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(iso))
}

function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(new Date(iso))
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const COVER_GRADIENTS = [
  'from-indigo-400 to-violet-500',
  'from-rose-400 to-orange-400',
  'from-emerald-400 to-teal-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-yellow-500',
  'from-fuchsia-400 to-pink-500',
]

function gradientForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash)
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length] ?? COVER_GRADIENTS[0] ?? ''
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  let detail: EventDetailResponse | null = null
  let fetchError = false

  try {
    detail = await apiGet<EventDetailResponse>(`/api/events/${eventId}`, token)
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) notFound()
    fetchError = true
  }

  if (fetchError || !detail) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load this event. Please try refreshing.
      </div>
    )
  }

  const { event, recordings, rsvpGoing, rsvpInterested, myRsvpStatus } = detail
  const gradient = gradientForId(event.id)
  const locationType = event.location?.type ?? 'virtual'
  const bodyHtml = event.body ? renderBody(event.body) : ''

  return (
    <div className="space-y-6">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
        </svg>
        Back to events
      </Link>

      {/* ── Cover ─────────────────────────────────────────────────────────── */}
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt={event.title}
          className="h-56 w-full rounded-2xl object-cover sm:h-72"
        />
      ) : (
        <div className={`h-56 w-full rounded-2xl bg-gradient-to-br ${gradient} sm:h-72`} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: main content ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title + tags */}
          <div>
            {event.tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {event.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-2xl font-bold text-surface-foreground">{event.title}</h1>
          </div>

          {/* Description */}
          {bodyHtml && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 text-sm font-semibold text-surface-foreground">About this event</h2>
              <div
                className="prose prose-slate prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </div>
          )}

          {/* Past recordings */}
          {recordings.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 text-sm font-semibold text-surface-foreground">Recordings</h2>
              <ul className="space-y-3">
                {recordings.map((rec) => (
                  <li key={rec.id}>
                    <a
                      href={rec.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted transition-colors"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-500">
                        <PlayIcon />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-surface-foreground line-clamp-1">{rec.title}</p>
                        {rec.durationSeconds && (
                          <p className="text-xs text-muted-foreground">{formatDuration(rec.durationSeconds)}</p>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Right: sidebar card ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Date & time */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
                <DateIcon />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
                <p className="mt-0.5 text-sm font-semibold text-surface-foreground">
                  {formatLongDate(event.startsAt, event.timezone)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatTime(event.startsAt, event.timezone)}
                  {' → '}
                  {formatTime(event.endsAt, event.timezone)}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
                {locationType === 'virtual' ? <GlobeIcon /> : <MapPinIcon />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {locationType === 'virtual' ? 'Virtual event' : 'In-person'}
                </p>
                {locationType === 'virtual' && event.location?.url ? (
                  <a
                    href={event.location.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-colors"
                  >
                    Join event
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm text-muted-foreground break-words">
                    {event.location?.address ?? 'Address TBA'}
                  </p>
                )}
              </div>
            </div>

            {/* Capacity */}
            {event.capacity != null && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
                  <UsersIcon />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Capacity</p>
                  <p className="mt-0.5 text-sm text-surface-foreground">
                    {rsvpGoing} / {event.capacity} spots filled
                  </p>
                </div>
              </div>
            )}

            {/* RSVP counts */}
            {(rsvpGoing > 0 || rsvpInterested > 0) && (
              <p className="text-xs text-muted-foreground">
                {rsvpGoing > 0 && <span>{rsvpGoing} going</span>}
                {rsvpGoing > 0 && rsvpInterested > 0 && <span className="mx-1">·</span>}
                {rsvpInterested > 0 && <span>{rsvpInterested} interested</span>}
              </p>
            )}
          </div>

          {/* RSVP */}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="mb-3 text-sm font-semibold text-surface-foreground">Your RSVP</p>
            <RsvpButton
              eventId={event.id}
              initialStatus={myRsvpStatus}
              goingCount={rsvpGoing}
              interestedCount={rsvpInterested}
              token={token}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function DateIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
    </svg>
  )
}

function MapPinIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
