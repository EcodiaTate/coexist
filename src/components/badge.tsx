import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Activity-type variants                                             */
/* ------------------------------------------------------------------ */

const activityStyles = {
  'tree-planting': 'bg-green-100 text-green-800',
  'beach-cleanup': 'bg-blue-100 text-blue-800',
  habitat: 'bg-emerald-100 text-emerald-800',
  wildlife: 'bg-amber-100 text-amber-800',
  education: 'bg-violet-100 text-violet-800',
  fundraising: 'bg-pink-100 text-pink-800',
  monitoring: 'bg-cyan-100 text-cyan-800',
  restoration: 'bg-lime-100 text-lime-800',
} as const

/* ------------------------------------------------------------------ */
/*  Tier variants                                                      */
/* ------------------------------------------------------------------ */

const tierStyles = {
  seedling: 'bg-green-100 text-green-800',
  sapling: 'bg-emerald-100 text-emerald-800',
  native: 'bg-teal-100 text-teal-800',
  canopy: 'bg-primary-100 text-primary-800',
  elder: 'bg-amber-100 text-amber-900',
} as const

type ActivityVariant = keyof typeof activityStyles
type TierVariant = keyof typeof tierStyles

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

type BadgeVariantProps =
  | { variant: 'activity'; activity: ActivityVariant; tier?: never }
  | { variant: 'tier'; tier: TierVariant; activity?: never }

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
      : tierStyles[tier]

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
