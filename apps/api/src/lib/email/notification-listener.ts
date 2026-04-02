import type { Context } from 'hono'
import type { HonoEnv } from '@osc/core'
import { Events } from '@osc/core'
import { eventBus } from '@osc/core'
import { getClient } from '@osc/db'
import { members, emailPreferences, emailQueue, users } from '@osc/db/schema'
import { eq, and } from 'drizzle-orm'
import { createEmailProvider } from './provider'
import { templateNewReply, templateNewIdeaComment, templateIdeaStatusChanged } from './templates'

let registered = false

/**
 * Generate an HMAC-based unsubscribe token for a member.
 * The token is validated by the unsubscribe endpoint.
 */
async function makeUnsubscribeToken(memberId: string, tenantId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(`${memberId}:${tenantId}`))
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${memberId}.${hex}`
}

/**
 * Send or enqueue an email for a member based on their email preferences.
 */
async function sendOrEnqueue(params: {
  db: ReturnType<typeof getClient>
  emailProvider: ReturnType<typeof createEmailProvider>
  tenantId: string
  memberId: string
  eventType: string
  subject: string
  html: string
  text: string
  frequency: string
}) {
  const { db, emailProvider, tenantId, memberId, eventType, subject, html, text, frequency } = params

  if (frequency === 'never') return

  // Look up member's email
  const [member] = await db
    .select({ userId: members.userId })
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.tenantId, tenantId)))
    .limit(1)

  if (!member) return

  const [user] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, member.userId))
    .limit(1)

  if (!user?.email) return

  if (frequency === 'instant') {
    await emailProvider.send({ to: user.email, subject, html, text })
  } else {
    // daily/weekly — enqueue
    const now = new Date()
    let sendAfter = new Date(now)
    if (frequency === 'daily') {
      sendAfter.setDate(sendAfter.getDate() + 1)
      sendAfter.setHours(8, 0, 0, 0)
    } else {
      // weekly — next Monday 8am UTC
      const daysUntilMonday = (8 - sendAfter.getDay()) % 7 || 7
      sendAfter.setDate(sendAfter.getDate() + daysUntilMonday)
      sendAfter.setHours(8, 0, 0, 0)
    }
    await db.insert(emailQueue).values({
      tenantId,
      memberId,
      toEmail: user.email,
      eventType,
      subject,
      bodyHtml: html,
      bodyText: text,
      sendAfter,
    })
  }
}

/**
 * Get a member's email preference for an event type.
 * Returns the frequency or 'instant' as default.
 */
async function getMemberFrequency(
  db: ReturnType<typeof getClient>,
  memberId: string,
  tenantId: string,
  eventType: string,
): Promise<string> {
  const [pref] = await db
    .select({ enabled: emailPreferences.enabled, frequency: emailPreferences.frequency })
    .from(emailPreferences)
    .where(and(
      eq(emailPreferences.memberId, memberId),
      eq(emailPreferences.tenantId, tenantId),
      eq(emailPreferences.eventType, eventType),
    ))
    .limit(1)

  if (!pref) return 'instant' // default: instant
  if (!pref.enabled) return 'never'
  return pref.frequency
}

/**
 * Register event listeners for email notifications.
 * Should be called once per Worker startup.
 * Uses waitUntil to avoid blocking responses.
 */
export function registerEmailNotifications() {
  if (registered) return
  registered = true
  // Listeners are registered per-route-handler via sendEmailNotification()
  // to access request context (c.env, c.executionCtx, tenantId)
}

/**
 * Send email notifications for an event. Call this in route handlers
 * alongside emitEvent(), inside c.executionCtx.waitUntil().
 */
export async function sendEmailNotification(
  c: Context<HonoEnv>,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
  const emailEnv: Parameters<typeof createEmailProvider>[0] = {}
  if (c.env.EMAIL_PROVIDER !== undefined) emailEnv.EMAIL_PROVIDER = c.env.EMAIL_PROVIDER
  if (c.env.EMAIL_API_KEY !== undefined) emailEnv.EMAIL_API_KEY = c.env.EMAIL_API_KEY
  if (c.env.EMAIL_FROM !== undefined) emailEnv.EMAIL_FROM = c.env.EMAIL_FROM
  if (c.env.EMAIL_DOMAIN !== undefined) emailEnv.EMAIL_DOMAIN = c.env.EMAIL_DOMAIN
  const emailProvider = createEmailProvider(emailEnv)
  const tenantId = c.get('tenantId')
  const appUrl = `https://${c.env.APP_DOMAIN ?? 'localhost:3001'}`

  // Fetch tenant name for email templates
  let communityName = 'Community'
  try {
    const tenant = c.get('tenant')
    communityName = tenant?.name ?? 'Community'
  } catch {}

  const secret = c.env.SUPABASE_JWT_SECRET // reuse for unsubscribe tokens

  async function getUnsubUrl(memberId: string) {
    const token = await makeUnsubscribeToken(memberId, tenantId, secret)
    return `${appUrl}/api/me/email-preferences/unsubscribe?token=${token}`
  }

  try {
    switch (eventType) {
      case Events.FORUM_POST_CREATED: {
        // Notify thread author when someone else replies
        const { threadId, post } = payload as { threadId: string; post: { authorId: string; body?: unknown } }
        if (!threadId || !post) break

        // Get the thread author from DB
        const { forumThreads } = await import('@osc/db/schema')
        const [thread] = await db
          .select({ authorId: forumThreads.authorId, title: forumThreads.title })
          .from(forumThreads)
          .where(eq(forumThreads.id, threadId))
          .limit(1)

        if (!thread || thread.authorId === (post as { authorId: string }).authorId) break

        const [authorMember] = await db
          .select({ displayName: members.displayName })
          .from(members)
          .where(eq(members.id, (post as { authorId: string }).authorId))
          .limit(1)

        const [recipientMember] = await db
          .select({ displayName: members.displayName })
          .from(members)
          .where(and(eq(members.id, thread.authorId), eq(members.tenantId, tenantId)))
          .limit(1)

        if (!recipientMember) break

        const frequency = await getMemberFrequency(db, thread.authorId, tenantId, eventType)
        const { subject, html, text } = templateNewReply({
          communityName,
          recipientName: recipientMember.displayName,
          authorName: authorMember?.displayName ?? 'Someone',
          threadTitle: thread.title,
          threadUrl: `${appUrl}/forums/general/${threadId}`,
          replySnippet: typeof post.body === 'string' ? post.body : JSON.stringify(post.body ?? ''),
          unsubscribeUrl: await getUnsubUrl(thread.authorId),
        })

        c.executionCtx.waitUntil(
          sendOrEnqueue({ db, emailProvider, tenantId, memberId: thread.authorId, eventType, subject, html, text, frequency })
        )
        break
      }

      case Events.IDEA_STATUS_CHANGED: {
        const { ideaId, newStatus, authorId } = payload as { ideaId: string; newStatus: string; authorId: string }
        if (!ideaId || !authorId) break

        const { ideas } = await import('@osc/db/schema')
        const [idea] = await db
          .select({ title: ideas.title })
          .from(ideas)
          .where(eq(ideas.id, ideaId))
          .limit(1)

        const [recipientMember] = await db
          .select({ displayName: members.displayName })
          .from(members)
          .where(and(eq(members.id, authorId), eq(members.tenantId, tenantId)))
          .limit(1)

        if (!idea || !recipientMember) break

        const frequency = await getMemberFrequency(db, authorId, tenantId, eventType)
        const { subject, html, text } = templateIdeaStatusChanged({
          communityName,
          recipientName: recipientMember.displayName,
          ideaTitle: idea.title,
          newStatus,
          ideaUrl: `${appUrl}/ideas/${ideaId}`,
          unsubscribeUrl: await getUnsubUrl(authorId),
        })

        c.executionCtx.waitUntil(
          sendOrEnqueue({ db, emailProvider, tenantId, memberId: authorId, eventType, subject, html, text, frequency })
        )
        break
      }

      default:
        break
    }
  } catch (err) {
    console.error('[EmailNotification] Error:', err)
  }
}
