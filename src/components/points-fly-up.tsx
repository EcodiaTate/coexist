import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface PointsFlyUpProps {
  points: number
  /** Trigger: change this key to fire a new animation */
  trigger: number | string
  className?: string
}

/**
 * Animated points "+25" flying up and fading.
 * §37 item 7: Points awarded fly up and add to total.
 */
export function PointsFlyUp({ points, trigger, className }: PointsFlyUpProps) {
  const shouldReduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (trigger) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [trigger])

  if (shouldReduceMotion || !points) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          className={className}
          initial={{ opacity: 1, y: 0, scale: 1 }}
          animate={{ opacity: 0, y: -40, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          aria-live="polite"
          aria-label={`${points} points earned`}
        >
          <span className="font-heading font-bold text-lg text-primary-400">
            +{points}
          </span>
        </motion.span>
      )}
    </AnimatePresence>
  )
}
