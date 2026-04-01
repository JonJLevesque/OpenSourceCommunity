import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { ModuleKey } from '@/components/layout/sidebar'
import type { Metadata } from 'next'
import { SubNavLink } from './sub-nav-link'

export const metadata: Metadata = { title: 'Social Intelligence' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantConfig {
  enabledModules: ModuleKey[]
}

// ─── Sub-navigation ───────────────────────────────────────────────────────────

const SUBNAV = [
  { label: 'Inbox', href: '/intelligence/inbox' },
  { label: 'Sentiment', href: '/intelligence/sentiment' },
  { label: 'Competitors', href: '/intelligence/competitors' },
  { label: 'Advocates', href: '/intelligence/advocates' },
  { label: 'Alerts', href: '/intelligence/alerts' },
  { label: 'Keywords', href: '/intelligence/keywords' },
]

// ─── Layout ─────────────────────────────────────────────────────────────────

export default async function IntelligenceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let enabledModules: ModuleKey[] = []
  try {
    const config = await apiGet<TenantConfig>('/api/tenant', token, 300)
    enabledModules = config.enabledModules
  } catch {
    // Fall back — assume not enabled, show upgrade prompt
  }

  const isEnabled = enabledModules.includes('intelligence')

  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Social Intelligence</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor mentions, sentiment, and advocates across social platforms.
          </p>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-card px-8 py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-violet-50 text-violet-400">
            <RadarIcon />
          </div>
          <h2 className="text-lg font-semibold text-surface-foreground">
            Social Intelligence is not enabled
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Upgrade your plan to monitor brand mentions, track sentiment trends, identify top
            advocates, and get alerts — all in one place.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/admin/billing"
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-colors"
            >
              Upgrade plan
            </Link>
            <a
              href="https://docs.opensourcecommunity.io/modules/social-intelligence"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Learn more
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">Social Intelligence</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor mentions, sentiment, and advocates across social platforms.
        </p>
      </div>

      {/* ── Sub-navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5">
        {SUBNAV.map((item) => (
          <SubNavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>

      {/* ── Page content ────────────────────────────────────────────────────── */}
      {children}
    </div>
  )
}

function RadarIcon() {
  return (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <circle cx="12" cy="12" r="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2a10 10 0 1 0 10 10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6a6 6 0 1 0 6 6" />
    </svg>
  )
}
