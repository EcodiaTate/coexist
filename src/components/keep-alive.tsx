import { type ReactElement, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { useSwipeBack } from '@/hooks/use-swipe-back'

const MAX_CACHED = 5

interface CachedPage {
  path: string
  element: ReactElement
}

/**
 * Keeps the last N route outlets alive in the DOM so that navigating
 * back renders instantly with preserved scroll position & state.
 *
 * All pages occupy the same grid cell (grid-area: 1/1) so the active
 * page layers on top. Inactive pages use visibility:hidden.
 *
 * No enter/exit animations here — instant show/hide. Individual pages
 * own their internal entrance animations (staggered lists, hero fades,
 * etc.). This keeps transitions rock-solid with zero flicker.
 *
 * Supports swipe-right-from-left-edge on mobile/native.
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname

  const cacheRef = useRef<CachedPage[]>([])
  const lastProcessedRef = useRef<string | null>(null)
  const historyStack = useRef<string[]>([])

  const { offsetX, swiping, animating } = useSwipeBack({ enabled: true })

  // ---- Detect back-navigation ----
  // If the path we're navigating TO is the previous entry in our stack,
  // this is a back-nav. We should reuse the cached element (preserving
  // scroll and component state) rather than replacing it with a fresh outlet.
  let isBackNav = false
  if (lastProcessedRef.current !== path) {
    const stack = historyStack.current
    if (stack.length >= 2 && stack[stack.length - 2] === path) {
      isBackNav = true
      stack.pop() // remove the page we're leaving
    } else {
      stack.push(path)
    }
  }

  // ---- Synchronous cache update (guarded, idempotent) ----
  if (outlet && lastProcessedRef.current !== path) {
    const cache = cacheRef.current
    lastProcessedRef.current = path

    const existingIdx = cache.findIndex((c) => c.path === path)
    if (existingIdx >= 0) {
      const entry = cache[existingIdx]
      // On back-nav: keep the cached element — preserves scroll & state.
      // On forward re-visit: update with fresh outlet.
      if (!isBackNav) {
        entry.element = outlet as ReactElement
      }
      cache.splice(existingIdx, 1)
      cache.push(entry)
    } else {
      if (cache.length >= MAX_CACHED) cache.shift()
      cache.push({ path, element: outlet as ReactElement })
    }
  } else if (outlet && !isBackNav) {
    // Same path — update element ref (query data / Suspense resolution)
    const entry = cacheRef.current.find((c) => c.path === path)
    if (entry) entry.element = outlet as ReactElement
  }

  const cache = cacheRef.current
  const prevPage = cache.length >= 2 ? cache[cache.length - 2] : null

  return (
    <div
      className="flex-1 min-h-0 min-w-0 max-w-full"
      style={{ display: 'grid', gridTemplate: '1fr / 1fr', overflowX: 'clip' }}
    >
      {cache.map((cached) => {
        const isActive = cached.path === path
        const isPrev = prevPage?.path === cached.path && !isActive
        const gridStyle = { gridArea: '1 / 1' } as const

        // During swipe: show previous page underneath — fully visible, no movement
        if (isPrev && swiping) {
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
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

        // Inactive: hidden but still in layout so scrollTop is preserved.
        // visibility:hidden + pointer-events:none keeps the element in the
        // rendering tree (scrollTop survives) while the browser skips painting.
        if (!isActive) {
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
              style={{
                ...gridStyle,
                visibility: 'hidden',
                pointerEvents: 'none',
                zIndex: -1,
              }}
            >
              {cached.element}
            </div>
          )
        }

        // Active page
        const swipeStyle = swiping
          ? {
              transform: `translateX(${offsetX}px)`,
              // During active drag: no transition (instant tracking).
              // During animating (commit or spring-back): smooth ease-out.
              transition: animating ? 'transform 250ms ease-out' : ('none' as const),
              boxShadow: offsetX > 0 ? '-8px 0 24px -4px rgba(0,0,0,0.1)' : undefined,
            }
          : {}

        return (
          <div
            key={cached.path}
            className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
            style={{ ...gridStyle, zIndex: 1, ...swipeStyle }}
          >
            {cached.element}
          </div>
        )
      })}
    </div>
  )
}
