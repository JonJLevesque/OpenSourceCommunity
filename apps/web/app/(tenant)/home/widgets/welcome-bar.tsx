import { Search, ArrowUpRight, Users, MessageSquare, PenLine, Calendar } from 'lucide-react'
import Link from 'next/link'
import { DM_Serif_Display } from 'next/font/google'
import { apiGet } from '@/lib/api'

// ─── Font ─────────────────────────────────────────────────────────────────────

const display = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommunityStats {
  memberCount: number
  postsThisWeek: number
  activeThreads: number
  upcomingEvents: number
}

interface MeData {
  displayName: string
  role: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function WelcomeBar({
  token,
  tenantName,
}: {
  token: string | undefined
  tenantName: string
}) {
  let stats: CommunityStats = { memberCount: 0, postsThisWeek: 0, activeThreads: 0, upcomingEvents: 0 }
  let displayName = ''

  try {
    const [statsData, meData] = await Promise.all([
      apiGet<CommunityStats>('/api/stats', token, 300),
      apiGet<MeData>('/api/me', token, 60),
    ])
    if (statsData) stats = statsData
    displayName = meData?.displayName ?? ''
  } catch {
    // graceful fallback
  }

  const greeting = greetingFor(new Date().getHours())

  const statItems = [
    { icon: Users,         value: stats.memberCount.toLocaleString(),   label: 'Members' },
    { icon: MessageSquare, value: stats.activeThreads.toLocaleString(),  label: 'Active threads' },
    { icon: PenLine,       value: stats.postsThisWeek.toLocaleString(),  label: 'Posts this week' },
    { icon: Calendar,      value: stats.upcomingEvents.toLocaleString(), label: 'Upcoming events' },
  ].filter(s => {
    const n = parseInt(s.value.replace(/,/g, ''))
    return isNaN(n) || n > 0
  })

  return (
    <div className={`col-span-1 md:col-span-2 lg:col-span-3 ${display.variable}`}>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand via-brand to-violet-600 shadow-lg">

        {/* Dot texture */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='1' cy='1' r='1' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundSize: '20px 20px',
          }}
        />

        {/* Decorative rings — top right */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full border border-white/10" />
        <div className="absolute -right-8 -top-8 h-44 w-44 rounded-full border border-white/10" />

        <div className="relative px-8 py-12">
          {/* Greeting */}
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/55">
            {greeting}{displayName ? ` · ${displayName}` : ''}
          </p>

          {/* Community name — display serif */}
          <h1
            className="mt-3 text-white leading-[1.05]"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 5vw, 3.75rem)',
              letterSpacing: '-0.01em',
            }}
          >
            {tenantName}
          </h1>

          {/* Tagline */}
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
            Connect, collaborate, and grow with your community.
          </p>

          {/* Search + CTA */}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/forums"
              className="flex flex-1 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-5 py-3.5 text-sm text-white/50 backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <Search className="h-4 w-4 shrink-0 text-white/40" />
              <span>Search discussions, ideas, members…</span>
            </Link>
            <Link
              href="/forums/new"
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-brand shadow-sm transition-opacity hover:opacity-90 sm:shrink-0"
            >
              Start a discussion
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Stats strip */}
          {statItems.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-6">
              {statItems.map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <s.icon className="h-3.5 w-3.5 text-white/45" />
                  <span className="text-sm font-bold text-white">{s.value}</span>
                  <span className="text-xs text-white/50">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
