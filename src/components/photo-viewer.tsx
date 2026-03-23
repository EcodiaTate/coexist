import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface Photo {
  src: string
  alt: string
  id: string
  photographer?: {
    name: string
    avatarUrl?: string
  }
}

interface PhotoViewerProps {
  photos: Photo[]
  initialIndex?: number
  open: boolean
  onClose: () => void
  /** Called when admin/leader taps remove - pass null to hide the button */
  onRemove?: (photoId: string) => void
  className?: string
}

export function PhotoViewer({
  photos,
  initialIndex = 0,
  open,
  onClose,
  onRemove,
  className,
}: PhotoViewerProps) {
  const shouldReduceMotion = useReducedMotion()

  // Reset index when reopened
  const [index, setIndex] = useState(initialIndex)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open && !prevOpen) {
    setIndex(initialIndex)
  }
  if (open !== prevOpen) {
    setPrevOpen(open)
  }

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : photos.length - 1))
  }, [photos.length])

  const next = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : 0))
  }, [photos.length])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose, prev, next])

  const photo = photos[index]
  if (!photo) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 z-50 flex flex-col bg-black/95',
            className,
          )}
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          {/* Top bar */}
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-white/70">
              {index + 1} / {photos.length}
            </span>
            <div className="flex items-center gap-2">
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  className="flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:bg-white/10 transition-colors"
                  aria-label="Remove photo"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 rounded-full text-white/70 hover:bg-white/10 transition-colors"
                aria-label="Close photo viewer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Image area - swipe/pinch via CSS touch-action */}
          <div
            className="flex-1 flex items-center justify-center px-4 min-h-0 touch-pinch-zoom"
            onClick={onClose}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={photo.id}
                src={photo.src}
                alt={photo.alt}
                initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="max-h-full max-w-full object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </AnimatePresence>
          </div>

          {/* Navigation arrows (desktop) */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRight size={22} />
              </button>
            </>
          )}

          {/* Attribution */}
          {photo.photographer && (
            <div className="flex items-center justify-center gap-2 p-4">
              {photo.photographer.avatarUrl && (
                <img
                  src={photo.photographer.avatarUrl}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-white/70">
                Photo by {photo.photographer.name}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
