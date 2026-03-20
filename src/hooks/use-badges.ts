import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Badge } from '@/types/database.types'

export interface BadgeWithStatus extends Badge {
  earned: boolean
  earnedAt: string | null
}

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .order('category', { ascending: true })
      if (error) throw error
      return data
    },
    staleTime: 30 * 60 * 1000,
  })
}

export function useUserBadges(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['user-badges', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', id)
        .order('earned_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBadgesWithStatus(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['badges-with-status', id],
    queryFn: async (): Promise<BadgeWithStatus[]> => {
      if (!id) throw new Error('No user ID')

      const [{ data: allBadges, error: badgeErr }, { data: userBadges, error: ubErr }] =
        await Promise.all([
          supabase.from('badges').select('*').order('category'),
          supabase.from('user_badges').select('badge_id, earned_at').eq('user_id', id),
        ])

      if (badgeErr) throw badgeErr
      if (ubErr) throw ubErr

      const earnedMap = new Map<string, string>()
      for (const ub of userBadges ?? []) {
        earnedMap.set(ub.badge_id, ub.earned_at)
      }

      return (allBadges ?? []).map((badge) => ({
        ...badge,
        earned: earnedMap.has(badge.id),
        earnedAt: earnedMap.get(badge.id) ?? null,
      }))
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useBadgeDetail(badgeId: string) {
  return useQuery({
    queryKey: ['badge-detail', badgeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('id', badgeId)
        .single()
      if (error) throw error

      // Get total earners for rarity
      const { count } = await supabase
        .from('user_badges')
        .select('*', { count: 'exact', head: true })
        .eq('badge_id', badgeId)

      return { ...data, totalEarners: count ?? 0 }
    },
    enabled: !!badgeId,
    staleTime: 10 * 60 * 1000,
  })
}
