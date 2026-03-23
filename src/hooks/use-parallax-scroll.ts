import { useEffect, useLayoutEffect, useRef } from 'react'
import { useMotionValue, useTransform, type MotionValue } from 'framer-motion'

/**
 * Robust scroll-tracking hook for parallax heroes.
 *
 * Tracks whichever of `window` or `#main-content` is actually scrolling
 * (mobile uses the inner container, desktop uses window).
 *
 * Handles React-Router remounts correctly by:
 * - Using useLayoutEffect to grab the container before paint
 * - Seeding the motion value with the *current* scroll position (not 0)
 * - Cleaning up listeners on unmount
 */
export function useParallaxScroll(): MotionValue<number> {
  const scrollY = useMotionValue(0)
  const containerRef = useRef<HTMLElement | null>(null)

  // Grab container ref synchronously before paint
  useLayoutEffect(() => {
    containerRef.current = document.getElementById('main-content')
  })

  useEffect(() => {
    const el = containerRef.current

    // Seed with current scroll position so parallax is correct on remount
    const w = window.scrollY
    const c = el ? el.scrollTop : 0
    scrollY.set(Math.max(w, c))

    const onScroll = () => {
      const winY = window.scrollY
      const containerY = el ? el.scrollTop : 0
      scrollY.set(Math.max(winY, containerY))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    el?.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      el?.removeEventListener('scroll', onScroll)
    }
    // Re-subscribe when the motion value identity changes (it won't, but for safety)
  }, [scrollY])

  return scrollY
}

/** Pre-built parallax transforms for the standard 3-layer hero */
export function useParallaxLayers(scrollY: MotionValue<number>, opts?: {
  textRange?: number
  bgRange?: number
  fgRange?: number
  withScale?: boolean
  withOpacity?: boolean
}) {
  const {
    textRange = 120,
    bgRange = 80,
    fgRange = 25,
    withScale = true,
    withOpacity = false,
  } = opts ?? {}

  const bgY = useTransform(scrollY, [0, 500], [0, bgRange])
  const bgScale = useTransform(scrollY, [0, 400], [1, withScale ? 1.08 : 1])
  const fgY = useTransform(scrollY, [0, 500], [0, fgRange])
  const textY = useTransform(scrollY, [0, 500], [0, textRange])
  const textOpacity = useTransform(scrollY, [0, 300], [1, withOpacity ? 0 : 1])

  return { bgY, bgScale, fgY, textY, textOpacity }
}
