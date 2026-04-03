import Link from 'next/link'
import {
  MessageSquare, Lightbulb, Calendar, BookOpen,
  GraduationCap, Video, MessageCircle, Brain, ArrowUpRight,
} from 'lucide-react'

// ─── Module definitions ───────────────────────────────────────────────────────

interface ModuleDef {
  href: string
  label: string
  desc: string
  icon: React.ElementType
  accent: string
}

const MODULE_DEFS: Record<string, ModuleDef> = {
  forums:         { href: '/forums',       label: 'Forums',         desc: 'Ask & answer questions',   icon: MessageSquare, accent: '#3b82f6' },
  ideas:          { href: '/ideas',        label: 'Ideas',          desc: 'Vote on what\'s next',      icon: Lightbulb,     accent: '#f59e0b' },
  events:         { href: '/events',       label: 'Events',         desc: 'Meetups & online sessions', icon: Calendar,      accent: '#10b981' },
  kb:             { href: '/kb',           label: 'Knowledge Base', desc: 'Guides & how-tos',          icon: BookOpen,      accent: '#8b5cf6' },
  courses:        { href: '/courses',      label: 'Courses',        desc: 'Structured learning',       icon: GraduationCap, accent: '#ef4444' },
  webinars:       { href: '/webinars',     label: 'Webinars',       desc: 'Live & recorded sessions',  icon: Video,         accent: '#0ea5e9' },
  chat:           { href: '/chat',         label: 'Chat',           desc: 'Real-time channels',        icon: MessageCircle, accent: '#14b8a6' },
  'social-intel': { href: '/intelligence', label: 'Intelligence',   desc: 'Community monitoring',      icon: Brain,         accent: '#a855f7' },
  intelligence:   { href: '/intelligence', label: 'Intelligence',   desc: 'Community monitoring',      icon: Brain,         accent: '#a855f7' },
}

// ─── Component ────────────────────────────────────────────────────────────────

const ADMIN_ONLY_MODULES = new Set(['social-intel', 'intelligence'])

export default function CategoriesGrid({ enabledModules, isAdmin = false }: { enabledModules: string[]; isAdmin?: boolean }) {
  const categories = enabledModules
    .filter((m) => isAdmin || !ADMIN_ONLY_MODULES.has(m))
    .map((m) => MODULE_DEFS[m])
    .filter((c): c is ModuleDef => Boolean(c))

  if (categories.length === 0) return null

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3">
      {/* Section label */}
      <div className="mb-4 flex items-center gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Explore
        </p>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((cat, i) => (
          <Link
            key={cat.href + cat.label}
            href={cat.href}
            className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderLeftColor: cat.accent, borderLeftWidth: '3px' }}
          >
            {/* Index number */}
            <span className="absolute right-3 top-3 font-mono text-[10px] font-bold text-muted-foreground/20">
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Icon */}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${cat.accent}1a` }}
            >
              <cat.icon className="h-[18px] w-[18px]" style={{ color: cat.accent }} />
            </div>

            {/* Text */}
            <div>
              <p className="text-sm font-bold text-surface-foreground transition-colors group-hover:text-brand">
                {cat.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {cat.desc}
              </p>
            </div>

            {/* Hover arrow */}
            <ArrowUpRight className="absolute bottom-4 right-4 h-3.5 w-3.5 text-muted-foreground/20 transition-all group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </div>
  )
}
