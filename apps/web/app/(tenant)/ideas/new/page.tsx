import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { NewIdeaForm } from './new-idea-form'

export const metadata: Metadata = { title: 'Submit idea' }

interface IdeaCategory {
  id: string
  name: string
}

export default async function NewIdeaPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  let categories: IdeaCategory[] = []
  try {
    categories = await apiGet<IdeaCategory[]>('/api/ideas/categories', token, 600)
  } catch {
    // non-fatal — form still works without categories
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-muted-foreground">
          Ideas
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">Submit idea</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">Submit an idea</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your idea with the community. Others can vote and comment to help it get noticed.
        </p>
      </div>

      <NewIdeaForm categories={categories} token={token} />
    </div>
  )
}
