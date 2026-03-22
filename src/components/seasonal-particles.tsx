import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'

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
  y: number
  delay: number
  duration: number
  size: number
  sway: number
  color: string
}

const AUTUMN_COLORS = ['#C0854D', '#A16B3D', '#D4A574', '#8B6F47']
const BLOSSOM_COLORS = ['#F9A8D4', '#FBCFE8', '#F472B6']

function createParticles(count: number, season: Season): ParticleConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: randomBetween(5, 95),
    y: season === 'summer' ? randomBetween(20, 80) : 0,
    delay: randomBetween(0, 8),
    duration: season === 'summer' ? randomBetween(12, 22) : randomBetween(8, 15),
    size: randomBetween(10, 18),
    sway: randomBetween(20, 50),
    color: season === 'autumn'
      ? AUTUMN_COLORS[i % AUTUMN_COLORS.length]
      : season === 'spring'
        ? BLOSSOM_COLORS[i % BLOSSOM_COLORS.length]
        : '',
  }))
}

/* ---- Per-season SVG shapes (static, no motion wrappers) ---- */

function AutumnLeafShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1C8 1 2 5 2 10c0 2.8 2.7 5 6 5s6-2.2 6-5c0-5-6-9-6-9z"
        fill={color}
        opacity="0.8"
      />
    </svg>
  )
}

function SnowflakeShape({ size }: { size: number }) {
  return (
    <div
      className="rounded-full bg-white/70"
      style={{ width: size, height: size }}
    />
  )
}

function BlossomShape({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <circle cx="6" cy="3" r="2.5" fill={color} />
      <circle cx="3" cy="6" r="2.5" fill={color} />
      <circle cx="9" cy="6" r="2.5" fill={color} />
      <circle cx="6" cy="9" r="2.5" fill={color} />
      <circle cx="6" cy="6" r="2" fill="#FDE047" />
    </svg>
  )
}

function FireflyShape({ size }: { size: number }) {
  const s = size * 0.6
  return (
    <div
      className="rounded-full bg-warning-300"
      style={{
        width: s,
        height: s,
        boxShadow: '0 0 6px 2px rgba(253, 224, 71, 0.4)',
      }}
    />
  )
}

/**
 * Seasonal ambient particles - Southern Hemisphere.
 * §37 item 19.
 *
 * Uses pure CSS animations (compositor-driven) instead of per-frame
 * Framer Motion JS for zero main-thread cost.
 */
export function SeasonalParticles({
  season: overrideSeason,
  count = 8,
}: SeasonalParticlesProps) {
  const shouldReduceMotion = useReducedMotion()
  const season = overrideSeason ?? getSouthernHemisphereSeason()

  const particles = useMemo(() => createParticles(count, season), [count, season])

  if (shouldReduceMotion) return null

  const isSummer = season === 'summer'

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{ contain: 'strict' }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="css-particle"
          style={{
            left: `${p.x}%`,
            top: isSummer ? `${p.y}%` : '-20px',
            '--sway': `${p.sway}px`,
            animationName: isSummer ? 'firefly-glow, firefly-drift' : 'particle-fall, particle-sway',
            animationDuration: `${p.duration}s, ${p.duration * 1.3}s`,
            animationDelay: `${p.delay}s, ${p.delay}s`,
            animationIterationCount: 'infinite, infinite',
            animationTimingFunction: isSummer ? 'ease-in-out, ease-in-out' : 'linear, ease-in-out',
          } as React.CSSProperties}
        >
          {season === 'autumn' && <AutumnLeafShape size={p.size} color={p.color} />}
          {season === 'winter' && <SnowflakeShape size={p.size} />}
          {season === 'spring' && <BlossomShape size={p.size} color={p.color} />}
          {season === 'summer' && <FireflyShape size={p.size} />}
        </div>
      ))}
    </div>
  )
}
