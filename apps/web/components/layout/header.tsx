'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Bell, LogOut, User, Settings } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { apiClientGet } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeaderProps {
  tenantName?: string
  tenantLogoUrl?: string | null
  userName?: string | undefined
  userAvatarUrl?: string | undefined
  userEmail?: string | undefined
  unreadCount?: number
  token?: string | undefined
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Header({
  tenantName = 'Community',
  tenantLogoUrl,
  userName,
  userAvatarUrl,
  userEmail,
  unreadCount = 0,
  token,
}: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
        {/* Left: workspace name (mobile only) */}
        <div className="flex items-center gap-3 lg:hidden">
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
          <span className="text-sm font-semibold text-surface-foreground">{tenantName}</span>
        </div>

        {/* Left placeholder on desktop */}
        <div className="hidden lg:block" />

        {/* Right: search + notifications + avatar */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground hover:border-border hover:bg-muted transition-colors"
            aria-label="Search"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Search…</span>
            <kbd className="hidden sm:inline rounded border border-border px-1 text-xs text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User avatar dropdown (Radix) */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                aria-label="User menu"
              >
                <Avatar
                  src={userAvatarUrl ?? null}
                  name={userName ?? null}
                  size="sm"
                />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-56 rounded-xl border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95"
              >
                {/* User info */}
                <div className="border-b border-border px-4 py-3">
                  <p className="truncate text-sm font-semibold text-surface-foreground">
                    {userName ?? 'My Account'}
                  </p>
                  {userEmail && (
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                  )}
                </div>

                {/* Menu items */}
                <DropdownMenu.Group className="py-1">
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/profile"
                      className={cn(dropdownItemCls)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings"
                      className={cn(dropdownItemCls)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Group>

                <DropdownMenu.Separator className="my-1 h-px bg-border" />

                <DropdownMenu.Group className="py-1">
                  <DropdownMenu.Item asChild>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors outline-none"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </DropdownMenu.Item>
                </DropdownMenu.Group>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* ── Search modal ──────────────────────────────────────────────────── */}
      {searchOpen && (
        <SearchModal
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onClose={() => {
            setSearchOpen(false)
            setSearchQuery('')
          }}
          token={token}
        />
      )}
    </>
  )
}

// ─── Shared dropdown item class ───────────────────────────────────────────────

const dropdownItemCls =
  'flex cursor-pointer items-center gap-2 px-4 py-2 text-sm text-surface-foreground hover:bg-muted transition-colors outline-none'

// ─── Search types ─────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  href: string
}

interface SearchResults {
  threads: SearchResult[]
  ideas: SearchResult[]
  members: SearchResult[]
  events: SearchResult[]
}

// ─── Search modal ─────────────────────────────────────────────────────────────

function SearchModal({
  query,
  onQueryChange,
  onClose,
  token,
}: {
  query: string
  onQueryChange: (v: string) => void
  onClose: () => void
  token?: string | undefined
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    inputRef.current?.focus()
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await apiClientGet<SearchResults>(`/api/search?q=${encodeURIComponent(query)}&limit=5`)
        setResults(data)
      } catch {
        // silent — show empty results
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, token])

  const hasResults = results && (
    results.threads.length + results.ideas.length +
    results.members.length + results.events.length > 0
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-20 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search forums, ideas, members, events…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-surface-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-brand" />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted"
          >
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!query || query.trim().length < 2 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Start typing to search
            </div>
          ) : loading && !results ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching…</div>
          ) : !hasResults ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-2">
              {results.threads.length > 0 && (
                <SearchSection label="Threads" items={results.threads} icon="💬" onClose={onClose} />
              )}
              {results.ideas.length > 0 && (
                <SearchSection label="Ideas" items={results.ideas} icon="💡" onClose={onClose} />
              )}
              {results.members.length > 0 && (
                <SearchSection label="Members" items={results.members} icon="👤" onClose={onClose} />
              )}
              {results.events.length > 0 && (
                <SearchSection label="Events" items={results.events} icon="📅" onClose={onClose} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Search section ───────────────────────────────────────────────────────────

function SearchSection({
  label,
  items,
  icon,
  onClose,
}: {
  label: string
  items: SearchResult[]
  icon: string
  onClose: () => void
}) {
  return (
    <div>
      <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-surface-foreground">{item.title}</p>
            {item.subtitle && (
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  )
}
