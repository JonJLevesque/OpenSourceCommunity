import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'

/**
 * YouTube Data API v3 connector.
 *
 * Quota cost per cycle (N keywords, M videos each):
 *   - search.list  = 100 units per call
 *   - commentThreads.list = 1 unit per call
 *
 * We cap video search at 10 results and comments at 50 per video
 * to keep quota usage reasonable.
 */
export class YouTubeConnector extends BaseSocialConnector {
  readonly platform = 'youtube' as const

  constructor(private apiKey: string) {
    super()
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    if (!keywords.length) return

    const query = this.buildSearchQuery(keywords)
    const maxVideos = Math.min(options.maxResults ?? 10, 50)

    // --- Step 1: Search for recent videos matching keywords ----------------
    const searchParams = new URLSearchParams({
      part: 'id,snippet',
      q: query,
      type: 'video',
      order: 'date',
      maxResults: maxVideos.toString(),
      key: this.apiKey,
    })

    if (options.since) {
      searchParams.set('publishedAfter', options.since.toISOString())
    }

    let searchData: YouTubeSearchResponse
    try {
      const res = await fetch(`${YT_API_BASE}/search?${searchParams}`)
      if (!res.ok) {
        console.error(`[youtube] search API error: ${res.status} ${await res.text()}`)
        return
      }
      searchData = await res.json() as YouTubeSearchResponse
    } catch (err) {
      console.error(`[youtube] search request failed:`, err)
      return
    }

    if (!searchData.items?.length) return

    // --- Step 2: For each video, fetch comment threads ---------------------
    for (const video of searchData.items) {
      const videoId = video.id.videoId
      if (!videoId) continue

      const commentParams = new URLSearchParams({
        part: 'snippet',
        videoId,
        order: 'relevance',
        maxResults: '50', // capped at 50 to conserve quota
        textFormat: 'plainText',
        key: this.apiKey,
      })

      let commentData: YouTubeCommentThreadResponse
      try {
        const res = await fetch(`${YT_API_BASE}/commentThreads?${commentParams}`)
        if (!res.ok) {
          // Comments may be disabled on a video — log and continue
          const body = await res.text()
          if (res.status === 403) {
            console.warn(`[youtube] comments disabled for video ${videoId}, skipping`)
          } else {
            console.error(`[youtube] commentThreads error for ${videoId}: ${res.status} ${body}`)
          }
          continue
        }
        commentData = await res.json() as YouTubeCommentThreadResponse
      } catch (err) {
        console.error(`[youtube] commentThreads request failed for ${videoId}:`, err)
        continue
      }

      if (!commentData.items?.length) continue

      // --- Step 3: Yield each comment as a RawMention ---------------------
      for (const thread of commentData.items) {
        const comment = thread.snippet?.topLevelComment?.snippet
        if (!comment) continue

        const publishedAt = new Date(comment.publishedAt)

        // Skip comments older than the since boundary
        if (options.since && publishedAt < options.since) continue

        const commentId = thread.snippet.topLevelComment.id

        yield {
          platform: 'youtube',
          externalId: commentId,
          authorHandle: comment.authorDisplayName ?? 'Unknown',
          authorUrl: comment.authorChannelUrl ?? '',
          contentUrl: `https://www.youtube.com/watch?v=${videoId}&lc=${commentId}`,
          text: comment.textOriginal ?? comment.textDisplay ?? '',
          publishedAt,
          engagementCount: comment.likeCount ?? 0,
          rawMetadata: {
            videoId,
            videoTitle: video.snippet?.title,
            channelId: video.snippet?.channelId,
            channelTitle: video.snippet?.channelTitle,
            totalReplyCount: thread.snippet.totalReplyCount,
            comment: thread.snippet.topLevelComment,
          },
        }
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const params = new URLSearchParams({
        part: 'id',
        q: 'test',
        type: 'video',
        maxResults: '1',
        key: this.apiKey,
      })

      const res = await fetch(`${YT_API_BASE}/search?${params}`)

      return {
        platform: 'youtube',
        available: res.ok,
        ...(res.ok ? {} : { lastError: `HTTP ${res.status}` }),
      }
    } catch (err) {
      return {
        platform: 'youtube',
        available: false,
        lastError: String(err),
      }
    }
  }
}

// ---------------------------------------------------------------------------
// YouTube Data API v3 response types
// ---------------------------------------------------------------------------

interface YouTubeSearchResponse {
  kind?: string
  etag?: string
  nextPageToken?: string
  pageInfo?: { totalResults: number; resultsPerPage: number }
  items?: Array<{
    kind?: string
    etag?: string
    id: {
      kind?: string
      videoId?: string
    }
    snippet?: {
      publishedAt: string
      channelId: string
      title: string
      description: string
      channelTitle: string
      thumbnails?: Record<string, { url: string; width: number; height: number }>
    }
  }>
}

interface YouTubeCommentThreadResponse {
  kind?: string
  etag?: string
  nextPageToken?: string
  pageInfo?: { totalResults: number; resultsPerPage: number }
  items?: Array<{
    kind?: string
    etag?: string
    id: string
    snippet: {
      videoId: string
      totalReplyCount: number
      topLevelComment: {
        kind?: string
        etag?: string
        id: string
        snippet: {
          videoId: string
          textDisplay: string
          textOriginal?: string
          authorDisplayName?: string
          authorProfileImageUrl?: string
          authorChannelUrl?: string
          authorChannelId?: { value: string }
          likeCount?: number
          publishedAt: string
          updatedAt?: string
        }
      }
    }
  }>
}
