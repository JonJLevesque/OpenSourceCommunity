'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SetupFormData {
  // Step 1
  name: string
  slug: string
  description: string
  primaryColor: string
  // Step 2
  modules: string[]
  // Step 3
  adminEmail: string
  adminPassword: string
  adminPasswordConfirm: string
  adminDisplayName: string
}

interface SetupResult {
  tenantId: string
  slug: string
  adminUserId: string
}

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULE_LIST = [
  {
    id: 'forums',
    name: 'Forums',
    description: 'Threaded discussions organised by category',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'ideas',
    name: 'Ideas',
    description: 'Collect, vote on, and track feature requests',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    id: 'events',
    name: 'Events',
    description: 'Schedule and RSVP to community events',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
  {
    id: 'courses',
    name: 'Courses',
    description: 'Structured learning paths and content',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v7M12 14l6.16-3.422a12.083 12.083 0 0 1 .665 6.479A11.952 11.952 0 0 1 12 20.055a11.952 11.952 0 0 1-6.824-2.998 12.078 12.078 0 0 1 .665-6.479L12 14z" />
      </svg>
    ),
  },
  {
    id: 'webinars',
    name: 'Webinars',
    description: 'Live video sessions with Q&A support',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0 1 21 8.82v6.36a1 1 0 0 1-1.447.89L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
  {
    id: 'kb',
    name: 'Knowledge Base',
    description: 'Searchable documentation and how-to articles',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    id: 'chat',
    name: 'Chat',
    description: 'Real-time messaging channels',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'social-intel',
    name: 'Social Intelligence',
    description: 'AI-powered insights on member engagement',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
      </svg>
    ),
  },
] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ['Community', 'Modules', 'Admin Account', 'Done!']

function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="Setup progress" className="mb-8">
      <ol className="flex items-center justify-center gap-0">
        {STEPS.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'upcoming'
          return (
            <li key={label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                    state === 'done' ? 'bg-brand text-white' : '',
                    state === 'active' ? 'border-2 border-brand bg-card text-brand' : '',
                    state === 'upcoming' ? 'border-2 border-border bg-card text-muted-foreground' : '',
                  ].join(' ')}
                >
                  {state === 'done' ? (
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={[
                    'hidden text-xs font-medium sm:block',
                    state === 'active' ? 'text-brand' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    'mx-2 mt-[-16px] h-0.5 w-10 sm:w-16 transition-colors',
                    i < current ? 'bg-brand' : 'bg-muted',
                  ].join(' ')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Field components ─────────────────────────────────────────────────────────

const inputClass =
  'block w-full rounded-lg border border-border px-3 py-2.5 text-sm text-surface-foreground placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-ring'

const labelClass = 'block text-sm font-medium text-surface-foreground mb-1'

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SetupPage() {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<SetupResult | null>(null)
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const [form, setForm] = useState<SetupFormData>({
    name: '',
    slug: '',
    description: '',
    primaryColor: '#6366f1',
    modules: MODULE_LIST.map((m) => m.id),
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    adminDisplayName: '',
  })

  // Auto-generate slug from name unless the user has manually edited it
  useEffect(() => {
    if (!slugManuallyEdited && form.name) {
      setForm((f) => ({ ...f, slug: slugify(f.name) }))
    }
  }, [form.name, slugManuallyEdited])

  function setField<K extends keyof SetupFormData>(key: K, value: SetupFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleModule(id: string) {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(id) ? f.modules.filter((m) => m !== id) : [...f.modules, id],
    }))
  }

  // ── Step validation ────────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 0) {
      return form.name.trim().length >= 1 && /^[a-z0-9-]{2,50}$/.test(form.slug)
    }
    if (step === 1) {
      return form.modules.length >= 1
    }
    if (step === 2) {
      return (
        form.adminEmail.includes('@') &&
        form.adminPassword.length >= 8 &&
        form.adminPassword === form.adminPasswordConfirm
      )
    }
    return true
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'
      const res = await fetch(`${apiUrl}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          modules: form.modules,
          primaryColor: form.primaryColor,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
          adminDisplayName: form.adminDisplayName || undefined,
        }),
      })

      const body = await res.json() as { data?: SetupResult; error?: string }

      if (!res.ok || body.error) {
        setSubmitError(body.error ?? 'Setup failed — please try again.')
        setIsSubmitting(false)
        return
      }

      setResult(body.data ?? null)
      setStep(3)
    } catch {
      setSubmitError('Network error — please check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Done state ─────────────────────────────────────────────────────────────
  if (step === 3 && result) {
    const communityUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/home`
        : '/home'

    return (
      <div className="w-full max-w-lg">
        <StepIndicator current={3} />

        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-surface-foreground">Your community is ready!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <strong>{form.name}</strong> has been created and your admin account is set up.
          </p>

          <div className="my-6 rounded-lg bg-brand/5 px-4 py-3 text-sm text-brand font-medium">
            {communityUrl}
          </div>

          <a
            href={communityUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand transition-colors"
          >
            Go to your community
            <span aria-hidden>→</span>
          </a>

          <p className="mt-4 text-sm text-muted-foreground">
            Already at your community URL?{' '}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Sign in now
            </Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-xl">
      {/* Logo / title */}
      <div className="mb-6 text-center">
        <span className="text-2xl font-bold text-brand">OpenSourceCommunity</span>
        <p className="mt-1 text-sm text-muted-foreground">Set up your community in minutes</p>
      </div>

      <StepIndicator current={step} />

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        {/* Step 0: Community info */}
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-surface-foreground">Tell us about your community</h2>

            <div>
              <label htmlFor="name" className={labelClass}>Community name</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField('name', e.target.value)}
                placeholder="e.g. Acme Community"
                className={inputClass}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="slug" className={labelClass}>
                Slug
                <span className="ml-1 text-muted-foreground font-normal">(becomes your subdomain)</span>
              </label>
              <input
                id="slug"
                type="text"
                value={form.slug}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setSlugManuallyEdited(true)
                  setField('slug', slugify(e.target.value))
                }}
                placeholder="acme"
                className={inputClass}
              />
              {form.slug && (
                <p className="mt-1.5 text-xs text-brand font-medium">
                  Preview: <span className="font-bold">{form.slug}.{typeof window !== 'undefined' ? window.location.host : 'opensourcecommunity.io'}</span>
                </p>
              )}
              {form.slug && !/^[a-z0-9-]{2,50}$/.test(form.slug) && (
                <p className="mt-1 text-xs text-red-600">
                  2–50 lowercase letters, numbers, and hyphens only
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className={labelClass}>Description</label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setField('description', e.target.value)}
                placeholder="What is this community about?"
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label htmlFor="primaryColor" className={labelClass}>Primary colour</label>
              <div className="flex items-center gap-3">
                <input
                  id="primaryColor"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setField('primaryColor', e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border bg-card p-1"
                />
                <span className="text-sm text-muted-foreground font-mono">{form.primaryColor}</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Modules */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-foreground">Choose your modules</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Toggle which features to enable — you can change this any time.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {MODULE_LIST.map((mod) => {
                const enabled = form.modules.includes(mod.id)
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={[
                      'flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
                      enabled
                        ? 'border-brand/30 bg-brand/5 ring-1 ring-brand/30'
                        : 'border-border bg-card hover:border-border',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                        enabled ? 'bg-brand text-white' : 'bg-muted text-muted-foreground',
                      ].join(' ')}
                    >
                      {mod.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={['text-sm font-semibold', enabled ? 'text-surface-foreground' : 'text-surface-foreground'].join(' ')}>
                        {mod.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{mod.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {form.modules.length === 0 && (
              <p className="text-xs text-amber-600 font-medium">Select at least one module to continue.</p>
            )}
          </div>
        )}

        {/* Step 2: Admin account */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-surface-foreground">Create your admin account</h2>

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div>
              <label htmlFor="adminEmail" className={labelClass}>Email address</label>
              <input
                id="adminEmail"
                type="email"
                autoComplete="email"
                value={form.adminEmail}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField('adminEmail', e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="adminDisplayName" className={labelClass}>
                Display name <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <input
                id="adminDisplayName"
                type="text"
                autoComplete="name"
                value={form.adminDisplayName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField('adminDisplayName', e.target.value)}
                placeholder="Jane Smith"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="adminPassword" className={labelClass}>Password</label>
              <input
                id="adminPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={form.adminPassword}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setField('adminPassword', e.target.value)}
                placeholder="Min. 8 characters"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="adminPasswordConfirm" className={labelClass}>Confirm password</label>
              <input
                id="adminPasswordConfirm"
                type="password"
                autoComplete="new-password"
                value={form.adminPasswordConfirm}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setField('adminPasswordConfirm', e.target.value)
                }
                placeholder="Repeat password"
                className={inputClass}
              />
              {form.adminPasswordConfirm && form.adminPassword !== form.adminPasswordConfirm && (
                <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className={['mt-8 flex', step > 0 ? 'justify-between' : 'justify-end'].join(' ')}>
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setSubmitError(null)
                setStep((s) => s - 1)
              }}
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Back
            </button>
          )}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-40 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canAdvance() || isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand disabled:opacity-40 transition-colors"
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? 'Creating...' : 'Create community'}
            </button>
          )}
        </div>
      </div>

      {/* Already have a community */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have a community?{' '}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  )
}
