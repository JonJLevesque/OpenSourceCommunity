'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function SubNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={[
        'whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
        isActive
          ? 'bg-brand text-white'
          : 'text-muted-foreground hover:bg-muted hover:text-surface-foreground',
      ].join(' ')}
    >
      {label}
    </Link>
  )
}
