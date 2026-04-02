import Link from 'next/link'
import { BookOpen, FileText } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { WidgetShell } from './widget-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArticleRow {
  id: string
  slug: string
  title: string
  excerpt?: string
  updatedAt: string
  viewCount: number
  category?: { slug: string; name: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default async function RecentArticles({ token }: { token: string | undefined }) {
  let articles: ArticleRow[] = []

  try {
    const data = await apiGet<{ articles: ArticleRow[] }>('/api/kb/articles?limit=4', token, 300)
    articles = data.articles ?? []
  } catch {
    return null
  }

  if (articles.length === 0) return null

  return (
    <WidgetShell
      title="Knowledge Base"
      icon={<BookOpen className="h-4 w-4" />}
      href="/kb"
      hrefLabel="Browse all"
      size="md"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/kb/${article.category?.slug ?? 'general'}/${article.slug}`}
            className="group flex items-start gap-3 rounded-lg border border-border p-3 hover:border-brand/30 hover:bg-muted transition-all"
          >
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-surface-foreground line-clamp-2 group-hover:text-brand transition-colors leading-snug">
                {article.title}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {article.category?.name ?? 'General'} · {timeAgo(article.updatedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </WidgetShell>
  )
}
