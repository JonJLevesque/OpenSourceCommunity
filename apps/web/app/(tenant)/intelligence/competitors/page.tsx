import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { CompetitorList } from './competitors-client'
import type { CompetitorGroup } from './competitors-client'

export const metadata: Metadata = { title: 'Competitors' }

export default async function CompetitorsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let groups: CompetitorGroup[] = []
  try {
    const all = await apiGet<CompetitorGroup[]>('/api/intelligence/keyword-groups', token)
    groups = all.filter((g) => g.type === 'competitor')
  } catch {
    // show empty state
  }

  return <CompetitorList initialGroups={groups} />
}
