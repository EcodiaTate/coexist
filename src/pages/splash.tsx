import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { APP_NAME, TAGLINE } from '@/lib/constants'
import { useAuth } from '@/hooks/use-auth'

interface SplashProps {
  /** Called when splash is done and app is ready */
  onReady: () => void
}

export default function SplashPage({ onReady }: SplashProps) {
  const { isLoading: authLoading } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  // Minimum display time of 1.5s
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  // Start fade-out when both auth resolves AND minimum time passes
  useEffect(() => {
    if (minTimePassed && !authLoading && !dismissing) {
      setDismissing(true)
    }
  }, [minTimePassed, authLoading, dismissing])

  return (
    <AnimatePresence onExitComplete={onReady}>
      {!dismissing && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          transition={shouldReduceMotion ? { duration: 0.15 } : { duration: 0.4, ease: 'easeInOut' }}
        >
          <motion.div
            className="flex flex-col items-center gap-8"
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Logo */}
            <motion.img
              src="/logos/black-wordmark.png"
              alt={APP_NAME}
              className="w-[225px] max-w-[60vw] h-auto"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            />

            {/* Tagline */}
            <motion.p
              className="text-[11px] sm:text-xs text-primary-600 font-medium tracking-[0.2em] uppercase"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {TAGLINE}
            </motion.p>

            {/* Subtle leaf accent */}
            <motion.div
              className="mt-6 flex items-center gap-1.5"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.9 }}
            >
              <span className="block w-1.5 h-1.5 rounded-full bg-primary-300" />
              <span className="block w-1.5 h-1.5 rounded-full bg-primary-400" />
              <span className="block w-1.5 h-1.5 rounded-full bg-primary-500" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
