import { getClient } from '@osc/db'
import { webhooks, webhookDeliveries } from '@osc/db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * Sign a payload with HMAC-SHA256 using the webhook secret.
 * Returns the hex-encoded signature prefixed with "sha256=".
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256=${hex}`
}

/**
 * Deliver a single webhook request. Returns true on 2xx, false otherwise.
 */
async function deliverWebhook(
  url: string,
  body: string,
  signature: string,
  eventType: string,
  deliveryId: string,
): Promise<{ ok: boolean; status: number; body: string }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Delivery-Id': deliveryId,
      },
      body,
      // Short timeout — don't block the main request lifecycle
      signal: AbortSignal.timeout(10_000),
    })
    const responseBody = await res.text().catch(() => '')
    return { ok: res.ok, status: res.status, body: responseBody.slice(0, 500) }
  } catch (err) {
    return { ok: false, status: 0, body: String(err).slice(0, 500) }
  }
}

/**
 * Dispatch webhooks for a given tenant event.
 * Queries all enabled webhooks subscribed to the event type,
 * then delivers to each with HMAC signing and up to 3 attempts.
 *
 * Should be called inside `c.executionCtx.waitUntil()` to run after response.
 */
export async function dispatchWebhooks(
  databaseUrl: string,
  tenantId: string,
  eventType: string,
  payload: unknown,
): Promise<void> {
  const db = getClient(databaseUrl)

  // Find all enabled webhooks for this tenant that subscribe to this event type
  const hooks = await db
    .select()
    .from(webhooks)
    .where(
      and(
        eq(webhooks.tenantId, tenantId),
        eq(webhooks.enabled, true),
        sql`${webhooks.events} @> ARRAY[${eventType}]::text[]`,
      )
    )

  if (hooks.length === 0) return

  const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload })

  await Promise.allSettled(
    hooks.map(async (hook) => {
      // Create a delivery record
      const [delivery] = await db
        .insert(webhookDeliveries)
        .values({
          tenantId,
          webhookId: hook.id,
          eventType,
          payload: payload as Record<string, unknown>,
          status: 'pending',
          attempts: 0,
        })
        .returning({ id: webhookDeliveries.id })

      if (!delivery) return

      const signature = await signPayload(body, hook.secret)

      let result = { ok: false, status: 0, body: '' }
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts && !result.ok) {
        attempts++
        result = await deliverWebhook(hook.url, body, signature, eventType, delivery.id)
      }

      await db
        .update(webhookDeliveries)
        .set({
          status: result.ok ? 'success' : 'failed',
          attempts,
          lastAttemptAt: new Date(),
          responseStatus: result.status || null,
          responseBody: result.body || null,
        })
        .where(eq(webhookDeliveries.id, delivery.id))
    })
  )
}
