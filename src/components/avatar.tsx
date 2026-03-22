import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type Tier = 'seedling' | 'sapling' | 'native' | 'canopy' | 'elder'

export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: AvatarSize
  online?: boolean
  tier?: Tier
  loading?: boolean
  className?: string
  'aria-label'?: string
}

/* ------------------------------------------------------------------ */
/*  Size map                                                           */
/* ------------------------------------------------------------------ */

const sizeMap: Record<AvatarSize, { px: number; text: string; dot: string; ring: string }> = {
  xs: { px: 24, text: 'text-[10px]', dot: 'w-2 h-2 ring-1', ring: 'ring-2' },
  sm: { px: 32, text: 'text-xs', dot: 'w-2.5 h-2.5 ring-[1.5px]', ring: 'ring-2' },
  md: { px: 40, text: 'text-sm', dot: 'w-3 h-3 ring-2', ring: 'ring-2' },
  lg: { px: 56, text: 'text-base', dot: 'w-3.5 h-3.5 ring-2', ring: 'ring-[3px]' },
  xl: { px: 80, text: 'text-xl', dot: 'w-4 h-4 ring-2', ring: 'ring-[3px]' },
}

/* ------------------------------------------------------------------ */
/*  Tier ring colors                                                   */
/* ------------------------------------------------------------------ */

const tierRingColor: Record<Tier, string> = {
  seedling: 'ring-moss-400',
  sapling: 'ring-moss-500',
  native: 'ring-moss-600',
  canopy: 'ring-primary-500',
  elder: 'ring-warning-500',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getInitials(name: string | undefined | null): string {
  if (!name?.trim()) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function Avatar({
  src,
  name,
  size = 'md',
  online,
  tier,
  loading = false,
  className,
  'aria-label': ariaLabel,
}: AvatarProps) {
  const shouldReduceMotion = useReducedMotion()
  const [imgError, setImgError] = useState(false)
  const s = sizeMap[size]
  const showImage = src && !imgError
  const initials = getInitials(name)

  /* Skeleton */
  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading avatar"
        className={cn('rounded-full bg-white animate-pulse shrink-0', className)}
        style={{ width: s.px, height: s.px }}
      />
    )
  }

  return (
    <div
      className={cn('relative inline-flex shrink-0', className)}
      style={{ width: s.px, height: s.px }}
    >
      <motion.div
        initial={shouldReduceMotion ? undefined : { scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        aria-label={ariaLabel ?? name ?? undefined}
        role="img"
        className={cn(
          'w-full h-full rounded-full overflow-hidden',
          // tier ring removed by design
          !showImage && 'bg-primary-200',
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={name ?? undefined}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className={cn(
              'flex items-center justify-center w-full h-full',
              'font-heading font-semibold text-primary-400 select-none',
              s.text,
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
        )}
      </motion.div>

      {/* Online indicator */}
      {online !== undefined && online && (
        <span
          aria-label="Online"
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-success ring-white',
            s.dot,
          )}
        />
      )}
    </div>
  )
}
