'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Home,
  MessageSquare,
  Lightbulb,
  Calendar,
  BookOpen,
  GraduationCap,
  Video,
  MessageCircle,
  Brain,
  Users,
  Settings,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModuleKey =
  | 'forums'
  | 'ideas'
  | 'events'
  | 'courses'
  | 'webinars'
  | 'kb'
  | 'chat'
  | 'intelligence'

export interface SidebarProps {
  enabledModules: ModuleKey[]
  isAdmin?: boolean
  tenantName?: string
  tenantLogoUrl?: string | null
}

// ─── Navigation items ─────────────────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  module?: ModuleKey
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/home', icon: Home },
  { label: 'Forums', href: '/forums', icon: MessageSquare, module: 'forums' },
  { label: 'Ideas', href: '/ideas', icon: Lightbulb, module: 'ideas' },
  { label: 'Events', href: '/events', icon: Calendar, module: 'events' },
  { label: 'Knowledge Base', href: '/kb', icon: BookOpen, module: 'kb' },
  { label: 'Courses', href: '/courses', icon: GraduationCap, module: 'courses' },
  { label: 'Webinars', href: '/webinars', icon: Video, module: 'webinars' },
  { label: 'Chat', href: '/chat', icon: MessageCircle, module: 'chat' },
  { label: 'Intelligence', href: '/intelligence', icon: Brain, module: 'intelligence' },
]

const INTELLIGENCE_SUBNAV = [
  { label: 'Inbox', href: '/intelligence/inbox' },
  { label: 'Sentiment', href: '/intelligence/sentiment' },
  { label: 'Competitors', href: '/intelligence/competitors' },
  { label: 'Advocates', href: '/intelligence/advocates' },
  { label: 'Alerts', href: '/intelligence/alerts' },
]

// ─── NavLink helper ───────────────────────────────────────────────────────────

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      {...(onClick ? { onClick } : {})}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active
          ? 'bg-brand/10 text-brand'
          : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-brand' : 'text-muted-foreground')} />
      {label}
    </Link>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({
  enabledModules,
  isAdmin = false,
  tenantName = 'Community',
  tenantLogoUrl,
}: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const visibleItems = ALL_NAV_ITEMS.filter(
    (item) => !item.module || enabledModules.includes(item.module),
  )

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const navContent = (
    <nav className="flex h-full flex-col">
      {/* Workspace header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-5">
        {tenantLogoUrl ? (
          <img
            src={tenantLogoUrl}
            alt={tenantName}
            className="h-8 w-8 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
            {tenantName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="truncate text-sm font-semibold text-surface-foreground">
          {tenantName}
        </span>
      </div>

      {/* Primary nav */}
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {visibleItems.map((item) => {
          if (item.module === 'intelligence') {
            const active = isActive('/intelligence')
            return (
              <div key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={active}
                  onClick={() => setMobileOpen(false)}
                />
                <div className="ml-7 mt-0.5 space-y-0.5">
                  {INTELLIGENCE_SUBNAV.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                        pathname === sub.href || pathname.startsWith(`${sub.href}/`)
                          ? 'bg-brand/10 text-brand'
                          : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isActive(item.href)}
              onClick={() => setMobileOpen(false)}
            />
          )
        })}
      </div>

      {/* Bottom section */}
      <div className="space-y-0.5 border-t border-border px-2 py-4">
        <NavLink
          href="/members"
          label="Members"
          icon={Users}
          active={isActive('/members')}
          onClick={() => setMobileOpen(false)}
        />
        {isAdmin && (
          <NavLink
            href="/admin"
            label="Admin"
            icon={Settings}
            active={isActive('/admin')}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </div>
    </nav>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        {navContent}
      </aside>

      {/* Mobile: hamburger button */}
      <button
        type="button"
        className="fixed bottom-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile: overlay + drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-xl lg:hidden">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </>
      )}
    </>
  )
}
