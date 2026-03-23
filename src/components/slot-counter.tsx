import { useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface SlotCounterProps {
  value: number
  /** Format with Intl.NumberFormat */
  locale?: string
  className?: string
  /** Prefix like "+" or "$" */
  prefix?: string
  /** Suffix like " pts" */
  suffix?: string
}

/**
 * Slot-machine style counter - old number slides up and out,
 * new number slides up from below.
 * §55.3.5: Points increment.
 */
export function SlotCounter({
  value,
  locale = 'en-AU',
  className,
  prefix = '',
  suffix = '',
}: SlotCounterProps) {
  const shouldReduceMotion = useReducedMotion()
  const prevRef = useRef(value)
  const [displayValue, setDisplayValue] = useState(value)
  const [direction, setDirection] = useState<'up' | 'down'>('up')

  if (value !== prevRef.current) {
    setDirection(value > prevRef.current ? 'up' : 'down')
    setDisplayValue(value)
    prevRef.current = value
  }

  const formatted = new Intl.NumberFormat(locale).format(displayValue)

  if (shouldReduceMotion) {
    return (
      <span className={className} aria-live="polite">
        {prefix}{formatted}{suffix}
      </span>
    )
  }

  const yIn = direction === 'up' ? 20 : -20
  const yOut = direction === 'up' ? -20 : 20

  return (
    <span
      className={cn('inline-flex items-baseline overflow-hidden', className)}
      aria-live="polite"
    >
      {prefix && <span>{prefix}</span>}
      <span className="relative inline-block" style={{ minWidth: '1ch' }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={displayValue}
            className="inline-block"
            initial={{ y: yIn, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: yOut, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
          >
            {formatted}
          </motion.span>
        </AnimatePresence>
      </span>
      {suffix && <span>{suffix}</span>}
    </span>
  )
}
