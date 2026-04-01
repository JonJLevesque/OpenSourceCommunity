import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { RegisterButton } from './register-button'
import { QaSection } from './qa-section'
import type { WebinarStatus } from '../page'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ webinarId: string }>
}): Promise<Metadata> {
  const { webinarId } = await params
  return { title: `Webinar ${webinarId}` }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WebinarDetail {
  id: string
  title: string
  description: string | null
  scheduledAt: string
  durationMinutes: number | null
  streamUrl: string | null
  maxAttendees: number | null
  recordingUrl: string | null
  viewCount: number
  status: WebinarStatus
  createdAt: string
  registrationCount: number
  isRegistered: boolean
}

export interface QaItem {
  id: string
  webinarId: string
  memberId: string
  question: string
  answer: string | null
  answeredBy: string | null
  answeredAt: string | null
  upvotes: number
  createdAt: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(iso))
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}m`
  if (h > 0) return `${h}h`
  return `${m}m`
}

const STATUS_BADGE: Record<WebinarStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Upcoming', className: 'bg-brand/5 text-brand' },
  live: { label: 'Live', className: 'bg-rose-50 text-rose-700' },
  ended: { label: 'Ended', className: 'bg-muted text-muted-foreground' },
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

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ webinarId: string }>
}) {
  const { webinarId } = await params

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const isAuthenticated = !!session

  let webinar: WebinarDetail | null = null
  let qaItems: QaItem[] = []
  let fetchError = false

  try {
    webinar = await apiGet<WebinarDetail>(`/api/webinars/${webinarId}`, token)
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) notFound()
    fetchError = true
  }

  if (fetchError || !webinar) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load this webinar. Please try refreshing.
      </div>
    )
  }

  try {
    qaItems = await apiGet<QaItem[]>(`/api/webinars/${webinarId}/qa`, token, 0)
  } catch {
    // Q&A load failure is non-fatal
  }

  const gradient = gradientForId(webinar.id)
  const badge = STATUS_BADGE[webinar.status] ?? STATUS_BADGE.scheduled
  const isLive = webinar.status === 'live'
  const canRegister = webinar.status === 'scheduled'

  return (
    <div className="space-y-6">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link
        href="/webinars"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
        </svg>
        Back to webinars
      </Link>

      {/* ── Cover ─────────────────────────────────────────────────────────── */}
      <div className={`relative h-48 w-full rounded-2xl bg-gradient-to-br ${gradient} sm:h-64`}>
        <span
          className={[
            'absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
            badge.className,
          ].join(' ')}
        >
          {isLive && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          )}
          {badge.label}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left: main content ──────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <h1 className="text-2xl font-bold text-surface-foreground">{webinar.title}</h1>

          {/* Description */}
          {webinar.description && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-3 text-sm font-semibold text-surface-foreground">About this webinar</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{webinar.description}</p>
            </div>
          )}

          {/* Stream embed (live only) */}
          {isLive && webinar.streamUrl && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold text-surface-foreground flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
                  Live stream
                </h2>
              </div>
              <div className="aspect-video bg-neutral-900">
                <iframe
                  src={webinar.streamUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Live webinar stream"
                />
              </div>
            </div>
          )}

          {/* Recording (ended only) */}
          {webinar.status === 'ended' && webinar.recordingUrl && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-sm font-semibold text-surface-foreground">Recording</h2>
              </div>
              <div className="aspect-video bg-neutral-900">
                <iframe
                  src={webinar.recordingUrl}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Webinar recording"
                />
              </div>
            </div>
          )}

          {/* Q&A section */}
          <QaSection
            webinarId={webinar.id}
            initialItems={qaItems}
            isAuthenticated={isAuthenticated}
            token={token}
          />
        </div>

        {/* ── Right: sidebar ──────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Date & time card */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
                <CalendarIcon />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date</p>
                <p className="mt-0.5 text-sm font-semibold text-surface-foreground">
                  {formatLongDate(webinar.scheduledAt)}
                </p>
                <p className="text-sm text-muted-foreground">{formatTime(webinar.scheduledAt)}</p>
              </div>
            </div>

            {webinar.durationMinutes != null && (
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
                  <ClockIcon />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duration</p>
                  <p className="mt-0.5 text-sm font-semibold text-surface-foreground">
                    {formatDuration(webinar.durationMinutes)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/5 text-brand">
                <UsersIcon />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Registrations</p>
                <p className="mt-0.5 text-sm font-semibold text-surface-foreground">
                  {webinar.registrationCount.toLocaleString()}
                  {webinar.maxAttendees != null && (
                    <span className="font-normal text-muted-foreground"> / {webinar.maxAttendees}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Register button */}
          {canRegister && isAuthenticated && token && (
            <div className="rounded-xl border border-border bg-card p-5">
              <RegisterButton
                webinarId={webinar.id}
                initialIsRegistered={webinar.isRegistered}
                registrationCount={webinar.registrationCount}
                maxAttendees={webinar.maxAttendees}
                token={token}
              />
            </div>
          )}

          {canRegister && !isAuthenticated && (
            <div className="rounded-xl border border-border bg-card p-5 text-center">
              <p className="text-sm text-muted-foreground mb-3">Sign in to register for this webinar</p>
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-colors"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
      <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
      <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline strokeLinecap="round" strokeLinejoin="round" points="12 6 12 12 16 14" />
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
