import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface GridImage {
  src: string
  alt: string
  id: string
}

interface PhotoGridProps {
  images: GridImage[]
  onImageClick?: (index: number) => void
  maxVisible?: number
  loading?: boolean
  className?: string
  'aria-label'?: string
}

export function PhotoGrid({
  images,
  onImageClick,
  maxVisible = 8,
  loading = false,
  className,
  'aria-label': ariaLabel = 'Photo gallery',
}: PhotoGridProps) {
  const shouldReduceMotion = useReducedMotion()
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading photos"
        className={cn(
          'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
          className,
        )}
      >
        {Array.from({ length: maxVisible }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-lg bg-white"
          />
        ))}
        <span className="sr-only">Loading photos</span>
      </div>
    )
  }

  const hasOverflow = images.length > maxVisible
  const visibleImages = hasOverflow
    ? images.slice(0, maxVisible)
    : images
  const overflowCount = images.length - maxVisible

  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      className={cn(
        'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
        className,
      )}
    >
      {visibleImages.map((image, index) => {
        const isLastVisible = hasOverflow && index === maxVisible - 1

        return (
          <motion.button
            key={image.id}
            type="button"
            role="gridcell"
            aria-label={isLastVisible ? `View ${overflowCount} more photos` : image.alt}
            onClick={() => onImageClick?.(index)}
            whileHover={shouldReduceMotion ? undefined : { scale: 1.03 }}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={cn(
              'relative aspect-square overflow-hidden rounded-lg',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
            )}
          >
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              onLoad={() =>
                setLoadedImages((prev) => new Set(prev).add(image.id))
              }
              className={cn(
                'h-full w-full object-cover transition-opacity duration-300',
                loadedImages.has(image.id) ? 'opacity-100' : 'opacity-0',
              )}
            />

            {!loadedImages.has(image.id) && (
              <div
                className="absolute inset-0 animate-pulse bg-white"
                aria-hidden="true"
              />
            )}

            {isLastVisible && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-black/60"
                aria-hidden="true"
              >
                <span className="text-lg font-heading font-semibold text-white">
                  +{overflowCount} more
                </span>
              </div>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
