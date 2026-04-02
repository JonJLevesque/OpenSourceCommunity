/// <reference types="@cloudflare/workers-types" />

// Re-export FetchOptions so connectors can import from '../types'
export type { FetchOptions } from './connectors/base'

export interface Env {
  AI?: Ai                         // Cloudflare Workers AI binding (optional for self-hosters)
  MENTION_QUEUE: Queue            // Cloudflare Queue for mention processing
  DATABASE_URL: string
  // Redis — at least one of these groups must be set for deduplication
  REDIS_URL?: string              // Standard Redis (Node.js / ioredis)
  UPSTASH_REDIS_REST_URL?: string // Upstash REST Redis (Cloudflare Workers)
  UPSTASH_REDIS_REST_TOKEN?: string
  // Sentiment provider — defaults to 'cloudflare' if AI binding present, else 'ollama'
  SENTIMENT_PROVIDER?: string     // 'cloudflare' | 'ollama' | 'huggingface'
  OLLAMA_URL?: string             // Ollama base URL (default: http://localhost:11434)
  HUGGINGFACE_API_TOKEN?: string  // HuggingFace Inference API token (optional for public models)
  // Platform API keys
  TWITTER_BEARER_TOKEN?: string
  REDDIT_CLIENT_ID?: string
  REDDIT_CLIENT_SECRET?: string
  GITHUB_TOKEN?: string
  LINKEDIN_ACCESS_TOKEN?: string  // OAuth2 token with r_organization_social scope
  LINKEDIN_ORG_URN?: string       // e.g. urn:li:organization:12345 (optional)
  YOUTUBE_API_KEY?: string        // Google Cloud API key with YouTube Data API v3 enabled
  DISCORD_BOT_TOKEN?: string      // Discord bot token (requires MESSAGE_CONTENT intent)
  DISCORD_CHANNEL_IDS?: string    // Comma-separated channel IDs to monitor
  // Internal API callback for alert notifications
  API_BASE_URL?: string       // e.g. https://api.opensourcecommunity.io
  INTERNAL_SECRET?: string    // shared secret for /internal/* routes
}

export type Platform =
  | 'twitter'
  | 'reddit'
  | 'linkedin'
  | 'youtube'
  | 'tiktok'
  | 'discord'
  | 'hackernews'
  | 'github'
  | 'g2'
  | 'trustpilot'
  | 'producthunt'

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed'

export interface RawMention {
  platform: Platform
  externalId: string
  authorHandle: string
  authorUrl: string
  contentUrl: string
  text: string
  publishedAt: Date
  engagementCount?: number
  rawMetadata: Record<string, unknown>
}

export interface EnrichedMention extends RawMention {
  tenantId: string
  keywordGroupId: string
  sentiment: SentimentLabel
  sentimentScore: number
}

export interface TenantKeywordConfig {
  tenantId: string
  keywordGroups: Array<{
    id: string
    name: string
    type: 'brand' | 'competitor' | 'custom'
    terms: string[]
    platforms: Platform[]
  }>
}
