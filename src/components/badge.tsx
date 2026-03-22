import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Activity-type variants                                             */
/* ------------------------------------------------------------------ */

const activityStyles = {
  'tree-planting': 'bg-success-100 text-success-800',
  'beach-cleanup': 'bg-sky-100 text-sky-800',
  habitat: 'bg-primary-100 text-primary-800',
  wildlife: 'bg-bark-100 text-bark-800',
  education: 'bg-plum-100 text-plum-800',
  fundraising: 'bg-coral-100 text-coral-800',
  monitoring: 'bg-moss-100 text-moss-800',
  restoration: 'bg-sprout-100 text-sprout-800',
} as const

/* ------------------------------------------------------------------ */
/*  Tier variants                                                      */
/* ------------------------------------------------------------------ */

const tierStyles = {
  new: 'bg-success-100 text-success-800',
  active: 'bg-primary-100 text-primary-800',
  committed: 'bg-moss-100 text-moss-800',
  dedicated: 'bg-secondary-100 text-secondary-800',
  lifetime: 'bg-bark-100 text-bark-900',
} as const

type ActivityVariant = keyof typeof activityStyles
type TierVariant = keyof typeof tierStyles

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type BadgeVariantProps =
  | { variant: 'activity'; activity: ActivityVariant; tier?: never }
  | { variant: 'tier'; tier: TierVariant; activity?: never }
  | { variant: 'default'; activity?: never; tier?: never }
  | { variant: 'success'; activity?: never; tier?: never }

interface BadgeBaseProps {
  size?: 'sm' | 'md'
  icon?: ReactNode
  children: ReactNode
  className?: string
  'aria-label'?: string
}

type BadgeProps = BadgeBaseProps & BadgeVariantProps

/* ------------------------------------------------------------------ */
/*  Size styles                                                        */
/* ------------------------------------------------------------------ */

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-3 py-1 text-caption',
} as const

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Badge({
  variant,
  activity,
  tier,
  size = 'md',
  icon,
  children,
  className,
  'aria-label': ariaLabel,
}: BadgeProps) {
  const colorClass =
    variant === 'activity'
      ? activityStyles[activity]
      : variant === 'tier'
        ? tierStyles[tier]
        : variant === 'success'
          ? 'bg-success-100 text-success-800'
          : 'bg-primary-100 text-primary-700'

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center justify-center gap-1 rounded-full font-semibold leading-none whitespace-nowrap select-none',
        sizeStyles[size],
        colorClass,
        className,
      )}
    >
      {icon && (
        <span className="flex items-center justify-center shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}
