'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const NAV = [
  {
    category: 'Getting Started',
    items: [
      { slug: 'self-hosting', title: 'Self-Hosting Guide' },
      { slug: 'social-pipeline', title: 'Social Pipeline Setup' },
      { slug: 'contributing', title: 'Contributing' },
    ],
  },
  {
    category: 'Reference',
    items: [
      { slug: 'architecture', title: 'Technical Architecture' },
    ],
  },
  {
    category: 'Policies',
    items: [
      { slug: 'security', title: 'Security Policy' },
      { slug: 'code-of-conduct', title: 'Code of Conduct' },
    ],
  },
]

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <span className="text-xs font-bold text-white leading-none">UC</span>
          </div>
          <span className="text-sm font-bold tracking-tight text-surface-foreground">Docs</span>
        </Link>
        {onClose && (
          <button {...(onClose && { onClick: onClose })} className="p-1 rounded-md text-muted-foreground hover:text-surface-foreground hover:bg-muted transition-colors lg:hidden">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <Link
            href="/docs"
            {...(onClose && { onClick: onClose })}
            className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
              pathname === '/docs'
                ? 'bg-brand/10 text-brand font-semibold'
                : 'text-muted-foreground hover:text-surface-foreground hover:bg-muted'
            }`}
          >
            Overview
          </Link>
        </div>
        {NAV.map((group) => (
          <div key={group.category}>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.category}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === `/docs/${item.slug}`
                return (
                  <li key={item.slug}>
                    <Link
                      href={`/docs/${item.slug}`}
                      {...(onClose && { onClick: onClose })}
                      className={`block px-3 py-1.5 rounded-md text-sm transition-colors ${
                        active
                          ? 'bg-brand/10 text-brand font-semibold'
                          : 'text-muted-foreground hover:text-surface-foreground hover:bg-muted'
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <Link
          href="https://github.com/JonJLevesque/OpenSourceCommunity"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-surface-foreground transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"/></svg>
          View on GitHub
        </Link>
      </div>
    </div>
  )
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 border-r border-border bg-card/50">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-72 max-w-[85vw] h-full bg-card border-r border-border shadow-xl">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-40 lg:hidden flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur border-b border-border">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-surface-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white leading-none">UC</span>
            </div>
            <span className="text-sm font-semibold text-surface-foreground">Docs</span>
          </Link>
        </div>

        <main className="px-6 py-10 max-w-4xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
