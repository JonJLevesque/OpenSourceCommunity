import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const TP_API_BASE = 'https://api.trustpilot.com/v1'

export class TrustpilotConnector extends BaseSocialConnector {
  readonly platform = 'trustpilot' as const

  // businessUnitId: Trustpilot business unit ID (find at businessapp.trustpilot.com)
  constructor(private apiKey: string, private businessUnitId: string) {
    super()
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    const perPage = Math.min(options.maxResults ?? 100, 100)
    const params = new URLSearchParams({
      apikey: this.apiKey,
      perPage: perPage.toString(),
      orderBy: 'createdat.desc',
    })

    if (options.since) {
      params.set('startDateTime', options.since.toISOString())
    }

    let data: TrustpilotReviewsResponse
    try {
      const res = await fetch(
        `${TP_API_BASE}/business-units/${this.businessUnitId}/reviews?${params}`
      )
      if (!res.ok) {
        console.error(`[trustpilot] API error: ${res.status} ${await res.text()}`)
        return
      }
      data = await res.json() as TrustpilotReviewsResponse
    } catch (err) {
      console.error('[trustpilot] request failed:', err)
      return
    }

    const lowerKeywords = keywords.map(k => k.toLowerCase())

    for (const review of data.reviews ?? []) {
      const text = [review.title, review.text].filter(Boolean).join('\n\n')
      if (!text) continue

      // Filter by keyword if keywords provided
      if (lowerKeywords.length) {
        const textLower = text.toLowerCase()
        if (!lowerKeywords.some(kw => textLower.includes(kw))) continue
      }

      const publishedAt = new Date(review.createdAt)
      if (options.since && publishedAt < options.since) continue

      yield {
        platform: 'trustpilot',
        externalId: review.id,
        authorHandle: review.consumer?.displayName ?? 'Anonymous',
        authorUrl: review.consumer?.profileUrl ?? 'https://www.trustpilot.com',
        contentUrl: review.links?.find(l => l.rel === 'review-page')?.href
          ?? `https://www.trustpilot.com/reviews/${review.id}`,
        text: text.slice(0, 2000),
        publishedAt,
        engagementCount: 0, // Trustpilot API doesn't expose engagement counts
        rawMetadata: { review },
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(
        `${TP_API_BASE}/business-units/${this.businessUnitId}?apikey=${this.apiKey}`
      )
      return {
        platform: 'trustpilot',
        available: res.ok,
        ...(res.ok ? {} : { lastError: `HTTP ${res.status}` }),
      }
    } catch (e) {
      return { platform: 'trustpilot', available: false, lastError: String(e) }
    }
  }
}

// ---------------------------------------------------------------------------
// Trustpilot API response types
// ---------------------------------------------------------------------------

interface TrustpilotReviewsResponse {
  reviews?: Array<{
    id: string
    title?: string
    text?: string
    stars?: number
    createdAt: string
    consumer?: {
      displayName?: string
      profileUrl?: string
    }
    links?: Array<{ href: string; rel: string; method: string }>
  }>
  pageSize?: number
  page?: number
}
