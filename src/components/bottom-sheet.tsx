import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useAnimation,
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
const MAX_HEIGHT_FRACTION = 0.9

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 34, mass: 0.8 }
const instantTransition = { duration: 0 }

export function BottomSheet({
  open,
  onClose,
  children,
  snapPoints = [0.5],
  initialSnap = 0,
  className,
}: BottomSheetProps) {
  const controls = useAnimation()
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const y = useMotionValue(0)
  const shouldReduceMotion = useReducedMotion()

  const getVh = () => (typeof window !== 'undefined' ? window.innerHeight : 800)
  const getMaxHeight = () => getVh() * MAX_HEIGHT_FRACTION

  /** Convert a snap fraction to a y offset from the top of the sheet container */
  const getSnapY = useCallback(
    (snapIndex: number) => {
      const vh = getVh()
      const maxH = vh * MAX_HEIGHT_FRACTION
      const fraction = snapPoints[Math.min(snapIndex, snapPoints.length - 1)]
      const sheetHeight = vh * fraction
      return maxH - sheetHeight
    },
    [snapPoints],
  )

  const backdropOpacity = useTransform(y, [0, getMaxHeight()], [1, 0])

  // Open animation
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      controls.start({
        y: getSnapY(initialSnap),
        transition: shouldReduceMotion ? instantTransition : springTransition,
      })

      requestAnimationFrame(() => {
        const focusable = sheetRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        focusable?.focus()
      })
    }

    return () => {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open, controls, getSnapY, initialSnap, shouldReduceMotion])

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

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const currentY = y.get()
      const maxH = getMaxHeight()

      // Dismiss if swiped down quickly or dragged past threshold
      if (
        info.velocity.y > DISMISS_VELOCITY ||
        currentY > maxH * (1 - DISMISS_THRESHOLD_FRACTION)
      ) {
        controls
          .start({
            y: maxH,
            transition: shouldReduceMotion
              ? instantTransition
              : { type: 'spring', stiffness: 300, damping: 30 },
          })
          .then(onClose)
        return
      }

      // Find nearest snap point
      const vh = getVh()
      let nearestIndex = 0
      let nearestDist = Infinity

      for (let i = 0; i < snapPoints.length; i++) {
        const snapY = maxH - vh * snapPoints[i]
        const dist = Math.abs(currentY - snapY)
        if (dist < nearestDist) {
          nearestDist = dist
          nearestIndex = i
        }
      }

      controls.start({
        y: getSnapY(nearestIndex),
        transition: shouldReduceMotion ? instantTransition : springTransition,
      })
    },
    [y, controls, snapPoints, getSnapY, onClose, shouldReduceMotion],
  )

  const maxHeight = getMaxHeight()

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
        <div className="fixed inset-0 z-50" aria-label="Bottom sheet">
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: backdropTransition }}
            exit={{ opacity: 0, transition: shouldReduceMotion ? instantTransition : { duration: 0.15, ease: 'easeIn' } }}
            style={{ opacity: backdropOpacity }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Bottom sheet"
            className={cn(
              'fixed inset-x-0 bottom-0 z-10 bg-white rounded-t-2xl shadow-lg',
              'touch-none',
              className,
            )}
            style={{
              height: maxHeight,
              y,
            }}
            initial={{ y: maxHeight }}
            animate={controls}
            exit={{
              y: maxHeight,
              transition: shouldReduceMotion
                ? instantTransition
                : { type: 'spring', stiffness: 300, damping: 30 },
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: maxHeight }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            onKeyDown={handleKeyDown}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div
                className="h-1 w-10 rounded-full bg-primary-200"
                aria-hidden="true"
              />
            </div>

            <motion.div
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
