import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  dark?: boolean
  background?: ReactNode
  'aria-label'?: string
}

/**
 * Pull-to-refresh is disabled app-wide — this component is now a
 * passthrough wrapper that preserves the layout (background + children)
 * without any touch gesture handling.
 */
export function PullToRefresh({
  children,
  className,
  background,
}: PullToRefreshProps) {
  return (
    <div className={cn('relative', className)}>
      {background}
      <div className="relative">{children}</div>
    </div>
  )
}
