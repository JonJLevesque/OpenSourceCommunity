import type { Env, Platform } from './types'
import { runPipeline } from './pipeline'
import { TwitterConnector } from './connectors/twitter'
import { RedditConnector } from './connectors/reddit'
import { HackerNewsConnector } from './connectors/hackernews'
import { LinkedInConnector } from './connectors/linkedin'
import { YouTubeConnector } from './connectors/youtube'
import { GitHubConnector } from './connectors/github'
import { DiscordConnector } from './connectors/discord'
import { TikTokConnector } from './connectors/tiktok'
import { G2Connector } from './connectors/g2'
import { TrustpilotConnector } from './connectors/trustpilot'
import { ProductHuntConnector } from './connectors/producthunt'

// Map cron schedule to which platforms to poll
function getPlatformsForCron(cron: string): Platform[] {
  const map: Record<string, Platform[]> = {
    '*/5 * * * *':  ['twitter'],
    '*/10 * * * *': ['reddit'],
    '*/15 * * * *': ['hackernews', 'github'],
    '0 * * * *':    ['linkedin', 'youtube', 'g2', 'trustpilot', 'producthunt'],
  }
  return map[cron] ?? []
}

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
      case 'linkedin':
        return env.LINKEDIN_ACCESS_TOKEN
          ? new LinkedInConnector(env.LINKEDIN_ACCESS_TOKEN, env.LINKEDIN_ORG_URN)
          : null
      case 'youtube':
        return env.YOUTUBE_API_KEY
          ? new YouTubeConnector(env.YOUTUBE_API_KEY)
          : null
      case 'github':
        return env.GITHUB_TOKEN
          ? new GitHubConnector(env.GITHUB_TOKEN)
          : null
      case 'tiktok':
        return env.TIKTOK_CLIENT_KEY && env.TIKTOK_CLIENT_SECRET
          ? new TikTokConnector(env.TIKTOK_CLIENT_KEY, env.TIKTOK_CLIENT_SECRET)
          : null
      case 'g2':
        return env.G2_API_KEY
          ? new G2Connector(env.G2_API_KEY, env.G2_PRODUCT_SLUG)
          : null
      case 'trustpilot':
        return env.TRUSTPILOT_API_KEY && env.TRUSTPILOT_BUSINESS_UNIT_ID
          ? new TrustpilotConnector(env.TRUSTPILOT_API_KEY, env.TRUSTPILOT_BUSINESS_UNIT_ID)
          : null
      case 'producthunt':
        return env.PRODUCTHUNT_API_KEY
          ? new ProductHuntConnector(env.PRODUCTHUNT_API_KEY)
          : null
      case 'discord': {
        const channelIds = env.DISCORD_CHANNEL_IDS
          ? env.DISCORD_CHANNEL_IDS.split(',').map(s => s.trim()).filter(Boolean)
          : []
        return env.DISCORD_BOT_TOKEN && channelIds.length
          ? new DiscordConnector(env.DISCORD_BOT_TOKEN, channelIds)
          : null
      }
      default:
        // Other connectors — stub for now, implement in Phase 2
        console.log(`[pipeline] Connector for '${platform}' not yet implemented`)
        return null
    }
  }
}

export default {
  // Handle scheduled cron triggers
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const platforms = getPlatformsForCron(event.cron)
    if (!platforms.length) {
      console.log(`[pipeline] No platforms mapped to cron: ${event.cron}`)
      return
    }

    console.log(`[pipeline] Running for platforms: ${platforms.join(', ')} (cron: ${event.cron})`)

    ctx.waitUntil(
      runPipeline(env, platforms, getConnector(env))
        .catch(err => console.error('[pipeline] Fatal error:', err))
    )
  },

  // HTTP handler for manual triggers + health check
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
    }

    if (url.pathname === '/trigger' && request.method === 'POST') {
      // Manual trigger for testing
      const { platforms } = await request.json() as { platforms: Platform[] }
      await runPipeline(env, platforms, getConnector(env))
      return Response.json({ triggered: true, platforms })
    }

    return new Response('Not found', { status: 404 })
  },
}
