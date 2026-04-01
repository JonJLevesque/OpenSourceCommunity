import { BaseSocialConnector } from './base'
import type { RawMention, FetchOptions } from '../types'

export class HackerNewsConnector extends BaseSocialConnector {
  readonly platform = 'hackernews' as const

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    for (const keyword of keywords) {
      const params = new URLSearchParams({
        query: keyword,
        tags: 'story,comment',
        hitsPerPage: '50',
      })

      if (options.since) {
        params.set('numericFilters', `created_at_i>${Math.floor(options.since.getTime() / 1000)}`)
      }

      const res = await fetch(`https://hn.algolia.com/api/v1/search_by_date?${params}`)
      if (!res.ok) continue

      const data = await res.json() as HNSearchResponse

      for (const hit of data.hits ?? []) {
        yield {
          platform: 'hackernews',
          externalId: hit.objectID,
          authorHandle: hit.author,
          authorUrl: `https://news.ycombinator.com/user?id=${hit.author}`,
          contentUrl: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
          text: hit.story_text ?? hit.comment_text ?? hit.title ?? '',
          publishedAt: new Date(hit.created_at),
          engagementCount: hit.points ?? 0,
          rawMetadata: { points: hit.points, numComments: hit.num_comments },
        }
      }
    }
  }
}

interface HNSearchResponse {
  hits?: Array<{
    objectID: string
    author: string
    title?: string
    story_text?: string
    comment_text?: string
    url?: string
    created_at: string
    points?: number
    num_comments?: number
  }>
}
