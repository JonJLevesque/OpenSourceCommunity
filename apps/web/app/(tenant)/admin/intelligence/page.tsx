import type { Metadata } from 'next'
import Link from 'next/link'
import { Brain, Target, Bell, Search, Inbox, TrendingUp } from 'lucide-react'

export const metadata: Metadata = { title: 'Intelligence Settings — Admin' }

const INTEL_SECTIONS = [
  {
    href: '/intelligence/inbox',
    label: 'Mentions Inbox',
    desc: 'Review and triage incoming brand mentions from all connected sources.',
    icon: Inbox,
    accent: '#8b5cf6',
  },
  {
    href: '/intelligence/sentiment',
    label: 'Sentiment',
    desc: 'Track sentiment trends over time across monitored keywords and channels.',
    icon: TrendingUp,
    accent: '#10b981',
  },
  {
    href: '/intelligence/competitors',
    label: 'Competitors',
    desc: 'Define competitor keyword groups and compare share of voice.',
    icon: Target,
    accent: '#ef4444',
  },
  {
    href: '/intelligence/advocates',
    label: 'Advocates',
    desc: 'Identify top brand advocates and most engaged community members.',
    icon: Brain,
    accent: '#f59e0b',
  },
  {
    href: '/intelligence/alerts',
    label: 'Alerts',
    desc: 'Configure alert rules for spikes in mentions, negative sentiment, or competitor activity.',
    icon: Bell,
    accent: '#0ea5e9',
  },
  {
    href: '/intelligence/keywords',
    label: 'Keywords',
    desc: 'Manage keyword groups that define what topics and terms are monitored.',
    icon: Search,
    accent: '#a855f7',
  },
]

export default function IntelligenceSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Intelligence Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure social listening, keyword monitoring, alerts, and analytics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEL_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderLeftColor: section.accent, borderLeftWidth: '3px' }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${section.accent}1a` }}
            >
              <section.icon className="h-[18px] w-[18px]" style={{ color: section.accent }} />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-foreground transition-colors group-hover:text-brand">
                {section.label}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{section.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-surface-foreground">Data Sources</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Social pipeline connectors (G2, Trustpilot, Product Hunt, Reddit, etc.) are configured via
          environment variables on the API worker. See the{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">SOCIAL_PIPELINE_*</code>{' '}
          variables in your deployment environment.
        </p>
      </div>
    </div>
  )
}
