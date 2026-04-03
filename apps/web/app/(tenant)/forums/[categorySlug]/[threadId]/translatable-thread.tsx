'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { TranslateButton } from '@/components/ui/translate-button'

interface Post {
  id: string
  authorName: string
  authorAvatarUrl: string | null
  authorRole: string
  bodyHtml: string
  bodyText: string
  isAnswer: boolean
  createdAt: string
}

interface TranslatableThreadProps {
  posts: Post[]
  targetLang: string
}

export function TranslatableThread({ posts, targetLang }: TranslatableThreadProps) {
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const isTranslated = Object.keys(translations).length > 0

  const translateItems = posts
    .filter((p) => p.bodyText.trim())
    .map((p) => ({ id: p.id, text: p.bodyText }))

  return (
    <div className="space-y-4">
      {/* Translation controls */}
      {translateItems.length > 0 && (
        <div className="flex justify-end">
          <TranslateButton
            items={translateItems}
            targetLang={targetLang}
            onTranslated={setTranslations}
            onReset={() => setTranslations({})}
            isTranslated={isTranslated}
          />
        </div>
      )}

      {posts.map((post) => (
        <article
          key={post.id}
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
            <Avatar src={post.authorAvatarUrl} name={post.authorName} size="sm" />
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

          {/* Body: translated plain text OR original HTML */}
          {translations[post.id] != null ? (
            <div className="prose prose-sm max-w-none prose-p:text-surface-foreground">
              {(translations[post.id] ?? '').split('\n').filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : post.bodyHtml ? (
            <div
              className="prose prose-sm max-w-none prose-headings:text-surface-foreground prose-p:text-surface-foreground prose-strong:text-surface-foreground prose-code:text-brand prose-a:text-brand"
              dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
            />
          ) : null}
        </article>
      ))}
    </div>
  )
}
