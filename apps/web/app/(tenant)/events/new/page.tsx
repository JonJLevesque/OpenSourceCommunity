import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { NewEventForm } from './new-event-form'

export const metadata: Metadata = { title: 'Create event' }

export default async function NewEventPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/events" className="hover:text-muted-foreground">
          Events
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">New event</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">Create event</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details to create a new community event.
        </p>
      </div>

      <NewEventForm token={session.access_token} />
    </div>
  )
}
