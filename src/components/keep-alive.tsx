import { type ReactElement, useRef, useCallback, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useSwipeBack } from '@/hooks/use-swipe-back'

const MAX_CACHED = 5

interface CachedPage {
  path: string
  element: ReactElement
  /** Increments each time we navigate TO this path — part of motion key */
  gen: number
}

/* ------------------------------------------------------------------ */
/*  First-visit tracking                                               */
/* ------------------------------------------------------------------ */

const visitedPaths = new Set<string>()

/* ------------------------------------------------------------------ */
/*  Transition configs                                                 */
/* ------------------------------------------------------------------ */

const firstVisitSpring = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 38,
  mass: 0.45,
}

const crossFade = {
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1] as readonly number[],
}

/**
 * Keeps the last N route outlets alive in the DOM so that navigating
 * back renders instantly with preserved scroll position & state.
 *
 * Transition strategy uses a grid stack:
 *  - All pages occupy the same grid cell (stacked via grid-area: 1/1)
 *  - The departing page stays visible in-flow (no absolute positioning)
 *  - The arriving page fades in on top
 *  - Once animation completes, departing hides via display:none
 *
 * This avoids the white-flash gap and layout sizing issues that come
 * from absolute positioning.
 *
 * Supports live swipe-right-from-left-edge gesture on mobile/native
 * that drags the active page to reveal the previous page underneath.
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname
  const shouldReduceMotion = useReducedMotion()

  const cacheRef = useRef<CachedPage[]>([])
  const lastProcessedRef = useRef<string | null>(null)
  const departingRef = useRef<string | null>(null)
  const [, bump] = useState(0)

  // Live swipe-back gesture — returns real-time drag offset
  const { offsetX, swiping } = useSwipeBack({ enabled: true })

  // ---- Synchronous cache update (guarded, idempotent) ----
  if (outlet && lastProcessedRef.current !== path) {
    const cache = cacheRef.current
    const oldPath = lastProcessedRef.current

    if (oldPath) departingRef.current = oldPath
    lastProcessedRef.current = path

    const existingIdx = cache.findIndex((c) => c.path === path)
    if (existingIdx >= 0) {
      const entry = cache[existingIdx]
      entry.element = outlet as ReactElement
      entry.gen++
      cache.splice(existingIdx, 1)
      cache.push(entry)
    } else {
      if (cache.length >= MAX_CACHED) cache.shift()
      cache.push({ path, element: outlet as ReactElement, gen: 0 })
    }
  } else if (outlet) {
    // Same path — just update the element ref (query data may change)
    const entry = cacheRef.current.find((c) => c.path === path)
    if (entry) entry.element = outlet as ReactElement
  }

  const handleEnterComplete = useCallback(() => {
    departingRef.current = null
    bump((n) => n + 1)
  }, [])

  const isFirstVisit = !visitedPaths.has(path)
  visitedPaths.add(path)

  const departingPath = departingRef.current

  // Identify the previous page in the cache (revealed on swipe-back)
  const cache = cacheRef.current
  const prevPage = cache.length >= 2 ? cache[cache.length - 2] : null

  // Grid stack: all children occupy the same cell (1 / 1).
  // The active page is rendered last so it's visually on top.
  // This keeps the departing page in-flow for correct sizing.
  return (
    <div
      className="flex-1 min-h-0"
      style={{ display: 'grid', gridTemplate: '1fr / 1fr', overflow: 'hidden' }}
    >
      {cache.map((cached) => {
        const isActive = cached.path === path
        const isDeparting = cached.path === departingPath && !isActive
        const isPrev = prevPage?.path === cached.path && !isActive

        // All items share the same grid cell
        const gridStyle = { gridArea: '1 / 1' } as const

        if (shouldReduceMotion) {
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0"
              style={{
                ...gridStyle,
                display: isActive ? undefined : 'none',
              }}
            >
              {cached.element}
            </div>
          )
        }

        // During a live swipe: show previous page underneath with parallax
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

        // Departing: visible in-flow behind the active page
        if (isDeparting) {
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0"
              style={{
                ...gridStyle,
                zIndex: 0,
                pointerEvents: 'none',
              }}
            >
              {cached.element}
            </div>
          )
        }

        // Inactive cached: hidden
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

        // Active page: apply live swipe offset when swiping
        const swipeTransform = swiping
          ? {
              transform: `translateX(${offsetX}px)`,
              transition: 'none',
              boxShadow: offsetX > 0 ? '-8px 0 24px -4px rgba(0,0,0,0.1)' : undefined,
            }
          : {}

        // Active: fade/slide in on top
        return (
          <motion.div
            key={`${cached.path}:${cached.gen}`}
            className="flex flex-col min-h-0"
            style={{
              ...gridStyle,
              zIndex: 1,
              backfaceVisibility: 'hidden',
              ...swipeTransform,
            }}
            initial={isFirstVisit ? { opacity: 0, y: 8 } : { opacity: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={isFirstVisit ? firstVisitSpring : crossFade}
            onAnimationComplete={handleEnterComplete}
          >
            {cached.element}
          </motion.div>
        )
      })}
    </div>
  )
}
