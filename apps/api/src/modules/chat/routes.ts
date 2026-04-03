import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { getClient } from '@osc/db'
import { chatChannels, chatMessages } from '@osc/db/schema'
import { eq, and, asc, desc } from 'drizzle-orm'

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
})

const editMessageSchema = z.object({
  body: z.string().min(1).max(4000),
})

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().default(false),
})

export function registerChatRoutes(app: Hono<HonoEnv>) {
  const router = new Hono<HonoEnv>()

  // GET /api/chat/channels
  router.get('/channels', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')

    const channels = await db
      .select()
      .from(chatChannels)
      .where(eq(chatChannels.tenantId, tenantId))
      .orderBy(asc(chatChannels.name))

    return c.json({ data: channels })
  })

  // POST /api/chat/channels
  router.post('/channels', requireAuth('moderator'), zValidator('json', createChannelSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const { name, slug, description, isPrivate } = c.req.valid('json')

    const [created] = await db
      .insert(chatChannels)
      .values({ tenantId, name, slug, description, isPrivate, createdBy: member.id })
      .returning()

    return c.json({ data: created }, 201)
  })

  // PATCH /api/chat/channels/:id — update channel (moderators+)
  const updateChannelSchema = createChannelSchema.partial()

  router.patch('/channels/:id', requireAuth('moderator'), zValidator('json', updateChannelSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const channelId = c.req.param('id')
    const data = c.req.valid('json')

    const [updated] = await db
      .update(chatChannels)
      .set(data)
      .where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
      .returning()

    if (!updated) return c.json({ error: 'Channel not found' }, 404)
    return c.json({ data: updated })
  })

  // DELETE /api/chat/channels/:id — delete channel (org_admin only)
  router.delete('/channels/:id', requireAuth('org_admin'), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const channelId = c.req.param('id')

    const existing = await db.query.chatChannels.findFirst({
      where: and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Channel not found' }, 404)

    await db.delete(chatChannels).where(and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)))
    return c.json({ data: { deleted: true } })
  })

  // GET /api/chat/channels/:id
  router.get('/channels/:id', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const channelId = c.req.param('id')

    const channel = await db.query.chatChannels.findFirst({
      where: and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)),
    })

    if (!channel) return c.json({ error: 'Channel not found' }, 404)
    return c.json({ data: channel })
  })

  // GET /api/chat/channels/:id/messages
  router.get('/channels/:id/messages', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const channelId = c.req.param('id')
    const { limit = '50' } = c.req.query()
    const limitNum = Math.min(100, Math.max(1, Number(limit)))

    // Verify channel belongs to tenant
    const channel = await db.query.chatChannels.findFirst({
      where: and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)),
    })
    if (!channel) return c.json({ error: 'Channel not found' }, 404)

    // Join with members for author info
    const { members } = await import('@osc/db/schema')
    const rows = await db
      .select({
        id: chatMessages.id,
        channelId: chatMessages.channelId,
        body: chatMessages.body,
        editedAt: chatMessages.editedAt,
        createdAt: chatMessages.createdAt,
        authorId: chatMessages.authorId,
        authorName: members.displayName,
        authorAvatarUrl: members.avatarUrl,
      })
      .from(chatMessages)
      .innerJoin(members, eq(chatMessages.authorId, members.id))
      .where(eq(chatMessages.channelId, channelId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(limitNum)

    return c.json({ data: rows })
  })

  // POST /api/chat/channels/:id/messages
  router.post('/channels/:id/messages', requireAuth(), zValidator('json', sendMessageSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const channelId = c.req.param('id')
    const { body } = c.req.valid('json')

    const channel = await db.query.chatChannels.findFirst({
      where: and(eq(chatChannels.id, channelId), eq(chatChannels.tenantId, tenantId)),
    })
    if (!channel) return c.json({ error: 'Channel not found' }, 404)

    const [created] = await db
      .insert(chatMessages)
      .values({ channelId, tenantId, authorId: member.id, body })
      .returning()

    return c.json({ data: created }, 201)
  })

  // PATCH /api/chat/channels/:id/messages/:msgId — edit own message
  router.patch('/channels/:id/messages/:msgId', requireAuth(), zValidator('json', editMessageSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const channelId = c.req.param('id')
    const msgId = c.req.param('msgId')
    const { body } = c.req.valid('json')

    const existing = await db.query.chatMessages.findFirst({
      where: and(eq(chatMessages.id, msgId), eq(chatMessages.channelId, channelId), eq(chatMessages.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Message not found' }, 404)
    if (existing.authorId !== member.id) return c.json({ error: 'Cannot edit another member\'s message' }, 403)

    const [updated] = await db
      .update(chatMessages)
      .set({ body, editedAt: new Date() })
      .where(eq(chatMessages.id, msgId))
      .returning()

    return c.json({ data: updated })
  })

  // DELETE /api/chat/channels/:id/messages/:msgId — delete own message (moderators can delete any)
  router.delete('/channels/:id/messages/:msgId', requireAuth(), async (c) => {
    const db = getClient(c.env.DATABASE_URL, c.env.HYPERDRIVE)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const channelId = c.req.param('id')
    const msgId = c.req.param('msgId')

    const existing = await db.query.chatMessages.findFirst({
      where: and(eq(chatMessages.id, msgId), eq(chatMessages.channelId, channelId), eq(chatMessages.tenantId, tenantId)),
    })
    if (!existing) return c.json({ error: 'Message not found' }, 404)

    const canDelete = existing.authorId === member.id || member.role === 'moderator' || member.role === 'org_admin'
    if (!canDelete) return c.json({ error: 'Cannot delete this message' }, 403)

    await db.delete(chatMessages).where(eq(chatMessages.id, msgId))

    return c.json({ data: { deleted: true } })
  })

  app.route('/api/chat', router)
}
