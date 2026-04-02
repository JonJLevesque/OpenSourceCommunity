import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const TIKTOK_AUTH_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_SEARCH_URL = 'https://open.tiktokapis.com/v2/research/video/query/'

/** Maximum videos per Research API request (TikTok hard limit). */
const MAX_PER_PAGE = 20

/**
 * TikTok Research API connector.
 *
 * Uses client-credentials OAuth to obtain an access token, then queries the
 * Research API video/query endpoint for videos matching the supplied keywords.
 *
 * Note: The Research API requires an approved application — see
 * https://developers.tiktok.com/products/research-api/
 */
export class TikTokConnector extends BaseSocialConnector {
  readonly platform = 'tiktok' as const

  constructor(
    private clientKey: string,
    private clientSecret: string,
  ) {
    super()
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    if (!keywords.length) return

    const accessToken = await this.getAccessToken()
    if (!accessToken) return

    const maxResults = Math.min(options.maxResults ?? MAX_PER_PAGE, MAX_PER_PAGE)

    // Build date range — default to the last 7 days
    const endDate = new Date()
    const startDate = options.since ?? new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)

    const body: TikTokSearchRequest = {
      query: {
        and: [
          {
            operation: 'IN',
            field_name: 'keyword',
            field_values: keywords,
          },
        ],
      },
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      max_count: maxResults,
    }

    const fields = [
      'id',
      'video_description',
      'create_time',
      'username',
      'like_count',
      'comment_count',
      'share_count',
      'view_count',
    ].join(',')

    let searchData: TikTokSearchResponse
    try {
      const res = await fetch(`${TIKTOK_SEARCH_URL}?fields=${fields}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        console.error(`[tiktok] search API error: ${res.status} ${await res.text()}`)
        return
      }

      searchData = (await res.json()) as TikTokSearchResponse
    } catch (err) {
      console.error('[tiktok] search request failed:', err)
      return
    }

    const videos = searchData.data?.videos
    if (!videos?.length) return

    for (const video of videos) {
      const authorHandle = video.username ?? 'unknown'
      const videoId = String(video.id)
      const publishedAt = new Date(video.create_time * 1000)

      // Skip videos older than the since boundary
      if (options.since && publishedAt < options.since) continue

      const engagement =
        (video.like_count ?? 0) +
        (video.comment_count ?? 0) +
        (video.share_count ?? 0)

      yield {
        platform: 'tiktok',
        externalId: videoId,
        authorHandle,
        authorUrl: `https://www.tiktok.com/@${authorHandle}`,
        contentUrl: `https://www.tiktok.com/@${authorHandle}/video/${videoId}`,
        text: video.video_description ?? '',
        publishedAt,
        ...(engagement > 0 ? { engagementCount: engagement } : {}),
        rawMetadata: {
          like_count: video.like_count,
          comment_count: video.comment_count,
          share_count: video.share_count,
          view_count: video.view_count,
          create_time: video.create_time,
        },
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const token = await this.getAccessToken()
      return {
        platform: 'tiktok',
        available: token !== null,
        ...(token === null ? { lastError: 'Failed to obtain access token' } : {}),
      }
    } catch (err) {
      return {
        platform: 'tiktok',
        available: false,
        lastError: String(err),
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Obtain a short-lived access token via the client-credentials grant.
   * Returns null on failure (logged, never throws).
   */
  private async getAccessToken(): Promise<string | null> {
    try {
      const res = await fetch(TIKTOK_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: this.clientKey,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
        }).toString(),
      })

      if (!res.ok) {
        console.error(`[tiktok] token request failed: ${res.status} ${await res.text()}`)
        return null
      }

      const data = (await res.json()) as TikTokTokenResponse
      if (!data.access_token) {
        console.error('[tiktok] token response missing access_token:', JSON.stringify(data))
        return null
      }

      return data.access_token
    } catch (err) {
      console.error('[tiktok] token request error:', err)
      return null
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a Date as YYYYMMDD for the TikTok Research API. */
function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

// ---------------------------------------------------------------------------
// TikTok API response types
// ---------------------------------------------------------------------------

interface TikTokTokenResponse {
  access_token?: string
  expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

interface TikTokSearchRequest {
  query: {
    and: Array<{
      operation: string
      field_name: string
      field_values: string[]
    }>
  }
  start_date: string
  end_date: string
  max_count: number
  cursor?: number
  search_id?: string
}

interface TikTokSearchResponse {
  data?: {
    videos?: TikTokVideo[]
    cursor?: number
    has_more?: boolean
    search_id?: string
  }
  error?: {
    code: string
    message: string
    log_id?: string
  }
}

interface TikTokVideo {
  id: number
  video_description?: string
  create_time: number
  username?: string
  like_count?: number
  comment_count?: number
  share_count?: number
  view_count?: number
}
