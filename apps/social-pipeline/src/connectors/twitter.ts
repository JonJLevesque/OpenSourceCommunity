import { BaseSocialConnector } from './base'
import type { RawMention, FetchOptions } from '../types'

export class TwitterConnector extends BaseSocialConnector {
  readonly platform = 'twitter' as const

  constructor(private bearerToken: string) {
    super()
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    const query = this.buildSearchQuery(keywords) + ' -is:retweet lang:en'
    const sinceId = undefined  // track via last_seen_id per tenant in Redis
    const maxResults = Math.min(options.maxResults ?? 100, 100)

    // Twitter v2 Recent Search API
    const params = new URLSearchParams({
      query,
      max_results: maxResults.toString(),
      'tweet.fields': 'created_at,author_id,public_metrics,entities',
      'user.fields': 'username,name,profile_image_url',
      expansions: 'author_id',
    })

    if (options.since) {
      params.set('start_time', options.since.toISOString())
    }

    const res = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?${params}`,
      { headers: { Authorization: `Bearer ${this.bearerToken}` } }
    )

    if (!res.ok) {
      console.error(`[twitter] API error: ${res.status} ${await res.text()}`)
      return
    }

    const data = await res.json() as TwitterSearchResponse

    if (!data.data?.length) return

    const usersById = new Map(
      (data.includes?.users ?? []).map(u => [u.id, u])
    )

    for (const tweet of data.data) {
      const author = usersById.get(tweet.author_id)
      yield {
        platform: 'twitter',
        externalId: tweet.id,
        authorHandle: author?.username ?? tweet.author_id,
        authorUrl: `https://twitter.com/${author?.username ?? tweet.author_id}`,
        contentUrl: `https://twitter.com/i/web/status/${tweet.id}`,
        text: tweet.text,
        publishedAt: new Date(tweet.created_at),
        engagementCount: this.extractEngagement(tweet.public_metrics ?? {}),
        rawMetadata: { tweet, author },
      }
    }
  }

  override async healthCheck() {
    try {
      const res = await fetch('https://api.twitter.com/2/tweets/search/recent?query=test&max_results=10', {
        headers: { Authorization: `Bearer ${this.bearerToken}` },
      })
      const remaining = parseInt(res.headers.get('x-rate-limit-remaining') ?? '0')
      const reset = parseInt(res.headers.get('x-rate-limit-reset') ?? '0')
      return {
        platform: 'twitter' as const,
        available: res.ok || res.status === 429,
        rateLimitRemaining: remaining,
        rateLimitResetAt: new Date(reset * 1000),
      }
    } catch (e) {
      return { platform: 'twitter' as const, available: false, lastError: String(e) }
    }
  }
}

// Twitter API v2 response types
interface TwitterSearchResponse {
  data?: Array<{
    id: string
    text: string
    author_id: string
    created_at: string
    public_metrics?: Record<string, number>
    entities?: Record<string, unknown>
  }>
  includes?: {
    users?: Array<{ id: string; username: string; name: string }>
  }
  meta?: { result_count: number; newest_id?: string; oldest_id?: string }
}
