import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const DISCORD_API_BASE = 'https://discord.com/api/v10'

// Discord has no full-text search for bots — we fetch messages from configured
// channels and filter locally for keyword matches.
export class DiscordConnector extends BaseSocialConnector {
  readonly platform = 'discord' as const

  // channelIds: comma-separated list of channel IDs to monitor
  constructor(private botToken: string, private channelIds: string[]) {
    super()
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bot ${this.botToken}`,
      'Content-Type': 'application/json',
    }
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    if (!keywords.length || !this.channelIds.length) return

    const lowerKeywords = keywords.map(k => k.toLowerCase())

    for (const channelId of this.channelIds) {
      const params = new URLSearchParams({ limit: '100' })

      if (options.since) {
        // Convert Date to Discord snowflake — Discord snowflakes embed timestamps
        // Snowflake = (unixMs - Discord epoch) << 22
        const DISCORD_EPOCH = 1420070400000n
        const snowflake = (BigInt(options.since.getTime()) - DISCORD_EPOCH) << 22n
        params.set('after', snowflake.toString())
      }

      let data: DiscordMessage[]
      try {
        const res = await fetch(
          `${DISCORD_API_BASE}/channels/${channelId}/messages?${params}`,
          { headers: this.headers }
        )

        if (!res.ok) {
          console.error(`[discord] messages error for channel ${channelId}: ${res.status} ${await res.text()}`)
          continue
        }

        data = await res.json() as DiscordMessage[]
      } catch (err) {
        console.error(`[discord] request failed for channel ${channelId}:`, err)
        continue
      }

      for (const msg of data) {
        if (!msg.content) continue

        // Local keyword match filter
        const contentLower = msg.content.toLowerCase()
        const matched = lowerKeywords.some(kw => contentLower.includes(kw))
        if (!matched) continue

        const publishedAt = new Date(msg.timestamp)
        if (options.since && publishedAt < options.since) continue

        const authorHandle = msg.author?.username
          ? (msg.author.discriminator && msg.author.discriminator !== '0'
            ? `${msg.author.username}#${msg.author.discriminator}`
            : msg.author.username)
          : 'unknown'

        yield {
          platform: 'discord',
          externalId: msg.id,
          authorHandle,
          authorUrl: `https://discord.com/users/${msg.author?.id ?? msg.id}`,
          contentUrl: `https://discord.com/channels/${msg.guild_id ?? '@me'}/${channelId}/${msg.id}`,
          text: msg.content.slice(0, 2000),
          publishedAt,
          engagementCount: Object.values(msg.reactions ?? {}).reduce(
            (sum, r) => sum + (r.count ?? 0), 0
          ),
          rawMetadata: { msg, channelId },
        }
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(`${DISCORD_API_BASE}/users/@me`, { headers: this.headers })
      return {
        platform: 'discord',
        available: res.ok,
        ...(res.ok ? {} : { lastError: `HTTP ${res.status}` }),
      }
    } catch (e) {
      return { platform: 'discord', available: false, lastError: String(e) }
    }
  }
}

// ---------------------------------------------------------------------------
// Discord API response types
// ---------------------------------------------------------------------------

interface DiscordMessage {
  id: string
  content: string
  timestamp: string
  guild_id?: string
  author?: {
    id: string
    username: string
    discriminator?: string
  }
  reactions?: Array<{ count: number; emoji: { name: string } }>
}
