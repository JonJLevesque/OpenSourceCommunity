import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'OpenSourceCommunity — The open-source community platform',
  description:
    'The official home of the OpenSourceCommunity project. Discuss, learn, share ideas, and connect with contributors building the open-source community platform.',
  openGraph: {
    title: 'OpenSourceCommunity — The open-source community platform',
    description:
      'Forums, ideas, events, courses, and AI-powered social intelligence. Open source. Self-hostable. Come build with us.',
  },
}

/* ═══════════════════════════════════════════════════════════════════════════
   INLINE SVG ICONS
   ═══════════════════════════════════════════════════════════════════════════ */

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  )
}

function ForumIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 9h8M8 13h6" />
    </svg>
  )
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5" />
    </svg>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m22 8-6 4 6 4V8Z" />
    </svg>
  )
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  )
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  )
}

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3 3 3 0 0 0 1 2.24A3.5 3.5 0 0 0 5 15.5 3.5 3.5 0 0 0 8 19h1v2h6v-2h1a3.5 3.5 0 0 0 3-5.26A3 3 0 0 0 20 11.24 3 3 0 0 0 21 10a3 3 0 0 0-3-3V6a4 4 0 0 0-4-4h-2Z" />
      <path d="M12 2v20" />
      <path d="M8 8h0M16 8h0M9 14h0M15 14h0" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
    </svg>
  )
}


/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DASHBOARD COMPONENT (Hero visual)
   ═══════════════════════════════════════════════════════════════════════════ */

function HeroDashboardMockup() {
  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-2xl shadow-neutral-900/10 overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/80 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-amber-400" />
          <div className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="ml-3 flex-1 rounded-md bg-card/80 border border-border px-3 py-1 text-xs text-muted-foreground font-mono">
          app.opensourcecommunity.io/dashboard
        </div>
      </div>

      {/* Dashboard body */}
      <div className="flex min-h-[320px]">
        {/* Sidebar */}
        <div className="hidden sm:flex w-48 flex-col border-r border-neutral-800 bg-neutral-900 p-3 gap-1">
          {/* Logo area */}
          <div className="flex items-center gap-2 px-2 py-2 mb-3">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-400 to-violet-500" />
            <span className="text-xs font-semibold text-white tracking-tight">Acme Community</span>
          </div>
          {/* Nav items */}
          {['Dashboard', 'Forums', 'Ideas', 'Events', 'Members', 'Intelligence'].map((item, i) => (
            <div
              key={item}
              className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                i === 0
                  ? 'bg-brand/20 text-brand/60'
                  : i === 5
                    ? 'text-orange-300/80'
                    : 'text-muted-foreground'
              }`}
            >
              <div className={`h-1.5 w-1.5 rounded-full ${
                i === 0 ? 'bg-brand/70' : i === 5 ? 'bg-orange-400' : 'bg-neutral-600'
              }`} />
              {item}
            </div>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
            <div className="h-5 w-5 rounded-full bg-neutral-700" />
            <span>Settings</span>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 bg-muted/50">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            {[
              { label: 'Members', value: '12,847', change: '+14%', color: 'text-brand', bg: 'bg-brand/5', ring: 'ring-brand/10' },
              { label: 'Active today', value: '1,293', change: '+8%', color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
              { label: 'Posts', value: '847', change: '+23%', color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
              { label: 'Sentiment', value: '94%', change: '+2%', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-lg ${stat.bg} ring-1 ${stat.ring} p-3`}
              >
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                <div className={`text-lg font-bold ${stat.color} mt-0.5 leading-tight`}>{stat.value}</div>
                <div className="text-[10px] font-medium text-emerald-500 mt-0.5">{stat.change} this week</div>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div className="rounded-lg bg-card ring-1 ring-slate-200/60 p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-surface-foreground">Recent Activity</span>
              <span className="text-[10px] text-muted-foreground font-medium">View all</span>
            </div>
            {[
              { name: 'Sarah K.', action: 'posted in Ideas', time: '2m ago', avatarColor: 'bg-brand/70' },
              { name: 'Marcus T.', action: 'replied to a thread', time: '5m ago', avatarColor: 'bg-emerald-400' },
              { name: 'Aisha R.', action: 'RSVP\'d to Webinar', time: '12m ago', avatarColor: 'bg-violet-400' },
              { name: 'David L.', action: 'earned Top Advocate badge', time: '18m ago', avatarColor: 'bg-amber-400' },
              { name: 'Priya S.', action: 'completed Course 3', time: '24m ago', avatarColor: 'bg-rose-400' },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-2.5 py-1.5">
                <div className={`h-6 w-6 rounded-full ${item.avatarColor} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-surface-foreground">{item.name} </span>
                  <span className="text-xs text-muted-foreground">{item.action}</span>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK INTELLIGENCE DASHBOARD
   ═══════════════════════════════════════════════════════════════════════════ */

function IntelligenceMockup() {
  return (
    <div className="rounded-xl border border-neutral-700/50 bg-neutral-800/80 shadow-2xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-neutral-700/50 bg-neutral-800 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <span className="ml-2 text-[11px] font-medium text-muted-foreground">Social Intelligence</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Crisis alert banner */}
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-red-300">Crisis Alert</div>
            <div className="text-[11px] text-red-300/70">Negative spike detected on r/saas &mdash; 12 mentions in 2h</div>
          </div>
        </div>

        {/* Two-col grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sentiment gauge */}
          <div className="rounded-lg bg-neutral-700/50 p-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Overall Sentiment</div>
            {/* Arc gauge - simplified */}
            <div className="flex items-center justify-center py-2">
              <svg viewBox="0 0 100 60" className="w-24 h-14">
                {/* Background arc */}
                <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
                {/* Value arc - ~78% of 180 degrees */}
                <path d="M 10 55 A 40 40 0 0 1 82 25" fill="none" stroke="url(#sentimentGrad)" strokeWidth="8" strokeLinecap="round" />
                <defs>
                  <linearGradient id="sentimentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <text x="50" y="52" textAnchor="middle" className="fill-white text-[16px] font-bold">78%</text>
              </svg>
            </div>
            <div className="text-center text-[10px] text-emerald-400 font-medium">+3% vs last week</div>
          </div>

          {/* Top advocates */}
          <div className="rounded-lg bg-neutral-700/50 p-3">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Top Advocates</div>
            <div className="space-y-2">
              {[
                { name: '@sarah_dev', score: 94, color: 'bg-brand/70' },
                { name: '@marcos_t', score: 87, color: 'bg-violet-400' },
                { name: '@priya_eng', score: 82, color: 'bg-emerald-400' },
              ].map((adv) => (
                <div key={adv.name} className="flex items-center gap-2">
                  <div className={`h-5 w-5 rounded-full ${adv.color} flex-shrink-0`} />
                  <span className="text-[11px] text-muted-foreground/70 flex-1 truncate">{adv.name}</span>
                  <span className="text-[10px] font-semibold text-emerald-400">{adv.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent mentions */}
        <div className="rounded-lg bg-neutral-700/50 p-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent Mentions</div>
          <div className="space-y-2">
            {[
              { platform: 'Reddit', badge: 'bg-orange-500/20 text-orange-300', text: '"OpenSourceCommunity is the best platform we\'ve used..."', sentiment: 'positive' },
              { platform: 'Twitter/X', badge: 'bg-sky-500/20 text-sky-300', text: '"Just migrated from Circle to @OpenSourceCommunity..."', sentiment: 'positive' },
              { platform: 'LinkedIn', badge: 'bg-blue-500/20 text-blue-300', text: '"Interesting approach to community-led growth..."', sentiment: 'neutral' },
            ].map((mention) => (
              <div key={mention.platform} className="flex items-start gap-2">
                <span className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${mention.badge}`}>
                  {mention.platform}
                </span>
                <p className="text-[11px] text-muted-foreground/70 leading-tight flex-1">{mention.text}</p>
                <span className={`flex-shrink-0 h-1.5 w-1.5 rounded-full mt-1 ${
                  mention.sentiment === 'positive' ? 'bg-emerald-400' : 'bg-neutral-400'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-card text-surface-foreground overflow-hidden">

      {/* ━━━ NAVBAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-card/80 border-b border-border/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm shadow-brand/20">
              <span className="text-sm font-bold text-white leading-none">UC</span>
            </div>
            <span className="text-base font-bold tracking-tight text-surface-foreground">
              OpenSourceCommunity
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-surface-foreground transition-colors">Features</Link>
            <Link href="#modules" className="hover:text-surface-foreground transition-colors">Modules</Link>
            <Link href="#open-source" className="hover:text-surface-foreground transition-colors">Open Source</Link>
            <Link href="#docs" className="hover:text-surface-foreground transition-colors">Docs</Link>
          </nav>

          {/* CTA buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-surface-foreground hover:bg-muted hover:border-border transition-all"
            >
              Sign in
            </Link>
            <Link
              href="https://github.com/JonJLevesque/OpenSourceCommunity"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/20 hover:opacity-90 transition-all"
            >
              <GitHubIcon className="h-4 w-4" />
              <span className="hidden sm:inline">View on GitHub</span>
              <span className="sm:hidden">GitHub</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative pt-32 pb-20 lg:pb-28 lg:pt-40">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="heroGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" opacity="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#heroGrid)" />
          </svg>
          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/90 to-white" />
          {/* Indigo glow */}
          <div className="absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-brand/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            {/* Text column */}
            <div className="lg:w-[42%] flex-shrink-0">
              {/* Eyebrow pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-emerald-700 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Open source &middot; Non-commercial &middot; Self-hostable
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.08] text-surface-foreground">
                Welcome to{' '}
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-transparent">
                  OpenSource<wbr />Community
                </span>
              </h1>

              <p className="mt-6 text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
                The official community of the OSC project. Discuss ideas, share knowledge, attend events,
                and help shape the future of open-source community software.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 hover:shadow-brand/30 transition-all"
                >
                  Join the OSCommunity
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="https://github.com/JonJLevesque/OpenSourceCommunity"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-7 py-3.5 text-base font-semibold text-surface-foreground hover:bg-muted hover:border-border transition-all"
                >
                  <GitHubIcon className="h-5 w-5" />
                  View on GitHub
                </Link>
              </div>

              {/* Trust strip */}
              <p className="mt-8 text-sm text-muted-foreground leading-relaxed">
                Open source &middot; Non-commercial license &middot; No vendor lock-in &middot; Self-host in 5 minutes
              </p>
            </div>

            {/* Dashboard visual */}
            <div className="mt-14 lg:mt-0 lg:w-[58%]">
              {/* Tilt/perspective wrapper */}
              <div className="relative" style={{ perspective: '2000px' }}>
                <div style={{ transform: 'rotateY(-3deg) rotateX(2deg)' }}>
                  <HeroDashboardMockup />
                </div>
                {/* Floating glow behind the card */}
                <div className="absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-br from-indigo-200/30 via-violet-200/20 to-transparent blur-2xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SOCIAL PROOF / STATS BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="bg-muted border-y border-border">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { value: '11', label: 'community modules' },
              { value: '100%', label: 'open source' },
              { value: 'Self-host', label: 'in 5 minutes' },
              { value: 'Non-commercial', label: 'license' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl sm:text-2xl font-bold text-surface-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ MODULES GRID ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="modules" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-surface-foreground">
              Everything in one place
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              OSC ships with 11 built-in modules. Modular by design &mdash; enable what you need,
              disable what you don&apos;t. Each module is independently deployable and fully customizable.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Forums */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-brand/5 flex items-center justify-center mb-4">
                <ForumIcon className="h-5.5 w-5.5 text-brand" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Forums</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Threaded discussions, categories, reactions</p>
            </div>

            {/* Ideas */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <LightbulbIcon className="h-5.5 w-5.5 text-amber-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Ideas</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Vote-based feature request board</p>
            </div>

            {/* Events */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <CalendarIcon className="h-5.5 w-5.5 text-emerald-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Events</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">In-person and virtual event listings + RSVP</p>
            </div>

            {/* Courses */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
                <BookIcon className="h-5.5 w-5.5 text-violet-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Courses</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Structured learning paths and lessons</p>
            </div>

            {/* Webinars */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-rose-50 flex items-center justify-center mb-4">
                <VideoIcon className="h-5.5 w-5.5 text-rose-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Webinars</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Live and recorded video sessions</p>
            </div>

            {/* Knowledge Base */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-sky-50 flex items-center justify-center mb-4">
                <DocumentIcon className="h-5.5 w-5.5 text-sky-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Knowledge Base</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Searchable docs and articles</p>
            </div>

            {/* Chat */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                <ChatIcon className="h-5.5 w-5.5 text-teal-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Chat</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Real-time channels powered by Supabase Realtime</p>
            </div>

            {/* Social Intelligence — FEATURED */}
            <div className="group rounded-2xl border-2 border-orange-400/30 bg-gradient-to-br from-orange-500/10 to-amber-500/10 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
              <div className="absolute top-3 right-3 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-500">
                Featured
              </div>
              <div className="h-11 w-11 rounded-xl bg-orange-500/15 flex items-center justify-center mb-4">
                <BrainIcon className="h-5.5 w-5.5 text-orange-500" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Social Intelligence</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI-powered mention monitoring, sentiment analysis, advocate identification, and crisis alerting across 11 platforms — Reddit, Twitter/X, LinkedIn, YouTube, GitHub, Discord, TikTok, G2, Trustpilot, Product Hunt, and HackerNews
              </p>
            </div>

            {/* Members */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
                <UsersIcon className="h-5.5 w-5.5 text-indigo-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Members</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Member directory, profiles, roles, and community leaderboards</p>
            </div>

            {/* Notifications */}
            <div className="group rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200">
              <div className="h-11 w-11 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
                <BellIcon className="h-5.5 w-5.5 text-pink-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Notifications</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">In-app alerts, email digests, and real-time activity feeds</p>
            </div>

            {/* Multilingual — Coming soon */}
            <div className="group rounded-2xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-500/8 to-indigo-500/8 p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 relative overflow-hidden">
              <div className="absolute top-3 right-3 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                Coming soon
              </div>
              <div className="h-11 w-11 rounded-xl bg-violet-500/12 flex items-center justify-center mb-4">
                <GlobeIcon className="h-5.5 w-5.5 text-violet-600" />
              </div>
              <h3 className="text-base font-semibold text-surface-foreground mb-1.5">Multilingual AI</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI translates any content to/from any language on the fly. Post once, reach everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ SOCIAL INTELLIGENCE DEEP-DIVE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="features" className="bg-neutral-900 text-white py-28 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-0" aria-hidden="true">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-orange-500/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-brand/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-16">
            {/* Text column */}
            <div className="lg:w-1/2 mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-orange-300 mb-6">
                <BrainIcon className="h-3.5 w-3.5" />
                The differentiator
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                The intelligence layer{' '}
                <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                  no one else has
                </span>
              </h2>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg">
                Social Intelligence monitors 11 platforms — Reddit, Twitter/X, LinkedIn, YouTube, GitHub, Discord, TikTok, G2, Trustpilot, Product Hunt, and HackerNews — for every
                mention of your community. It surfaces what matters before it becomes a crisis.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'Monitor brand mentions across 11 platforms — Reddit, Twitter/X, LinkedIn, YouTube, GitHub, Discord, TikTok, and more',
                  'AI-powered sentiment analysis detects shifts before they trend',
                  'Identify and nurture your top advocates automatically',
                  'Crisis alerting with instant notifications when negativity spikes',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-muted-foreground/70 leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-sm text-muted-foreground">
                Built into every OSC instance &mdash; open source, no subscriptions, fully self-hosted.
              </p>
            </div>

            {/* Intelligence dashboard mockup */}
            <div className="lg:w-1/2">
              <IntelligenceMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ OPEN SOURCE CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section id="open-source" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-surface-foreground">
              Self-host in 5 minutes
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Clone, install, start. No sales calls, no credit cards, no vendor lock-in. Your data stays yours.
            </p>
          </div>

          {/* Terminal code block */}
          <div className="mx-auto max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
            {/* Terminal top bar */}
            <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-4 py-3">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="ml-3 text-xs text-muted-foreground font-mono">terminal</span>
            </div>
            {/* Code */}
            <div className="p-5 font-mono text-sm leading-7 overflow-x-auto">
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">git clone</span>{' '}
                <span className="text-muted-foreground/70">https://github.com/JonJLevesque/OpenSourceCommunity.git</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">cd</span>{' '}
                <span className="text-muted-foreground/70">OpenSourceCommunity</span>{' '}
                <span className="text-muted-foreground">&&</span>{' '}
                <span className="text-sky-300">pnpm install</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">npx supabase start</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">pnpm db:push</span>{' '}
                <span className="text-muted-foreground">&&</span>{' '}
                <span className="text-sky-300">pnpm db:seed</span>
              </div>
              <div>
                <span className="text-emerald-400">$</span>{' '}
                <span className="text-sky-300">pnpm dev</span>
              </div>
              <div className="mt-2">
                <span className="text-muted-foreground"># Ready at http://localhost:3000</span>
              </div>
            </div>
          </div>

          {/* Deploy your own card */}
          <div className="mt-12 max-w-sm mx-auto">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">Run your own instance</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                Self-host OSC on your own infrastructure. Non-commercial open-source license. Full control over your data.
              </p>
              <Link
                href="https://github.com/JonJLevesque/OpenSourceCommunity"
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-all"
              >
                <GitHubIcon className="h-4 w-4" />
                Get the code
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ ROADMAP ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="py-24 px-6 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 border-y border-border/60">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold tracking-wide text-violet-600 mb-6">
              What&apos;s coming
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-surface-foreground">
              The roadmap
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Built in public. These are the next big things landing in OSC.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Phase 1 — Shipped */}
            <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-7 shadow-sm">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
                ✓ Phase 1 — Shipped
              </div>
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">11 Social Connectors</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Full coverage shipped: Reddit, HackerNews, Twitter/X, LinkedIn, YouTube, GitHub, Discord, TikTok, G2, Trustpilot, and Product Hunt — all live.
              </p>
            </div>

            {/* Social Loop */}
            <div className="rounded-2xl border border-violet-200 bg-white p-7 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-violet-50 flex items-center justify-center mb-5">
                <svg className="h-5 w-5 text-violet-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <path d="m17 11-5-5-5 5" /><path d="M12 6v9" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700 mb-3">
                Phase 3
              </div>
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">Social Loop</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every social mention becomes a community conversation. Reply in your forum — the answer goes back to Reddit, Twitter, or wherever it came from.
              </p>
            </div>

            {/* Multilingual AI */}
            <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-5">
                <GlobeIcon className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-3">
                Phase 2
              </div>
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">Multilingual AI</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Powered by Gemini and Claude. Post in any language, read in yours. Translation built into every module — forums, chat, knowledge base, and more.
              </p>
            </div>

            {/* Fediverse */}
            <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-5">
                <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
                  <line x1="12" y1="7" x2="5" y2="17" /><line x1="12" y1="7" x2="19" y2="17" /><line x1="5" y1="17" x2="19" y2="17" />
                </svg>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-3">
                Phase 4
              </div>
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">Fediverse (ActivityPub)</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every OSC instance becomes a fediverse node. Forums federate like Mastodon threads, members get portable identities across the open social web.
              </p>
            </div>

            {/* Slack Bridge */}
            <div className="rounded-2xl border border-border bg-white p-7 shadow-sm">
              <div className="h-11 w-11 rounded-xl bg-sky-50 flex items-center justify-center mb-5">
                <SlackIcon className="h-5 w-5 text-sky-600" />
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-3">
                Phase 6
              </div>
              <h3 className="text-lg font-semibold text-surface-foreground mb-2">Slack Bridge</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sync your Slack workspace with OSC forums. Posts flow both ways — keep your team where they are while your community grows on a platform you own.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="https://github.com/JonJLevesque/OpenSourceCommunity/issues?q=label%3Aroadmap"
              className="inline-flex items-center gap-2 text-brand font-semibold text-base hover:opacity-80 transition-opacity"
            >
              View the full roadmap on GitHub
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section className="relative py-28 px-6 bg-gradient-to-br from-indigo-600 to-violet-700 text-white overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="ctaGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" opacity="0.07" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ctaGrid)" />
          </svg>
        </div>

        {/* Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-white/5 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Come build with us
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-xl mx-auto">
            OSC is an open-source project built in public. Join the community, share ideas, report bugs, and help shape what comes next.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-brand shadow-lg hover:bg-white/90 transition-all"
            >
              Join the community
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="https://github.com/JonJLevesque/OpenSourceCommunity"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              <GitHubIcon className="h-5 w-5" />
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer className="border-t border-border bg-card py-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <span className="text-sm font-bold text-white leading-none">UC</span>
                </div>
                <span className="text-base font-bold tracking-tight text-surface-foreground">
                  OpenSourceCommunity
                </span>
              </Link>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
                The open-source community platform with AI-powered social intelligence.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Features</h4>
              <ul className="space-y-2.5">
                {['Forums', 'Ideas', 'Events', 'Courses', 'Webinars', 'Knowledge Base', 'Chat', 'Members', 'Notifications', 'Social Intelligence'].map((item) => (
                  <li key={item}>
                    <Link href="#modules" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">{item}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Developers */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Developers</h4>
              <ul className="space-y-2.5">
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">GitHub</Link></li>
                <li><Link href="#docs" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Documentation</Link></li>
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity/blob/main/CONTRIBUTING.md" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Contributing</Link></li>
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity/security" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Security</Link></li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Community</h4>
              <ul className="space-y-2.5">
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Discord</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Twitter / X</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link href="https://github.com/JonJLevesque/OpenSourceCommunity/blob/main/LICENSE" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">License (Non-commercial)</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-sm text-muted-foreground hover:text-surface-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-14 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} OpenSourceCommunity. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Released under the{' '}
              <Link href="https://github.com/JonJLevesque/OpenSourceCommunity/blob/main/LICENSE" className="text-brand hover:text-brand transition-colors">
                Non-commercial License
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
