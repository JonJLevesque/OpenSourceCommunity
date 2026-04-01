import type { Context } from 'hono'
import type { HonoEnv } from '@osc/core'
import { eventBus } from '@osc/core'
import { dispatchWebhooks } from './webhook-dispatcher'

/**
 * Emit an event on the EventBus AND schedule webhook dispatch for the current
 * request's tenant. Use this instead of `eventBus.emit()` directly in route
 * handlers so webhooks are automatically dispatched.
 *
 * Dispatch runs via `waitUntil` — it does NOT block the response.
 */
export async function emitEvent<T extends { tenantId: string }>(
  c: Context<HonoEnv>,
  eventType: string,
  payload: T,
): Promise<void> {
  await eventBus.emit(eventType, payload)

  const databaseUrl = c.env.DATABASE_URL
  if (databaseUrl && payload.tenantId) {
    c.executionCtx.waitUntil(
      dispatchWebhooks(databaseUrl, payload.tenantId, eventType, payload)
    )
  }
}
