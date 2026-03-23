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
/*  First-visit tracking                                               */
/* ------------------------------------------------------------------ */

const visitedPaths = new Set<string>()

/* ------------------------------------------------------------------ */
/*  Transition configs                                                 */
/* ------------------------------------------------------------------ */

// First visit: gentle spring slide-up
const firstVisitTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 38,
  mass: 0.45,
}

// Revisit: quick opacity-only crossfade
const revisitTransition = {
  duration: 0.14,
  ease: [0.25, 0.1, 0.25, 1] as readonly number[],
}

/**
 * Keeps the last N route outlets alive in the DOM so that navigating
 * back renders instantly with preserved scroll position & component state.
 *
 * Transition strategy:
 *  - The departing page stays fully visible (full opacity, behind)
 *  - The arriving page fades in (and optionally slides up) on top
 *  - Once the arrive animation settles, the old page goes to display:none
 *
 * This completely eliminates white-flash gaps between pages.
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname
  const shouldReduceMotion = useReducedMotion()

  // Stable cache — survives re-renders
  const cacheRef = useRef<CachedPage[]>([])
  const [, forceUpdate] = useState(0)

  // Track previous path for cross-fade layering
  const prevPathRef = useRef<string | null>(null)
  const [departingPath, setDepartingPath] = useState<string | null>(null)

  useEffect(() => {
    if (!outlet) return

    const cache = cacheRef.current
    const oldPath = prevPathRef.current

    // Mark departure for cross-fade layering
    if (oldPath && oldPath !== path) {
      setDepartingPath(oldPath)
    }

    const existingIdx = cache.findIndex((c) => c.path === path)

    if (existingIdx >= 0) {
      const [entry] = cache.splice(existingIdx, 1)
      entry.element = outlet as ReactElement
      cache.push(entry)
    } else {
      if (cache.length >= MAX_CACHED) {
        cache.shift()
      }
      cache.push({ path, element: outlet as ReactElement })
    }

    prevPathRef.current = path
    forceUpdate((n) => n + 1)
  }, [path, outlet])

  // Once enter animation completes, hide the departing page
  const handleEnterComplete = () => {
    setDepartingPath(null)
  }

  // Check first-visit status
  const isFirstVisit = !visitedPaths.has(path)
  if (!visitedPaths.has(path)) {
    visitedPaths.add(path)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {cacheRef.current.map((cached) => {
        const isActive = cached.path === path
        const isDeparting = cached.path === departingPath && !isActive

        /* ---- Reduced motion: instant swap ---- */
        if (shouldReduceMotion) {
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

        /* ---- Departing page: stays fully visible BEHIND until enter finishes ---- */
        if (isDeparting) {
          return (
            <div
              key={cached.path}
              className="flex-1 flex flex-col min-h-0 absolute inset-0 z-0"
              style={{ pointerEvents: 'none' }}
            >
              {cached.element}
            </div>
          )
        }

        /* ---- Inactive cached page: hidden ---- */
        if (!isActive) {
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

        /* ---- Active page: fade/slide in on top ---- */
        return (
          <motion.div
            key={cached.path}
            className="flex-1 flex flex-col min-h-0 relative z-10"
            initial={
              isFirstVisit
                ? { opacity: 0, y: 8 }
                : { opacity: 0 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={isFirstVisit ? firstVisitTransition : revisitTransition}
            onAnimationComplete={handleEnterComplete}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {cached.element}
          </motion.div>
        )
      })}
    </div>
  )
}
