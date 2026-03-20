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
    expect(TIER_THRESHOLDS.seedling.min).toBe(0)
    expect(TIER_THRESHOLDS.sapling.min).toBe(500)
    expect(TIER_THRESHOLDS.native.min).toBe(2000)
    expect(TIER_THRESHOLDS.canopy.min).toBe(5000)
    expect(TIER_THRESHOLDS.elder.min).toBe(10000)
    expect(TIER_THRESHOLDS.elder.max).toBe(Infinity)
  })
})

describe('getTierFromPoints', () => {
  it('returns seedling for 0 points', () => {
    expect(getTierFromPoints(0)).toBe('seedling')
  })

  it('returns seedling for 499 points', () => {
    expect(getTierFromPoints(499)).toBe('seedling')
  })

  it('returns sapling for 500 points', () => {
    expect(getTierFromPoints(500)).toBe('sapling')
  })

  it('returns native for 2000 points', () => {
    expect(getTierFromPoints(2000)).toBe('native')
  })

  it('returns canopy for 5000 points', () => {
    expect(getTierFromPoints(5000)).toBe('canopy')
  })

  it('returns elder for 10000 points', () => {
    expect(getTierFromPoints(10000)).toBe('elder')
  })

  it('returns elder for very high points', () => {
    expect(getTierFromPoints(999999)).toBe('elder')
  })
})

describe('getTierProgress', () => {
  it('returns 0% progress at tier start', () => {
    const result = getTierProgress(0)
    expect(result.tier).toBe('seedling')
    expect(result.nextTier).toBe('sapling')
    expect(result.progress).toBe(0)
    expect(result.pointsToNext).toBe(500)
  })

  it('returns 50% progress midway through seedling', () => {
    const result = getTierProgress(250)
    expect(result.tier).toBe('seedling')
    expect(result.progress).toBe(50)
    expect(result.pointsToNext).toBe(250)
  })

  it('returns 100% progress and no next tier for elder', () => {
    const result = getTierProgress(15000)
    expect(result.tier).toBe('elder')
    expect(result.nextTier).toBeNull()
    expect(result.progress).toBe(100)
    expect(result.pointsToNext).toBe(0)
  })

  it('calculates sapling progress correctly', () => {
    // sapling: 500-1999, next is native at 2000
    const result = getTierProgress(1250)
    expect(result.tier).toBe('sapling')
    expect(result.nextTier).toBe('native')
    expect(result.progress).toBe(50)
    expect(result.pointsToNext).toBe(750)
  })

  it('caps progress at 100', () => {
    // At the very edge of a tier
    const result = getTierProgress(499)
    expect(result.progress).toBeLessThanOrEqual(100)
  })
})
