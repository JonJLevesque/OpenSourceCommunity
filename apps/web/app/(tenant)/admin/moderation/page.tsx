import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ModerationActions } from './moderation-actions'

export const metadata: Metadata = { title: 'Moderation Queue' }

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'pending' | 'reviewing' | 'removed' | 'dismissed'

interface ContentReport {
  id: string
  contentType: string
  contentId: string
  contentPreview: string | null
  contentAuthorName: string | null
  reason: string
  notes: string | null
  status: ReportStatus
  aiFlag: string | null
  aiReasoning: string | null
  createdAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  spam: 'Spam',
  harassment: 'Harassment',
  hate_speech: 'Hate speech',
  misinformation: 'Misinformation',
  off_topic: 'Off topic',
  other: 'Other',
}

const TYPE_BADGE: Record<string, string> = {
  thread: 'bg-blue-50 text-blue-700',
  post: 'bg-muted text-muted-foreground',
  idea: 'bg-violet-50 text-violet-700',
  comment: 'bg-amber-50 text-amber-700',
  chat_message: 'bg-emerald-50 text-emerald-700',
}

const AI_FLAG_CONFIG: Record<string, { label: string; badge: string }> = {
  unsafe: { label: 'AI: Unsafe', badge: 'bg-red-50 text-red-700 border border-red-200' },
  uncertain: { label: 'AI: Uncertain', badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  safe: { label: 'AI: Safe', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function ModerationPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let isAdmin = false
  try {
    const profile = await apiGet<{ role: string }>('/api/me', token, 60)
    isAdmin = profile.role === 'org_admin' || profile.role === 'moderator'
  } catch {}
  if (!isAdmin) redirect('/home')

  const { status = 'pending' } = await searchParams
  const validStatus = ['pending', 'reviewing', 'removed', 'dismissed'].includes(status) ? status : 'pending'

  let reports: ContentReport[] = []
  try {
    reports = await apiGet<ContentReport[]>(`/api/admin/reports?status=${validStatus}&limit=50`, token, 0)
  } catch {}

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Moderation Queue</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review flagged content reported by community members</p>
        </div>
        <Link href="/admin" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
          ← Back to Admin
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1.5 w-fit">
        {(['pending', 'reviewing', 'removed', 'dismissed'] as const).map((s) => (
          <Link
            key={s}
            href={`/admin/moderation?status=${s}`}
            className={[
              'rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              validStatus === s
                ? 'bg-brand text-white'
                : 'text-muted-foreground hover:bg-muted',
            ].join(' ')}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Queue */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-2xl">✅</div>
          <p className="text-sm font-medium text-muted-foreground">
            {validStatus === 'pending' ? 'Queue is clear' : `No ${validStatus} items`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {validStatus === 'pending'
              ? 'No content currently awaiting review.'
              : `${validStatus.charAt(0).toUpperCase() + validStatus.slice(1)} reports will appear here.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const typeBadge = TYPE_BADGE[report.contentType] ?? 'bg-muted text-muted-foreground'
            const aiFlagCfg = report.aiFlag ? AI_FLAG_CONFIG[report.aiFlag] : null
            return (
              <div key={report.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Badges row */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', typeBadge].join(' ')}>
                        {report.contentType.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {REASON_LABELS[report.reason] ?? report.reason}
                      </span>
                      {aiFlagCfg && (
                        <span className={['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', aiFlagCfg.badge].join(' ')}>
                          {aiFlagCfg.label}
                        </span>
                      )}
                    </div>

                    {/* Content preview */}
                    {report.contentPreview && (
                      <p className="text-sm text-surface-foreground line-clamp-2 mb-1">
                        &ldquo;{report.contentPreview}&rdquo;
                      </p>
                    )}

                    {/* Meta */}
                    <p className="text-xs text-muted-foreground">
                      {report.contentAuthorName && <>By {report.contentAuthorName} · </>}
                      Reported {timeAgo(report.createdAt)}
                    </p>
                    {report.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">
                        Reporter note: &ldquo;{report.notes}&rdquo;
                      </p>
                    )}
                    {report.aiReasoning && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        AI: {report.aiReasoning}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {validStatus === 'pending' && (
                    <ModerationActions reportId={report.id} token={token ?? ''} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Guidelines */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-3 text-sm font-semibold text-surface-foreground">Moderation guidelines</h2>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {[
            'Review flagged content within 24 hours to maintain community trust.',
            'Remove content that violates community guidelines: spam, harassment, or off-topic promotion.',
            'Dismiss false reports — consider reaching out to the reporter.',
            'Repeat violations may warrant role changes in the Members admin page.',
            'AI flags are advisory only — always apply human judgement before removing content.',
          ].map((g) => (
            <li key={g} className="flex items-start gap-2">
              <span className="mt-0.5">•</span>
              {g}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
