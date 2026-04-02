import { BaseSocialConnector } from './base'
import type { ConnectorHealth, FetchOptions } from './base'
import type { RawMention } from '../types'

const GH_API_BASE = 'https://api.github.com'

export class GitHubConnector extends BaseSocialConnector {
  readonly platform = 'github' as const

  constructor(private token: string) {
    super()
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
  }

  async *fetchMentions(keywords: string[], options: FetchOptions = {}): AsyncGenerator<RawMention> {
    if (!keywords.length) return

    const query = keywords.map(k => k.includes(' ') ? `"${k}"` : k).join(' OR ')
    const sinceStr = options.since ? ` created:>=${options.since.toISOString().slice(0, 10)}` : ''
    const fullQuery = `${query}${sinceStr}`
    const perPage = Math.min(options.maxResults ?? 50, 100)

    // --- Issues and PRs via REST search ---
    const params = new URLSearchParams({
      q: fullQuery,
      sort: 'created',
      order: 'desc',
      per_page: perPage.toString(),
    })

    const res = await fetch(`${GH_API_BASE}/search/issues?${params}`, { headers: this.headers })

    if (!res.ok) {
      console.error(`[github] search/issues API error: ${res.status} ${await res.text()}`)
    } else {
      const data = await res.json() as GitHubSearchResponse

      for (const item of data.items ?? []) {
        const isPR = Boolean(item.pull_request)
        const contentUrl = item.html_url
        const publishedAt = new Date(item.created_at)

        if (options.since && publishedAt < options.since) continue

        yield {
          platform: 'github',
          externalId: String(item.id),
          authorHandle: item.user?.login ?? 'unknown',
          authorUrl: item.user?.html_url ?? `https://github.com/${item.user?.login ?? 'unknown'}`,
          contentUrl,
          text: [item.title, item.body].filter(Boolean).join('\n\n').slice(0, 2000),
          publishedAt,
          engagementCount: item.comments,
          rawMetadata: { item, type: isPR ? 'pull_request' : 'issue' },
        }
      }
    }

    // --- Discussions via GraphQL ---
    yield* this.fetchDiscussions(query, options)
  }

  private async *fetchDiscussions(query: string, options: FetchOptions): AsyncGenerator<RawMention> {
    const first = Math.min(options.maxResults ?? 50, 50)
    const graphqlQuery = `
      query($query: String!, $first: Int!) {
        search(type: DISCUSSION, query: $query, first: $first) {
          nodes {
            ... on Discussion {
              id
              title
              body
              url
              createdAt
              upvoteCount
              comments { totalCount }
              author { login url }
              repository { nameWithOwner }
            }
          }
        }
      }
    `

    let data: GitHubGraphQLResponse
    try {
      const res = await fetch(`${GH_API_BASE}/graphql`, {
        method: 'POST',
        headers: { ...this.headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: graphqlQuery, variables: { query, first } }),
      })

      if (!res.ok) {
        console.error(`[github] graphql error: ${res.status} ${await res.text()}`)
        return
      }

      data = await res.json() as GitHubGraphQLResponse
    } catch (err) {
      console.error('[github] graphql request failed:', err)
      return
    }

    for (const node of data.data?.search?.nodes ?? []) {
      if (!node.id) continue

      const publishedAt = new Date(node.createdAt)
      if (options.since && publishedAt < options.since) continue

      yield {
        platform: 'github',
        externalId: `discussion:${node.id}`,
        authorHandle: node.author?.login ?? 'unknown',
        authorUrl: node.author?.url ?? `https://github.com/${node.author?.login ?? 'unknown'}`,
        contentUrl: node.url,
        text: [node.title, node.body].filter(Boolean).join('\n\n').slice(0, 2000),
        publishedAt,
        engagementCount: (node.upvoteCount ?? 0) + (node.comments?.totalCount ?? 0),
        rawMetadata: { node, type: 'discussion', repo: node.repository?.nameWithOwner },
      }
    }
  }

  override async healthCheck(): Promise<ConnectorHealth> {
    try {
      const res = await fetch(`${GH_API_BASE}/rate_limit`, { headers: this.headers })
      if (!res.ok) {
        return { platform: 'github', available: false, lastError: `HTTP ${res.status}` }
      }
      const data = await res.json() as { resources?: { search?: { remaining: number; reset: number } } }
      const search = data.resources?.search
      return {
        platform: 'github',
        available: true,
        ...(search?.remaining !== undefined ? { rateLimitRemaining: search.remaining } : {}),
        ...(search?.reset ? { rateLimitResetAt: new Date(search.reset * 1000) } : {}),
      }
    } catch (e) {
      return { platform: 'github', available: false, lastError: String(e) }
    }
  }
}

// ---------------------------------------------------------------------------
// GitHub API response types
// ---------------------------------------------------------------------------

interface GitHubSearchResponse {
  total_count?: number
  items?: Array<{
    id: number
    number: number
    title: string
    body?: string
    html_url: string
    created_at: string
    comments: number
    user?: { login: string; html_url: string }
    pull_request?: unknown
  }>
}

interface GitHubGraphQLResponse {
  data?: {
    search?: {
      nodes?: Array<{
        id?: string
        title?: string
        body?: string
        url: string
        createdAt: string
        upvoteCount?: number
        comments?: { totalCount: number }
        author?: { login: string; url: string }
        repository?: { nameWithOwner: string }
      }>
    }
  }
}
