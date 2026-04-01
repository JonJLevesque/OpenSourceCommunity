import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { IdeaVoteButton } from './idea-vote-button'
import { CommentForm } from './comment-form'
import { STATUS_CONFIG } from '../ideas-config'
import type { IdeaStatus } from '../ideas-config'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IdeaObj {
  id: string
  title: string
  body: Record<string, unknown> | string
  status: IdeaStatus
  voteCount: number
  category: string | null
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  createdAt: string
}

interface IdeaComment {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  body: Record<string, unknown> | string
  isOfficial: boolean
  createdAt: string
}

interface StatusHistoryEntry {
  id: string
  status: IdeaStatus
  note: string
  createdAt: string
}

interface IdeaDetailResponse {
  idea: IdeaObj
  comments: IdeaComment[]
  statusHistory: StatusHistoryEntry[]
  hasVoted: boolean
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ideaId: string }>
}): Promise<Metadata> {
  const { ideaId } = await params
  try {
    const supabase = await createClient()
    const token = (await supabase.auth.getSession()).data.session?.access_token
    const detail = await apiGet<IdeaDetailResponse>(`/api/ideas/${ideaId}`, token)
    return { title: detail.idea.title }
  } catch {
    return { title: 'Idea' }
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

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ ideaId: string }>
}) {
  const { ideaId } = await params

  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let detail: IdeaDetailResponse | null = null
  try {
    detail = await apiGet<IdeaDetailResponse>(`/api/ideas/${ideaId}`, token)
  } catch {
    notFound()
  }
  if (!detail) notFound()

  const { idea, comments, statusHistory, hasVoted } = detail
  const statusConfig = STATUS_CONFIG[idea.status] ?? STATUS_CONFIG.new
  const bodyHtml = renderBody(idea.body)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/ideas" className="hover:text-surface-foreground transition-colors">Ideas</Link>
        <span className="text-border">/</span>
        <span className="truncate max-w-[200px] text-surface-foreground font-medium">
          {idea.title}
        </span>
      </nav>

      {/* Main card */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
              statusConfig.className,
            ].join(' ')}
          >
            {statusConfig.label}
          </span>
          {idea.category && (
            <Badge variant="secondary">{idea.category}</Badge>
          )}
        </div>

        <h1 className="text-xl font-bold text-surface-foreground">{idea.title}</h1>

        <p className="text-xs text-muted-foreground">
          Submitted by{' '}
          <span className="font-medium text-surface-foreground">{idea.authorName}</span>{' '}
          &middot;{' '}
          {new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(idea.createdAt))}
        </p>

        {bodyHtml && (
          <div
            className="prose prose-sm max-w-none prose-headings:text-surface-foreground prose-p:text-surface-foreground prose-strong:text-surface-foreground prose-code:text-brand prose-a:text-brand"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}

        <div className="pt-2">
          <IdeaVoteButton
            ideaId={idea.id}
            voteCount={idea.voteCount}
            hasVoted={hasVoted}
            token={token ?? ''}
          />
        </div>
      </div>

      {/* Status timeline */}
      {statusHistory.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-surface-foreground">
            Status history
          </h2>
          <div className="relative ml-3 space-y-4 border-l-2 border-border pl-6">
            {statusHistory.map((entry) => {
              const sc = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.new
              return (
                <div key={entry.id} className="relative">
                  <div className="absolute -left-[calc(1.5rem+1px)] top-1 h-3 w-3 rounded-full border-2 border-card bg-muted-foreground" />
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                        sc.className,
                      ].join(' ')}
                    >
                      {sc.label}
                    </span>
                    <time className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
                        new Date(entry.createdAt),
                      )}
                    </time>
                  </div>
                  {entry.note && (
                    <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Comments */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-surface-foreground">
          Comments ({comments.length})
        </h2>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} />
            ))}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="mb-3 text-sm font-semibold text-surface-foreground">Leave a comment</h3>
          <CommentForm ideaId={idea.id} token={token ?? ''} />
        </div>
      </section>
    </div>
  )
}

// ─── Comment card ─────────────────────────────────────────────────────────────

function CommentCard({ comment }: { comment: IdeaComment }) {
  const bodyHtml = renderBody(comment.body)

  return (
    <div
      className={[
        'rounded-xl border p-5',
        comment.isOfficial
          ? 'border-brand/30 bg-brand/5'
          : 'border-border bg-card',
      ].join(' ')}
    >
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          src={comment.authorAvatarUrl}
          name={comment.authorName}
          size="sm"
        />
        <div>
          <p className="text-sm font-semibold text-surface-foreground">
            {comment.authorName}
            {comment.isOfficial && (
              <span className="ml-2 inline-flex items-center rounded-full bg-brand/10 px-1.5 py-0.5 text-xs font-medium text-brand">
                Team
              </span>
            )}
          </p>
          <time className="text-xs text-muted-foreground">
            {new Intl.DateTimeFormat('en', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(new Date(comment.createdAt))}
          </time>
        </div>
      </div>
      {bodyHtml && (
        <div
          className="prose prose-sm max-w-none prose-headings:text-surface-foreground prose-p:text-surface-foreground prose-strong:text-surface-foreground prose-code:text-brand prose-a:text-brand"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}
    </div>
  )
}
