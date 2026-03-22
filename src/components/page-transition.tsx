import { type ReactNode, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

interface PageTransitionProps {
  children: ReactNode
  mode?: 'push' | 'fade'
}

/* ------------------------------------------------------------------ */
/*  First-visit: full slide-up entrance                                */
/* ------------------------------------------------------------------ */

const pushVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

const pushTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
}

/* ------------------------------------------------------------------ */
/*  Revisit: subtle quick fade - feels instant but not jarring         */
/* ------------------------------------------------------------------ */

const revisitVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

const revisitTransition = {
  duration: 0.12,
  ease: [0.25, 0.1, 0.25, 1] as const,
}

/* ------------------------------------------------------------------ */
/*  Fade mode (used explicitly)                                        */
/* ------------------------------------------------------------------ */

const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
}

const fadeTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1] as const,
}

/* ------------------------------------------------------------------ */
/*  Reduced motion                                                     */
/* ------------------------------------------------------------------ */

const instantVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
}

const instantTransition = { duration: 0 }

/* ------------------------------------------------------------------ */
/*  Visited path cache - persists for the session                      */
/* ------------------------------------------------------------------ */

const visitedPaths = new Set<string>()

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PageTransition({ children, mode = 'push' }: PageTransitionProps) {
  const shouldReduceMotion = useReducedMotion()
  const location = useLocation()

  // Normalize: strip trailing slash, treat /events/123 → /events/:id pattern
  // We cache at the exact pathname level so revisiting the same page is instant
  const path = location.pathname

  const isFirstVisit = !visitedPaths.has(path)
  const hasRenderedRef = useRef(false)

  // Mark as visited after first render
  if (!hasRenderedRef.current) {
    hasRenderedRef.current = true
    visitedPaths.add(path)
  }

  if (shouldReduceMotion) {
    return (
      <motion.div
        key={path}
        className="flex-1 flex flex-col min-h-0"
        variants={instantVariants}
        initial="initial"
        animate="animate"
        transition={instantTransition}
      >
        {children}
      </motion.div>
    )
  }

  if (mode === 'fade') {
    return (
      <motion.div
        key={path}
        className="flex-1 flex flex-col min-h-0"
        variants={fadeVariants}
        initial="initial"
        animate="animate"
        transition={fadeTransition}
      >
        {children}
      </motion.div>
    )
  }

  // Push mode: full animation on first visit, quick fade on revisit
  const variants = isFirstVisit ? pushVariants : revisitVariants
  const transition = isFirstVisit ? pushTransition : revisitTransition

  return (
    <motion.div
      key={path}
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
