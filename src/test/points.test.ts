import { describe, it, expect } from 'vitest'
import {
  getTierFromPoints,
  getTierProgress,
  POINT_VALUES,
  TIER_THRESHOLDS,
} from '@/hooks/use-points'

describe('POINT_VALUES', () => {
  it('has expected keys', () => {
    expect(POINT_VALUES.event_attendance).toBe(100)
    expect(POINT_VALUES.first_event).toBe(250)
    expect(POINT_VALUES.referral_first_event).toBe(200)
    expect(POINT_VALUES.complete_profile).toBe(50)
  })
})

describe('TIER_THRESHOLDS', () => {
  it('tiers are contiguous', () => {
    expect(TIER_THRESHOLDS.new.min).toBe(0)
    expect(TIER_THRESHOLDS.active.min).toBe(500)
    expect(TIER_THRESHOLDS.committed.min).toBe(2000)
    expect(TIER_THRESHOLDS.dedicated.min).toBe(5000)
    expect(TIER_THRESHOLDS.lifetime.min).toBe(10000)
    expect(TIER_THRESHOLDS.lifetime.max).toBe(Infinity)
  })
})

describe('getTierFromPoints', () => {
  it('returns new for 0 points', () => {
    expect(getTierFromPoints(0)).toBe('new')
  })

  it('returns new for 499 points', () => {
    expect(getTierFromPoints(499)).toBe('new')
  })

  it('returns active for 500 points', () => {
    expect(getTierFromPoints(500)).toBe('active')
  })

  it('returns committed for 2000 points', () => {
    expect(getTierFromPoints(2000)).toBe('committed')
  })

  it('returns dedicated for 5000 points', () => {
    expect(getTierFromPoints(5000)).toBe('dedicated')
  })

  it('returns lifetime for 10000 points', () => {
    expect(getTierFromPoints(10000)).toBe('lifetime')
  })

  it('returns lifetime for very high points', () => {
    expect(getTierFromPoints(999999)).toBe('lifetime')
  })
})

describe('getTierProgress', () => {
  it('returns 0% progress at tier start', () => {
    const result = getTierProgress(0)
    expect(result.tier).toBe('new')
    expect(result.nextTier).toBe('active')
    expect(result.progress).toBe(0)
    expect(result.pointsToNext).toBe(500)
  })

  it('returns 50% progress midway through new', () => {
    const result = getTierProgress(250)
    expect(result.tier).toBe('new')
    expect(result.progress).toBe(50)
    expect(result.pointsToNext).toBe(250)
  })

  it('returns 100% progress and no next tier for lifetime', () => {
    const result = getTierProgress(15000)
    expect(result.tier).toBe('lifetime')
    expect(result.nextTier).toBeNull()
    expect(result.progress).toBe(100)
    expect(result.pointsToNext).toBe(0)
  })

  it('calculates active progress correctly', () => {
    // active: 500-1999, next is committed at 2000
    const result = getTierProgress(1250)
    expect(result.tier).toBe('active')
    expect(result.nextTier).toBe('committed')
    expect(result.progress).toBe(50)
    expect(result.pointsToNext).toBe(750)
  })

  it('caps progress at 100', () => {
    // At the very edge of a tier
    const result = getTierProgress(499)
    expect(result.progress).toBeLessThanOrEqual(100)
  })
})
