/** Membership plan & rewards types for Co-Exist */

export type MembershipPlanInterval = 'monthly' | 'yearly'

export interface MembershipPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface MembershipReward {
  id: string
  title: string
  description: string
  partner_name: string | null
  partner_logo_url: string | null
  discount_code: string | null
  discount_percent: number | null
  category: RewardCategory
  is_active: boolean
  plans: string[]
  created_at: string
}

export type RewardCategory =
  | 'merch'
  | 'partner_store'
  | 'experience'
  | 'event'
  | 'other'

export const REWARD_CATEGORIES: Record<RewardCategory, string> = {
  merch: 'Co-Exist Merch',
  partner_store: 'Partner Store',
  experience: 'Experience',
  event: 'Event Perk',
  other: 'Other',
}

export interface Membership {
  id: string
  user_id: string
  plan_id: string
  stripe_subscription_id: string | null
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  current_period_start: string
  current_period_end: string
  created_at: string
}

export interface MembershipWithPlan extends Membership {
  plan: MembershipPlan
}
