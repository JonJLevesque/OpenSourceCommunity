import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Chat' }

interface Channel {
  id: string
  name: string
  slug: string
  description: string | null
  isPrivate: boolean | null
  createdAt: string | null
}

export default async function ChatPage() {
  const supabase = await createClient()
  const token = (await supabase.auth.getSession()).data.session?.access_token

  let channels: Channel[] = []
  try {
    channels = await apiGet<Channel[]>('/api/chat/channels', token, 0)
  } catch { /* show empty */ }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-foreground">Chat</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real-time conversations with your community</p>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">No channels yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/chat/${ch.id}`}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-sm hover:border-border transition-all"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-bold text-lg">
                #
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-surface-foreground">{ch.name}</p>
                {ch.description && (
                  <p className="text-sm text-muted-foreground truncate">{ch.description}</p>
                )}
              </div>
              {ch.isPrivate && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Private</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
