import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Standard client for server-side usage (apps/api, social-pipeline)
export function createClient(connectionString: string) {
  const sql = postgres(connectionString, { prepare: false })
  return drizzle(sql, { schema })
}

// Cloudflare Workers client.
// Prefers Hyperdrive binding (required for TCP connections from Workers).
// Falls back to direct connection string for local dev.
export function getClient(connectionString: string, hyperdrive?: { connectionString: string }) {
  return createClient(hyperdrive?.connectionString ?? connectionString)
}
