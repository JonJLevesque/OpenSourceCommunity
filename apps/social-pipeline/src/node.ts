/// <reference types="@cloudflare/workers-types" />
import cron from 'node-cron'
import { runPipeline } from './pipeline'
import type { Env, Platform } from './types'
import { TwitterConnector } from './connectors/twitter'
import { RedditConnector } from './connectors/reddit'
import { HackerNewsConnector } from './connectors/hackernews'

// ---------------------------------------------------------------------------
// Build a Node.js Env from process.env
// ---------------------------------------------------------------------------

function getNodeEnv(): Env {
  const required = ['DATABASE_URL'] as const
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`[node] Missing required environment variable: ${key}`)
    }
  }

  // Build env — only include optional keys when they have a value to satisfy
  // exactOptionalPropertyTypes
  const env: Env = {
    // Node.js has no native Workers AI — sentiment falls back to neutral in classifySentiment
    AI: undefined as unknown as Ai,
    MENTION_QUEUE: undefined as unknown as Queue,

    DATABASE_URL: process.env['DATABASE_URL']!,
  }

  if (process.env['REDIS_URL']) env.REDIS_URL = process.env['REDIS_URL']
  if (process.env['UPSTASH_REDIS_REST_URL']) env.UPSTASH_REDIS_REST_URL = process.env['UPSTASH_REDIS_REST_URL']
  if (process.env['UPSTASH_REDIS_REST_TOKEN']) env.UPSTASH_REDIS_REST_TOKEN = process.env['UPSTASH_REDIS_REST_TOKEN']
  if (process.env['TWITTER_BEARER_TOKEN']) env.TWITTER_BEARER_TOKEN = process.env['TWITTER_BEARER_TOKEN']
  if (process.env['REDDIT_CLIENT_ID']) env.REDDIT_CLIENT_ID = process.env['REDDIT_CLIENT_ID']
  if (process.env['REDDIT_CLIENT_SECRET']) env.REDDIT_CLIENT_SECRET = process.env['REDDIT_CLIENT_SECRET']
  if (process.env['GITHUB_TOKEN']) env.GITHUB_TOKEN = process.env['GITHUB_TOKEN']

  return env
}

// ---------------------------------------------------------------------------
// Connector factory (same logic as index.ts)
// ---------------------------------------------------------------------------

function getConnector(env: Env) {
  return (platform: Platform) => {
    switch (platform) {
      case 'twitter':
        return env.TWITTER_BEARER_TOKEN
          ? new TwitterConnector(env.TWITTER_BEARER_TOKEN)
          : null
      case 'reddit':
        return new RedditConnector()
      case 'hackernews':
        return new HackerNewsConnector()
      default:
        console.log(`[pipeline] Connector for '${platform}' not yet implemented`)
        return null
    }
  }
}

// ---------------------------------------------------------------------------
// Cron schedules (mirror wrangler.toml triggers)
// ---------------------------------------------------------------------------

const env = getNodeEnv()
const connector = getConnector(env)

cron.schedule('*/5 * * * *', () => {
  runPipeline(env, ['twitter'], connector)
    .catch(err => console.error('[cron] twitter error:', err))
})

cron.schedule('*/10 * * * *', () => {
  runPipeline(env, ['reddit'], connector)
    .catch(err => console.error('[cron] reddit error:', err))
})

cron.schedule('*/15 * * * *', () => {
  runPipeline(env, ['hackernews', 'github'], connector)
    .catch(err => console.error('[cron] hackernews/github error:', err))
})

cron.schedule('*/30 * * * *', () => {
  runPipeline(env, ['linkedin', 'youtube'], connector)
    .catch(err => console.error('[cron] linkedin/youtube error:', err))
})

cron.schedule('0 * * * *', () => {
  runPipeline(env, ['g2', 'trustpilot', 'producthunt'], connector)
    .catch(err => console.error('[cron] g2/trustpilot/producthunt error:', err))
})

console.log('[social-pipeline] Cron jobs started')
