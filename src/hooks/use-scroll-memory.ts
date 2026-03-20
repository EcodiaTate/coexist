import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const scrollPositions = new Map<string, number>()

/**
 * Remembers scroll position when navigating away and restores it on return.
 * Attach the returned ref to the scrollable container.
 */
export function useScrollMemory<T extends HTMLElement = HTMLDivElement>() {
  const location = useLocation()
  const ref = useRef<T>(null)
  const key = location.key ?? location.pathname

  // Restore position on mount
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const saved = scrollPositions.get(key)
    if (saved !== undefined) {
      el.scrollTop = saved
    }
  }, [key])

  // Save position on unmount
  useEffect(() => {
    const el = ref.current
    return () => {
      if (el) {
        scrollPositions.set(key, el.scrollTop)
      }
    }
  }, [key])

  return ref
}
