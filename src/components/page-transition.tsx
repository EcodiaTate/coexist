import { type ReactNode, useRef, useEffect, useState } from 'react'
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
  initial: { opacity: 0.6, y: 6 },
  animate: { opacity: 1, y: 0 },
}

const pushTransition = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 34,
  mass: 0.6,
}

/* ------------------------------------------------------------------ */
/*  Revisit: instant — pages have their own entrance animations        */
/* ------------------------------------------------------------------ */

const revisitVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
}

const revisitTransition = { duration: 0 }

/* ------------------------------------------------------------------ */
/*  Fade mode (used explicitly)                                        */
/* ------------------------------------------------------------------ */

const fadeVariants = {
  initial: { opacity: 0.7 },
  animate: { opacity: 1 },
}

const fadeTransition = {
  duration: 0.15,
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
  const path = location.pathname

  // Track a generation counter that bumps on path change —
  // used as key to re-trigger the entry animation without
  // destroying the wrapper div's DOM node position in the tree.
  const [gen, setGen] = useState(0)
  const prevPath = useRef(path)
  useEffect(() => {
    if (prevPath.current !== path) {
      prevPath.current = path
      setGen((g) => g + 1)
    }
  }, [path])

  const isFirstVisit = !visitedPaths.has(path)
  if (!visitedPaths.has(path)) {
    visitedPaths.add(path)
  }

  if (shouldReduceMotion) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    )
  }

  if (mode === 'fade') {
    return (
      <motion.div
        key={gen}
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
      key={gen}
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
