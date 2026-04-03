import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import Link from 'next/link'
import { KbSettingsClient } from './kb-settings-client'

export const metadata: Metadata = { title: 'Knowledge Base Settings — Admin' }

interface KbCategory {
  id: string
  name: string
  slug: string
  parentId: string | null
  sortOrder: number
  createdAt: string
}

interface KbArticle {
  id: string
  title: string
  categoryId: string | null
  isPublished: boolean
  visibility: 'public' | 'members' | 'restricted'
  viewCount: number
  updatedAt: string
}

export default async function KbSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const [categories, articles] = await Promise.all([
    apiGet<KbCategory[]>('/api/kb/categories', token, 0).then((r) => r ?? []),
    apiGet<KbArticle[]>('/api/kb/articles?limit=50', token, 0).then((r) => r ?? []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Knowledge Base Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage KB categories and articles.
        </p>
      </div>

      <KbSettingsClient initialCategories={categories} />

      {/* Articles overview */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-foreground">Articles</h3>
          <Link href="/kb" className="text-xs font-medium text-brand hover:underline">
            View all →
          </Link>
        </div>
        {articles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card px-8 py-10 text-center">
            <p className="text-sm text-muted-foreground">No articles yet.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Article</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:table-cell">Status</th>
                  <th className="hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:table-cell">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {articles.slice(0, 20).map((article) => (
                  <tr key={article.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/kb/${article.id}`} className="font-medium text-surface-foreground hover:text-brand transition-colors">
                        {article.title}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        article.isPublished
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {article.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 text-right text-muted-foreground lg:table-cell">
                      {article.viewCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
