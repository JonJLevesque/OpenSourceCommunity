import * as React from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon?: string | React.ReactNode
  highlight?: boolean
  className?: string
}

export function StatCard({ label, value, icon, highlight = false, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        highlight ? 'border-red-200 bg-red-50' : 'border-border bg-card',
        className
      )}
    >
      {icon && <div className="text-2xl">{icon}</div>}
      <p
        className={cn(
          'mt-2 text-2xl font-bold',
          highlight ? 'text-red-700' : 'text-surface-foreground'
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
