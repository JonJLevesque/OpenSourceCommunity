import { eq, and, sql } from 'drizzle-orm'
import { createClient } from '@osc/db'
import { siKeywordGroups, siMentions } from '@osc/db'
import type { Env, Platform, RawMention } from './types'
import { classifySentiment } from './sentiment'
import { createDeduplicator } from './dedup'
import { evaluateAlerts } from './alerts'

export async function runPipeline(
  env: Env,
  platforms: Platform[],
  connector: (platform: Platform) => { fetchMentions: (keywords: string[], opts?: { since?: Date }) => AsyncGenerator<RawMention> } | null
): Promise<void> {
  const db = createClient(env.DATABASE_URL)
  const dedup = createDeduplicator(env)

  // Get all active tenant keyword configs for these platforms
  // We use `sql` array overlap operator since Drizzle doesn't have a built-in .overlaps()
  const keywordGroupRows = await db
    .select({
      id: siKeywordGroups.id,
      tenantId: siKeywordGroups.tenantId,
      terms: siKeywordGroups.terms,
      platforms: siKeywordGroups.platforms,
      type: siKeywordGroups.type,
    })
    .from(siKeywordGroups)
    .where(
      and(
        eq(siKeywordGroups.isActive, true),
        sql`${siKeywordGroups.platforms} && ${sql`ARRAY[${sql.join(platforms.map(p => sql`${p}`), sql`, `)}]::text[]`}`
      )
    )

  if (!keywordGroupRows.length) return

  // Group by tenant
  const byTenant = new Map<string, typeof keywordGroupRows>()
  for (const group of keywordGroupRows) {
    const existing = byTenant.get(group.tenantId) ?? []
    byTenant.set(group.tenantId, [...existing, group])
  }

  for (const [tenantId, groups] of byTenant) {
    for (const platform of platforms) {
      const conn = connector(platform)
      if (!conn) continue

      const relevantGroups = groups.filter(g => g.platforms.includes(platform))
      if (!relevantGroups.length) continue

      const allKeywords = [...new Set(relevantGroups.flatMap(g => g.terms))]
      const since = new Date(Date.now() - 60 * 60 * 1000)  // last hour

      const newMentions: Array<RawMention & { keywordGroupId: string }> = []

      try {
        for await (const mention of conn.fetchMentions(allKeywords, { since })) {
          // Find which keyword group this mention belongs to
          const matchedGroup = relevantGroups.find(g =>
            g.terms.some(term =>
              mention.text.toLowerCase().includes(term.toLowerCase())
            )
          )
          if (!matchedGroup) continue

          // Dedup check
          const isNew = await dedup.isNew(tenantId, platform, mention.externalId)
          if (!isNew) continue

          newMentions.push({ ...mention, keywordGroupId: matchedGroup.id })
        }
      } catch (err) {
        console.error(`[pipeline] Error fetching from ${platform} for tenant ${tenantId}:`, err)
        continue
      }

      if (!newMentions.length) continue

      // Batch sentiment classification
      const sentimentResults = await classifySentiment(env, newMentions.map(m => m.text))

      // Build rows using Drizzle column names (camelCase)
      const rows = newMentions.map((mention, i) => {
        const sentiment = sentimentResults[i]!
        return {
          tenantId,
          keywordGroupId: mention.keywordGroupId,
          platform: mention.platform,
          externalId: mention.externalId,
          authorHandle: mention.authorHandle,
          authorUrl: mention.authorUrl,
          contentUrl: mention.contentUrl,
          textPreview: mention.text.slice(0, 500),
          publishedAt: mention.publishedAt,
          sentiment: sentiment.label,
          sentimentScore: sentiment.score,
          engagementCount: mention.engagementCount ?? 0,
          rawMetadata: mention.rawMetadata,
        }
      })

      try {
        await db
          .insert(siMentions)
          .values(rows)
          .onConflictDoNothing({
            target: [siMentions.tenantId, siMentions.platform, siMentions.externalId],
          })

        console.log(`[pipeline] Wrote ${rows.length} mentions for tenant ${tenantId} from ${platform}`)
        await evaluateAlerts(env, tenantId, platform)
      } catch (err) {
        console.error(`[pipeline] DB write error for ${platform}:`, err)
      }
    }
  }
}
