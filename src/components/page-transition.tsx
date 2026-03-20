import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
  mode?: 'push' | 'fade'
}

const pushVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const instantVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 1 },
}

const springTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
}

const fadeTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1] as const,
}

export function PageTransition({ children, mode = 'push' }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion()
  const location = useLocation()

  const variants = shouldReduceMotion
    ? instantVariants
    : mode === 'fade'
      ? fadeVariants
      : pushVariants

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : mode === 'fade'
      ? fadeTransition
      : springTransition

  return (
    <motion.div
      key={location.pathname}
      className="flex-1 flex flex-col min-h-0"
      variants={variants}
      initial="initial"
      animate="animate"
      transition={transition}
    >
      {children}
    </motion.div>
  )
}
