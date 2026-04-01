import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Pin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ThreadActions } from './thread-actions'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreadObj {
  id: string
  title: string
  categorySlug: string
  categoryName: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  isAnswered: boolean
  isPinned: boolean
  viewCount: number
  acceptedAnswerId: string | null
  createdAt: string
}

interface PostObj {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  authorRole: string
  body: Record<string, unknown> | string
  isAnswer: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

interface ThreadDetailResponse {
  thread: ThreadObj
  posts: PostObj[]
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>
}): Promise<Metadata> {
  const { threadId } = await params
  try {
    const supabase = await createClient()
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const detail = await apiGet<ThreadDetailResponse>(`/api/forums/threads/${threadId}`, token)
    return { title: detail.thread.title }
  } catch {
    return { title: 'Thread' }
  }
}

// ─── Body renderer ────────────────────────────────────────────────────────────

function renderNode(node: Record<string, unknown>): string {
  const type = node.type as string
  const content = (node.content as Record<string, unknown>[] | undefined) ?? []
  const children = content.map((child) => renderNode(child)).join('')

  switch (type) {
    case 'doc': return children
    case 'paragraph': return `<p>${children || '<br>'}</p>`
    case 'heading': {
      const level = (node.attrs as Record<string, number> | undefined)?.level ?? 2
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList': return `<ul>${children}</ul>`
    case 'orderedList': return `<ol>${children}</ol>`
    case 'listItem': return `<li>${children}</li>`
    case 'blockquote': return `<blockquote>${children}</blockquote>`
    case 'codeBlock': return `<pre><code>${children}</code></pre>`
    case 'text': {
      let text = (node.text as string | undefined) ?? ''
      const marks = (node.marks as Array<{ type: string }> | undefined) ?? []
      for (const mark of marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'underline') text = `<u>${text}</u>`
        if (mark.type === 'strike') text = `<s>${text}</s>`
        if (mark.type === 'code') text = `<code>${text}</code>`
      }
      return text
    }
    default: return children
  }
}

function renderBody(body: Record<string, unknown> | string): string {
  try {
    if (typeof body === 'string') return body
    return renderNode(body)
  } catch {
    return ''
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ categorySlug: string; threadId: string }>
}) {
  const { categorySlug, threadId } = await params

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let detail: ThreadDetailResponse | null = null
  try {
    detail = await apiGet<ThreadDetailResponse>(`/api/forums/threads/${threadId}`, token)
  } catch {
    notFound()
  }
  if (!detail) notFound()

  const { thread, posts } = detail
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/forums" className="hover:text-surface-foreground transition-colors">Forums</Link>
        <span className="text-border">/</span>
        <Link href={`/forums/${categorySlug}`} className="hover:text-surface-foreground transition-colors">
          {thread.categoryName}
        </Link>
        <span className="text-border">/</span>
        <span className="truncate max-w-[200px] text-surface-foreground font-medium">
          {thread.title}
        </span>
      </nav>

      {/* Thread header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-2">
              {thread.isPinned && (
                <Badge variant="secondary">
                  <Pin className="h-3 w-3 mr-1" />Pinned
                </Badge>
              )}
              {thread.isAnswered && (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Answered
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold text-surface-foreground">{thread.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {thread.authorName} &middot;{' '}
              {new Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(thread.createdAt))}{' '}
              &middot; {thread.viewCount.toLocaleString()} views
            </p>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} isFirst={index === 0} />
        ))}
      </div>

      {/* Reply form */}
      <ThreadActions
        threadId={thread.id}
        categorySlug={categorySlug}
        token={token ?? ''}
      />
    </div>
  )
}

// ─── Post card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  isFirst: _isFirst,
}: {
  post: PostObj
  isFirst: boolean
}) {
  const bodyHtml = renderBody(post.body)

  return (
    <article
      className={[
        'rounded-xl border bg-card p-6',
        post.isAnswer
          ? 'border-emerald-300 ring-1 ring-emerald-200/60'
          : 'border-border',
      ].join(' ')}
    >
      {post.isAnswer && (
        <div className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Accepted answer
        </div>
      )}

      {/* Author row */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar
          src={post.authorAvatarUrl}
          name={post.authorName}
          size="sm"
        />
        <div>
          <p className="text-sm font-semibold text-surface-foreground">{post.authorName}</p>
          {post.authorRole !== 'member' && post.authorRole !== 'guest' && (
            <span className="text-xs text-brand capitalize">{post.authorRole.replace('_', ' ')}</span>
          )}
        </div>
        <time className="ml-auto text-xs text-muted-foreground">
          {new Intl.DateTimeFormat('en', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(post.createdAt))}
        </time>
      </div>

      {/* Body */}
      {bodyHtml && (
        <div
          className="prose prose-sm max-w-none prose-headings:text-surface-foreground prose-p:text-surface-foreground prose-strong:text-surface-foreground prose-code:text-brand prose-a:text-brand"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}
    </article>
  )
}
