import { type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface EmptyContentTransitionProps {
  /** True when content is available */
  hasContent: boolean
  /** The empty state to show (illustration + text) */
  emptyState: ReactNode
  /** The real content */
  children: ReactNode
  className?: string
}

/**
 * Empty → Content transition.
 * §55.3.2: Illustration shrinks and fades while content slides in from bottom.
 */
export function EmptyContentTransition({
  hasContent,
  emptyState,
  children,
  className,
}: EmptyContentTransitionProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{hasContent ? children : emptyState}</div>
  }

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {hasContent ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {emptyState}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
