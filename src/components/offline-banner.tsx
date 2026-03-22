import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useOffline } from '@/hooks/use-offline'

interface OfflineBannerProps {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const { isOffline, justReconnected } = useOffline()
  const shouldReduceMotion = useReducedMotion()

  const show = isOffline || justReconnected

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          role="status"
          aria-live="polite"
          className={cn('overflow-hidden', className)}
        >
          <div
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium',
              isOffline
                ? 'bg-primary-900 text-white'
                : 'bg-success text-white',
            )}
          >
            {isOffline ? (
              <>
                <WifiOff size={14} />
                <span>You're offline - some features may be limited</span>
              </>
            ) : (
              <>
                <Wifi size={14} />
                <span>Back online</span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
