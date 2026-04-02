import { eq, and, gte, sql, gt } from 'drizzle-orm'
import { createClient } from '@osc/db'
import { siAlertConfigs, siAlerts, siMentions, siKeywordGroups } from '@osc/db'
import type { Env } from './types'

async function notifyApi(env: Env, tenantId: string, alertType: string, alertId: string, payload: Record<string, unknown>): Promise<void> {
  if (!env.API_BASE_URL || !env.INTERNAL_SECRET) return
  try {
    await fetch(`${env.API_BASE_URL}/internal/alerts/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.INTERNAL_SECRET,
      },
      body: JSON.stringify({ tenantId, alertType, alertId, payload }),
    })
  } catch (err) {
    console.error('[alerts] Failed to notify API:', err)
  }
}

export async function evaluateAlerts(
  env: Env,
  tenantId: string,
  platform: string
): Promise<void> {
  const db = createClient(env.HYPERDRIVE?.connectionString ?? env.DATABASE_URL)

  // Get alert config for this tenant
  const [config] = await db
    .select()
    .from(siAlertConfigs)
    .where(eq(siAlertConfigs.tenantId, tenantId))
    .limit(1)

  if (!config) return

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)

  // Count mentions in the last hour for this tenant+platform
  const [hourResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(siMentions)
    .where(
      and(
        eq(siMentions.tenantId, tenantId),
        eq(siMentions.platform, platform),
        gte(siMentions.publishedAt, oneHourAgo)
      )
    )
  const currentHourCount = Number(hourResult?.count ?? 0)

  // Get 7-day count for baseline hourly average
  const [weekResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(siMentions)
    .where(
      and(
        eq(siMentions.tenantId, tenantId),
        eq(siMentions.platform, platform),
        gte(siMentions.publishedAt, sevenDaysAgo)
      )
    )
  const weekCount = Number(weekResult?.count ?? 0)

  const avgHourlyCount = weekCount / (7 * 24)
  const spikeMultiplier = config.volumeSpikeMultiplier ?? 3.0

  // Volume spike alert
  if (
    avgHourlyCount > 5 &&  // Only alert if there's meaningful baseline
    currentHourCount > avgHourlyCount * spikeMultiplier
  ) {
    const spikePayload = { platform, currentHourCount, avgHourlyCount, multiplier: spikeMultiplier }
    const spikeId = await createAlert(db, tenantId, 'volume_spike', spikePayload)
    if (spikeId) await notifyApi(env, tenantId, 'volume_spike', spikeId, spikePayload)
  }

  // Competitor mention alert — fire when a competitor keyword group gets any new mention
  const competitorGroups = await db
    .select({ id: siKeywordGroups.id, name: siKeywordGroups.name })
    .from(siKeywordGroups)
    .where(
      and(
        eq(siKeywordGroups.tenantId, tenantId),
        eq(siKeywordGroups.type, 'competitor'),
        eq(siKeywordGroups.isActive, true)
      )
    )

  for (const group of competitorGroups) {
    const [compResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(siMentions)
      .where(
        and(
          eq(siMentions.tenantId, tenantId),
          eq(siMentions.keywordGroupId, group.id),
          gte(siMentions.collectedAt, oneHourAgo)
        )
      )
    const compCount = Number(compResult?.count ?? 0)
    if (compCount > 0) {
      const compPayload = {
        competitorGroupId: group.id,
        competitorName: group.name,
        mentionCount: compCount,
        platform,
        message: `${compCount} new mention${compCount > 1 ? 's' : ''} of competitor "${group.name}" on ${platform}`,
      }
      const compId = await createAlert(db, tenantId, 'competitor_mention', compPayload)
      if (compId) await notifyApi(env, tenantId, 'competitor_mention', compId, compPayload)
    }
  }

  // Crisis alert — check negative sentiment ratio in last 4 hours
  const recentMentions = await db
    .select({ sentiment: siMentions.sentiment })
    .from(siMentions)
    .where(
      and(
        eq(siMentions.tenantId, tenantId),
        gte(siMentions.publishedAt, fourHoursAgo)
      )
    )

  const crisisMinVolume = config.crisisMinVolume ?? 20
  if (recentMentions.length >= crisisMinVolume) {
    const negativeCount = recentMentions.filter(m => m.sentiment === 'negative').length
    const negativeRatio = negativeCount / recentMentions.length

    if (negativeRatio >= (config.crisisNegativeThreshold ?? 0.6)) {
      const crisisPayload = { negativeRatio, totalMentions: recentMentions.length, negativeCount }
      const crisisId = await createAlert(db, tenantId, 'crisis', crisisPayload)
      if (crisisId) await notifyApi(env, tenantId, 'crisis', crisisId, crisisPayload)
    }
  }
}

type DrizzleClient = ReturnType<typeof createClient>

async function createAlert(
  db: DrizzleClient,
  tenantId: string,
  alertType: 'volume_spike' | 'crisis' | 'competitor_mention',
  payload: Record<string, unknown>
): Promise<string | null> {
  // Don't create duplicate alerts within 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  // For competitor_mention, deduplicate per competitor group (not globally)
  const dedupeWhere = alertType === 'competitor_mention' && payload.competitorGroupId
    ? and(
        eq(siAlerts.tenantId, tenantId),
        eq(siAlerts.alertType, alertType),
        gte(siAlerts.triggeredAt, oneHourAgo),
        sql`${siAlerts.payload}->>'competitorGroupId' = ${payload.competitorGroupId as string}`
      )
    : and(
        eq(siAlerts.tenantId, tenantId),
        eq(siAlerts.alertType, alertType),
        gte(siAlerts.triggeredAt, oneHourAgo)
      )

  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(siAlerts)
    .where(dedupeWhere)

  if (Number(existing?.count ?? 0) > 0) return null  // Already alerted recently

  const [alert] = await db.insert(siAlerts).values({
    tenantId,
    alertType,
    payload,
    triggeredAt: new Date(),
  }).returning({ id: siAlerts.id })

  console.log(`[alerts] Created ${alertType} alert for tenant ${tenantId}`)
  return alert?.id ?? null
}
