import { WifiOff, Clock, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useOffline } from '@/hooks/use-offline'

interface OfflineIndicatorProps {
  /** React Query's dataUpdatedAt timestamp (ms) */
  dataUpdatedAt?: number
  /** Whether the query is currently fetching */
  isFetching?: boolean
  /** Compact mode - just an icon, no text */
  compact?: boolean
  className?: string
}

/**
 * Inline offline/stale data indicator for data-dependent components.
 * Shows:
 *   - "Offline - showing cached data" when offline with data
 *   - "Updated X ago" when data is stale
 *   - Spinning refresh icon when fetching
 */
export function OfflineIndicator({
  dataUpdatedAt,
  isFetching,
  compact,
  className,
}: OfflineIndicatorProps) {
  const { isOffline } = useOffline()

  if (isFetching && !isOffline) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-primary-400', className)}>
        <RefreshCw size={12} className="animate-spin" />
        {!compact && <span>Updating…</span>}
      </span>
    )
  }

  if (isOffline) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-amber-600', className)}>
        <WifiOff size={12} />
        {!compact && <span>Offline - cached data</span>}
      </span>
    )
  }

  // Show "stale" hint if data is older than 5 minutes
  if (dataUpdatedAt) {
    const age = Date.now() - dataUpdatedAt
    if (age > 5 * 60 * 1000) {
      const mins = Math.round(age / 60_000)
      const label = mins >= 60 ? `${Math.round(mins / 60)}h ago` : `${mins}m ago`
      return (
        <span className={cn('inline-flex items-center gap-1 text-xs text-primary-400', className)}>
          <Clock size={12} />
          {!compact ? <span>Updated {label}</span> : null}
        </span>
      )
    }
  }

  return null
}
