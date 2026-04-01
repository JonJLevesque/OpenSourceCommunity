import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-10 w-10 text-sm',
}

const imageSizeMap = {
  xs: 24,
  sm: 32,
  md: 36,
  lg: 40,
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const dim = imageSizeMap[size]
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-brand/10',
        sizeMap[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          width={dim}
          height={dim}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold text-brand">
          {getInitials(name)}
        </span>
      )}
    </div>
  )
}
