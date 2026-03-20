import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ProgressiveImageProps {
  src: string
  alt: string
  /** Low-quality placeholder (blur-up) */
  placeholder?: string
  aspectRatio?: string
  className?: string
}

/**
 * Image lazy loading with blur -> sharp progressive loading.
 * §42 item 61.
 */
export function ProgressiveImage({
  src,
  alt,
  placeholder,
  aspectRatio = '16/9',
  className,
}: ProgressiveImageProps) {
  const shouldReduceMotion = useReducedMotion()
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = useCallback(() => setLoaded(true), [])
  const handleError = useCallback(() => setError(true), [])

  return (
    <div
      className={cn('relative overflow-hidden bg-white', className)}
      style={{ aspectRatio }}
    >
      {/* Placeholder / blur layer */}
      {placeholder && !loaded && !error && (
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-lg scale-110"
        />
      )}

      {/* Shimmer while loading */}
      {!loaded && !error && !placeholder && (
        <div
          className={cn(
            'absolute inset-0 bg-white',
            'before:absolute before:inset-0',
            'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
            'before:animate-[shimmer_1.5s_ease-in-out_infinite]',
            'motion-reduce:before:animate-none',
          )}
          aria-hidden="true"
        />
      )}

      {/* Full image */}
      {!error && (
        <motion.img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            !loaded && 'opacity-0',
          )}
          initial={false}
          animate={loaded ? { opacity: 1 } : { opacity: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
        />
      )}

      {/* Error fallback */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <span className="text-sm text-primary-400">Image unavailable</span>
        </div>
      )}
    </div>
  )
}
