import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { WidgetConfig } from './types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WidgetShellProps {
  title: string
  icon?: React.ReactNode
  href?: string
  hrefLabel?: string
  size: WidgetConfig['size']
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

// ─── Grid span classes ────────────────────────────────────────────────────────

const spanClass: Record<WidgetConfig['size'], string> = {
  sm: 'col-span-1',
  md: 'col-span-1 md:col-span-2 lg:col-span-2',
  lg: 'col-span-1 md:col-span-2 lg:col-span-3',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WidgetShell({
  title,
  icon,
  href,
  hrefLabel = 'View all',
  size,
  children,
  className,
  contentClassName,
}: WidgetShellProps) {
  return (
    <Card className={cn('flex flex-col hover:shadow-md transition-shadow', spanClass[size], className)}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              {icon}
            </div>
          )}
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </CardTitle>
        </div>
        {href && (
          <Link
            href={href}
            className="group flex items-center gap-1 text-xs font-medium text-brand hover:text-brand transition-colors"
          >
            {hrefLabel}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className={cn('flex-1 pt-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

// ─── Footer variant (for widgets that need a distinct CTA footer) ─────────────

interface WidgetShellWithFooterProps extends WidgetShellProps {
  footerContent: React.ReactNode
}

export function WidgetShellWithFooter({
  footerContent,
  ...props
}: WidgetShellWithFooterProps) {
  return (
    <Card className={cn('flex flex-col hover:shadow-md transition-shadow', spanClass[props.size], props.className)}>
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          {props.icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 text-brand">
              {props.icon}
            </div>
          )}
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {props.title}
          </CardTitle>
        </div>
        {props.href && (
          <Link
            href={props.href}
            className="group flex items-center gap-1 text-xs font-medium text-brand hover:text-brand transition-colors"
          >
            {props.hrefLabel ?? 'View all'}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </CardHeader>
      <CardContent className={cn('flex-1 pt-0', props.contentClassName)}>
        {props.children}
      </CardContent>
      <CardFooter className="pt-3">
        {footerContent}
      </CardFooter>
    </Card>
  )
}
