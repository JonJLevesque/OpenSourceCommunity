import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const BASE_URL = 'https://api.linkedin.com'
const LI_VERSION = '202404'

export class LinkedInConnector extends BaseSocialConnector {
  readonly platform = 'linkedin' as const

  constructor(private accessToken: string, private orgUrn?: string) {
    super()
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'LinkedIn-Version': LI_VERSION,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    }
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    // LinkedIn Posts Search API — search for posts containing each keyword set
    // Rate limit is ~100 calls/day so we batch keywords into a single query
    const query = keywords.join(' OR ')
    const count = Math.min(options.maxResults ?? 50, 50)

    const params = new URLSearchParams({
      q: 'search',
      keywords: query,
      count: count.toString(),
      sortBy: 'DATE_POSTED',
    })

    if (options.since) {
      // LinkedIn uses epoch milliseconds for time filtering
      params.set('datePostedAfter', options.since.getTime().toString())
    }

    const res = await fetch(`${BASE_URL}/rest/posts?${params}`, {
      headers: this.headers,
    })

    if (!res.ok) {
      console.error(`[linkedin] API error: ${res.status} ${await res.text()}`)
      return
    }

    const data = await res.json() as LinkedInPostsResponse

    if (!data.elements?.length) return

    for (const post of data.elements) {
      // Skip posts without text content
      const text = post.commentary ?? post.specificContent?.['com.linkedin.ugc.ShareContent']?.shareCommentary?.text ?? ''
      if (!text) continue

      // Resolve author URN to a handle — use the URN itself as fallback
      const authorUrn = post.author ?? ''
      const authorHandle = this.urnToHandle(authorUrn)
      const authorUrl = this.urnToProfileUrl(authorUrn)

      // Post URL: construct from post URN
      const postId = post.id ?? post.ugcPost ?? ''
      const contentUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`

      const publishedAt = post.publishedAt
        ? new Date(post.publishedAt)
        : post.created?.time
          ? new Date(post.created.time)
          : new Date()

      const engagement = (post.socialDetail?.totalShareStatistics?.numLikes ?? 0)
        + (post.socialDetail?.totalShareStatistics?.numComments ?? 0)
        + (post.socialDetail?.totalShareStatistics?.numShares ?? 0)

      yield {
        platform: 'linkedin',
        externalId: postId || authorUrn + ':' + publishedAt.getTime(),
        authorHandle,
        authorUrl,
        contentUrl,
        text,
        publishedAt,
        engagementCount: engagement,
        rawMetadata: { post },
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(`${BASE_URL}/rest/me`, {
        headers: this.headers,
      })
      return {
        platform: 'linkedin' as const,
        available: res.ok,
        ...(res.ok ? {} : { lastError: `HTTP ${res.status}` }),
      }
    } catch (e) {
      return { platform: 'linkedin' as const, available: false, lastError: String(e) }
    }
  }

  private urnToHandle(urn: string): string {
    // urn:li:person:ABC123 → person:ABC123
    // urn:li:organization:123 → org:123
    if (urn.includes(':person:')) return urn.split(':person:')[1] ?? urn
    if (urn.includes(':organization:')) return `org:${urn.split(':organization:')[1] ?? urn}`
    return urn
  }

  private urnToProfileUrl(urn: string): string {
    if (urn.includes(':person:')) {
      const id = urn.split(':person:')[1]
      return `https://www.linkedin.com/in/${id}`
    }
    if (urn.includes(':organization:')) {
      const id = urn.split(':organization:')[1]
      return `https://www.linkedin.com/company/${id}`
    }
    return 'https://www.linkedin.com'
  }
}

// LinkedIn API response types
interface LinkedInPostsResponse {
  elements?: LinkedInPost[]
  paging?: { count: number; start: number; total: number }
}

interface LinkedInPost {
  id?: string
  ugcPost?: string
  author?: string
  commentary?: string
  publishedAt?: number
  created?: { time: number }
  specificContent?: Record<string, {
    shareCommentary?: { text: string }
  }>
  socialDetail?: {
    totalShareStatistics?: {
      numLikes?: number
      numComments?: number
      numShares?: number
    }
  }
}
