import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Standard client for server-side usage (apps/api, social-pipeline)
export function createClient(connectionString: string) {
  const sql = postgres(connectionString, { prepare: false })
  return drizzle(sql, { schema })
}

// Per-request client for Cloudflare Workers.
// Workers isolate I/O contexts per-request so we must not cache across requests.
export function getClient(connectionString: string) {
  return createClient(connectionString)
}
