import { useEffect, useRef, useCallback, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

const sizeClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
} as const

type ModalSize = keyof typeof sizeClasses

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: ModalSize
  className?: string
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 640px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return desktop
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const isDesktop = useIsDesktop()
  const shouldReduceMotion = useReducedMotion()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && contentRef.current) {
        const focusable = contentRef.current.querySelectorAll<HTMLElement>(
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
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'

      requestAnimationFrame(() => {
        const focusable = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        focusable?.focus()
      })
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [open, handleKeyDown])

  /* ---- Animation variants ---- */

  const instant = { duration: 0 }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: shouldReduceMotion ? instant : { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, transition: shouldReduceMotion ? instant : { duration: 0.15, ease: 'easeIn' } },
  }

  const desktopVariants = {
    hidden: { opacity: 0, scale: 0.92, y: 8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: shouldReduceMotion
        ? instant
        : { type: 'spring', stiffness: 420, damping: 30, mass: 0.8 },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: 4,
      transition: shouldReduceMotion ? instant : { duration: 0.15, ease: [0.4, 0, 1, 1] },
    },
  }

  const mobileVariants = {
    hidden: { y: '100%', borderRadius: '16px 16px 0 0' },
    visible: {
      y: 0,
      borderRadius: '16px 16px 0 0',
      transition: shouldReduceMotion
        ? instant
        : { type: 'spring', stiffness: 400, damping: 34, mass: 0.8 },
    },
    exit: {
      y: '100%',
      transition: shouldReduceMotion ? instant : { duration: 0.2, ease: [0.4, 0, 1, 1] },
    },
  }

  const contentVariants = isDesktop ? desktopVariants : mobileVariants

  /* ---- Header content stagger ---- */

  const headerVariants = {
    hidden: { opacity: 0, y: -4 },
    visible: {
      opacity: 1,
      y: 0,
      transition: shouldReduceMotion
        ? instant
        : { delay: 0.05, duration: 0.2, ease: 'easeOut' },
    },
    exit: { opacity: 0 },
  }

  const bodyVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: shouldReduceMotion
        ? instant
        : { delay: 0.08, duration: 0.2, ease: 'easeOut' },
    },
    exit: { opacity: 0 },
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            variants={backdropVariants}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 w-full bg-white shadow-lg',
              'rounded-t-2xl sm:rounded-2xl',
              'max-h-[85vh] overflow-y-auto overscroll-contain',
              sizeClasses[size],
              className,
            )}
            variants={contentVariants}
          >
            <motion.div
              className="sticky top-0 z-10 flex items-center justify-between border-b border-primary-100 bg-white/90 px-5 py-4 backdrop-blur-sm rounded-t-2xl"
              variants={headerVariants}
            >
              <h2 className="font-heading text-lg font-semibold text-primary-800">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-primary-400 transition-colors hover:bg-primary-50 hover:text-primary-400"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </motion.div>
            <motion.div className="p-5" variants={bodyVariants}>
              {children}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
