import { type ReactNode, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Trend {
  value: number
  direction: 'up' | 'down'
}

interface StatCardProps {
  value: number | string
  label: string
  trend?: Trend
  icon?: ReactNode
  className?: string
  'aria-label'?: string
}

export function useCountUp(target: number, duration: number, enabled: boolean) {
  const [current, setCurrent] = useState(enabled ? 0 : target)

  useEffect(() => {
    if (!enabled) {
      setCurrent(target)
      return
    }

    const startTime = performance.now()
    let frame: number

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, enabled])

  return current
}

export function StatCard({
  value,
  label,
  trend,
  icon,
  className,
  'aria-label': ariaLabel,
}: StatCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const isNumeric = typeof value === 'number'
  const displayValue = useCountUp(
    isNumeric ? value : 0,
    1200,
    isNumeric && !shouldReduceMotion,
  )

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 300, damping: 25 }
      }
      aria-label={ariaLabel ?? `${label}: ${value}`}
      className={cn(
        'rounded-xl shadow-sm p-4',
        'bg-gradient-to-br from-white to-primary-100/50',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-heading text-3xl font-bold text-primary-800 tabular-nums">
            {isNumeric ? displayValue.toLocaleString() : value}
          </p>
          <p className="mt-1 text-sm text-primary-400 truncate">{label}</p>
        </div>
        {icon && (
          <span
            className="flex items-center justify-center shrink-0 ml-3 text-primary-500"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      {trend && (
        <div
          className={cn(
            'mt-3 inline-flex items-center gap-1 text-sm font-medium',
            trend.direction === 'up' ? 'text-success' : 'text-error',
          )}
          aria-label={`Trend: ${trend.direction === 'up' ? 'up' : 'down'} ${trend.value}%`}
        >
          {trend.direction === 'up' ? (
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
          ) : (
            <TrendingDown className="w-4 h-4" aria-hidden="true" />
          )}
          <span className="tabular-nums">{trend.value}%</span>
        </div>
      )}
    </motion.div>
  )
}
