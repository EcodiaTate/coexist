import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useCountUp } from '@/components/stat-card'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Colour presets                                                     */
/*                                                                     */
/*  Each preset provides a gradient bg, icon tint, and value colour    */
/*  that reads well on the dark admin hero band. The extended range    */
/*  covers every semantic colour in the theme so each admin page can   */
/*  give its stats a distinct visual identity.                         */
/* ------------------------------------------------------------------ */

export const HERO_STAT_COLORS = {
  // Greens / nature
  primary:  { bg: 'bg-gradient-to-br from-primary-600 to-primary-800',  icon: 'bg-primary-500/30 text-primary-200',  value: 'text-white',   shadow: 'shadow-primary-900/20' },
  sprout:   { bg: 'bg-gradient-to-br from-sprout-500 to-sprout-800',    icon: 'bg-sprout-400/30 text-sprout-200',    value: 'text-white',   shadow: 'shadow-sprout-900/20' },
  moss:     { bg: 'bg-gradient-to-br from-moss-500 to-moss-800',        icon: 'bg-moss-400/30 text-moss-200',        value: 'text-white',   shadow: 'shadow-moss-900/20' },
  success:  { bg: 'bg-gradient-to-br from-success-500 to-success-800',  icon: 'bg-success-400/30 text-success-200',  value: 'text-white',   shadow: 'shadow-success-900/20' },

  // Earth
  bark:     { bg: 'bg-gradient-to-br from-bark-500 to-bark-800',        icon: 'bg-bark-400/30 text-bark-200',        value: 'text-white',   shadow: 'shadow-bark-900/20' },
  secondary:{ bg: 'bg-gradient-to-br from-secondary-500 to-secondary-800', icon: 'bg-secondary-400/30 text-secondary-200', value: 'text-white', shadow: 'shadow-secondary-900/20' },

  // Blues / cool
  info:     { bg: 'bg-gradient-to-br from-info-500 to-info-800',        icon: 'bg-info-400/30 text-info-200',        value: 'text-white',   shadow: 'shadow-info-900/20' },
  sky:      { bg: 'bg-gradient-to-br from-sky-500 to-sky-800',          icon: 'bg-sky-400/30 text-sky-200',          value: 'text-white',   shadow: 'shadow-sky-900/20' },

  // Warm / accent
  warning:  { bg: 'bg-gradient-to-br from-warning-500 to-warning-800',  icon: 'bg-warning-400/30 text-warning-200',  value: 'text-white',   shadow: 'shadow-warning-900/20' },
  coral:    { bg: 'bg-gradient-to-br from-coral-500 to-coral-800',      icon: 'bg-coral-400/30 text-coral-200',      value: 'text-white',   shadow: 'shadow-coral-900/20' },
  error:    { bg: 'bg-gradient-to-br from-error-500 to-error-800',      icon: 'bg-error-400/30 text-error-200',      value: 'text-white',   shadow: 'shadow-error-900/20' },

  // Purple
  plum:     { bg: 'bg-gradient-to-br from-plum-500 to-plum-800',        icon: 'bg-plum-400/30 text-plum-200',        value: 'text-white',   shadow: 'shadow-plum-900/20' },

  // Neutral / glass (for single or low-priority stats)
  glass:    { bg: 'bg-white/[0.08]',                                    icon: 'bg-white/10 text-white/60',           value: 'text-white',   shadow: '' },
} as const

export type HeroStatColor = keyof typeof HERO_STAT_COLORS

/* ------------------------------------------------------------------ */
/*  AdminHeroStat                                                      */
/* ------------------------------------------------------------------ */

export interface AdminHeroStatProps {
  value: number
  label: string
  icon?: ReactNode
  color?: HeroStatColor
  /** Optional sub-label, e.g. "+12" trend */
  sub?: string
  /** Stagger delay multiplier (0, 1, 2, …) */
  delay?: number
  reducedMotion?: boolean
  className?: string
}

export function AdminHeroStat({
  value,
  label,
  icon,
  color = 'glass',
  sub,
  delay = 0,
  reducedMotion = false,
  className,
}: AdminHeroStatProps) {
  const display = useCountUp(value, 1200, !reducedMotion)
  const c = HERO_STAT_COLORS[color]

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: reducedMotion ? 0 : 0.15 + delay * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn(
        'flex flex-col items-center text-center rounded-2xl px-4 py-3.5 min-w-[76px]',
        c.bg, c.shadow,
        className,
      )}
      aria-label={`${label}: ${value}`}
    >
      {icon && (
        <span
          className={cn('flex items-center justify-center w-9 h-9 rounded-xl mb-2', c.icon)}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        className={cn('text-2xl font-bold tracking-tight tabular-nums leading-none', c.value)}
      >
        {display.toLocaleString()}
      </p>
      <p className="mt-1 text-[10px] font-semibold text-white/50 tracking-wider uppercase">
        {label}
      </p>
      {sub && (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold mt-1 text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
          {sub}
        </span>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Grid wrapper (convenience)                                         */
/* ------------------------------------------------------------------ */

export function AdminHeroStatRow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-stretch gap-2.5 flex-wrap', className)}>
      {children}
    </div>
  )
}
