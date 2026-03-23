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
 * page layers on top. Inactive pages use display:none.
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

  const { offsetX, swiping } = useSwipeBack({ enabled: true })

  // ---- Synchronous cache update (guarded, idempotent) ----
  if (outlet && lastProcessedRef.current !== path) {
    const cache = cacheRef.current
    lastProcessedRef.current = path

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
  } else if (outlet) {
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

        // Inactive: hidden
        if (!isActive) {
          return (
            <div
              key={cached.path}
              className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
              style={{ ...gridStyle, display: 'none' }}
            >
              {cached.element}
            </div>
          )
        }

        // Active page
        const vw = typeof window !== 'undefined' ? window.innerWidth || 375 : 375
        const isCompleting = swiping && offsetX >= vw
        const swipeStyle = swiping
          ? {
              transform: `translateX(${offsetX}px)`,
              transition: isCompleting ? 'transform 250ms ease-out' : ('none' as const),
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
