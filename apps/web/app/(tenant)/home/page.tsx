import Link from 'next/link'
import {
  Users,
  PenLine,
  MessageSquare,
  Calendar,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Plus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

export const metadata: Metadata = { title: 'Home' }

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'post' | 'idea' | 'event' | 'comment'
  title: string
  authorName: string
  authorAvatarUrl?: string
  createdAt: string
  href: string
}

interface CommunityStats {
  memberCount: number
  postsThisWeek: number
  activeThreads: number
  upcomingEvents: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const ACTIVITY_BADGE: Record<ActivityItem['type'], React.ComponentProps<typeof Badge>['variant']> = {
  post: 'default',
  idea: 'warning',
  event: 'success',
  comment: 'secondary',
}

const ACTIVITY_LABEL: Record<ActivityItem['type'], string> = {
  post: 'Post',
  idea: 'Idea',
  event: 'Event',
  comment: 'Reply',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CommunityHomePage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let activity: ActivityItem[] = []
  let stats: CommunityStats = {
    memberCount: 0,
    postsThisWeek: 0,
    activeThreads: 0,
    upcomingEvents: 0,
  }
  let displayName = 'there'
  let role = ''

  try {
    const [activityData, statsData, meData] = await Promise.all([
      apiGet<ActivityItem[]>('/api/activity?limit=20', token, 60),
      apiGet<CommunityStats>('/api/stats', token, 300),
      apiGet<{ displayName: string; role: string }>('/api/me', token, 60),
    ])
    activity = activityData
    stats = statsData
    displayName = meData.displayName
    role = meData.role
  } catch {
    // Show empty states — don't crash the page.
  }

  const hour = new Date().getHours()
  const greeting = greetingFor(hour)

  return (
    <div className="space-y-8">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl bg-brand text-white">
        <div className="grid lg:grid-cols-[1fr_auto]">

          {/* Left: greeting */}
          <div className="px-8 py-10 lg:border-r lg:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
              {greeting}
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
              {displayName}
              <span className="text-white/30">.</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Here&apos;s what&apos;s happening in your community today.
            </p>
            {role && (
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <Sparkles className="h-3 w-3" />
                {role}
              </span>
            )}
          </div>

          {/* Right: stat grid */}
          <div className="grid grid-cols-2 border-t border-white/10 lg:border-t-0 lg:min-w-[320px]">
            <StatCell
              label="Members"
              value={stats.memberCount}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCell
              label="Posts this week"
              value={stats.postsThisWeek}
              icon={<PenLine className="h-3.5 w-3.5" />}
              border="left"
            />
            <StatCell
              label="Active threads"
              value={stats.activeThreads}
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              border="top"
            />
            <StatCell
              label="Upcoming events"
              value={stats.upcomingEvents}
              icon={<Calendar className="h-3.5 w-3.5" />}
              border="top-left"
            />
          </div>

        </div>
      </section>

      {/* ── Content grid ───────────────────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-3">

        {/* Activity feed (2/3) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-surface-foreground">
              Recent activity
            </h2>
            <Link
              href="/forums"
              className="group flex items-center gap-1 text-xs font-medium text-brand hover:text-brand transition-colors"
            >
              View all
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
                <Plus className="h-5 w-5 text-brand" />
              </div>
              <p className="mt-4 text-sm font-semibold text-surface-foreground">
                No activity yet
              </p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Be the first to share something with the community.
              </p>
              <Link
                href="/forums/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                Start a discussion
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {activity.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="group flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors"
                  >
                    {/* Left accent */}
                    <div className="w-0.5 self-stretch rounded-full bg-brand/30 group-hover:bg-brand transition-colors flex-shrink-0" />

                    {/* Avatar */}
                    <Avatar
                      src={item.authorAvatarUrl ?? null}
                      name={item.authorName}
                      size="sm"
                    />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-surface-foreground line-clamp-1 group-hover:text-brand transition-colors">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.authorName} · {timeAgo(item.createdAt)}
                      </p>
                    </div>

                    {/* Badge */}
                    <Badge variant={ACTIVITY_BADGE[item.type]} className="flex-shrink-0">
                      {ACTIVITY_LABEL[item.type]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sidebar (1/3) */}
        <aside className="space-y-6">

          {/* Explore */}
          <div>
            <h2 className="mb-3 text-base font-bold tracking-tight text-surface-foreground">
              Explore
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
              <ExploreLink href="/forums" icon={<MessageSquare className="h-4 w-4" />} label="Forums" desc="Discussions & answers" />
              <ExploreLink href="/ideas" icon={<Lightbulb className="h-4 w-4" />} label="Ideas" desc="Vote on what's next" />
              <ExploreLink href="/events" icon={<Calendar className="h-4 w-4" />} label="Events" desc="Upcoming meetups" />
              <ExploreLink href="/members" icon={<Users className="h-4 w-4" />} label="Members" desc="Connect with the community" />
            </div>
          </div>

          {/* Invite callout */}
          <Link
            href="/invite"
            className="group flex items-center justify-between gap-4 rounded-xl border border-brand/20 bg-brand/5 p-5 hover:border-brand/40 hover:bg-brand/10 transition-all"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-surface-foreground">
                Grow your community
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                Invite a colleague to join.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
          </Link>

        </aside>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  icon,
  border,
}: {
  label: string
  value: number
  icon: React.ReactNode
  border?: 'left' | 'top' | 'top-left'
}) {
  return (
    <div
      className={[
        'flex flex-col justify-between px-6 py-5',
        border === 'left' || border === 'top-left' ? 'border-l border-white/10' : '',
        border === 'top' || border === 'top-left' ? 'border-t border-white/10' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-1.5 text-white/50">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function ExploreLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string
  icon: React.ReactNode
  label: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted transition-colors"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-surface-foreground group-hover:text-brand transition-colors">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
    </Link>
  )
}
