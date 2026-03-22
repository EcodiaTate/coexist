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
  /** Set to true on dark backgrounds so the indicator text/icon is white */
  dark?: boolean
  /** Stationary background layer — rendered behind the content and never moves.
   *  Move your decorative / sticky background here so pull-to-refresh only
   *  translates the foreground content, keeping backgrounds 100 % locked. */
  background?: ReactNode
  'aria-label'?: string
}

const THRESHOLD = 80
const MAX_PULL = 120

export function PullToRefresh({
  onRefresh,
  children,
  className,
  dark = false,
  background,
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
    const el = containerRef.current
    if (!el) return true
    // Check own scrollTop first, then walk up to find the nearest scrolling ancestor
    if (el.scrollHeight > el.clientHeight && el.scrollTop > 0) return false
    let node = el.parentElement
    while (node) {
      const { overflowY } = getComputedStyle(node)
      if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollTop > 0) return false
      node = node.parentElement
    }
    return true
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

  const active = pullDistance > 0 || refreshing
  const currentPull = active ? pullDistance : 0

  const springTransition = pulling.current
    ? { duration: 0 }
    : shouldReduceMotion
      ? { duration: 0 }
      : { type: 'spring' as const, stiffness: 280, damping: 28, mass: 0.8 }

  return (
    <div
      ref={containerRef}
      aria-label={ariaLabel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={cn('relative', className)}
    >
      {/* Background layer — completely stationary, never translated */}
      {background}

      {/* Pull indicator — absolutely positioned, revealed as content slides down */}
      {active && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-end justify-center"
          style={{ height: currentPull }}
        >
          <motion.div
            className="pb-2 flex flex-col items-center gap-1"
            animate={{ opacity: pullDistance > 10 || refreshing ? 1 : 0 }}
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
                className={dark ? 'text-white/80' : 'text-primary-400'}
              />
            </motion.div>
            <span className={cn('text-xs font-medium', dark ? 'text-white/70' : 'text-primary-400')}>
              {refreshing
                ? 'Refreshing…'
                : pastThreshold
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
            </span>
          </motion.div>
        </div>
      )}

      {/* Content — only this translates down, background stays locked */}
      <motion.div
        className="relative will-change-transform"
        animate={{ y: currentPull }}
        transition={springTransition}
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
