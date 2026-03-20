import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface CenteredDialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

export function CenteredDialog({ open, onClose, children, className }: CenteredDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const hasFocusedRef = useRef(false)
  const shouldReduceMotion = useReducedMotion()

  // Body scroll lock + one-time focus
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'

      if (!hasFocusedRef.current) {
        hasFocusedRef.current = true
        // Small delay so the dialog is rendered first
        setTimeout(() => {
          const first = dialogRef.current?.querySelector<HTMLElement>(
            'input:not([type="hidden"]), textarea, select',
          )
          first?.focus()
        }, 50)
      }
    } else {
      hasFocusedRef.current = false
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !dialogRef.current) return

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
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

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            onKeyDown={handleKeyDown}
            className={cn(
              'relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden',
              className,
            )}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.93, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.93, y: 20 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 400, damping: 28, mass: 0.8 }
            }
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3 right-3 z-10 flex items-center justify-center min-h-9 min-w-9 rounded-full text-primary-400 hover:bg-primary-100 active:scale-[0.93] transition-all duration-150 cursor-pointer select-none"
            >
              <X size={18} />
            </button>

            {/* Content */}
            <div
              className="overflow-y-auto overscroll-contain px-5 py-5"
              style={{ maxHeight: '80vh' }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
