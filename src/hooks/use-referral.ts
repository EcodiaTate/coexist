import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

export function useReferralCode() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // Read-only query: just fetch existing code
  const query = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('invites')
        .select('code')
        .eq('inviter_id', user.id)
        .limit(1)
        .maybeSingle()

      return existing?.code ?? null
    },
    enabled: !!user,
    staleTime: 60 * 60 * 1000,
  })

  // Separate mutation for creating a code (prevents duplicate inserts on query retry)
  const createCode = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const code = `CE-${user.id.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`
      const { error } = await supabase
        .from('invites')
        .insert({ inviter_id: user.id, invitee_email: '', code, status: 'pending' })
      if (error) throw error
      return code
    },
    onSuccess: (code) => {
      queryClient.setQueryData(['referral-code', user?.id], code)
    },
  })

  return { ...query, createCode }
}

export function useReferralStats(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['referral-stats', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')

      const { data: invites, error } = await supabase
        .from('invites')
        .select('*')
        .eq('inviter_id', id)

      if (error) throw error

      const total = invites?.length ?? 0
      const accepted = invites?.filter((i) => i.status === 'accepted').length ?? 0
      const pending = invites?.filter((i) => i.status === 'pending').length ?? 0

      return { total, accepted, pending }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useReferralLeaderboard() {
  return useQuery({
    queryKey: ['referral-leaderboard'],
    queryFn: async () => {
      const { data: invites } = await supabase
        .from('invites')
        .select('inviter_id')
        .eq('status', 'accepted')

      if (!invites?.length) return []

      const counts = new Map<string, number>()
      for (const invite of invites) {
        counts.set(invite.inviter_id, (counts.get(invite.inviter_id) ?? 0) + 1)
      }

      const sorted = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)

      if (sorted.length === 0) return []

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', sorted.map(([id]) => id))

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

      return sorted.map(([userId, count], i) => ({
        rank: i + 1,
        userId,
        displayName: profileMap.get(userId)?.display_name ?? 'Unknown',
        avatarUrl: profileMap.get(userId)?.avatar_url ?? null,
        referrals: count,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSendInvite() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('invites')
        .insert({
          inviter_id: user.id,
          invitee_email: email,
          code,
          status: 'pending',
        })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referral-stats', user?.id] })
    },
  })
}
