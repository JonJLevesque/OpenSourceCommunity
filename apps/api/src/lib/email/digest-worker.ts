import { getClient } from '@osc/db'
import { emailQueue, members, users } from '@osc/db/schema'
import { eq, and, lte, sql } from 'drizzle-orm'
import { createEmailProvider } from './provider'
import type { HonoEnv } from '@osc/core'

interface DigestEnv {
  DATABASE_URL: string
  EMAIL_PROVIDER?: string
  EMAIL_API_KEY?: string
  EMAIL_FROM?: string
  EMAIL_DOMAIN?: string
}

/**
 * Process pending email queue entries where send_after <= NOW().
 * Groups by member to send batched digest emails.
 *
 * This should be called from a Cloudflare Cron Trigger handler or
 * a Node.js cron job. It is idempotent — uses status='pending' check.
 */
export async function processEmailDigest(env: DigestEnv): Promise<void> {
  const db = getClient(env.DATABASE_URL)
  const emailEnv: Parameters<typeof createEmailProvider>[0] = {}
  if (env.EMAIL_PROVIDER !== undefined) emailEnv.EMAIL_PROVIDER = env.EMAIL_PROVIDER
  if (env.EMAIL_API_KEY !== undefined) emailEnv.EMAIL_API_KEY = env.EMAIL_API_KEY
  if (env.EMAIL_FROM !== undefined) emailEnv.EMAIL_FROM = env.EMAIL_FROM
  if (env.EMAIL_DOMAIN !== undefined) emailEnv.EMAIL_DOMAIN = env.EMAIL_DOMAIN
  const emailProvider = createEmailProvider(emailEnv)

  // Fetch all pending emails due for delivery
  const pending = await db
    .select()
    .from(emailQueue)
    .where(and(
      eq(emailQueue.status, 'pending'),
      lte(emailQueue.sendAfter, sql`NOW()`),
    ))
    .limit(100)

  if (pending.length === 0) return

  // Group by member + tenant for potential digest consolidation
  const grouped = new Map<string, typeof pending>()
  for (const item of pending) {
    const key = `${item.tenantId}:${item.memberId}`
    const group = grouped.get(key) ?? []
    group.push(item)
    grouped.set(key, group)
  }

  await Promise.allSettled(
    [...grouped.entries()].map(async ([, items]) => {
      const ids = items.map(i => i.id)

      try {
        if (items.length === 1) {
          // Single item — send directly
          const item = items[0]!
          const sendOpts: Parameters<typeof emailProvider.send>[0] = {
            to: item.toEmail,
            subject: item.subject,
            html: item.bodyHtml,
          }
          if (item.bodyText) sendOpts.text = item.bodyText
          await emailProvider.send(sendOpts)
        } else {
          // Multiple items — consolidate into one digest email
          const firstItem = items[0]!
          const subject = `${items.length} updates from your community`
          const html = `<!DOCTYPE html><html><body style="font-family:ui-sans-serif,sans-serif;padding:24px">
            <h2 style="font-size:16px;margin:0 0 16px">Your community digest</h2>
            ${items.map(i => `<div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px">
              <p style="font-size:14px;font-weight:600;margin:0 0 8px">${i.subject}</p>
              ${i.bodyHtml}
            </div>`).join('')}
          </body></html>`
          const text = items.map(i => `${i.subject}\n\n${i.bodyText ?? ''}`).join('\n\n---\n\n')

          await emailProvider.send({
            to: firstItem.toEmail,
            subject,
            html,
            text,
          })
        }

        // Mark as sent
        await db
          .update(emailQueue)
          .set({ status: 'sent', sentAt: new Date() })
          .where(sql`${emailQueue.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}])`)
      } catch (err) {
        console.error('[DigestWorker] Failed to send:', err)
        await db
          .update(emailQueue)
          .set({ status: 'failed' })
          .where(sql`${emailQueue.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}::uuid`), sql`, `)}])`)
      }
    })
  )
}
