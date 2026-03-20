import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type Season = 'autumn' | 'winter' | 'spring' | 'summer'

interface SeasonalParticlesProps {
  /** Override auto-detected season */
  season?: Season
  count?: number
}

function getSouthernHemisphereSeason(): Season {
  const month = new Date().getMonth() // 0-indexed
  if (month >= 2 && month <= 4) return 'autumn' // Mar-May
  if (month >= 5 && month <= 7) return 'winter' // Jun-Aug
  if (month >= 8 && month <= 10) return 'spring' // Sep-Nov
  return 'summer' // Dec-Feb
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

interface ParticleConfig {
  id: number
  x: number
  delay: number
  duration: number
  size: number
  sway: number
}

function AutumnLeaf({ config }: { config: ParticleConfig }) {
  const colors = ['#C0854D', '#A16B3D', '#D4A574', '#8B6F47']
  const color = colors[config.id % colors.length]

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${config.x}%`, top: '-20px' }}
      initial={{ y: -20, x: 0, rotate: 0, opacity: 0.7 }}
      animate={{
        y: '100vh',
        x: [0, config.sway, -config.sway / 2, config.sway / 3, 0],
        rotate: [0, 180, 360, 540],
        opacity: [0.7, 0.7, 0.5, 0],
      }}
      transition={{
        duration: config.duration,
        delay: config.delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg
        width={config.size}
        height={config.size}
        viewBox="0 0 16 16"
        aria-hidden="true"
      >
        <path
          d="M8 1C8 1 2 5 2 10c0 2.8 2.7 5 6 5s6-2.2 6-5c0-5-6-9-6-9z"
          fill={color}
          opacity="0.8"
        />
      </svg>
    </motion.div>
  )
}

function Snowflake({ config }: { config: ParticleConfig }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${config.x}%`, top: '-10px' }}
      initial={{ y: -10, x: 0, opacity: 0.6 }}
      animate={{
        y: '100vh',
        x: [0, config.sway, -config.sway, config.sway / 2, 0],
        opacity: [0.6, 0.6, 0.4, 0],
      }}
      transition={{
        duration: config.duration,
        delay: config.delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <div
        className="rounded-full bg-white/70"
        style={{ width: config.size, height: config.size }}
      />
    </motion.div>
  )
}

function Blossom({ config }: { config: ParticleConfig }) {
  const colors = ['#F9A8D4', '#FBCFE8', '#F472B6']
  const color = colors[config.id % colors.length]

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${config.x}%`, top: '-15px' }}
      initial={{ y: -15, x: 0, rotate: 0, opacity: 0.6 }}
      animate={{
        y: '100vh',
        x: [0, config.sway * 1.5, -config.sway, config.sway * 0.5, 0],
        rotate: [0, 90, 180, 270, 360],
        opacity: [0.6, 0.6, 0.4, 0],
      }}
      transition={{
        duration: config.duration,
        delay: config.delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <svg
        width={config.size}
        height={config.size}
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <circle cx="6" cy="3" r="2.5" fill={color} />
        <circle cx="3" cy="6" r="2.5" fill={color} />
        <circle cx="9" cy="6" r="2.5" fill={color} />
        <circle cx="6" cy="9" r="2.5" fill={color} />
        <circle cx="6" cy="6" r="2" fill="#FDE047" />
      </svg>
    </motion.div>
  )
}

function Firefly({ config }: { config: ParticleConfig }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ left: `${config.x}%`, top: `${randomBetween(20, 80)}%` }}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0, 0.8, 0.3, 0.9, 0],
        x: [0, config.sway, -config.sway * 0.5, config.sway * 0.3],
        y: [0, -config.sway * 0.5, config.sway * 0.3, -config.sway * 0.2],
      }}
      transition={{
        duration: config.duration * 1.5,
        delay: config.delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div
        className="rounded-full bg-yellow-300"
        style={{
          width: config.size * 0.6,
          height: config.size * 0.6,
          boxShadow: '0 0 6px 2px rgba(253, 224, 71, 0.4)',
        }}
      />
    </motion.div>
  )
}

/**
 * Seasonal ambient particles - Southern Hemisphere.
 * §37 item 19.
 */
export function SeasonalParticles({
  season: overrideSeason,
  count = 8,
}: SeasonalParticlesProps) {
  const shouldReduceMotion = useReducedMotion()
  const season = overrideSeason ?? getSouthernHemisphereSeason()

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: randomBetween(5, 95),
      delay: randomBetween(0, 8),
      duration: randomBetween(8, 15),
      size: randomBetween(10, 18),
      sway: randomBetween(20, 50),
    }))
  }, [count])

  if (shouldReduceMotion) return null

  const ParticleComponent = {
    autumn: AutumnLeaf,
    winter: Snowflake,
    spring: Blossom,
    summer: Firefly,
  }[season]

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <ParticleComponent key={p.id} config={p} />
      ))}
    </div>
  )
}
