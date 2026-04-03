import type { ModuleKey } from '@/components/layout/sidebar'

// ─── Widget config types ───────────────────────────────────────────────────────

export interface WidgetConfig {
  id: string
  enabled: boolean
  order: number
  size: 'sm' | 'md' | 'lg'
}

export interface HomepageConfig {
  version: 1
  widgets: WidgetConfig[]
}

// ─── Module gate map ──────────────────────────────────────────────────────────
// null = always visible regardless of enabled modules

export const MODULE_GATE: Record<string, ModuleKey | null> = {
  'welcome':           null,
  'categories-grid':   null,
  'hot-discussions':   'forums',
  'trending-ideas':    'ideas',
  'upcoming-events':   'events',
  'recent-articles':   'kb',
  'featured-courses':  'courses',
  'upcoming-webinars': 'webinars',
  'member-spotlight':  null,
  'activity-feed':     null,
  'quick-links':       null,
}

// ─── Default layout ───────────────────────────────────────────────────────────

export const DEFAULT_HOMEPAGE_WIDGETS: WidgetConfig[] = [
  { id: 'welcome',           enabled: true, order: 0,  size: 'lg' },
  { id: 'categories-grid',   enabled: true, order: 1,  size: 'lg' },
  { id: 'hot-discussions',   enabled: true, order: 2,  size: 'md' },
  { id: 'member-spotlight',  enabled: true, order: 3,  size: 'sm' },
  { id: 'upcoming-events',   enabled: true, order: 4,  size: 'lg' },
  { id: 'trending-ideas',    enabled: true, order: 5,  size: 'md' },
  { id: 'activity-feed',     enabled: true, order: 6,  size: 'sm' },
  { id: 'recent-articles',   enabled: true, order: 7,  size: 'md' },
  { id: 'upcoming-webinars', enabled: true, order: 8,  size: 'md' },
  { id: 'featured-courses',  enabled: true, order: 9,  size: 'lg' },
]

// ─── Resolve widgets for a given tenant ──────────────────────────────────────

export function resolveWidgets(
  config: HomepageConfig | null | undefined,
  enabledModules: string[]
): WidgetConfig[] {
  const source = config?.widgets ?? DEFAULT_HOMEPAGE_WIDGETS
  return source
    .filter((w) => {
      if (!w.enabled) return false
      const gate = MODULE_GATE[w.id]
      if (gate === null || gate === undefined) return true
      return enabledModules.includes(gate)
    })
    .sort((a, b) => a.order - b.order)
}
