import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const PH_API_BASE = 'https://api.producthunt.com/v2/api/graphql'

export class ProductHuntConnector extends BaseSocialConnector {
  readonly platform = 'producthunt' as const

  constructor(private apiKey: string) {
    super()
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    if (!keywords.length) return

    const first = Math.min(options.maxResults ?? 20, 20)

    // Product Hunt GraphQL API — fetch recent posts and filter by keyword
    const query = `
      query($first: Int!, $postedAfter: DateTime) {
        posts(first: $first, order: NEWEST, postedAfter: $postedAfter) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              commentsCount
              createdAt
              user {
                username
                profileUrl
              }
            }
          }
        }
      }
    `

    let data: PHPostsResponse
    try {
      const res = await fetch(PH_API_BASE, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          query,
          variables: {
            first,
            ...(options.since ? { postedAfter: options.since.toISOString() } : {}),
          },
        }),
      })

      if (!res.ok) {
        console.error(`[producthunt] API error: ${res.status} ${await res.text()}`)
        return
      }

      data = await res.json() as PHPostsResponse
    } catch (err) {
      console.error('[producthunt] request failed:', err)
      return
    }

    const lowerKeywords = keywords.map(k => k.toLowerCase())

    for (const edge of data.data?.posts?.edges ?? []) {
      const post = edge.node
      if (!post) continue

      const text = [post.name, post.tagline, post.description].filter(Boolean).join(' ')
      const textLower = text.toLowerCase()

      if (!lowerKeywords.some(kw => textLower.includes(kw))) continue

      const publishedAt = new Date(post.createdAt)
      if (options.since && publishedAt < options.since) continue

      yield {
        platform: 'producthunt',
        externalId: post.id,
        authorHandle: post.user?.username ?? 'unknown',
        authorUrl: post.user?.profileUrl ?? `https://www.producthunt.com/@${post.user?.username ?? 'unknown'}`,
        contentUrl: post.url,
        text: text.slice(0, 2000),
        publishedAt,
        engagementCount: (post.votesCount ?? 0) + (post.commentsCount ?? 0),
        rawMetadata: { post },
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(PH_API_BASE, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ query: '{ viewer { user { id } } }' }),
      })
      return {
        platform: 'producthunt',
        available: res.ok,
        ...(res.ok ? {} : { lastError: `HTTP ${res.status}` }),
      }
    } catch (e) {
      return { platform: 'producthunt', available: false, lastError: String(e) }
    }
  }
}

// ---------------------------------------------------------------------------
// Product Hunt API response types
// ---------------------------------------------------------------------------

interface PHPostsResponse {
  data?: {
    posts?: {
      edges?: Array<{
        node?: {
          id: string
          name: string
          tagline?: string
          description?: string
          url: string
          votesCount?: number
          commentsCount?: number
          createdAt: string
          user?: {
            username: string
            profileUrl: string
          }
        }
      }>
    }
  }
}
