import { Users, PenLine, MessageSquare, Calendar } from 'lucide-react'
import { apiGet } from '@/lib/api'

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
    stats = statsData
    displayName = meData.displayName
  } catch {
    // graceful fallback
  }

  const greeting = greetingFor(new Date().getHours())

  const statPills = [
    { icon: Users,         label: `${stats.memberCount.toLocaleString()} members` },
    { icon: PenLine,       label: `${stats.postsThisWeek} posts this week` },
    { icon: MessageSquare, label: `${stats.activeThreads} active threads` },
    { icon: Calendar,      label: `${stats.upcomingEvents} upcoming events` },
  ].filter(p => {
    // hide zeros for a cleaner look when data is sparse
    const num = parseInt(p.label)
    return isNaN(num) || num > 0
  })

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 overflow-hidden rounded-2xl bg-brand text-white">
      <div className="flex flex-col gap-5 px-8 py-7 sm:flex-row sm:items-center sm:justify-between">

        {/* Left: greeting + name */}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
            {greeting}{displayName ? `, ${displayName}` : ''}
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
            {tenantName}
            <span className="text-white/30">.</span>
          </h1>
          <p className="mt-1 text-sm text-white/60">
            Here&apos;s what&apos;s happening in your community today.
          </p>
        </div>

        {/* Right: stat pills */}
        {statPills.length > 0 && (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            {statPills.map((pill) => (
              <span
                key={pill.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white"
              >
                <pill.icon className="h-3 w-3" />
                {pill.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
