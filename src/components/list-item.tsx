import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ListItemProps {
  icon?: ReactNode
  avatar?: ReactNode
  title: string
  subtitle?: string
  rightContent?: ReactNode
  onClick?: () => void
  href?: string
  disabled?: boolean
  hideDivider?: boolean
  className?: string
  'aria-label'?: string
}

export function ListItem({
  icon,
  avatar,
  title,
  subtitle,
  rightContent,
  onClick,
  href,
  disabled = false,
  hideDivider = false,
  className,
  'aria-label': ariaLabel,
}: ListItemProps) {
  const shouldReduceMotion = useReducedMotion()
  const isInteractive = !disabled && (!!onClick || !!href)

  const content = (
    <>
      {(icon || avatar) && (
        <span
          className="flex items-center justify-center shrink-0 mr-3 text-primary-400"
          aria-hidden="true"
        >
          {avatar ?? icon}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-primary-800 truncate">
          {title}
        </span>
        {subtitle && (
          <span className="block text-xs text-primary-400 truncate mt-0.5">
            {subtitle}
          </span>
        )}
      </span>
      <span className="flex items-center shrink-0 ml-3 text-primary-400">
        {rightContent ?? (
          isInteractive && (
            <ChevronRight className="w-5 h-5" aria-hidden="true" />
          )
        )}
      </span>
    </>
  )

  const sharedClassName = cn(
    'flex items-center w-full min-h-14 px-4 py-3 text-left',
    'transition-colors duration-100',
    isInteractive && 'cursor-pointer hover:bg-primary-50 active:bg-primary-50',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    !hideDivider && 'border-b border-primary-100/40',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
    className,
  )

  if (href && !disabled) {
    return (
      <motion.a
        href={href}
        aria-label={ariaLabel ?? title}
        aria-disabled={disabled}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={sharedClassName}
      >
        {content}
      </motion.a>
    )
  }

  if (onClick && !disabled) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? title}
        aria-disabled={disabled}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={sharedClassName}
      >
        {content}
      </motion.button>
    )
  }

  return (
    <div
      aria-label={ariaLabel ?? title}
      aria-disabled={disabled || undefined}
      className={sharedClassName}
    >
      {content}
    </div>
  )
}
