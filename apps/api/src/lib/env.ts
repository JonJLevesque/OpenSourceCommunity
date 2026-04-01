import type { Context } from 'hono'
import type { HonoEnv } from '@osc/core'

type Env = HonoEnv['Bindings']

/**
 * Returns environment bindings that work on both Cloudflare Workers (c.env)
 * and Node.js (process.env).
 */
export function getEnv(c: Context<HonoEnv>): Env {
  // On Cloudflare Workers, c.env is populated with bindings
  // On Node.js, c.env is empty — fall back to process.env
  if (c.env.DATABASE_URL) return c.env

  const env: Env = {
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    SUPABASE_URL: process.env.SUPABASE_URL ?? '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? '',
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  }

  // Only set optional fields if they are defined, to satisfy exactOptionalPropertyTypes
  if (process.env.APP_DOMAIN !== undefined) env.APP_DOMAIN = process.env.APP_DOMAIN
  if (process.env.CORS_ORIGINS !== undefined) env.CORS_ORIGINS = process.env.CORS_ORIGINS

  return env
}
