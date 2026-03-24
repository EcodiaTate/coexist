import { useEffect, useRef, useCallback, useState, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
    motion,
    AnimatePresence,
    useReducedMotion,
} from 'framer-motion'
import { cn } from '@/lib/cn'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Snap points as fractions of viewport height (0-1). E.g. [0.4, 0.8] */
  snapPoints?: number[]
  /** Index into snapPoints for the initial snap position */
  initialSnap?: number
  className?: string
}

const MAX_HEIGHT_FRACTION = 0.92
const DESKTOP_BREAKPOINT = 640
const DISMISS_VELOCITY = 0.4   // px/ms — a quick flick
const DISMISS_DISTANCE = 0.3   // fraction of sheet height

const instantTransition = { duration: 0 }

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= DESKTOP_BREAKPOINT,
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

export function BottomSheet({
  open,
  onClose,
  children,
  snapPoints = [0.5],
  initialSnap = 0,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const shouldReduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  const snapKey = snapPoints.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSnapPoints = useMemo(() => snapPoints, [snapKey])

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const maxHeight = vh * MAX_HEIGHT_FRACTION
  const snapFraction = stableSnapPoints[Math.min(initialSnap, stableSnapPoints.length - 1)]
  const sheetHeight = vh * Math.min(snapFraction, MAX_HEIGHT_FRACTION)

  /* ------------------------------------------------------------------ */
  /*  Body scroll lock                                                   */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
    }
    return () => {
      if (!open) return
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open])

  /* ------------------------------------------------------------------ */
  /*  Auto-focus first input (preventScroll so content stays at top)     */
  /* ------------------------------------------------------------------ */
  const hasFocusedRef = useRef(false)
  useEffect(() => {
    if (open && !hasFocusedRef.current) {
      hasFocusedRef.current = true
      const timer = setTimeout(() => {
        const focusable = sheetRef.current?.querySelector<HTMLElement>(
          'input, textarea, select, [tabindex]:not([tabindex="-1"])',
        )
        focusable?.focus({ preventScroll: true })
      }, 120)
      return () => clearTimeout(timer)
    }
    if (!open) hasFocusedRef.current = false
  }, [open])

  // Reset scroll position to top when sheet opens
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }, [open])

  /* ------------------------------------------------------------------ */
  /*  Escape key                                                         */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  /* ------------------------------------------------------------------ */
  /*  Focus trap                                                         */
  /* ------------------------------------------------------------------ */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !sheetRef.current) return

    const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [])

  /* ------------------------------------------------------------------ */
  /*  Dismiss guard                                                      */
  /* ------------------------------------------------------------------ */
  const dismissingRef = useRef(false)
  useEffect(() => {
    if (!open) dismissingRef.current = false
  }, [open])

  /* ------------------------------------------------------------------ */
  /*  Handle drag (pointer events on grab bar only)                      */
  /*  pointerdown on the handle, then move/up on window so we never      */
  /*  lose the gesture even when the pointer leaves the element.         */
  /* ------------------------------------------------------------------ */
  const dragState = useRef<{ startY: number; startTime: number } | null>(null)
  const dragYRef = useRef(0)
  const [dragY, setDragY] = useState(0)        // px offset, 0 = resting, positive = pulled down
  const [animating, setAnimating] = useState(false) // true when snapping back with CSS transition

  useEffect(() => {
    if (open) { setDragY(0); dragYRef.current = 0; setAnimating(false) }
  }, [open])

  // Stable refs for the values the window listeners need
  const sheetHeightRef = useRef(sheetHeight)
  sheetHeightRef.current = sheetHeight
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragState.current) return
      const dy = e.clientY - dragState.current.startY
      const val = Math.max(0, dy)
      dragYRef.current = val
      setDragY(val)
    }

    const onUp = () => {
      if (!dragState.current) return
      const dy = dragYRef.current
      const dt = Date.now() - dragState.current.startTime
      const velocity = dt > 0 ? dy / dt : 0
      dragState.current = null

      if (
        (velocity > DISMISS_VELOCITY || dy > sheetHeightRef.current * DISMISS_DISTANCE) &&
        !dismissingRef.current
      ) {
        dismissingRef.current = true
        setDragY(sheetHeightRef.current + 40)
        setAnimating(true)
        setTimeout(() => onCloseRef.current(), 200)
      } else {
        setDragY(0)
        dragYRef.current = 0
        setAnimating(true)
        setTimeout(() => setAnimating(false), 200)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    dragState.current = { startY: e.clientY, startTime: Date.now() }
    setAnimating(false)
    dragYRef.current = 0
    setDragY(0)
  }, [])

  /* ------------------------------------------------------------------ */
  /*  Scroll hint                                                        */
  /* ------------------------------------------------------------------ */
  const [canScrollDown, setCanScrollDown] = useState(false)

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    const check = () => {
      setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    }
    const raf = requestAnimationFrame(check)
    el.addEventListener('scroll', check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('scroll', check)
      ro.disconnect()
    }
  }, [open])

  /* ------------------------------------------------------------------ */
  /*  Desktop animation config                                           */
  /* ------------------------------------------------------------------ */
  const backdropTransition = shouldReduceMotion
    ? instantTransition
    : { duration: 0.2, ease: 'easeOut' as const }

  const contentVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? instantTransition
        : { delay: 0.1, duration: 0.2, ease: 'easeOut' as const },
    },
  }

  /* ------------------------------------------------------------------ */
  /*  Backdrop opacity tracks drag                                       */
  /* ------------------------------------------------------------------ */
  const backdropDragOpacity = sheetHeight > 0
    ? Math.max(0, 1 - dragY / sheetHeight)
    : 1

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" aria-label="Dialog">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 gpu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: backdropTransition }}
            exit={{ opacity: 0, transition: shouldReduceMotion ? instantTransition : { duration: 0.18, ease: [0.4, 0, 0.2, 1] } }}
            style={isDesktop ? undefined : { opacity: backdropDragOpacity }}
            onClick={onClose}
            aria-hidden="true"
          />

          {isDesktop ? (
            /* ---- Desktop: centred modal ---- */
            <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label="Dialog"
                className={cn(
                  'relative w-full max-w-md bg-surface-0 rounded-2xl shadow-lg pointer-events-auto gpu-panel',
                  className,
                )}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
                transition={shouldReduceMotion ? instantTransition : { type: 'spring', stiffness: 260, damping: 28, mass: 0.6 }}
                onKeyDown={handleKeyDown}
              >
                <motion.div
                  ref={scrollRef}
                  className="overflow-y-auto overscroll-contain px-5 py-6"
                  style={{ maxHeight: '80vh' }}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {children}
                </motion.div>
                <AnimatePresence>
                  {canScrollDown && (
                    <motion.div
                      className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-surface-0 to-transparent rounded-b-2xl pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          ) : (
            /* -------------------------------------------------------- */
            /*  Mobile: bottom sheet                                     */
            /*  - Positioned with bottom:0, slides up via translateY    */
            /*  - Framer handles enter/exit only                        */
            /*  - Drag is raw pointer events → inline transform         */
            /* -------------------------------------------------------- */
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Bottom sheet"
              className={cn(
                'fixed inset-x-0 bottom-0 z-10 bg-surface-0 rounded-t-2xl shadow-lg gpu-panel flex flex-col',
                className,
              )}
              style={{
                maxHeight: maxHeight,
                // During drag we set transform directly; otherwise framer controls it
                ...(dragY > 0 || animating
                  ? {
                      transform: `translateY(${dragY}px)`,
                      transition: animating ? 'transform 0.2s ease-out' : 'none',
                    }
                  : {}),
              }}
              // Framer only handles mount/unmount slide
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={
                shouldReduceMotion
                  ? instantTransition
                  : { type: 'spring', stiffness: 400, damping: 34, mass: 0.8 }
              }
              onKeyDown={handleKeyDown}
            >
              {/* Grab handle — only this area initiates drag */}
              <div
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
                onPointerDown={onHandlePointerDown}
              >
                <div className="h-1 w-10 rounded-full bg-primary-200" aria-hidden="true" />
              </div>

              {/* Scrollable content */}
              <div
                ref={scrollRef}
                className="overflow-y-auto overscroll-contain px-5 pb-6 flex-1 min-h-0"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)' }}
              >
                {children}
              </div>

              {/* Scroll hint gradient */}
              <AnimatePresence>
                {canScrollDown && (
                  <motion.div
                    className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-surface-0 to-transparent rounded-b-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
