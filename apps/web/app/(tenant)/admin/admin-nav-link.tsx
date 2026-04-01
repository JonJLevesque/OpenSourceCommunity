'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href)

  return (
    <Link
      href={href}
      className={[
        'rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
        isActive
          ? 'bg-brand text-white'
          : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
