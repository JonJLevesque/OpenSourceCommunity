import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { FeedbackButtons } from './feedback-buttons'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KbCategory {
  id: string
  slug: string
  name: string
  parentId: string | null
}

interface KbArticleDetail {
  id: string
  title: string
  slug: string | null
  body: Record<string, unknown>
  tags: string[]
  visibility: 'public' | 'members' | 'restricted'
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  viewCount: number
  helpfulCount: number
  notHelpfulCount: number
  authorId: string
  categoryId: string
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; articleSlug: string }>
}): Promise<Metadata> {
  const { articleSlug: _articleSlug } = await params
  return { title: `Article — Knowledge Base` }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso))
}

/**
 * Very simple ProseMirror / TipTap JSON-to-HTML renderer.
 * Handles paragraph, heading, bulletList, orderedList, listItem, bold, italic.
 * Falls back to a <pre> dump for unsupported shapes.
 */
function renderBody(body: Record<string, unknown>): string {
  try {
    return renderNode(body)
  } catch {
    return `<pre class="text-xs text-muted-foreground overflow-auto">${JSON.stringify(body, null, 2)}</pre>`
  }
}

function renderNode(node: Record<string, unknown>): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const children = content.map((child) => renderNode(child)).join('')

  switch (type) {
    case 'doc':
      return children
    case 'paragraph':
      return `<p>${children}</p>`
    case 'heading': {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${children}</ul>`
    case 'orderedList':
      return `<ol>${children}</ol>`
    case 'listItem':
      return `<li>${children}</li>`
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`
    case 'codeBlock':
      return `<pre><code>${children}</code></pre>`
    case 'code':
      return `<code>${(node.text as string | undefined) ?? ''}</code>`
    case 'text': {
      let text = (node.text as string | undefined) ?? ''
      const marks = (node.marks as Array<{ type: string }> | undefined) ?? []
      for (const mark of marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'underline') text = `<u>${text}</u>`
        if (mark.type === 'strike') text = `<s>${text}</s>`
      }
      return text
    }
    default:
      return children
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function KbArticlePage({
  params,
}: {
  params: Promise<{ categorySlug: string; articleSlug: string }>
}) {
  const { categorySlug, articleSlug } = await params

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token

  // Resolve the article — articleSlug may be a UUID or a real slug
  let article: KbArticleDetail | null = null
  let fetchError = false

  // First try by ID (UUID shape)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(articleSlug)) {
    try {
      article = await apiGet<KbArticleDetail>(`/api/kb/articles/${articleSlug}`, token)
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) notFound()
      fetchError = true
    }
  } else {
    // Search by slug — fetch articles for the category and match
    try {
      const categories = await apiGet<KbCategory[]>('/api/kb/categories', token)
      const category = categories.find((c) => c.slug === categorySlug)
      if (!category) notFound()

      const list = await apiGet<KbArticleDetail[]>(
        `/api/kb/articles?categoryId=${category.id}&published=true`,
        token,
      )

      article = list.find((a) => (a.slug ?? a.id) === articleSlug) ?? null
      if (!article) notFound()
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) notFound()
      fetchError = true
    }
  }

  if (fetchError || !article) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load this article. Please try refreshing.
      </div>
    )
  }

  const htmlContent = renderBody(article.body)

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/kb" className="hover:text-surface-foreground transition-colors">
          Knowledge Base
        </Link>
        <span aria-hidden>/</span>
        <Link
          href={`/kb/${categorySlug}`}
          className="hover:text-surface-foreground transition-colors capitalize"
        >
          {categorySlug.replace(/-/g, ' ')}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-surface-foreground font-medium line-clamp-1">{article.title}</span>
      </nav>

      {/* ── Article card ─────────────────────────────────────────────────── */}
      <article className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-5 sm:px-8">
          {article.tags.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-xl font-bold text-surface-foreground sm:text-2xl">{article.title}</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Last updated {formatLongDate(article.updatedAt)}
          </p>
        </div>

        {/* Prose body */}
        <div className="px-6 py-6 sm:px-8">
          <div
            className="prose prose-sm prose-slate max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Footer: feedback */}
        <div className="border-t border-border bg-muted px-6 py-5 sm:px-8">
          <FeedbackButtons articleId={article.id} />
        </div>
      </article>

      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link
        href={`/kb/${categorySlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-surface-foreground transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
        </svg>
        Back to {categorySlug.replace(/-/g, ' ')}
      </Link>
    </div>
  )
}
