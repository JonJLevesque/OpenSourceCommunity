import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'New discussion' }

interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string | null
}

export default async function ForumsNewPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  let categories: ForumCategory[] = []
  try {
    categories = await apiGet<ForumCategory[]>('/api/forums/categories', token)
  } catch {
    // fall through — show error state
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-muted-foreground">
          Forums
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">New discussion</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">New discussion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a category to post in
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No categories available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            An admin needs to create forum categories first.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/forums/${cat.slug}/new`}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-surface-foreground">{cat.name}</p>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{cat.description}</p>
                    )}
                  </div>
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
