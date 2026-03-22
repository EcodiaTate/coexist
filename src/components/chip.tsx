import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ChipProps {
  label: string
  selected?: boolean
  onSelect?: () => void
  onDismiss?: () => void
  icon?: ReactNode
  variant?: 'default' | 'activity'
  className?: string
  'aria-label'?: string
}

const variantStyles = {
  default: {
    selected: 'bg-primary-100 text-primary-800 shadow-sm',
    unselected: 'bg-surface-2 text-primary-600 hover:bg-primary-100/60 shadow-sm',
  },
  activity: {
    selected: 'bg-accent-100 text-primary-800 shadow-sm',
    unselected: 'bg-surface-2 text-primary-600 hover:bg-primary-100/60 shadow-sm',
  },
} as const

export function Chip({
  label,
  selected = false,
  onSelect,
  onDismiss,
  icon,
  variant = 'default',
  className,
  'aria-label': ariaLabel,
}: ChipProps) {
  const shouldReduceMotion = useReducedMotion()
  const styles = variantStyles[variant]

  return (
    <motion.button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={ariaLabel ?? label}
      onClick={onSelect}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 min-h-11',
        'text-sm font-medium cursor-pointer select-none',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
        selected ? styles.selected : styles.unselected,
        className,
      )}
    >
      {icon && (
        <span className="flex items-center shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{label}</span>
      {onDismiss && (
        <span
          role="button"
          tabIndex={0}
          aria-label={`Remove ${label}`}
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              e.stopPropagation()
              onDismiss()
            }
          }}
          className={cn(
            'flex items-center justify-center rounded-full',
            '-mr-1 ml-0.5 min-w-[28px] min-h-[28px] p-1',
            'hover:bg-black/10 transition-colors duration-100',
          )}
        >
          <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        </span>
      )}
    </motion.button>
  )
}
