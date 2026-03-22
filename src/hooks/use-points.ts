import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

export const POINT_VALUES = {
  event_attendance: 100,
  first_event: 250,
  event_check_in_qr: 50,
  referral_first_event: 200,
  post_photo: 25,
  complete_profile: 50,
  join_collective: 50,
  streak_bonus_week: 50,
} as const

export const TIER_THRESHOLDS = {
  new: { min: 0, max: 499 },
  active: { min: 500, max: 1999 },
  committed: { min: 2000, max: 4999 },
  dedicated: { min: 5000, max: 9999 },
  lifetime: { min: 10000, max: Infinity },
} as const

export type TierName = keyof typeof TIER_THRESHOLDS

export function getTierFromPoints(points: number): TierName {
  if (points >= 10000) return 'lifetime'
  if (points >= 5000) return 'dedicated'
  if (points >= 2000) return 'committed'
  if (points >= 500) return 'active'
  return 'new'
}

export function getTierProgress(points: number): {
  tier: TierName
  nextTier: TierName | null
  progress: number
  pointsToNext: number
} {
  const tier = getTierFromPoints(points)
  const thresholds = TIER_THRESHOLDS[tier]

  if (tier === 'lifetime') {
    return { tier, nextTier: null, progress: 100, pointsToNext: 0 }
  }

  const tierOrder: TierName[] = ['new', 'active', 'committed', 'dedicated', 'lifetime']
  const nextTier = tierOrder[tierOrder.indexOf(tier) + 1] as TierName
  const nextMin = TIER_THRESHOLDS[nextTier].min
  const rangeSize = nextMin - thresholds.min
  const progress = Math.round(((points - thresholds.min) / rangeSize) * 100)

  return {
    tier,
    nextTier,
    progress: Math.min(progress, 100),
    pointsToNext: nextMin - points,
  }
}

export function usePointsBalance(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['points-balance', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')
      const { data, error } = await supabase
        .from('profiles')
        .select('points, membership_level')
        .eq('id', id)
        .single()
      if (error) throw error
      return { points: data.points, membershipLevel: data.membership_level }
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}

export function usePointsHistory(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['points-history', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')
      const { data, error } = await supabase
        .from('points_ledger')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  })
}
