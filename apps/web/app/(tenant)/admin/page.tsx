import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Flag,
  Puzzle,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  ArrowRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ModuleToggle } from './module-toggle'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Admin' }

// ─── Types ────────────────────────────────────────────────────────────────────

type ModuleKey =
  | 'forums'
  | 'ideas'
  | 'events'
  | 'courses'
  | 'webinars'
  | 'kb'
  | 'intelligence'
  | 'chat'

interface ModuleConfig {
  key: ModuleKey
  enabled: boolean
}

interface AdminOverview {
  modules: ModuleConfig[]
  memberCount: number
  newMembersThisWeek: number
  threadCount: number
  ideaCount: number
  eventCount: number
  pendingModeration: number
}

// ─── Module metadata ──────────────────────────────────────────────────────────

const MODULE_META: Record<
  ModuleKey,
  { label: string; description: string; emoji: string; settingsHref: string }
> = {
  forums: { label: 'Forums', description: 'Discussion threads organised by category', emoji: '💬', settingsHref: '/admin/forums' },
  ideas: { label: 'Ideas', description: 'Vote-based feedback and feature requests', emoji: '💡', settingsHref: '/admin/ideas' },
  events: { label: 'Events', description: 'In-person and virtual event listings', emoji: '📅', settingsHref: '/admin/events' },
  courses: { label: 'Courses', description: 'Structured learning paths and lessons', emoji: '📚', settingsHref: '/admin/courses' },
  webinars: { label: 'Webinars', description: 'Live and recorded video sessions', emoji: '🎥', settingsHref: '/admin/webinars' },
  kb: { label: 'Knowledge Base', description: 'Searchable documentation and articles', emoji: '📖', settingsHref: '/admin/kb' },
  intelligence: { label: 'Intelligence', description: 'AI-powered analytics and member insights', emoji: '🧠', settingsHref: '/admin/intelligence' },
  chat: { label: 'Chat', description: 'Real-time messaging channels for members', emoji: '💬', settingsHref: '/admin/chat' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  let overview: AdminOverview = {
    modules: [],
    memberCount: 0,
    newMembersThisWeek: 0,
    threadCount: 0,
    ideaCount: 0,
    eventCount: 0,
    pendingModeration: 0,
  }

  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {}

  if (isAdmin) {
    try {
      overview = await apiGet<AdminOverview>('/api/admin/overview', token, 30)
    } catch {}
  }

  if (!isAdmin) {
    redirect('/home')
  }

  const quickLinks = [
    { label: 'Moderation queue', href: '/admin/moderation', badge: overview.pendingModeration, icon: <Flag className="h-4 w-4" /> },
    { label: 'Members', href: '/admin/members', icon: <Users className="h-4 w-4" /> },
    { label: 'Analytics', href: '/admin/analytics', icon: <TrendingUp className="h-4 w-4" /> },
    { label: 'Audit log', href: '/admin/audit-log', icon: <span className="text-sm">📋</span> },
    { label: 'Roles & permissions', href: '/admin/roles', icon: <Puzzle className="h-4 w-4" /> },
    { label: 'Custom branding', href: '/admin/branding', icon: <span className="text-sm">🎨</span> },
    { label: 'Integrations', href: '/admin/integrations', icon: <span className="text-sm">🔌</span> },
  ]

  return (
    <div className="space-y-8">

      {/* Stats strip */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6">
          <StatCell
            label="Total members"
            value={overview.memberCount}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCell
            label="Pending moderation"
            value={overview.pendingModeration}
            icon={<Flag className="h-4 w-4" />}
            alert={overview.pendingModeration > 0}
          />
          <StatCell
            label="Active modules"
            value={overview.modules.filter((m) => m.enabled).length}
            icon={<Puzzle className="h-4 w-4" />}
          />
          <StatCell
            label="Forum threads"
            value={overview.threadCount}
            icon={<MessageSquare className="h-4 w-4" />}
          />
          <StatCell
            label="Ideas"
            value={overview.ideaCount}
            icon={<Lightbulb className="h-4 w-4" />}
          />
          <StatCell
            label="New members (7d)"
            value={overview.newMembersThisWeek}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Modules */}
      <section>
        <h2 className="mb-4 text-base font-bold tracking-tight text-surface-foreground">Modules</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.modules.map((mod) => {
            const meta = MODULE_META[mod.key]
            if (!meta) return null
            return (
              <div
                key={mod.key}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-surface-foreground">
                        {meta.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                  </div>
                  <ModuleToggle
                    moduleKey={mod.key}
                    enabled={mod.enabled}
                    token={token ?? ''}
                  />
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <Link
                    href={meta.settingsHref}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Settings →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="mb-4 text-base font-bold tracking-tight text-surface-foreground">
          Quick links
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-surface-foreground hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2.5 text-muted-foreground">
                {link.icon}
                <span className="text-surface-foreground">{link.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {link.badge != null && link.badge > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                    {link.badge}
                  </Badge>
                )}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  icon,
  alert = false,
}: {
  label: string
  value: number
  icon: React.ReactNode
  alert?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1 px-5 py-4', alert && 'bg-destructive/5')}>
      <div className={cn('flex items-center gap-1.5 text-xs font-medium', alert ? 'text-destructive' : 'text-muted-foreground')}>
        <span className={alert ? 'text-destructive' : 'text-muted-foreground'}>{icon}</span>
        {label}
      </div>
      <p className={cn('text-2xl font-black tracking-tight', alert ? 'text-destructive' : 'text-surface-foreground')}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
