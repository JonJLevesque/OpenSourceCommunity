import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KbCategory {
  id: string
  slug: string
  name: string
  parentId: string | null
  sortOrder: number
}

interface KbArticle {
  id: string
  title: string
  slug: string | null
  updatedAt: string
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  tags: string[]
  isPublished: boolean
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}): Promise<Metadata> {
  const { categorySlug } = await params
  return { title: `${categorySlug} — Knowledge Base` }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getArticleSlug(article: KbArticle): string {
  return article.slug ?? article.id
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KbCategoryPage({
  params,
}: {
  params: Promise<{ categorySlug: string }>
}) {
  const { categorySlug } = await params

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  // Fetch all categories to find the current one by slug
  let categories: KbCategory[] = []
  let articles: KbArticle[] = []
  let fetchError = false

  try {
    categories = await apiGet<KbCategory[]>('/api/kb/categories', token)
  } catch {
    fetchError = true
  }

  const category = categories.find((c) => c.slug === categorySlug)

  if (!fetchError && !category) {
    notFound()
  }

  if (category) {
    try {
      articles = await apiGet<KbArticle[]>(
        `/api/kb/articles?categoryId=${category.id}&published=true`,
        token,
      )
    } catch {
      fetchError = true
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/kb" className="hover:text-surface-foreground transition-colors">
          Knowledge Base
        </Link>
        <span aria-hidden>/</span>
        <span className="text-surface-foreground font-medium">{category?.name ?? categorySlug}</span>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-surface-foreground">{category?.name ?? categorySlug}</h1>
        {articles.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── Error state ───────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load articles. Please try refreshing.
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!fetchError && articles.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-base font-medium text-muted-foreground">No articles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check back soon — articles will appear here when published.
          </p>
        </div>
      )}

      {/* ── Article list ─────────────────────────────────────────────────── */}
      {!fetchError && articles.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/kb/${categorySlug}/${getArticleSlug(article)}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors group"
            >
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium text-surface-foreground group-hover:text-brand transition-colors line-clamp-1">
                  {article.title}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Updated {formatRelativeDate(article.updatedAt)}
                  </span>
                  {article.viewCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {article.viewCount.toLocaleString()} views
                    </span>
                  )}
                  {article.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <svg
                className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-brand transition-colors"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
