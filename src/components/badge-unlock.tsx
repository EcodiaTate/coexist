import { type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Confetti } from './confetti'

interface BadgeUnlockProps {
  open: boolean
  onClose: () => void
  badgeName: string
  badgeIcon?: ReactNode
  description?: string
  className?: string
}

/**
 * Badge unlock celebration — card flip + glow + particles.
 * §37 item 6.
 */
export function BadgeUnlock({
  open,
  onClose,
  badgeName,
  badgeIcon,
  description,
  className,
}: BadgeUnlockProps) {
  const shouldReduceMotion = useReducedMotion()

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[100] flex items-center justify-center',
            'bg-black/60 backdrop-blur-sm',
            className,
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Badge unlocked: ${badgeName}`}
        >
          <Confetti active={open} count={30} duration={2000} />

          {/* Card with flip animation */}
          <motion.div
            className={cn(
              'relative flex flex-col items-center gap-4 p-8',
              'bg-white rounded-3xl shadow-lg max-w-[280px] w-full',
            )}
            initial={
              shouldReduceMotion
                ? { opacity: 0 }
                : { rotateY: -90, scale: 0.8, opacity: 0 }
            }
            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
            exit={
              shouldReduceMotion
                ? { opacity: 0 }
                : { rotateY: 90, scale: 0.8, opacity: 0 }
            }
            transition={
              shouldReduceMotion
                ? { duration: 0.15 }
                : { type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }
            }
            onClick={(e) => e.stopPropagation()}
            style={{ perspective: 1000 }}
          >
            {/* Glow ring */}
            {!shouldReduceMotion && (
              <motion.div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background:
                    'radial-gradient(circle, var(--color-accent-200) 0%, transparent 70%)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0.3] }}
                transition={{ duration: 1, delay: 0.3 }}
                aria-hidden="true"
              />
            )}

            <p className="text-overline text-primary-400 relative">
              Badge Unlocked!
            </p>

            {/* Badge icon */}
            <motion.div
              className={cn(
                'relative flex items-center justify-center',
                'w-20 h-20 rounded-full',
                'bg-gradient-to-br from-accent-100 to-accent-200',
                'text-primary-400',
              )}
              initial={shouldReduceMotion ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }
              }
            >
              {badgeIcon ?? (
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              )}
            </motion.div>

            <h3 className="font-heading text-xl font-bold text-primary-800 text-center relative">
              {badgeName}
            </h3>

            {description && (
              <p className="text-sm text-primary-400 text-center relative">
                {description}
              </p>
            )}

            <button
              type="button"
              onClick={onClose}
              className={cn(
                'mt-2 px-6 py-2.5 rounded-lg',
                'bg-primary-800 text-white font-heading font-semibold text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                'relative',
              )}
            >
              Awesome!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
