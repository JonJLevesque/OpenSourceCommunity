import type { Platform, RawMention } from '../types'

export interface FetchOptions {
  since?: Date
  maxResults?: number
}

export interface ConnectorHealth {
  platform: Platform
  available: boolean
  rateLimitRemaining?: number
  rateLimitResetAt?: Date
  lastError?: string
}

// Every platform connector implements this interface
export interface SocialConnector {
  readonly platform: Platform

  // Async generator — yields mentions one by one as they're fetched
  fetchMentions(
    keywords: string[],
    options?: FetchOptions
  ): AsyncGenerator<RawMention, void, unknown>

  healthCheck(): Promise<ConnectorHealth>
}

// Base class with shared utilities
export abstract class BaseSocialConnector implements SocialConnector {
  abstract readonly platform: Platform

  abstract fetchMentions(
    keywords: string[],
    options?: FetchOptions
  ): AsyncGenerator<RawMention, void, unknown>

  async healthCheck(): Promise<ConnectorHealth> {
    return { platform: this.platform, available: true }
  }

  protected buildSearchQuery(keywords: string[]): string {
    // Combine keywords with OR for broad matching
    return keywords
      .map(k => k.includes(' ') ? `"${k}"` : k)
      .join(' OR ')
  }

  protected extractEngagement(metrics: Record<string, number>): number {
    return (metrics.like_count ?? 0) +
           (metrics.retweet_count ?? 0) +
           (metrics.reply_count ?? 0) +
           (metrics.quote_count ?? 0)
  }
}
