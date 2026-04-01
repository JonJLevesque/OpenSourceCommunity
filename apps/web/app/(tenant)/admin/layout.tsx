import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { redirect } from 'next/navigation'
import { AdminNavLink } from './admin-nav-link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {}

  if (!isAdmin) redirect('/home')

  const NAV = [
    { label: 'Overview', href: '/admin' },
    { label: 'Members', href: '/admin/members' },
    { label: 'Moderation', href: '/admin/moderation' },
    { label: 'Roles', href: '/admin/roles' },
    { label: 'Branding', href: '/admin/branding' },
    { label: 'Integrations', href: '/admin/integrations' },
  ]

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1.5">
        {NAV.map((item) => (
          <AdminNavLink key={item.href} href={item.href} label={item.label} />
        ))}
      </div>

      {/* Page content */}
      {children}
    </div>
  )
}
