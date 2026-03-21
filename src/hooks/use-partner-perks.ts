import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PartnerPerk {
  id: string
  title: string
  description: string | null
  partner_name: string
  partner_logo_url: string | null
  discount_code: string | null
  discount_percent: number | null
  category: string | null
  source: 'offer' | 'reward'
  points_cost: number | null
  terms_and_conditions: string | null
}

/* ------------------------------------------------------------------ */
/*  Fetch active partner perks for the shop                            */
/* ------------------------------------------------------------------ */

export function usePartnerPerks() {
  return useQuery({
    queryKey: ['partner-perks'],
    queryFn: async () => {
      // Fetch partner offers (point-redeemable deals)
      const { data: offers, error: offersErr } = await supabase
        .from('partner_offers')
        .select('*, organisations(name, logo_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (offersErr) throw offersErr

      // Fetch membership rewards (member-exclusive discounts)
      const { data: rewards, error: rewardsErr } = await supabase
        .from('membership_rewards' as any)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (rewardsErr) throw rewardsErr

      // Normalise offers into PartnerPerk
      const offerPerks: PartnerPerk[] = (offers ?? []).map((o: any) => ({
        id: o.id,
        title: o.title || o.partner_name,
        description: o.description || o.offer_details,
        partner_name: o.organisations?.name || o.partner_name,
        partner_logo_url: o.organisations?.logo_url || o.image_url,
        discount_code: o.code,
        discount_percent: null,
        category: o.category,
        source: 'offer' as const,
        points_cost: o.points_cost,
        terms_and_conditions: o.terms_and_conditions,
      }))

      // Normalise rewards into PartnerPerk
      const rewardPerks: PartnerPerk[] = (rewards ?? []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        partner_name: r.partner_name,
        partner_logo_url: r.partner_logo_url,
        discount_code: r.discount_code,
        discount_percent: r.discount_percent,
        category: r.category,
        source: 'reward' as const,
        points_cost: null,
        terms_and_conditions: null,
      }))

      return [...offerPerks, ...rewardPerks]
    },
    staleTime: 5 * 60 * 1000,
  })
}
