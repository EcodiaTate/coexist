import { type ReactElement, useRef, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

const MAX_CACHED = 5

interface CachedPage {
  /** Pathname used as cache key (without search/hash) */
  path: string
  /** The frozen outlet element for this route */
  element: ReactElement
}

/* ------------------------------------------------------------------ */
/*  Transition config — GPU-composited only (opacity + translateY)     */
/* ------------------------------------------------------------------ */

const pageVariants = {
  enter: {
    opacity: 1,
    y: 0,
    willChange: 'opacity, transform' as const,
  },
  exit: {
    opacity: 0,
    y: -4,
    willChange: 'opacity, transform' as const,
  },
}

const enterTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 36,
  mass: 0.5,
}

const exitTransition = {
  duration: 0.12,
  ease: [0.4, 0, 1, 1] as readonly number[],
}

/* ------------------------------------------------------------------ */
/*  First-visit tracking                                               */
/* ------------------------------------------------------------------ */

const visitedPaths = new Set<string>()

/**
 * Keeps the last N route outlets alive in the DOM so that navigating
 * back renders instantly with preserved scroll position & component state.
 *
 * Active page fades/slides in; departing page fades out.
 * Cached (hidden) pages use `display: none` to avoid paint cost.
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname
  const shouldReduceMotion = useReducedMotion()

  // Stable cache — survives re-renders
  const cacheRef = useRef<CachedPage[]>([])
  const [, forceUpdate] = useState(0)

  // Track previous path for transition direction
  const prevPathRef = useRef(path)

  useEffect(() => {
    if (!outlet) return

    const cache = cacheRef.current
    const existingIdx = cache.findIndex((c) => c.path === path)

    if (existingIdx >= 0) {
      // Move to end (most recently visited) and update element
      const [entry] = cache.splice(existingIdx, 1)
      entry.element = outlet as ReactElement
      cache.push(entry)
    } else {
      // New entry — evict oldest if over limit
      if (cache.length >= MAX_CACHED) {
        cache.shift()
      }
      cache.push({ path, element: outlet as ReactElement })
    }

    prevPathRef.current = path
    forceUpdate((n) => n + 1)
  }, [path, outlet])

  // Track whether this is a first visit for the current path
  const isFirstVisit = !visitedPaths.has(path)
  if (!visitedPaths.has(path)) {
    visitedPaths.add(path)
  }

  // Determine initial state for the incoming page
  const initialState = shouldReduceMotion
    ? undefined
    : isFirstVisit
      ? { opacity: 0, y: 8 }
      : { opacity: 0.92, y: 0 }

  return (
    <>
      {cacheRef.current.map((cached) => {
        const isActive = cached.path === path

        if (shouldReduceMotion) {
          // No animation — simple show/hide
          return (
            <div
              key={cached.path}
              className="flex-1 flex flex-col min-h-0"
              style={{ display: isActive ? undefined : 'none' }}
            >
              {cached.element}
            </div>
          )
        }

        if (!isActive) {
          // Hidden cached page — no animation, just hidden
          return (
            <div
              key={cached.path}
              className="flex-1 flex flex-col min-h-0"
              style={{ display: 'none' }}
            >
              {cached.element}
            </div>
          )
        }

        // Active page — animate in
        return (
          <motion.div
            key={cached.path}
            className="flex-1 flex flex-col min-h-0"
            style={{ backfaceVisibility: 'hidden' }}
            initial={initialState}
            animate={pageVariants.enter}
            transition={enterTransition}
          >
            {cached.element}
          </motion.div>
        )
      })}
    </>
  )
}
