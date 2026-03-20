import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ScrollRevealProps {
  children: ReactNode
  /** Delay in seconds */
  delay?: number
  className?: string
}

/**
 * Wraps children in a subtle fade+slide-up animation triggered on scroll.
 * Card reveal on scroll - §55 item 23.
 */
export function ScrollReveal({ children, delay = 0, className }: ScrollRevealProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Staggered list wrapper - §55 item 22                              */
/* ------------------------------------------------------------------ */

interface StaggeredListProps {
  children: ReactNode
  /** Stagger delay per item in ms */
  stagger?: number
  className?: string
}

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger / 1000 },
  }),
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
} as const satisfies import('framer-motion').Variants

export function StaggeredList({
  children,
  stagger = 30,
  className,
}: StaggeredListProps) {
  const shouldReduceMotion = useReducedMotion()

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      custom={stagger}
      variants={containerVariants}
    >
      {children}
    </motion.div>
  )
}

/** Wrap each item in a StaggeredList with this */
export function StaggeredItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  )
}
