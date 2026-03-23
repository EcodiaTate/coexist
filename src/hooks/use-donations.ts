import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  Donation,
  DonationFrequency,
  DonationProject,
  DonorWallEntry,
  RecurringDonation,
} from '@/types/donations'

/* ------------------------------------------------------------------ */
/*  Donation projects (with goal thermometer data)                     */
/* ------------------------------------------------------------------ */

export function useDonationProjects() {
  return useQuery({
    queryKey: ['donation-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donation_projects' as any)
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as unknown as DonationProject[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Create donation → Stripe Checkout                                  */
/* ------------------------------------------------------------------ */

interface CreateDonationParams {
  amount: number
  frequency: DonationFrequency
  projectId?: string
  message?: string
  onBehalfOf?: string
  isPublic?: boolean
}

export function useCreateDonation() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (params: CreateDonationParams) => {
      const res = await supabase.functions.invoke('create-checkout', {
        body: {
          type: 'donation',
          user_id: user?.id,
          amount: params.amount,
          frequency: params.frequency,
          project_id: params.projectId ?? null,
          message: params.message ?? null,
          on_behalf_of: params.onBehalfOf ?? null,
          is_public: params.isPublic ?? true,
        },
      })
      if (res.error) throw res.error
      return res.data as { session_id: string; url: string }
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Donation history (current user)                                    */
/* ------------------------------------------------------------------ */

export function useMyDonations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-donations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Donation[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Recurring donations management                                     */
/* ------------------------------------------------------------------ */

export function useMyRecurringDonations() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-recurring-donations', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_donations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as RecurringDonation[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCancelRecurringDonation() {
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
    onMutate: async (subscriptionId) => {
      await queryClient.cancelQueries({ queryKey: ['my-recurring-donations', user?.id] })
      const previous = queryClient.getQueryData<RecurringDonation[]>(['my-recurring-donations', user?.id])
      queryClient.setQueryData<RecurringDonation[]>(['my-recurring-donations', user?.id], (old) =>
        old?.map((d) =>
          d.stripe_subscription_id === subscriptionId ? { ...d, status: 'cancelled' as const } : d,
        ),
      )
      return { previous }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['my-recurring-donations', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['my-recurring-donations', user?.id] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Donor wall (public, opt-in)                                        */
/* ------------------------------------------------------------------ */

export function useDonorWall() {
  return useQuery({
    queryKey: ['donor-wall'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('id, amount, message, on_behalf_of, created_at, profiles(display_name, avatar_url)')
        .eq('status', 'succeeded')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return ((data ?? []) as any[]).map((d): DonorWallEntry => ({
        id: d.id,
        display_name: (d.profiles as { display_name: string | null } | null)?.display_name ?? null,
        on_behalf_of: d.on_behalf_of,
        amount: d.amount,
        message: d.message,
        avatar_url: (d.profiles as { avatar_url: string | null } | null)?.avatar_url ?? null,
        created_at: d.created_at,
      }))
    },
    staleTime: 5 * 60 * 1000,
  })
}
