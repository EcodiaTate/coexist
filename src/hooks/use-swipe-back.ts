import { useRef, useCallback, useEffect, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLayout } from './use-layout'

interface SwipeBackState {
  /** Current horizontal drag offset (0 = resting) */
  offsetX: number
  /** Whether a swipe gesture is actively in progress */
  swiping: boolean
  /** Whether the page is animating to committed/cancelled position */
  animating: boolean
}

interface SwipeBackOptions {
  /** Enable/disable the gesture (default: true) */
  enabled?: boolean
  /** Fraction of screen width to commit navigation on release (default: 0.35) */
  commitFraction?: number
  /** Min velocity (px/ms) to commit even below commitFraction (default: 0.4) */
  velocityThreshold?: number
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
 *
 * The user can hold the page at any position mid-drag — only releasing
 * commits or cancels. Commitment is based on either the drag fraction
 * of screen width OR the release velocity, whichever triggers first.
 */
export function useSwipeBack({
  enabled = true,
  commitFraction = 0.35,
  velocityThreshold = 0.4,
  verticalTolerance = 50,
  edgeWidth = 28,
  onBack,
  targetRef,
}: SwipeBackOptions = {}): SwipeBackState {
  const navigate = useNavigate()
  const { isMobile, isNative } = useLayout()
  const [state, setState] = useState<SwipeBackState>({ offsetX: 0, swiping: false, animating: false })

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const lastMove = useRef<{ x: number; t: number } | null>(null)
  const cancelled = useRef(false)
  const active = enabled && (isMobile || isNative)

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      if (touch.clientX <= edgeWidth) {
        touchStart.current = { x: touch.clientX, y: touch.clientY, t: Date.now() }
        lastMove.current = { x: touch.clientX, t: Date.now() }
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
        setState({ offsetX: 0, swiping: false, animating: false })
        return
      }

      const dx = Math.max(0, touch.clientX - touchStart.current.x)
      lastMove.current = { x: touch.clientX, t: Date.now() }
      if (dx > 4) {
        setState({ offsetX: dx, swiping: true, animating: false })
      }
    },
    [verticalTolerance],
  )

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStart.current || cancelled.current) {
        setState({ offsetX: 0, swiping: false, animating: false })
        return
      }
      const touch = e.changedTouches[0]
      if (!touch) {
        setState({ offsetX: 0, swiping: false, animating: false })
        return
      }

      const dx = touch.clientX - touchStart.current.x
      const vw = window.innerWidth || 375

      // Calculate release velocity from last move to touch end
      const now = Date.now()
      const dt = lastMove.current ? now - lastMove.current.t : 16
      const lastDx = lastMove.current ? touch.clientX - lastMove.current.x : 0
      const velocity = dt > 0 ? lastDx / dt : 0 // px/ms

      touchStart.current = null
      lastMove.current = null

      const shouldCommit = dx >= vw * commitFraction || velocity >= velocityThreshold

      if (shouldCommit && dx > 20) {
        // Animate page fully off-screen, then navigate
        setState({ offsetX: vw, swiping: true, animating: true })
        // Let the CSS transition play, then navigate
        requestAnimationFrame(() => {
          setTimeout(() => {
            setState({ offsetX: 0, swiping: false, animating: false })
            if (onBack) {
              onBack()
            } else {
              navigate(-1)
            }
          }, 250)
        })
      } else {
        // Animate back to resting position
        setState({ offsetX: 0, swiping: true, animating: true })
        // Clear animating flag after spring-back completes
        requestAnimationFrame(() => {
          setTimeout(() => {
            setState({ offsetX: 0, swiping: false, animating: false })
          }, 250)
        })
      }
    },
    [commitFraction, velocityThreshold, onBack, navigate],
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
  if (!active) return { offsetX: 0, swiping: false, animating: false }
  return state
}
