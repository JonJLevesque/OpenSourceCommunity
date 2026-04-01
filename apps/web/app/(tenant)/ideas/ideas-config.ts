// Shared types and config used by both server pages and client components.
// Must NOT have 'use client' — it's a plain module.

export type IdeaStatus =
  | 'new'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'shipped'
  | 'declined'

export const STATUS_CONFIG: Record<IdeaStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  under_review: { label: 'Under review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  planned: { label: 'Planned', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  in_progress: { label: 'In progress', className: 'bg-brand/5 text-brand border-brand/20' },
  shipped: { label: 'Shipped', className: 'bg-green-50 text-green-700 border-green-200' },
  declined: { label: 'Declined', className: 'bg-muted text-muted-foreground border-border' },
}
