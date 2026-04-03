import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ForumsSettingsClient } from './forums-settings-client'

export const metadata: Metadata = { title: 'Forums Settings — Admin' }

interface CategoryRow {
  id: string
  name: string
  slug: string
  description: string | null
  visibility: 'public' | 'members' | 'restricted'
  sortOrder: number
  isArchived: boolean
  threadCount: number
  postCount: number
  createdAt: string
}

export default async function ForumsSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const categories = (await apiGet<CategoryRow[]>('/api/forums/categories', token, 0)) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Forums Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage forum categories — create, edit, reorder, and archive.
        </p>
      </div>
      <ForumsSettingsClient initialCategories={categories} />
    </div>
  )
}
