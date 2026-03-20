import {
  type ReactNode,
  useState,
  useRef,
  useCallback,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  'aria-label'?: string
}

const THRESHOLD = 80
const MAX_PULL = 120

export function PullToRefresh({
  onRefresh,
  children,
  className,
  'aria-label': ariaLabel = 'Pull to refresh',
}: PullToRefreshProps) {
  const shouldReduceMotion = useReducedMotion()
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const pulling = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const pastThreshold = pullDistance >= THRESHOLD

  const isAtScrollTop = useCallback(() => {
    if (!containerRef.current) return true
    return containerRef.current.scrollTop <= 0
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (refreshing) return
      if (!isAtScrollTop()) return
      touchStartY.current = e.touches[0].clientY
      pulling.current = true
    },
    [refreshing, isAtScrollTop],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || refreshing) return
      if (!isAtScrollTop()) {
        pulling.current = false
        setPullDistance(0)
        return
      }

      const delta = e.touches[0].clientY - touchStartY.current
      if (delta > 0) {
        // Apply resistance curve
        const dampened = Math.min(delta * 0.5, MAX_PULL)
        setPullDistance(dampened)
      }
    },
    [refreshing, isAtScrollTop],
  )

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing) return
    pulling.current = false

    if (pastThreshold) {
      setRefreshing(true)
      setPullDistance(THRESHOLD * 0.6)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullDistance(0)
      }
    } else {
      setPullDistance(0)
    }
  }, [pastThreshold, onRefresh, refreshing])

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('relative overflow-y-auto', className)}
    >
      {/* Pull indicator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-center overflow-hidden"
        style={{ height: pullDistance > 0 || refreshing ? pullDistance : 0 }}
      >
        <motion.div
          className="mt-3 flex flex-col items-center gap-1"
          animate={{
            opacity: pullDistance > 10 || refreshing ? 1 : 0,
          }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }}
        >
          <motion.div
            animate={{
              rotate: refreshing ? 360 : progress * 180,
              scale: refreshing ? 1 : 0.6 + progress * 0.4,
            }}
            transition={
              refreshing
                ? { repeat: Infinity, duration: 1, ease: 'linear' }
                : shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 300, damping: 20 }
            }
          >
            <Sprout
              size={24}
              className={cn(
                'transition-colors duration-150',
                pastThreshold || refreshing
                  ? 'text-primary-400'
                  : 'text-primary-400',
              )}
            />
          </motion.div>
          <span
            className={cn(
              'text-xs font-medium transition-colors duration-150',
              pastThreshold || refreshing
                ? 'text-primary-400'
                : 'text-primary-400',
            )}
          >
            {refreshing
              ? 'Refreshing...'
              : pastThreshold
                ? 'Release to refresh'
                : 'Pull to refresh'}
          </span>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        animate={{ y: pullDistance > 0 || refreshing ? pullDistance : 0 }}
        transition={
          pulling.current
            ? { duration: 0 }
            : shouldReduceMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 30 }
        }
      >
        {children}
      </motion.div>

      {/* Live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {refreshing ? 'Refreshing content' : ''}
      </div>
    </div>
  )
}
