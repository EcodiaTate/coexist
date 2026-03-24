import {
  type ReactElement,
  type ReactNode,
  useRef,
  useEffect,
  useMemo,
} from 'react'
import {
  useLocation,
  useOutlet,
  UNSAFE_LocationContext as LocationContext,
  UNSAFE_RouteContext as RouteContext,
} from 'react-router'
import { useSwipeBack } from '@/hooks/use-swipe-back'

const MAX_CACHED = 5

interface CachedPage {
  path: string
  element: ReactElement
  /** Saved scrollTop of the #main-content element inside this page */
  savedScroll: number
}

/** Find the #main-content scroll container inside a wrapper div */
function getScrollEl(wrapper: HTMLDivElement | null): HTMLElement | null {
  return wrapper?.querySelector('#main-content') as HTMLElement | null
}

/**
 * Freezes the React Router location context for its children.
 * This prevents cached pages from re-rendering when the global
 * route changes — they keep seeing the location from when they
 * were first created.
 */
function FrozenRouter({ location, children }: { location: ReturnType<typeof useLocation>; children: ReactNode }) {
  const locationCtx = useMemo(() => ({ location, navigationType: 'POP' as const }), [location])
  return (
    <LocationContext.Provider value={locationCtx}>
      {children}
    </LocationContext.Provider>
  )
}

/**
 * Keeps the last N route outlets alive in the DOM so that navigating
 * back renders instantly with preserved scroll position & state.
 *
 * Each cached page is wrapped in a frozen location context so it
 * doesn't re-render when the active route changes. Scroll position
 * is captured before hiding (display:none resets scrollTop) and
 * restored when the page becomes visible again.
 *
 * Supports swipe-right-from-left-edge on mobile/native.
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname

  const cacheRef = useRef<CachedPage[]>([])
  const lastProcessedRef = useRef<string | null>(null)
  const wrappersRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const prevPathRef = useRef<string | null>(null)
  const swipeRestoredRef = useRef<string | null>(null)
  // Frozen location per cached page — so back-nav doesn't re-render page contents
  const frozenLocationsRef = useRef<Map<string, ReturnType<typeof useLocation>>>(new Map())

  const { offsetX, swiping, animating } = useSwipeBack({ enabled: true })

  // ---- Save scroll from the page we're leaving ----
  const prevPath = prevPathRef.current
  if (prevPath && prevPath !== path) {
    const scrollEl = getScrollEl(wrappersRef.current.get(prevPath) ?? null)
    const entry = cacheRef.current.find((c) => c.path === prevPath)
    if (scrollEl && entry) {
      entry.savedScroll = scrollEl.scrollTop
    }
  }
  prevPathRef.current = path

  // ---- Synchronous cache update ----
  if (outlet && lastProcessedRef.current !== path) {
    const cache = cacheRef.current
    lastProcessedRef.current = path

    const existingIdx = cache.findIndex((c) => c.path === path)
    if (existingIdx >= 0) {
      // Back-nav or re-visit: reuse cached element, don't replace
      const entry = cache[existingIdx]
      cache.splice(existingIdx, 1)
      cache.push(entry)
    } else {
      // New page: cache the outlet and freeze the current location for it
      frozenLocationsRef.current.set(path, { ...location })
      if (cache.length >= MAX_CACHED) {
        const evicted = cache.shift()
        if (evicted) frozenLocationsRef.current.delete(evicted.path)
      }
      cache.push({ path, element: outlet as ReactElement, savedScroll: 0 })
    }
  }
  // Note: we intentionally do NOT update cached elements on re-renders.
  // The frozen location context ensures the cached page tree is stable.

  // ---- Restore scroll on the active page after it becomes visible ----
  useEffect(() => {
    const entry = cacheRef.current.find((c) => c.path === path)
    if (!entry || entry.savedScroll === 0) return
    const scrollEl = getScrollEl(wrappersRef.current.get(path) ?? null)
    if (!scrollEl) return
    // Double-rAF to wait for display:none → visible repaint
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollEl.scrollTop = entry.savedScroll
      })
    })
  }, [path])

  // ---- Restore scroll on the swipe-preview page when it first appears ----
  const cache = cacheRef.current
  const prevPage = cache.length >= 2 ? cache[cache.length - 2] : null

  useEffect(() => {
    if (!swiping || !prevPage) {
      swipeRestoredRef.current = null
      return
    }
    if (swipeRestoredRef.current === prevPage.path) return
    swipeRestoredRef.current = prevPage.path

    if (prevPage.savedScroll === 0) return
    const scrollEl = getScrollEl(wrappersRef.current.get(prevPage.path) ?? null)
    if (!scrollEl) return
    requestAnimationFrame(() => {
      scrollEl.scrollTop = prevPage.savedScroll
    })
  }, [swiping, prevPage])

  return (
    <div
      className="flex-1 min-h-0 min-w-0 max-w-full"
      style={{ display: 'grid', gridTemplate: '1fr / 1fr', overflowX: 'clip' }}
    >
      {cache.map((cached) => {
        const isActive = cached.path === path
        const isPrev = prevPage?.path === cached.path && !isActive
        const gridStyle = { gridArea: '1 / 1' } as const
        const frozenLocation = frozenLocationsRef.current.get(cached.path) ?? location
        const ref = (el: HTMLDivElement | null) => {
          if (el) wrappersRef.current.set(cached.path, el)
        }

        // During swipe: show previous page underneath
        if (isPrev && swiping) {
          return (
            <div
              key={cached.path}
              ref={ref}
              className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
              style={{ ...gridStyle, zIndex: 0, pointerEvents: 'none' }}
            >
              <FrozenRouter location={frozenLocation}>
                {cached.element}
              </FrozenRouter>
            </div>
          )
        }

        // Inactive: hidden
        if (!isActive) {
          return (
            <div
              key={cached.path}
              ref={ref}
              className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
              style={{ ...gridStyle, display: 'none' }}
            >
              <FrozenRouter location={frozenLocation}>
                {cached.element}
              </FrozenRouter>
            </div>
          )
        }

        // Active page
        const swipeStyle = swiping
          ? {
              transform: `translateX(${offsetX}px)`,
              transition: animating ? 'transform 250ms ease-out' : ('none' as const),
              boxShadow: offsetX > 0 ? '-8px 0 24px -4px rgba(0,0,0,0.1)' : undefined,
            }
          : {}

        return (
          <div
            key={cached.path}
            ref={ref}
            className="flex flex-col min-h-0 min-w-0 overflow-x-clip"
            style={{ ...gridStyle, zIndex: 1, ...swipeStyle }}
          >
            <FrozenRouter location={frozenLocation}>
              {cached.element}
            </FrozenRouter>
          </div>
        )
      })}
    </div>
  )
}
