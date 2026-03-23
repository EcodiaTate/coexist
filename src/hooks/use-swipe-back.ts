import { useRef, useCallback, useEffect, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from './use-layout'

interface SwipeBackState {
  /** Current horizontal drag offset (0 = resting) */
  offsetX: number
  /** Whether a swipe gesture is actively in progress */
  swiping: boolean
}

interface SwipeBackOptions {
  /** Enable/disable the gesture (default: true) */
  enabled?: boolean
  /** Min horizontal distance in px to commit navigation (default: 100) */
  threshold?: number
  /** Max vertical movement before cancelling (default: 50) */
  verticalTolerance?: number
  /** Edge zone width in px — swipe must start within this zone (default: 28) */
  edgeWidth?: number
  /** Custom back handler instead of navigate(-1) */
  onBack?: () => void
  /** Existing ref to attach to (otherwise uses document) */
  targetRef?: RefObject<HTMLElement | null>
}

/**
 * Live swipe-right-from-left-edge to navigate back on mobile/native.
 * Returns real-time drag state so the UI can translate the page.
 */
export function useSwipeBack({
  enabled = true,
  threshold = 100,
  verticalTolerance = 50,
  edgeWidth = 28,
  onBack,
  targetRef,
}: SwipeBackOptions = {}): SwipeBackState {
  const navigate = useNavigate()
  const { isMobile, isNative } = useLayout()
  const [state, setState] = useState<SwipeBackState>({ offsetX: 0, swiping: false })

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

      const dy = Math.abs(touch.clientY - touchStart.current.y)
      if (dy > verticalTolerance) {
        cancelled.current = true
        setState({ offsetX: 0, swiping: false })
        return
      }

      const dx = Math.max(0, touch.clientX - touchStart.current.x)
      if (dx > 4) {
        setState({ offsetX: dx, swiping: true })
      }
    },
    [verticalTolerance],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current || cancelled.current) {
        setState({ offsetX: 0, swiping: false })
        return
      }
      const touch = e.changedTouches[0]
      if (!touch) {
        setState({ offsetX: 0, swiping: false })
        return
      }

      const dx = touch.clientX - touchStart.current.x
      touchStart.current = null

      if (dx >= threshold) {
        // Animate page fully off-screen, then navigate
        const vw = window.innerWidth || 375
        setState({ offsetX: vw, swiping: true })
        // Let the CSS transition play, then navigate
        requestAnimationFrame(() => {
          setTimeout(() => {
            setState({ offsetX: 0, swiping: false })
            if (onBack) {
              onBack()
            } else {
              navigate(-1)
            }
          }, 250)
        })
      } else {
        setState({ offsetX: 0, swiping: false })
      }
    },
    [threshold, onBack, navigate],
  )

  useEffect(() => {
    if (!active) return

    const el = targetRef?.current ?? document
    el.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true })
    el.addEventListener('touchmove', handleTouchMove as EventListener, { passive: true })
    el.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true })

    return () => {
      el.removeEventListener('touchstart', handleTouchStart as EventListener)
      el.removeEventListener('touchmove', handleTouchMove as EventListener)
      el.removeEventListener('touchend', handleTouchEnd as EventListener)
    }
  }, [active, handleTouchStart, handleTouchMove, handleTouchEnd, targetRef])

  // Return idle state if not active
  if (!active) return { offsetX: 0, swiping: false }
  return state
}
