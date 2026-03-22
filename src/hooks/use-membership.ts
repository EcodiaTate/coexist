import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  MembershipPlan,
  MembershipReward,
  MembershipWithPlan,
} from '@/types/membership'

/* ------------------------------------------------------------------ */
/*  Plans                                                              */
/* ------------------------------------------------------------------ */

export function useMembershipPlans() {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans' as any)
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data as unknown as MembershipPlan[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Current user's membership                                          */
/* ------------------------------------------------------------------ */

export function useMyMembership() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-membership', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships' as any)
        .select('*, plan:membership_plans(*)')
        .eq('user_id', user!.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as unknown as MembershipWithPlan | null
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Subscribe → Stripe Checkout                                        */
/* ------------------------------------------------------------------ */

interface SubscribeParams {
  planId: string
  interval: 'monthly' | 'yearly'
}

export function useSubscribeMembership() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: SubscribeParams) => {
      const res = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'membership',
          user_id: user?.id,
          plan_id: params.planId,
          interval: params.interval,
        },
      })
      if (res.error) throw res.error
      return res.data as { session_id: string; url: string }
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Cancel membership                                                  */
/* ------------------------------------------------------------------ */

export function useCancelMembership() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const res = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'cancel_subscription',
          stripe_subscription_id: subscriptionId,
        },
      })
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-membership', user?.id] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Rewards                                                            */
/* ------------------------------------------------------------------ */

export function useMembershipRewards() {
  return useQuery({
    queryKey: ['membership-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_rewards' as any)
        .select('*')
        .eq('is_active', true)
        .order('category')
      if (error) throw error
      return data as unknown as MembershipReward[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: fetch a specific user's membership                          */
/* ------------------------------------------------------------------ */

export function useAdminUserMembership(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin-user-membership', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships' as any)
        .select('*, plan:membership_plans(*)')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as unknown as (MembershipWithPlan & { interval: string }) | null
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: update membership status                                    */
/* ------------------------------------------------------------------ */

export function useAdminUpdateMembershipStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ membershipId, status }: { membershipId: string; status: string }) => {
      const { error } = await supabase
        .from('memberships' as any)
        .update({ status } as any)
        .eq('id', membershipId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-membership'] })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: set of user IDs with active memberships (for list badges)   */
/* ------------------------------------------------------------------ */

export function useActiveMemberUserIds() {
  return useQuery({
    queryKey: ['admin-active-member-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships' as any)
        .select('user_id')
        .in('status', ['active', 'trialing'])
      if (error) throw error
      return new Set((data as any[] ?? []).map((d: any) => d.user_id as string))
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: all rewards (active + inactive)                             */
/* ------------------------------------------------------------------ */

export function useAdminMembershipRewards() {
  return useQuery({
    queryKey: ['admin-membership-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_rewards' as any)
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as MembershipReward[]
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: all plans (active + inactive)                               */
/* ------------------------------------------------------------------ */

export function useAdminMembershipPlans() {
  return useQuery({
    queryKey: ['admin-membership-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('membership_plans' as any)
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data as unknown as MembershipPlan[]
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: upsert reward                                               */
/* ------------------------------------------------------------------ */

export function useUpsertReward() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (reward: Partial<MembershipReward> & { id?: string }) => {
      const { data, error } = await supabase
        .from('membership_rewards' as any)
        .upsert(reward as any)
        .select()
        .single()
      if (error) throw error
      return data as unknown as MembershipReward
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-rewards'] })
      queryClient.invalidateQueries({ queryKey: ['membership-rewards'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Admin: upsert plan                                                 */
/* ------------------------------------------------------------------ */

export function useUpsertPlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (plan: Partial<MembershipPlan> & { id?: string }) => {
      const { data, error } = await supabase
        .from('membership_plans' as any)
        .upsert(plan as any)
        .select()
        .single()
      if (error) throw error
      return data as unknown as MembershipPlan
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-membership-plans'] })
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] })
    },
  })
}
