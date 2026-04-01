import type { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { Events } from '@osc/core'
import { dispatchWebhooks } from '../lib/webhook-dispatcher'
import { sendEmailNotification } from '../lib/email/notification-listener'

const alertNotificationSchema = z.object({
  tenantId: z.string().uuid(),
  alertType: z.enum(['volume_spike', 'crisis', 'competitor_mention']),
  alertId: z.string().uuid(),
  payload: z.record(z.unknown()),
})

/**
 * Internal routes — called by other workers in the same Cloudflare account.
 * Protected by a shared INTERNAL_SECRET header rather than user JWTs.
 *
 * Mount at /internal/* — these routes must be registered BEFORE authMiddleware
 * so they are not subject to user auth.
 */
export function registerInternalRoutes(app: Hono<HonoEnv>) {
  // POST /internal/alerts/notify — called by the social-pipeline Worker when an alert fires
  app.post('/internal/alerts/notify', zValidator('json', alertNotificationSchema), async (c) => {
    const secret = c.req.header('x-internal-secret')
    const expected = c.env.INTERNAL_SECRET

    if (!expected || secret !== expected) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { tenantId, alertType, alertId, payload } = c.req.valid('json')

    const eventPayload = { tenantId, alertType, alertId, payload }

    // Dispatch webhooks for SI_ALERT_TRIGGERED (non-blocking)
    c.executionCtx.waitUntil(
      dispatchWebhooks(c.env.DATABASE_URL, tenantId, Events.SI_ALERT_TRIGGERED, eventPayload)
    )

    // Send email notification (non-blocking)
    c.executionCtx.waitUntil(
      sendEmailNotification(c, Events.SI_ALERT_TRIGGERED, eventPayload)
    )

    return c.json({ ok: true })
  })
}
