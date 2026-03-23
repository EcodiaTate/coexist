import { useEffect, useRef, useCallback, useState, useMemo, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useTransform,
    useReducedMotion,
    type PanInfo,
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

const DISMISS_VELOCITY = 500
const DISMISS_THRESHOLD_FRACTION = 0.25
const MAX_HEIGHT_FRACTION = 0.92
const DESKTOP_BREAKPOINT = 640

const springConfig = { type: 'spring' as const, stiffness: 280, damping: 30, mass: 0.6 }
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

function getVh() {
  return typeof window !== 'undefined' ? window.innerHeight : 800
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
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const y = useMotionValue(0)
  const shouldReduceMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  // Stabilise snapPoints so a new array literal each render doesn't cause effect re-fires
  const snapKey = snapPoints.join(',')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableSnapPoints = useMemo(() => snapPoints, [snapKey])

  const vh = getVh()
  const maxHeight = vh * MAX_HEIGHT_FRACTION

  // Target y when the sheet is open - this is the declarative animate target
  const snapFraction = stableSnapPoints[Math.min(initialSnap, stableSnapPoints.length - 1)]
  const clampedFraction = Math.min(snapFraction, MAX_HEIGHT_FRACTION)
  const openY = maxHeight - vh * clampedFraction

  const backdropOpacity = useTransform(y, [openY, maxHeight], [1, 0])

  // Track current snap for drag-end snapping
  const [currentSnapY, setCurrentSnapY] = useState(openY)

  // Body scroll lock
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

  // Auto-focus first input once per open cycle
  const hasFocusedRef = useRef(false)
  useEffect(() => {
    if (open && !hasFocusedRef.current) {
      hasFocusedRef.current = true
      const timer = setTimeout(() => {
        const focusable = sheetRef.current?.querySelector<HTMLElement>(
          'input, textarea, select, [tabindex]:not([tabindex="-1"])',
        )
        focusable?.focus()
      }, 120)
      return () => clearTimeout(timer)
    }
    if (!open) hasFocusedRef.current = false
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus trap
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

  // Dismissing ref to prevent onClose firing multiple times
  const dismissingRef = useRef(false)
  useEffect(() => {
    if (!open) dismissingRef.current = false
  }, [open])

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (dismissingRef.current) return
      const currentY = y.get()

      // Dismiss if swiped down quickly or dragged past threshold
      if (
        info.velocity.y > DISMISS_VELOCITY ||
        currentY > maxHeight * (1 - DISMISS_THRESHOLD_FRACTION)
      ) {
        dismissingRef.current = true
        onClose()
        return
      }

      // Find nearest snap point
      let nearestSnapY = openY
      let nearestDist = Infinity

      for (let i = 0; i < stableSnapPoints.length; i++) {
        const frac = Math.min(stableSnapPoints[i], MAX_HEIGHT_FRACTION)
        const snapY = maxHeight - vh * frac
        const dist = Math.abs(currentY - snapY)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestSnapY = snapY
        }
      }

      setCurrentSnapY(nearestSnapY)
    },
    [y, maxHeight, vh, openY, stableSnapPoints, onClose],
  )

  // Sync currentSnapY when openY changes
  useEffect(() => {
    setCurrentSnapY(openY)
  }, [openY])

  /* ---- Scroll hint state ---- */
  const scrollRef = useRef<HTMLDivElement>(null)
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

  /* ---- Backdrop animation ---- */
  const backdropTransition = shouldReduceMotion
    ? instantTransition
    : { duration: 0.2, ease: 'easeOut' as const }

  /* ---- Content stagger ---- */
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50" aria-label="Dialog">
          {/* Backdrop - GPU-promoted for blur perf */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm gpu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: backdropTransition }}
            exit={{ opacity: 0, transition: shouldReduceMotion ? instantTransition : { duration: 0.18, ease: [0.4, 0, 0.2, 1] } }}
            style={isDesktop ? undefined : { opacity: backdropOpacity }}
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
            </div>
          ) : (
            /* ---- Mobile: bottom sheet ---- */
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Bottom sheet"
              className={cn(
                'fixed inset-x-0 bottom-0 z-10 bg-surface-0 rounded-t-2xl shadow-lg gpu-panel',
                'touch-none',
                className,
              )}
              style={{
                height: maxHeight,
                y,
              }}
              initial={{ y: maxHeight }}
              animate={{ y: currentSnapY }}
              exit={{ y: maxHeight }}
              transition={shouldReduceMotion ? instantTransition : springConfig}
              drag="y"
              dragConstraints={{ top: 0, bottom: maxHeight }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
              onKeyDown={handleKeyDown}
            >
              {/* Handle bar - respects safe area */}
              <div
                className="flex justify-center pb-2 cursor-grab active:cursor-grabbing"
                style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
              >
                <div
                  className="h-1 w-10 rounded-full bg-primary-200"
                  aria-hidden="true"
                />
              </div>

              <motion.div
                ref={scrollRef}
                className="overflow-y-auto overscroll-contain px-5 pb-6"
                style={{
                  maxHeight: maxHeight - 28,
                  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1.5rem)',
                }}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                {children}
              </motion.div>
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
