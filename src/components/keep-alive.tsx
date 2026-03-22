import { type ReactElement, useRef, useEffect, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

const MAX_CACHED = 5

interface CachedPage {
  /** Pathname used as cache key (without search/hash) */
  path: string
  /** The frozen outlet element for this route */
  element: ReactElement
}

/**
 * Keeps the last N route outlets alive in the DOM (hidden) so that
 * navigating back renders instantly with no re-mount or data refetch.
 *
 * Only the active route is visible — cached routes are hidden via
 * CSS `display: none` which preserves scroll position, DOM state,
 * and React component state (including hooks / query caches).
 */
export function KeepAlive() {
  const location = useLocation()
  const outlet = useOutlet()
  const path = location.pathname

  // Stable cache — survives re-renders
  const cacheRef = useRef<CachedPage[]>([])
  const [, forceUpdate] = useState(0)

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

    forceUpdate((n) => n + 1)
  }, [path, outlet])

  return (
    <>
      {cacheRef.current.map((cached) => (
        <div
          key={cached.path}
          className="flex-1 flex flex-col min-h-0"
          style={{ display: cached.path === path ? undefined : 'none' }}
        >
          {cached.element}
        </div>
      ))}
    </>
  )
}
