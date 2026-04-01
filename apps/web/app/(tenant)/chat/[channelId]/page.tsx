import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { apiGet } from '@/lib/api'
import type { Metadata } from 'next'
import { ChatRoom } from './chat-room'

export const metadata: Metadata = { title: 'Chat' }

interface Channel {
  id: string
  name: string
  description: string | null
}

interface Message {
  id: string
  channelId: string
  body: string
  createdAt: string | null
  editedAt: string | null
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
}

export default async function ChatChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const { channelId } = await params
  const supabase = await createClient()
  const session = await supabase.auth.getSession()
  const token = session.data.session?.access_token
  const userId = session.data.session?.user?.id
  const userName = session.data.session?.user?.user_metadata?.full_name as string | undefined

  let channel: Channel | null = null
  let initialMessages: Message[] = []

  try {
    channel = await apiGet<Channel>(`/api/chat/channels/${channelId}`, token)
    initialMessages = await apiGet<Message[]>(`/api/chat/channels/${channelId}/messages?limit=50`, token)
  } catch {
    notFound()
  }

  if (!channel) notFound()

  return (
    <ChatRoom
      channel={channel}
      initialMessages={initialMessages}
      token={token ?? ''}
      currentUserId={userId ?? ''}
      {...(userName !== undefined ? { currentUserName: userName } : {})}
    />
  )
}
