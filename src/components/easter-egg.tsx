import { useRef, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

interface EasterEggProps {
  children: React.ReactNode
  /** Number of taps required */
  taps?: number
}

const BURST_COLORS = [
  'var(--color-primary-400)',
  'var(--color-primary-500)',
  'var(--color-accent-400)',
]

/**
 * Tap logo 5x → hidden animation.
 * §53 item 48.
 *
 * Uses CSS keyframes for the burst particles to avoid
 * 12 simultaneous JS-driven animation loops.
 */
export function EasterEgg({ children, taps = 5 }: EasterEggProps) {
  const shouldReduceMotion = useReducedMotion()
  const [triggered, setTriggered] = useState(false)
  const tapCount = useRef(0)
  const lastTap = useRef(0)

  // Pre-compute burst directions so they're stable during animation
  const burstParticles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        const dist = 150
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          rotate: 360 + i * 30,
          color: BURST_COLORS[i % 3],
        }
      }),
    [],
  )

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
            style={{ contain: 'strict' }}
            aria-hidden="true"
          >
            {!shouldReduceMotion ? (
              <>
                {/* CSS-driven burst particles */}
                {burstParticles.map((p, i) => (
                  <div
                    key={i}
                    className="css-particle"
                    style={{
                      left: '50%',
                      top: '50%',
                      '--burst-x': `${p.x}px`,
                      '--burst-y': `${p.y}px`,
                      animationName: 'burst-out',
                      animationDuration: '1.5s',
                      animationTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                    } as React.CSSProperties}
                  >
                    <svg width="20" height="20" viewBox="0 0 16 16">
                      <path
                        d="M8 1C8 1 2 5 2 10c0 2.8 2.7 5 6 5s6-2.2 6-5c0-5-6-9-6-9z"
                        fill={p.color}
                      />
                    </svg>
                  </div>
                ))}

                {/* Center burst ring */}
                <motion.div
                  className="w-12 h-12 rounded-full bg-primary-400/40"
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: [0, 3, 3], opacity: [0.6, 0.3, 0] }}
                  transition={{ duration: 1, ease: 'easeOut' }}
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
