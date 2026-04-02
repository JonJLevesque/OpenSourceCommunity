import type { Env, Platform } from './types'
import { runPipeline } from './pipeline'
import { TwitterConnector } from './connectors/twitter'
import { RedditConnector } from './connectors/reddit'
import { HackerNewsConnector } from './connectors/hackernews'
import { LinkedInConnector } from './connectors/linkedin'
import { YouTubeConnector } from './connectors/youtube'

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
