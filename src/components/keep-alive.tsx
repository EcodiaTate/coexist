import { type ReactElement, useRef, useCallback, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useSwipeBack } from '@/hooks/use-swipe-back'

const MAX_CACHED = 5

interface CachedPage {
  path: string
  element: ReactElement
}

/* ------------------------------------------------------------------ */
/*  First-visit tracking                                               */
/* ------------------------------------------------------------------ */

const visitedPaths = new Set<string>()

/* ------------------------------------------------------------------ */
/*  Enter animation for first-visit pages only                         */
/* ------------------------------------------------------------------ */

const firstVisitSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 38,
  mass: 0.45,
}

/**
 * Keeps the last N route outlets alive in the DOM so that navigating
 * back renders instantly with preserved scroll position & state.
 *
 * Strategy:
 *  - Grid stack: all pages in same cell via grid-area 1/1
 *  - Active page is simply visible; inactive pages use display:none
 *  - First visit of a NEW page: gentle spring slide-up via motion.div
 *  - Revisits (cached pages): INSTANT swap, no animation
 *    (the page is already rendered — just flip visibility)
 *  - No departing-page animation = no opacity:0 gap = no white flash
 *
 * Supports swipe-right-from-left-edge on mobile/native.
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname
  const shouldReduceMotion = useReducedMotion()

  const cacheRef = useRef<CachedPage[]>([])
  const lastProcessedRef = useRef<string | null>(null)
  // Track which path is currently doing its first-visit entrance
  const enteringRef = useRef<string | null>(null)
  const [, bump] = useState(0)

  const { offsetX, swiping } = useSwipeBack({ enabled: true })

  // ---- Synchronous cache update (guarded, idempotent) ----
  let isFirstVisit = false
  if (outlet && lastProcessedRef.current !== path) {
    const cache = cacheRef.current
    lastProcessedRef.current = path

    isFirstVisit = !visitedPaths.has(path)
    visitedPaths.add(path)

    const existingIdx = cache.findIndex((c) => c.path === path)
    if (existingIdx >= 0) {
      const entry = cache[existingIdx]
      entry.element = outlet as ReactElement
      cache.splice(existingIdx, 1)
      cache.push(entry)
    } else {
      if (cache.length >= MAX_CACHED) cache.shift()
      cache.push({ path, element: outlet as ReactElement })
    }

    // Only animate entrance for genuinely new pages
    enteringRef.current = isFirstVisit && !shouldReduceMotion ? path : null
  } else if (outlet) {
    const entry = cacheRef.current.find((c) => c.path === path)
    if (entry) entry.element = outlet as ReactElement
  }

  const handleEnterComplete = useCallback(() => {
    enteringRef.current = null
    bump((n) => n + 1)
  }, [])

  const cache = cacheRef.current
  const prevPage = cache.length >= 2 ? cache[cache.length - 2] : null
  const isEntering = enteringRef.current === path

  return (
    <div
      className="flex-1 min-h-0"
      style={{ display: 'grid', gridTemplate: '1fr / 1fr', overflow: 'hidden' }}
    >
      {cache.map((cached) => {
        const isActive = cached.path === path
        const isPrev = prevPage?.path === cached.path && !isActive
        const gridStyle = { gridArea: '1 / 1' } as const

        // ---- During swipe: show previous page underneath ----
        if (isPrev && swiping) {
          const vw = window.innerWidth || 375
          const progress = Math.min(offsetX / vw, 1)
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0"
              style={{
                ...gridStyle,
                zIndex: 0,
                pointerEvents: 'none',
                transform: `translateX(${-70 + progress * 70}px)`,
                opacity: 0.5 + progress * 0.5,
              }}
            >
              {cached.element}
            </div>
          )
        }

        // ---- Inactive: hidden ----
        if (!isActive) {
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0"
              style={{ ...gridStyle, display: 'none' }}
            >
              {cached.element}
            </div>
          )
        }

        // ---- Active + first-visit entrance animation ----
        if (isEntering) {
          const swipeTransform = swiping
            ? {
                transform: `translateX(${offsetX}px)`,
                transition: 'none',
                boxShadow: offsetX > 0 ? '-8px 0 24px -4px rgba(0,0,0,0.1)' : undefined,
              }
            : {}

          return (
            <motion.div
              key={cached.path}
              className="flex flex-col min-h-0"
              style={{
                ...gridStyle,
                zIndex: 1,
                backfaceVisibility: 'hidden',
                ...swipeTransform,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={firstVisitSpring}
              onAnimationComplete={handleEnterComplete}
            >
              {cached.element}
            </motion.div>
          )
        }

        // ---- Active + revisit: instant, no animation ----
        const swipeTransform = swiping
          ? {
              transform: `translateX(${offsetX}px)`,
              transition: 'none',
              boxShadow: offsetX > 0 ? '-8px 0 24px -4px rgba(0,0,0,0.1)' : undefined,
            }
          : {}

        return (
          <div
            key={cached.path}
            className="flex flex-col min-h-0"
            style={{
              ...gridStyle,
              zIndex: 1,
              ...swipeTransform,
            }}
          >
            {cached.element}
          </div>
        )
      })}
    </div>
  )
}
