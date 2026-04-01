import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import type { HonoEnv } from '@osc/core'
import { requireAuth } from '../../middleware/auth'
import { requireModule } from '../../middleware/module'
import { getClient } from '@osc/db'
import {
  ideas,
  ideaVotes,
  ideaComments,
  ideaStatusHistory,
} from '@osc/db/schema'
import { members } from '@osc/db/schema'
import { eq, and, desc, asc, sql, inArray } from 'drizzle-orm'
import { Events } from '@osc/core'
import { emitEvent } from '../../lib/emit-event'
import { sendEmailNotification } from '../../lib/email/notification-listener'

// ─── Validators ────────────────────────────────────────────────────────────────

const createIdeaSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.union([z.string(), z.record(z.unknown())]), // HTML string or Tiptap JSON
  category: z.string().optional(),
})

const createCommentSchema = z.object({
  body: z.union([z.string(), z.record(z.unknown())]), // HTML string or Tiptap JSON
})

const changeStatusSchema = z.object({
  status: z.enum(['new', 'under_review', 'planned', 'in_progress', 'shipped', 'declined']),
  note: z.string().min(1, 'A note is required when changing status'),
})

const mergeIdeaSchema = z.object({
  targetIdeaId: z.string().uuid(),
})

// ─── Route Registration ────────────────────────────────────────────────────────

export function registerIdeasRoutes(app: Hono<HonoEnv>) {
  const ideasRouter = new Hono<HonoEnv>()
  ideasRouter.use('*', requireModule('ideas'))

  // ─── GET /api/ideas/categories ───────────────────────────────────────────────
  ideasRouter.get('/categories', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')

    const cats = await db
      .selectDistinct({ category: ideas.category })
      .from(ideas)
      .where(and(eq(ideas.tenantId, tenantId), eq(ideas.isMerged, false), sql`${ideas.category} IS NOT NULL`))
      .orderBy(asc(ideas.category))

    return c.json({
      data: cats
        .filter((c) => c.category)
        .map((c) => ({ id: c.category!, name: c.category! })),
    })
  })

  // ─── GET /api/ideas ──────────────────────────────────────────────────────────
  // List ideas with sort + filter options
  ideasRouter.get('/', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')

    const {
      sort = 'votes',
      status,
      categoryId,
      myVotes,
      page = '1',
      limit = '20',
    } = c.req.query()

    const offset = (Number(page) - 1) * Number(limit)

    // Build conditions
    const conditions = [eq(ideas.tenantId, tenantId), eq(ideas.isMerged, false)]

    if (status) {
      conditions.push(eq(ideas.status, status as any))
    }

    if (categoryId) {
      conditions.push(eq(ideas.category, categoryId))
    }

    // For myVotes filter we need sub-query
    if (myVotes === 'true' && member) {
      const votedRows = await db.query.ideaVotes.findMany({
        where: and(eq(ideaVotes.tenantId, tenantId), eq(ideaVotes.memberId, member.id)),
        columns: { ideaId: true },
      })
      const votedIds = votedRows.map(v => v.ideaId)
      if (votedIds.length === 0) {
        return c.json({ data: [], meta: { page: Number(page), limit: Number(limit), total: 0 } })
      }
      conditions.push(inArray(ideas.id, votedIds))
    }

    const orderBy = (() => {
      switch (sort) {
        case 'newest':       return [desc(ideas.createdAt)]
        case 'trending':     return [desc(ideas.voteCount), desc(ideas.createdAt)]
        case 'votes':
        default:             return [desc(ideas.voteCount)]
      }
    })()

    const [rows, countRow] = await Promise.all([
      db.query.ideas.findMany({
        where: and(...conditions),
        orderBy,
        limit: Number(limit),
        offset,
      }),
      db.select({ count: sql<number>`count(*)` })
        .from(ideas)
        .where(and(...conditions)),
    ])

    // Batch-enrich with authorName and commentCount
    const ideaIds = rows.map((r) => r.id)
    const authorIds = [...new Set(rows.map((r) => r.authorId))]

    const [authorsData, commentCountsData] = await Promise.all([
      authorIds.length > 0
        ? db.select({ id: members.id, displayName: members.displayName })
            .from(members)
            .where(and(eq(members.tenantId, tenantId), inArray(members.id, authorIds)))
        : Promise.resolve([]),
      ideaIds.length > 0
        ? db.select({ ideaId: ideaComments.ideaId, count: sql<number>`count(*)` })
            .from(ideaComments)
            .where(and(eq(ideaComments.tenantId, tenantId), inArray(ideaComments.ideaId, ideaIds)))
            .groupBy(ideaComments.ideaId)
        : Promise.resolve([]),
    ])

    const authorMap = new Map(authorsData.map((a) => [a.id, a.displayName]))
    const countMap = new Map(commentCountsData.map((c) => [c.ideaId, Number(c.count)]))

    const enriched = rows.map((idea) => ({
      ...idea,
      authorName: authorMap.get(idea.authorId) ?? '',
      commentCount: countMap.get(idea.id) ?? 0,
    }))

    return c.json({
      data: enriched,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: Number(countRow[0]?.count ?? 0),
      },
    })
  })

  // ─── GET /api/ideas/:id ──────────────────────────────────────────────────────
  ideasRouter.get('/:id', async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')
    const ideaId = c.req.param('id')

    const idea = await db.query.ideas.findFirst({
      where: and(eq(ideas.id, ideaId), eq(ideas.tenantId, tenantId)),
    })

    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const [rawComments, statusHistory, ideaAuthor] = await Promise.all([
      db.query.ideaComments.findMany({
        where: and(eq(ideaComments.ideaId, ideaId), eq(ideaComments.tenantId, tenantId)),
        orderBy: [asc(ideaComments.createdAt)],
      }),
      db.query.ideaStatusHistory.findMany({
        where: and(eq(ideaStatusHistory.ideaId, ideaId), eq(ideaStatusHistory.tenantId, tenantId)),
        orderBy: [asc(ideaStatusHistory.createdAt)],
      }),
      db.query.members.findFirst({
        where: eq(members.id, idea.authorId),
        columns: { id: true, displayName: true, avatarUrl: true },
      }),
    ])

    // Enrich comments with author info
    const commentAuthorIds = [...new Set(rawComments.map((c) => c.authorId))]
    const commentAuthors = commentAuthorIds.length > 0
      ? await db.select({ id: members.id, displayName: members.displayName, avatarUrl: members.avatarUrl })
          .from(members)
          .where(inArray(members.id, commentAuthorIds))
      : []
    const commentAuthorMap = new Map(commentAuthors.map((a) => [a.id, a]))

    const comments = rawComments.map((c) => {
      const author = commentAuthorMap.get(c.authorId)
      return {
        ...c,
        authorName: author?.displayName ?? '',
        authorAvatarUrl: author?.avatarUrl ?? null,
      }
    })

    // Check if current member has voted
    let hasVoted = false
    if (member) {
      const vote = await db.query.ideaVotes.findFirst({
        where: and(
          eq(ideaVotes.ideaId, ideaId),
          eq(ideaVotes.memberId, member.id),
          eq(ideaVotes.tenantId, tenantId),
        ),
      })
      hasVoted = !!vote
    }

    return c.json({
      data: {
        idea: {
          ...idea,
          authorName: ideaAuthor?.displayName ?? '',
          authorAvatarUrl: ideaAuthor?.avatarUrl ?? null,
        },
        comments,
        statusHistory,
        hasVoted,
      },
    })
  })

  // ─── POST /api/ideas ─────────────────────────────────────────────────────────
  ideasRouter.post('/', requireAuth('member'), zValidator('json', createIdeaSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const { title, body, category } = c.req.valid('json')

    const [idea] = await db.insert(ideas).values({
      tenantId,
      authorId: member.id,
      title,
      body,
      category,
      status: 'new',
      voteCount: 0,
      isMerged: false,
    }).returning() as [typeof ideas.$inferSelect, ...typeof ideas.$inferSelect[]]

    // Auto-vote on creation
    await db.insert(ideaVotes).values({
      tenantId,
      ideaId: idea.id,
      memberId: member.id,
    })

    await db.update(ideas)
      .set({ voteCount: sql`${ideas.voteCount} + 1` })
      .where(eq(ideas.id, idea.id))

    await emitEvent(c, Events.IDEA_CREATED, { tenantId, idea })

    return c.json({ data: idea }, 201)
  })

  // ─── POST /api/ideas/:id/vote ─────────────────────────────────────────────────
  // Idempotent toggle — vote if not voted, unvote if already voted
  ideasRouter.post('/:id/vote', requireAuth('member'), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const ideaId = c.req.param('id')

    const idea = await db.query.ideas.findFirst({
      where: and(eq(ideas.id, ideaId), eq(ideas.tenantId, tenantId)),
    })

    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const existingVote = await db.query.ideaVotes.findFirst({
      where: and(
        eq(ideaVotes.ideaId, ideaId),
        eq(ideaVotes.memberId, member.id),
        eq(ideaVotes.tenantId, tenantId),
      ),
    })

    if (existingVote) {
      // Unvote
      await db.delete(ideaVotes)
        .where(and(
          eq(ideaVotes.ideaId, ideaId),
          eq(ideaVotes.memberId, member.id),
          eq(ideaVotes.tenantId, tenantId),
        ))

      await db.update(ideas)
        .set({ voteCount: sql`greatest(${ideas.voteCount} - 1, 0)` })
        .where(eq(ideas.id, ideaId))

      await emitEvent(c, Events.IDEA_VOTED, { tenantId, ideaId, memberId: member.id, action: 'unvoted' })

      return c.json({ data: { voted: false } })
    } else {
      // Vote
      await db.insert(ideaVotes).values({
        tenantId,
        ideaId,
        memberId: member.id,
      })

      await db.update(ideas)
        .set({ voteCount: sql`${ideas.voteCount} + 1` })
        .where(eq(ideas.id, ideaId))

      await emitEvent(c, Events.IDEA_VOTED, { tenantId, ideaId, memberId: member.id, action: 'voted' })

      return c.json({ data: { voted: true } })
    }
  })

  // ─── POST /api/ideas/:id/comments ────────────────────────────────────────────
  ideasRouter.post('/:id/comments', requireAuth('member'), zValidator('json', createCommentSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const ideaId = c.req.param('id')
    const { body } = c.req.valid('json')

    const idea = await db.query.ideas.findFirst({
      where: and(eq(ideas.id, ideaId), eq(ideas.tenantId, tenantId)),
    })

    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const [comment] = await db.insert(ideaComments).values({
      tenantId,
      ideaId,
      authorId: member.id,
      body,
    }).returning()

    return c.json({ data: comment }, 201)
  })

  // ─── PATCH /api/ideas/:id/status ──────────────────────────────────────────────
  // org_admin only — change idea status and record history
  ideasRouter.patch('/:id/status', requireAuth('org_admin'), zValidator('json', changeStatusSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const member = c.get('member')!
    const ideaId = c.req.param('id')
    const { status, note } = c.req.valid('json')

    const idea = await db.query.ideas.findFirst({
      where: and(eq(ideas.id, ideaId), eq(ideas.tenantId, tenantId)),
    })

    if (!idea) return c.json({ error: 'Idea not found' }, 404)

    const previousStatus = idea.status

    // Update idea status
    const [updated] = await db.update(ideas)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(ideas.id, ideaId))
      .returning()

    // Record status history
    await db.insert(ideaStatusHistory).values({
      tenantId,
      ideaId,
      status: status as any,
      note,
      changedBy: member.id,
    })

    // Notify all voters of the status change
    const voters = await db.query.ideaVotes.findMany({
      where: and(eq(ideaVotes.ideaId, ideaId), eq(ideaVotes.tenantId, tenantId)),
      columns: { memberId: true },
    })

    const ideaStatusPayload = {
      tenantId,
      ideaId,
      previousStatus,
      newStatus: status,
      note,
      voterIds: voters.map(v => v.memberId),
    }
    await emitEvent(c, Events.IDEA_STATUS_CHANGED, ideaStatusPayload)
    c.executionCtx.waitUntil(
      sendEmailNotification(c, Events.IDEA_STATUS_CHANGED, ideaStatusPayload)
    )

    return c.json({ data: updated })
  })

  // ─── POST /api/ideas/:id/merge ────────────────────────────────────────────────
  // org_admin only — merge this idea into another
  ideasRouter.post('/:id/merge', requireAuth('org_admin'), zValidator('json', mergeIdeaSchema), async (c) => {
    const db = getClient(c.env.DATABASE_URL)
    const tenantId = c.get('tenantId')
    const ideaId = c.req.param('id')
    const { targetIdeaId } = c.req.valid('json')

    if (ideaId === targetIdeaId) {
      return c.json({ error: 'Cannot merge an idea into itself' }, 400)
    }

    const [sourceIdea, targetIdea] = await Promise.all([
      db.query.ideas.findFirst({
        where: and(eq(ideas.id, ideaId), eq(ideas.tenantId, tenantId)),
      }),
      db.query.ideas.findFirst({
        where: and(eq(ideas.id, targetIdeaId), eq(ideas.tenantId, tenantId)),
      }),
    ])

    if (!sourceIdea) return c.json({ error: 'Source idea not found' }, 404)
    if (!targetIdea) return c.json({ error: 'Target idea not found' }, 404)
    if (sourceIdea.isMerged) return c.json({ error: 'Source idea is already merged' }, 400)
    if (targetIdea.isMerged) return c.json({ error: 'Cannot merge into a merged idea' }, 400)

    // Move votes from source to target (skip duplicates)
    const sourceVoters = await db.query.ideaVotes.findMany({
      where: and(eq(ideaVotes.ideaId, ideaId), eq(ideaVotes.tenantId, tenantId)),
      columns: { memberId: true },
    })

    const targetVoters = await db.query.ideaVotes.findMany({
      where: and(eq(ideaVotes.ideaId, targetIdeaId), eq(ideaVotes.tenantId, tenantId)),
      columns: { memberId: true },
    })

    const targetVoterSet = new Set(targetVoters.map(v => v.memberId))
    const newVoters = sourceVoters.filter(v => !targetVoterSet.has(v.memberId))

    if (newVoters.length > 0) {
      await db.insert(ideaVotes).values(
        newVoters.map(v => ({
          tenantId,
          ideaId: targetIdeaId,
          memberId: v.memberId,
        }))
      )

      // Update target vote count
      await db.update(ideas)
        .set({ voteCount: sql`${ideas.voteCount} + ${newVoters.length}` })
        .where(eq(ideas.id, targetIdeaId))
    }

    // Mark source as merged
    await db.update(ideas)
      .set({ isMerged: true, mergedIntoId: targetIdeaId, updatedAt: new Date() })
      .where(eq(ideas.id, ideaId))

    // Move comments over to target idea
    await db.update(ideaComments)
      .set({ ideaId: targetIdeaId })
      .where(and(eq(ideaComments.ideaId, ideaId), eq(ideaComments.tenantId, tenantId)))

    return c.json({
      data: {
        merged: true,
        sourceIdeaId: ideaId,
        targetIdeaId,
        votesTransferred: newVoters.length,
      },
    })
  })

  app.route('/api/ideas', ideasRouter)
}
