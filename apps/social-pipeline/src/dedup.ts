import { Redis as UpstashRedis } from '@upstash/redis'
import Redis from 'ioredis'

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface MentionDeduplicator {
  /** Returns true if this mention is NEW (not seen before). Marks it seen. */
  isNew(tenantId: string, platform: string, externalId: string): Promise<boolean>
  markSeen(tenantId: string, platform: string, externalId: string): Promise<void>
}

const DEDUP_TTL_SECONDS = 60 * 60 * 24 * 90  // 90 days

// ---------------------------------------------------------------------------
// Upstash implementation (REST-based, for Cloudflare Workers)
// ---------------------------------------------------------------------------

class UpstashDeduplicator implements MentionDeduplicator {
  private redis: UpstashRedis

  constructor(restUrl: string, restToken: string) {
    this.redis = new UpstashRedis({ url: restUrl, token: restToken })
  }

  async isNew(tenantId: string, platform: string, externalId: string): Promise<boolean> {
    const key = `dedup:${tenantId}:${platform}:${externalId}`
    const existed = await this.redis.set(key, '1', {
      nx: true,
      ex: DEDUP_TTL_SECONDS,
    })
    return existed !== null  // null means key already existed (duplicate)
  }

  async markSeen(_tenantId: string, _platform: string, _externalId: string): Promise<void> {
    // Already handled by the NX flag in isNew
  }
}

// ---------------------------------------------------------------------------
// Standard Redis implementation (ioredis, for Node.js)
// ---------------------------------------------------------------------------

class StandardRedisDeduplicator implements MentionDeduplicator {
  private redis: Redis

  constructor(url: string) {
    this.redis = new Redis(url, { lazyConnect: true, enableOfflineQueue: false })
  }

  async isNew(tenantId: string, platform: string, externalId: string): Promise<boolean> {
    const key = `dedup:${tenantId}:${platform}:${externalId}`
    // SET key value EX seconds NX — returns "OK" on success, null if key existed
    const result = await this.redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX')
    return result !== null  // null means key already existed (duplicate)
  }

  async markSeen(_tenantId: string, _platform: string, _externalId: string): Promise<void> {
    // Already handled by the NX flag in isNew
  }
}

// ---------------------------------------------------------------------------
// No-op implementation (runs without Redis — never deduplicates)
// ---------------------------------------------------------------------------

class NoopDeduplicator implements MentionDeduplicator {
  async isNew(_tenantId: string, _platform: string, _externalId: string): Promise<boolean> {
    return true  // always treat as new
  }

  async markSeen(_tenantId: string, _platform: string, _externalId: string): Promise<void> {
    // no-op
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

interface DeduplicatorEnv {
  REDIS_URL?: string
  UPSTASH_REDIS_REST_URL?: string
  UPSTASH_REDIS_REST_TOKEN?: string
}

export function createDeduplicator(env: DeduplicatorEnv): MentionDeduplicator {
  if (env.REDIS_URL) {
    return new StandardRedisDeduplicator(env.REDIS_URL)
  }

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashDeduplicator(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  }

  console.warn('[dedup] No Redis configured — deduplication disabled')
  return new NoopDeduplicator()
}
