import Link from 'next/link'
import {
  MessageSquare, Lightbulb, Calendar, BookOpen,
  GraduationCap, Video, Users, ArrowRight, Compass,
} from 'lucide-react'
import type { ModuleKey } from '@/components/layout/sidebar'
import { WidgetShell } from './widget-shell'

// ─── Module link definitions ─────────────────────────────────────────────────

const MODULE_LINKS: Record<ModuleKey, { href: string; label: string; desc: string; icon: React.ElementType }> = {
  forums:        { href: '/forums',    label: 'Forums',        desc: 'Discussions & answers', icon: MessageSquare },
  ideas:         { href: '/ideas',     label: 'Ideas',         desc: 'Vote on what\'s next',   icon: Lightbulb },
  events:        { href: '/events',    label: 'Events',        desc: 'Upcoming meetups',       icon: Calendar },
  kb:            { href: '/kb',        label: 'Knowledge Base', desc: 'Guides & articles',     icon: BookOpen },
  courses:       { href: '/courses',   label: 'Courses',       desc: 'Structured learning',    icon: GraduationCap },
  webinars:      { href: '/webinars',  label: 'Webinars',      desc: 'Live & recorded',        icon: Video },
  chat:          { href: '/chat',      label: 'Chat',          desc: 'Real-time channels',     icon: MessageSquare },
  intelligence:  { href: '/intelligence', label: 'Intelligence', desc: 'Social monitoring',    icon: Lightbulb },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuickLinks({ enabledModules }: { enabledModules: string[] }) {
  const links = (enabledModules as ModuleKey[])
    .filter((m) => MODULE_LINKS[m])
    .map((m) => MODULE_LINKS[m])

  // Always append Members
  const allLinks = [
    ...links,
    { href: '/members', label: 'Members', desc: 'Connect with others', icon: Users },
  ]

  return (
    <WidgetShell
      title="Explore"
      icon={<Compass className="h-4 w-4" />}
      size="sm"
      contentClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {allLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-center gap-3 px-5 py-3 hover:bg-muted transition-colors"
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                <link.icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-surface-foreground group-hover:text-brand transition-colors">
                  {link.label}
                </p>
                <p className="text-[11px] text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground/40 transition-all group-hover:text-brand group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
    </WidgetShell>
  )
}
