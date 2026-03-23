import { useRef, useCallback, useEffect, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from './use-layout'

interface SwipeBackOptions {
  /** Enable/disable the gesture (default: true) */
  enabled?: boolean
  /** Min horizontal distance in px to trigger navigation (default: 80) */
  threshold?: number
  /** Max vertical movement before cancelling (default: 60) */
  verticalTolerance?: number
  /** Edge zone width in px — swipe must start within this zone (default: 32) */
  edgeWidth?: number
  /** Custom back handler instead of navigate(-1) */
  onBack?: () => void
  /** Existing ref to attach to (otherwise creates its own) */
  targetRef?: RefObject<HTMLElement | null>
}

/**
 * Enables swipe-right-from-left-edge to navigate back on mobile/native.
 * Attach to a container element via the returned ref, or pass targetRef.
 */
export function useSwipeBack({
  enabled = true,
  threshold = 80,
  verticalTolerance = 60,
  edgeWidth = 32,
  onBack,
  targetRef,
}: SwipeBackOptions = {}) {
  const navigate = useNavigate()
  const { isMobile, isNative } = useLayout()
  const ownRef = useRef<HTMLElement>(null)
  const ref = targetRef ?? ownRef
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const cancelled = useRef(false)

  const active = enabled && (isMobile || isNative)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      if (touch.clientX <= edgeWidth) {
        touchStart.current = { x: touch.clientX, y: touch.clientY }
        cancelled.current = false
      } else {
        touchStart.current = null
      }
    },
    [edgeWidth],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current || cancelled.current) return
      const touch = e.touches[0]
      if (!touch) return
      if (Math.abs(touch.clientY - touchStart.current.y) > verticalTolerance) {
        cancelled.current = true
      }
    },
    [verticalTolerance],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current || cancelled.current) return
      const touch = e.changedTouches[0]
      if (!touch) return
      if (touch.clientX - touchStart.current.x >= threshold) {
        if (onBack) {
          onBack()
        } else {
          navigate(-1)
        }
      }
      touchStart.current = null
    },
    [threshold, onBack, navigate],
  )

  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: true })
    el.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  }, [active, handleTouchStart, handleTouchMove, handleTouchEnd, ref])

  return ref
}
