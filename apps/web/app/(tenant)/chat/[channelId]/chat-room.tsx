'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { apiClientGet, apiClientPost, apiClientPatch, apiClientDelete } from '@/lib/api-client'

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

interface PresenceState {
  userId: string
  name: string
  onlineAt: string
}

interface ChatRoomProps {
  channel: Channel
  initialMessages: Message[]
  token: string
  currentUserId: string
  currentUserName?: string
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(d)
}

function Avatar({ name, avatarUrl, size = 8 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  const cls = `h-${size} w-${size} flex-shrink-0 rounded-full`
  if (avatarUrl) {
    return <img src={avatarUrl} alt={name} className={`${cls} object-cover`} />
  }
  return (
    <div className={`${cls} flex items-center justify-center bg-brand/10 text-xs font-semibold text-brand`}>
      {initials}
    </div>
  )
}

export function ChatRoom({ channel, initialMessages, token: _token, currentUserId, currentUserName = 'You' }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [onlineCount, setOnlineCount] = useState(1)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase Realtime: postgres_changes for messages + Presence for typing/online
  useEffect(() => {
    // ── Message subscription ───────────────────────────────────────────────────
    const msgChannel = supabase
      .channel(`chat:${channel.id}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as {
            id: string
            channel_id: string
            author_id: string
            body: string
            created_at: string
            edited_at: string | null
          }
          // Don't double-add messages we sent ourselves (we optimistically rendered them)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            // Fetch with author info
            apiClientGet<Message[]>(`/api/chat/channels/${channel.id}/messages?limit=1`)
              .then((msgs) => {
                const latest = msgs.at(-1)
                if (latest && latest.id === newMsg.id) {
                  setMessages((p) => p.some((m) => m.id === latest.id) ? p : [...p, latest])
                }
              })
              .catch(() => {
                // Fallback: add without author info
                setMessages((p) =>
                  p.some((m) => m.id === newMsg.id)
                    ? p
                    : [...p, { id: newMsg.id, channelId: newMsg.channel_id, body: newMsg.body, createdAt: newMsg.created_at, editedAt: newMsg.edited_at, authorId: newMsg.author_id, authorName: 'Member', authorAvatarUrl: null }]
                )
              })
            return prev
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const upd = payload.new as { id: string; body: string; edited_at: string | null }
          setMessages((prev) =>
            prev.map((m) => m.id === upd.id ? { ...m, body: upd.body, editedAt: upd.edited_at } : m)
          )
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channel.id}`,
        },
        (payload) => {
          const del = payload.old as { id: string }
          setMessages((prev) => prev.filter((m) => m.id !== del.id))
        },
      )
      .subscribe()

    // ── Presence channel ───────────────────────────────────────────────────────
    const presenceChannel = supabase.channel(`chat:${channel.id}:presence`, {
      config: { presence: { key: currentUserId } },
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceState>()
        const online = Object.values(state).flat()
        setOnlineCount(online.length)
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: { payload: { userId: string; name: string; isTyping: boolean } }) => {
        if (payload.userId === currentUserId) return
        setTypingUsers((prev) => {
          if (payload.isTyping) {
            return prev.includes(payload.name) ? prev : [...prev, payload.name]
          }
          return prev.filter((n) => n !== payload.name)
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUserId,
            name: currentUserName,
            onlineAt: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, currentUserId, currentUserName])

  // Broadcast typing indicator
  const broadcastTyping = useCallback(
    (isTyping: boolean) => {
      supabase.channel(`chat:${channel.id}:presence`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUserId, name: currentUserName, isTyping },
      })
    },
    [supabase, channel.id, currentUserId, currentUserName],
  )

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    if (e.target.value.trim()) {
      broadcastTyping(true)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000)
    } else {
      broadcastTyping(false)
    }
  }

  const sendMessage = useCallback(async () => {
    const body = input.trim()
    if (!body || sending) return

    setSending(true)
    setInput('')
    broadcastTyping(false)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    try {
      await apiClientPost(`/api/chat/channels/${channel.id}/messages`, { body })
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }, [input, sending, channel.id, broadcastTyping])

  async function handleEdit(msgId: string) {
    const body = editBody.trim()
    if (!body) return
    try {
      await apiClientPatch(`/api/chat/channels/${channel.id}/messages/${msgId}`, { body })
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, body, editedAt: new Date().toISOString() } : m))
      setEditingId(null)
      setEditBody('')
    } catch {
      // silent — optimistic edit failed
    }
  }

  async function handleDelete(msgId: string) {
    try {
      await apiClientDelete(`/api/chat/channels/${channel.id}/messages/${msgId}`)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
    } catch {
      // silent
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.createdAt)
    const last = grouped.at(-1)
    if (!last || last.date !== date) {
      grouped.push({ date, msgs: [msg] })
    } else {
      last.msgs.push(msg)
    }
  }

  // Typing indicator text
  const typingText =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing…`
      : typingUsers.length === 2
      ? `${typingUsers[0]} and ${typingUsers[1]} are typing…`
      : typingUsers.length > 2
      ? 'Several people are typing…'
      : null

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-xl border border-border bg-card overflow-hidden">
      {/* Channel header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-3">
        <Link href="/chat" className="text-muted-foreground hover:text-muted-foreground transition-colors">
          <BackIcon />
        </Link>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand font-bold">
          #
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-foreground">{channel.name}</p>
          {channel.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[300px]">{channel.description}</p>
          )}
        </div>
        {/* Online count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {onlineCount} online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-3 text-4xl">💬</div>
            <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Be the first to say something!</p>
          </div>
        )}

        {grouped.map((group) => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs font-medium text-muted-foreground px-2">{group.date}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <div className="space-y-0.5">
              {group.msgs.map((msg, idx) => {
                const prevMsg = idx > 0 ? group.msgs[idx - 1] : null
                const isSameAuthor = prevMsg?.authorId === msg.authorId
                const isOwnMessage = msg.authorId === currentUserId
                const isEditing = editingId === msg.id
                const isHovered = hoveredId === msg.id

                return (
                  <div
                    key={msg.id}
                    className={['group relative flex items-start gap-3 rounded-lg px-2 py-1 hover:bg-muted/50 transition-colors', isSameAuthor ? 'mt-0' : 'mt-3'].join(' ')}
                    onMouseEnter={() => setHoveredId(msg.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {/* Avatar or spacer */}
                    {!isSameAuthor ? (
                      <Avatar name={msg.authorName} avatarUrl={msg.authorAvatarUrl} size={8} />
                    ) : (
                      <div className="w-8 flex-shrink-0">
                        {isHovered && (
                          <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground/60">
                            {formatTime(msg.createdAt)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      {!isSameAuthor && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-surface-foreground">{msg.authorName}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}

                      {isEditing ? (
                        <div className="mt-1">
                          <textarea
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(msg.id) }
                              if (e.key === 'Escape') { setEditingId(null); setEditBody('') }
                            }}
                            autoFocus
                            rows={2}
                            className="w-full rounded-lg border border-brand/30 bg-card px-3 py-2 text-sm text-surface-foreground outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                          <div className="mt-1.5 flex gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => handleEdit(msg.id)}
                              className="font-medium text-brand hover:underline"
                            >
                              Save
                            </button>
                            <span className="text-muted-foreground">·</span>
                            <button
                              type="button"
                              onClick={() => { setEditingId(null); setEditBody('') }}
                              className="text-muted-foreground hover:text-surface-foreground"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-surface-foreground whitespace-pre-wrap break-words">
                          {msg.body}
                          {msg.editedAt && (
                            <span className="ml-1 text-[10px] text-muted-foreground/60">(edited)</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Message actions — show on hover */}
                    {isHovered && !isEditing && (
                      <div className="absolute right-2 top-1 flex items-center gap-1 rounded-lg border border-border bg-card shadow-sm px-1">
                        {isOwnMessage && (
                          <button
                            type="button"
                            title="Edit message"
                            onClick={() => { setEditingId(msg.id); setEditBody(msg.body) }}
                            className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-surface-foreground transition-colors"
                          >
                            <EditIcon />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete message"
                          onClick={() => handleDelete(msg.id)}
                          className="flex h-7 w-7 items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      <div className="h-5 px-5">
        {typingText && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TypingDots />
            {typingText}
          </p>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-end gap-3 rounded-xl border border-border bg-muted px-4 py-2 focus-within:border-brand/30 focus-within:bg-card transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channel.name}`}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-surface-foreground placeholder:text-muted-foreground outline-none max-h-32"
            style={{ lineHeight: '1.5rem' }}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <line strokeLinecap="round" strokeLinejoin="round" x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <polyline strokeLinecap="round" strokeLinejoin="round" points="3 6 5 6 21 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

function TypingDots() {
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '1s' }}
        />
      ))}
    </span>
  )
}
