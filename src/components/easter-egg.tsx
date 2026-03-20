import { useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface EasterEggProps {
  children: React.ReactNode
  /** Number of taps required */
  taps?: number
}

/**
 * Tap logo 5x → hidden animation.
 * §53 item 48.
 */
export function EasterEgg({ children, taps = 5 }: EasterEggProps) {
  const shouldReduceMotion = useReducedMotion()
  const [triggered, setTriggered] = useState(false)
  const tapCount = useRef(0)
  const lastTap = useRef(0)

  const handleTap = useCallback(() => {
    const now = Date.now()
    // Reset if >800ms between taps
    if (now - lastTap.current > 800) {
      tapCount.current = 0
    }
    lastTap.current = now
    tapCount.current++

    if (tapCount.current >= taps) {
      tapCount.current = 0
      setTriggered(true)
      setTimeout(() => setTriggered(false), 3000)
    }
  }, [taps])

  return (
    <>
      <div onClick={handleTap} className="cursor-pointer">
        {children}
      </div>

      <AnimatePresence>
        {triggered && (
          <div
            className="fixed inset-0 z-[300] pointer-events-none flex items-center justify-center"
            aria-hidden="true"
          >
            {/* Nature burst animation */}
            {!shouldReduceMotion ? (
              <>
                {/* Spinning leaves */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute"
                    initial={{
                      x: 0,
                      y: 0,
                      rotate: 0,
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: Math.cos((i / 12) * Math.PI * 2) * 150,
                      y: Math.sin((i / 12) * Math.PI * 2) * 150,
                      rotate: 360 + i * 30,
                      scale: [0, 1.5, 0],
                      opacity: [1, 1, 0],
                    }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 16 16">
                      <path
                        d="M8 1C8 1 2 5 2 10c0 2.8 2.7 5 6 5s6-2.2 6-5c0-5-6-9-6-9z"
                        fill={['var(--color-primary-400)', 'var(--color-primary-500)', 'var(--color-accent-400)'][i % 3]}
                      />
                    </svg>
                  </motion.div>
                ))}

                {/* Center burst */}
                <motion.div
                  className="w-12 h-12 rounded-full bg-primary-400/40"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 3, 0] }}
                  transition={{ duration: 1 }}
                />
              </>
            ) : (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5 }}
                aria-hidden="true"
              >
                <svg width="28" height="28" viewBox="0 0 16 16">
                  <path
                    d="M8 1C8 1 2 5 2 10c0 2.8 2.7 5 6 5s6-2.2 6-5c0-5-6-9-6-9z"
                    fill="var(--color-primary-400)"
                  />
                </svg>
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
