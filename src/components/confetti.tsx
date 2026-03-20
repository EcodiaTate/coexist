import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ConfettiProps {
  active: boolean
  /** Duration in ms before auto-clearing */
  duration?: number
  /** Number of particles */
  count?: number
  className?: string
}

interface Particle {
  id: number
  x: number
  y: number
  rotation: number
  scale: number
  color: string
  shape: 'circle' | 'rect' | 'leaf'
  delay: number
}

const COLORS = [
  'var(--color-primary-400)',
  'var(--color-primary-600)',
  'var(--color-secondary-400)',
  'var(--color-accent-400)',
  'var(--color-accent-500)',
  'var(--color-success)',
]

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function createParticles(count: number): Particle[] {
  const shapes: Particle['shape'][] = ['circle', 'rect', 'leaf']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(10, 90),
    y: randomBetween(-20, -5),
    rotation: randomBetween(0, 360),
    scale: randomBetween(0.5, 1.2),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    delay: randomBetween(0, 0.3),
  }))
}

function ParticleShape({ shape, color }: { shape: Particle['shape']; color: string }) {
  if (shape === 'circle') {
    return (
      <div
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    )
  }
  if (shape === 'rect') {
    return (
      <div
        className="w-3 h-1.5 rounded-sm"
        style={{ backgroundColor: color }}
      />
    )
  }
  // Leaf shape
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M6 0C6 0 0 4 0 8c0 2.2 2.7 4 6 4s6-1.8 6-4c0-4-6-8-6-8z"
        fill={color}
      />
    </svg>
  )
}

export function Confetti({
  active,
  duration = 2500,
  count = 40,
  className,
}: ConfettiProps) {
  const shouldReduceMotion = useReducedMotion()
  const [particles, setParticles] = useState<Particle[]>([])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active && !shouldReduceMotion) {
      setParticles(createParticles(count))
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), duration)
      return () => clearTimeout(timer)
    }
    if (active && shouldReduceMotion) {
      // Show a brief flash for reduced motion
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 500)
      return () => clearTimeout(timer)
    }
  }, [active, count, duration, shouldReduceMotion])

  if (shouldReduceMotion && visible) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-[200] pointer-events-none flex items-center justify-center',
          className,
        )}
        aria-hidden="true"
      >
        <motion.div
          className="w-16 h-16 rounded-full bg-primary-400/30"
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </div>
    )
  }

  return (
    <AnimatePresence>
      {visible && (
        <div
          className={cn(
            'fixed inset-0 z-[200] pointer-events-none overflow-hidden',
            className,
          )}
          aria-hidden="true"
        >
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: '0%',
              }}
              initial={{
                y: '-10vh',
                rotate: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: p.rotation + randomBetween(180, 720),
                scale: p.scale,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: randomBetween(1.5, 2.5),
                delay: p.delay,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <ParticleShape shape={p.shape} color={p.color} />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}
