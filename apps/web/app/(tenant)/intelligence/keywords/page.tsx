import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import { KeywordGroupList } from './keyword-groups-client'
import type { Metadata } from 'next'
import type { KeywordGroup } from './keyword-groups-client'

export const metadata: Metadata = { title: 'Keyword Groups' }

export default async function KeywordsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let groups: KeywordGroup[] = []

  try {
    const res = await apiGet<{ data: KeywordGroup[] }>('/api/intelligence/keyword-groups', token, 0)
    groups = res.data
  } catch {
    // Start with empty list
  }

  return <KeywordGroupList initialGroups={groups} />
}
