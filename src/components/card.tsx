/* eslint-disable react-refresh/only-export-components */
import {
  type ReactNode,
  createContext,
  useContext,
  forwardRef,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type CardVariant =
  | 'event'
  | 'collective'
  | 'stat'
  | 'profile'
  | 'merch'
  | 'announcement'

interface CardContextValue {
  variant: CardVariant
}

const CardContext = createContext<CardContextValue>({ variant: 'event' })

function useCard() {
  return useContext(CardContext)
}

/* ------------------------------------------------------------------ */
/*  Variant-specific styling                                           */
/* ------------------------------------------------------------------ */

const variantWrapper: Record<CardVariant, string> = {
  event: 'bg-surface-0',
  collective: 'bg-surface-2',
  stat: 'bg-gradient-to-br from-surface-0 to-primary-100/60',
  profile: 'bg-surface-2',
  merch: 'bg-surface-0',
  announcement:
    'bg-gradient-to-br from-surface-0 to-accent-100',
}

/* ------------------------------------------------------------------ */
/*  Card (root)                                                        */
/* ------------------------------------------------------------------ */

interface CardRootProps {
  variant?: CardVariant
  children: ReactNode
  className?: string
  onClick?: React.MouseEventHandler<HTMLDivElement>
  'aria-label'?: string
}

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(function CardRoot(
  { variant = 'event', children, className, onClick, 'aria-label': ariaLabel },
  ref,
) {
  const shouldReduceMotion = useReducedMotion()
  const isInteractive = !!onClick

  return (
    <CardContext.Provider value={{ variant }}>
      <motion.div
        ref={ref}
        role={isInteractive ? 'button' : 'article'}
        tabIndex={isInteractive ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={
          isInteractive
            ? (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
                }
              }
            : undefined
        }
        whileTap={
          isInteractive && !shouldReduceMotion
            ? { scale: 0.98 }
            : undefined
        }
        transition={{ type: 'spring', stiffness: 400, damping: 26, mass: 0.7 }}
        className={cn(
          'rounded-2xl shadow-md overflow-hidden',
          isInteractive && 'cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
          variantWrapper[variant],
          className,
        )}
      >
        {children}
      </motion.div>
    </CardContext.Provider>
  )
})

/* ------------------------------------------------------------------ */
/*  Card.Image                                                         */
/* ------------------------------------------------------------------ */

interface CardImageProps {
  src: string
  alt: string
  aspectRatio?: string
  className?: string
}

function CardImage({
  src,
  alt,
  aspectRatio = '16/9',
  className,
}: CardImageProps) {
  const { variant } = useCard()
  const hasGradient = variant === 'event'

  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {hasGradient && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Card.Badge                                                         */
/* ------------------------------------------------------------------ */

interface CardBadgeProps {
  children: ReactNode
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  className?: string
}

const badgePositionMap: Record<NonNullable<CardBadgeProps['position']>, string> = {
  'top-left': 'top-2 left-2',
  'top-right': 'top-2 right-2',
  'bottom-left': 'bottom-2 left-2',
  'bottom-right': 'bottom-2 right-2',
}

function CardBadge({
  children,
  position = 'top-right',
  className,
}: CardBadgeProps) {
  return (
    <span
      className={cn(
        'absolute z-10',
        badgePositionMap[position],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Card.Content                                                       */
/* ------------------------------------------------------------------ */

interface CardContentProps {
  children: ReactNode
  className?: string
}

function CardContent({ children, className }: CardContentProps) {
  return <div className={cn('p-4', className)}>{children}</div>
}

/* ------------------------------------------------------------------ */
/*  Card.Title                                                         */
/* ------------------------------------------------------------------ */

interface CardTitleProps {
  children: ReactNode
  as?: 'h2' | 'h3' | 'h4' | 'h5'
  className?: string
}

function CardTitle({ children, as: Tag = 'h3', className }: CardTitleProps) {
  return (
    <Tag
      className={cn(
        'font-heading font-semibold text-primary-800 leading-tight',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/* ------------------------------------------------------------------ */
/*  Card.Meta                                                          */
/* ------------------------------------------------------------------ */

interface CardMetaProps {
  children: ReactNode
  className?: string
}

function CardMeta({ children, className }: CardMetaProps) {
  return (
    <p className={cn('text-caption text-primary-400 mt-1', className)}>
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ */
/*  Card.Skeleton                                                      */
/* ------------------------------------------------------------------ */

interface CardSkeletonProps {
  hasImage?: boolean
  lines?: number
  className?: string
}

function CardSkeleton({
  hasImage = true,
  lines = 3,
  className,
}: CardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading card"
      className={cn(
        'rounded-2xl shadow-md overflow-hidden bg-surface-0 animate-pulse',
        className,
      )}
    >
      {hasImage && (
        <div className="w-full bg-primary-100" style={{ aspectRatio: '16/9' }} />
      )}
      <div className="p-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-3.5 bg-primary-100 rounded',
              i === 0 && 'w-3/4 h-4',
              i === lines - 1 && 'w-1/2',
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Compound export                                                    */
/* ------------------------------------------------------------------ */

export const Card = Object.assign(CardRoot, {
  Root: CardRoot,
  Image: CardImage,
  Badge: CardBadge,
  Content: CardContent,
  Title: CardTitle,
  Meta: CardMeta,
  Skeleton: CardSkeleton,
})
