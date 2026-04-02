import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

// G2 Partner API — requires approved partner access at data.g2.com
// Apply at: https://sell.g2.com/partners/technology/api
const G2_API_BASE = 'https://data.g2.com/api/v1'

export class G2Connector extends BaseSocialConnector {
  readonly platform = 'g2' as const

  // productSlug: your product's G2 slug (e.g. "my-product") — reviews are scoped per product
  constructor(private apiKey: string, private productSlug?: string) {
    super()
  }

  private get headers(): HeadersInit {
    return {
      'PRIVATE-TOKEN': this.apiKey,
      'Content-Type': 'application/json',
    }
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    const params = new URLSearchParams({
      'page[size]': String(Math.min(options.maxResults ?? 50, 100)),
      'filter[published]': 'true',
      'sort': '-created_at',
    })

    if (this.productSlug) {
      params.set('filter[product_slug]', this.productSlug)
    }

    if (options.since) {
      params.set('filter[min_created_date]', options.since.toISOString().slice(0, 10))
    }

    let data: G2ReviewsResponse
    try {
      const res = await fetch(`${G2_API_BASE}/reviews?${params}`, { headers: this.headers })
      if (!res.ok) {
        console.error(`[g2] API error: ${res.status} ${await res.text()}`)
        return
      }
      data = await res.json() as G2ReviewsResponse
    } catch (err) {
      console.error('[g2] request failed:', err)
      return
    }

    const lowerKeywords = keywords.map(k => k.toLowerCase())

    for (const review of data.data ?? []) {
      const attrs = review.attributes
      if (!attrs) continue

      const text = [attrs.title, attrs.comment?.pros, attrs.comment?.cons, attrs.comment?.overall]
        .filter(Boolean).join(' ')

      // Skip reviews that don't mention any tracked keyword
      const textLower = text.toLowerCase()
      if (lowerKeywords.length && !lowerKeywords.some(kw => textLower.includes(kw))) continue

      const publishedAt = new Date(attrs.created_at)
      if (options.since && publishedAt < options.since) continue

      const reviewUrl = attrs.url ?? `https://www.g2.com/products/${this.productSlug ?? 'unknown'}/reviews/${review.id}`

      yield {
        platform: 'g2',
        externalId: review.id,
        authorHandle: attrs.reviewer?.display_name ?? 'Anonymous',
        authorUrl: `https://www.g2.com/users/${attrs.reviewer?.id ?? review.id}`,
        contentUrl: reviewUrl,
        text: text.slice(0, 2000),
        publishedAt,
        engagementCount: attrs.helpful_count ?? 0,
        rawMetadata: { review },
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(`${G2_API_BASE}/reviews?page[size]=1`, { headers: this.headers })
      return {
        platform: 'g2',
        available: res.ok,
        ...(res.ok ? {} : { lastError: `HTTP ${res.status}` }),
      }
    } catch (e) {
      return { platform: 'g2', available: false, lastError: String(e) }
    }
  }
}

// ---------------------------------------------------------------------------
// G2 Partner API response types
// ---------------------------------------------------------------------------

interface G2ReviewsResponse {
  data?: Array<{
    id: string
    type?: string
    attributes?: {
      title?: string
      url?: string
      created_at: string
      star_rating?: number
      helpful_count?: number
      comment?: {
        pros?: string
        cons?: string
        overall?: string
      }
      reviewer?: {
        id?: string
        display_name?: string
      }
    }
  }>
  meta?: { total_count: number; total_pages: number }
}
