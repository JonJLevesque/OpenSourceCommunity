import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ChatSettingsClient } from './chat-settings-client'

export const metadata: Metadata = { title: 'Chat Settings — Admin' }

interface ChatChannel {
  id: string
  name: string
  slug: string
  description: string | null
  isPrivate: boolean
  createdAt: string
}

export default async function ChatSettingsPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  const channels = (await apiGet<ChatChannel[]>('/api/chat/channels', token, 0)) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-surface-foreground">Chat Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage real-time chat channels for your community.
        </p>
      </div>
      <ChatSettingsClient initialChannels={channels} />
    </div>
  )
}
