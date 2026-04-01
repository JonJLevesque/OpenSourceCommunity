import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { NewThreadForm } from './new-thread-form'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}): Promise<Metadata> {
  const { categorySlug } = await params
  return { title: `New thread — ${categorySlug}` }
}

interface ForumCategory {
  id: string
  slug: string
  name: string
  description: string | null
}

export default async function NewThreadPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}) {
  const { categorySlug } = await params

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect('/login')

  const token = session.access_token

  let category: ForumCategory | null = null
  try {
    const categories = await apiGet<ForumCategory[]>('/api/forums/categories', token)
    category = categories.find((c) => c.slug === categorySlug) ?? null
  } catch {
    notFound()
  }

  if (!category) notFound()

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ──────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-muted-foreground">
          Forums
        </Link>
        <span>/</span>
        <Link href={`/forums/${categorySlug}`} className="hover:text-muted-foreground">
          {category.name}
        </Link>
        <span>/</span>
        <span className="text-surface-foreground font-medium">New thread</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">New thread</h1>
      </div>

      <NewThreadForm
        categoryId={category.id}
        categoryName={category.name}
        categorySlug={categorySlug}
        token={token}
      />
    </div>
  )
}
