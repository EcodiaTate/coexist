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
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {emptyState}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
