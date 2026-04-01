import { Skeleton } from '@/components/ui/skeleton'

export default function IdeasLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <Skeleton className="h-8 w-48" />

      {/* Filter bar */}
      <Skeleton className="h-9 rounded-xl w-64" />

      {/* Idea card skeletons */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 flex gap-4">
          {/* Vote column */}
          <Skeleton className="h-12 w-10 shrink-0" />
          {/* Content */}
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
