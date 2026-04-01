import { BaseSocialConnector } from './base'
import type { RawMention, FetchOptions } from '../types'

export class RedditConnector extends BaseSocialConnector {
  readonly platform = 'reddit' as const

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    // Reddit's Pushshift-style search via official search API
    const query = keywords.join(' OR ')
    const params = new URLSearchParams({
      q: query,
      sort: 'new',
      limit: '100',
      type: 'link,comment',
    })

    if (options.since) {
      // Reddit API uses 'before' as epoch timestamp
      // We filter by created_utc >= since in post-processing
    }

    const res = await fetch(
      `https://www.reddit.com/search.json?${params}`,
      { headers: { 'User-Agent': 'OpenSourceCommunity/1.0 (+https://opensourcecommunity.io)' } }
    )

    if (!res.ok) {
      console.error(`[reddit] API error: ${res.status}`)
      return
    }

    const data = await res.json() as RedditSearchResponse

    for (const child of data.data?.children ?? []) {
      const post = child.data
      const createdAt = new Date(post.created_utc * 1000)

      if (options.since && createdAt < options.since) continue

      yield {
        platform: 'reddit',
        externalId: post.id,
        authorHandle: post.author,
        authorUrl: `https://reddit.com/u/${post.author}`,
        contentUrl: `https://reddit.com${post.permalink}`,
        text: post.selftext || post.title,
        publishedAt: createdAt,
        engagementCount: post.score + post.num_comments,
        rawMetadata: { subreddit: post.subreddit, score: post.score, numComments: post.num_comments },
      }
    }
  }
}

interface RedditSearchResponse {
  data?: {
    children?: Array<{
      data: {
        id: string
        title: string
        selftext: string
        author: string
        permalink: string
        subreddit: string
        created_utc: number
        score: number
        num_comments: number
      }
    }>
  }
}
