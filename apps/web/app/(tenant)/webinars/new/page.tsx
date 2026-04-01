import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { NewWebinarForm } from './new-webinar-form'

export const metadata: Metadata = { title: 'Create webinar' }

export default async function NewWebinarPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  // Verify the user is an org_admin
  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin'
  } catch {
    // fall through — will redirect below
  }

  if (!isAdmin) redirect('/webinars')

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/webinars" className="hover:text-muted-foreground">
          Webinars
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">Create webinar</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">Create webinar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          New webinars start in draft status — publish when ready.
        </p>
      </div>

      <NewWebinarForm token={token} />
    </div>
  )
}
