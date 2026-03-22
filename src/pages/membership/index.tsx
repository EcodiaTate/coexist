import { useState, useCallback } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  Crown,
  Check,
  Gift,
  Tag,
  ShoppingBag,
  Ticket,
  Star,
  Copy,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { usePointsBalance, getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'
import {
  useMembershipPlans,
  useMyMembership,
  useMembershipRewards,
  useSubscribeMembership,
} from '@/hooks/use-membership'
import { redirectToCheckout } from '@/lib/stripe'
import type { MembershipPlanInterval, MembershipReward, RewardCategory } from '@/types/membership'
import { REWARD_CATEGORIES } from '@/types/membership'
import MembershipCard from '@/pages/profile/membership-card'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background shapes                                       */
/* ------------------------------------------------------------------ */

function BackgroundShapes({ reduce }: { reduce: boolean }) {
  if (reduce) return null
  return (
    <>
      {/* Large ring — top-right */}
      <motion.div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full border-[3px] border-moss-200/30"
        animate={{ scale: [1, 1.06, 1], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Small ring — mid-left */}
      <motion.div
        className="absolute top-[40%] -left-10 w-36 h-36 rounded-full border-[2px] border-moss-200/30"
        animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      {/* Blurred glow — bottom-right */}
      <motion.div
        className="absolute bottom-32 -right-16 w-56 h-56 rounded-full bg-amber-100/20 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Soft circle — bottom-left */}
      <motion.div
        className="absolute bottom-16 left-6 w-28 h-28 rounded-full bg-moss-100/25 blur-2xl"
        animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />
      {/* Floating dot 1 */}
      <motion.div
        className="absolute top-28 right-12 w-2.5 h-2.5 rounded-full bg-moss-300/25"
        animate={{ y: [0, -10, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Floating dot 2 */}
      <motion.div
        className="absolute top-[55%] right-[30%] w-2 h-2 rounded-full bg-amber-300/20"
        animate={{ y: [0, -8, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      {/* Floating dot 3 */}
      <motion.div
        className="absolute bottom-48 left-[20%] w-3 h-3 rounded-full bg-moss-300/25"
        animate={{ y: [0, -12, 0], opacity: [0.2, 0.45, 0.2] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Reward category icons                                              */
/* ------------------------------------------------------------------ */

const categoryIcons: Record<RewardCategory, React.ReactNode> = {
  merch: <ShoppingBag size={16} />,
  partner_store: <Tag size={16} />,
  experience: <Star size={16} />,
  event: <Ticket size={16} />,
  other: <Gift size={16} />,
}

/* ------------------------------------------------------------------ */
/*  Reward card                                                        */
/* ------------------------------------------------------------------ */

function RewardCard({ reward }: { reward: MembershipReward }) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)

  const handleCopyCode = useCallback(async () => {
    if (!reward.discount_code) return
    await navigator.clipboard.writeText(reward.discount_code)
    setCopied(true)
    toast.success('Code copied!')
    setTimeout(() => setCopied(false), 2000)
  }, [reward.discount_code, toast])

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-moss-50/60 p-4 space-y-3">
      <div className="flex items-start gap-3">
        {reward.partner_logo_url ? (
          <img
            src={reward.partner_logo_url}
            alt={reward.partner_name ?? ''}
            className="w-10 h-10 rounded-lg object-cover bg-moss-50"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-moss-50 flex items-center justify-center text-moss-400">
            {categoryIcons[reward.category]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm text-primary-800 leading-tight">
            {reward.title}
          </p>
          {reward.partner_name && (
            <p className="text-xs text-primary-400 mt-0.5">{reward.partner_name}</p>
          )}
        </div>
        {reward.discount_percent && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
            {reward.discount_percent}% off
          </span>
        )}
      </div>

      <p className="text-xs text-primary-400 leading-relaxed">{reward.description}</p>

      {reward.discount_code && (
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 w-full rounded-xl bg-moss-50 px-3 py-2.5 text-left transition-colors hover:bg-moss-100 cursor-pointer"
        >
          <code className="flex-1 font-mono text-sm font-bold text-moss-700 tracking-wider">
            {reward.discount_code}
          </code>
          {copied ? (
            <Check size={14} className="text-moss-500 shrink-0" />
          ) : (
            <Copy size={14} className="text-moss-400 shrink-0" />
          )}
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main membership page                                               */
/* ------------------------------------------------------------------ */

export default function MembershipPage() {
  const shouldReduceMotion = useReducedMotion()
  const { toast } = useToast()

  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: pointsData } = usePointsBalance()
  const { data: plans, isLoading: plansLoading } = useMembershipPlans()
  const { data: membership, isLoading: membershipLoading } = useMyMembership()
  const { data: rewards, isLoading: rewardsLoading } = useMembershipRewards()
  const subscribe = useSubscribeMembership()

  const [interval, setInterval] = useState<MembershipPlanInterval>('monthly')

  const points = pointsData?.points ?? profile?.points ?? 0
  const tier = getTierFromPoints(points) as TierName
  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    : ''

  const isLoading = profileLoading || plansLoading || membershipLoading

  const handleSubscribe = useCallback(
    async (planId: string) => {
      try {
        const result = await subscribe.mutateAsync({ planId, interval })
        if (result.url) {
          window.location.href = result.url
        } else if (result.session_id) {
          await redirectToCheckout(result.session_id)
        }
      } catch {
        toast.error('Something went wrong. Please try again.')
      }
    },
    [subscribe, interval, toast],
  )

  if (isLoading) {
    return (
      <Page header={<Header title="Membership" back />} className="!px-0 !bg-transparent">
        <div className="relative min-h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-moss-50/50 via-white to-amber-50/15" />
          <div className="relative z-10 px-4 lg:px-6 py-4 space-y-6">
            <Skeleton variant="card" className="h-48" />
            <Skeleton variant="card" className="h-32" />
            <Skeleton variant="card" className="h-32" />
          </div>
        </div>
      </Page>
    )
  }

  const isActive = membership?.status === 'active' || membership?.status === 'trialing'

  // Group rewards by category
  const rewardsByCategory = (rewards ?? []).reduce<Record<string, MembershipReward[]>>(
    (acc, r) => {
      const key = r.category
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
      return acc
    },
    {},
  )

  return (
    <Page header={<Header title="Membership" back />} className="!px-0 !bg-transparent">
      <div className="relative min-h-full">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-moss-50/50 via-white to-amber-50/15" />

        {/* Decorative animated shapes */}
        <BackgroundShapes reduce={!!shouldReduceMotion} />

        {/* Content */}
        <div className="relative z-10 px-4 lg:px-6 py-4 space-y-5">
          <div className="max-w-2xl mx-auto w-full pb-8">
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              {/* ---- Digital membership card (hero) ---- */}
              {profile && (
                <motion.section variants={fadeUp}>
                  <div className="rounded-2xl bg-white/80 shadow-sm border border-moss-50/60 backdrop-blur-sm p-3">
                    <MembershipCard
                      name={profile.display_name ?? ''}
                      memberId={profile.id.substring(0, 8).toUpperCase()}
                      userId={profile.id}
                      tier={tier}
                      memberSince={memberSince}
                      avatarUrl={profile.avatar_url}
                    />
                  </div>
                </motion.section>
              )}

              {/* ---- Active membership banner ---- */}
              {isActive && membership && (
                <motion.section variants={fadeUp}>
                  <div className="rounded-2xl bg-white shadow-sm border border-moss-50/60 p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-moss-500 to-moss-600 flex items-center justify-center shadow-sm">
                        <Crown size={18} className="text-white" />
                      </div>
                      <div>
                        <p className="font-heading font-bold text-primary-800">
                          {membership.plan.name}
                        </p>
                        <p className="text-xs text-primary-400">
                          Active until{' '}
                          {new Date(membership.current_period_end).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-primary-500 leading-relaxed">
                      Thanks for being a member! You have access to all the perks below.
                    </p>
                  </div>
                </motion.section>
              )}

              {/* ---- Plan selection (show when not subscribed) ---- */}
              {!isActive && (
                <motion.section variants={fadeUp}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-semibold text-primary-800 text-lg">
                      Become a Member
                    </h3>
                    {/* Interval toggle */}
                    <div className="flex items-center rounded-full bg-moss-100 p-0.5">
                      {(['monthly', 'yearly'] as const).map((i) => (
                        <button
                          key={i}
                          onClick={() => setInterval(i)}
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold transition-all',
                            interval === i
                              ? 'bg-white text-primary-800 shadow-sm'
                              : 'text-primary-400 hover:text-primary-600',
                          )}
                        >
                          {i === 'monthly' ? 'Monthly' : 'Yearly'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-primary-400 mb-5">
                    Join as a paying member to unlock exclusive perks, partner discounts, and Co-Exist
                    merch deals. Your membership directly funds conservation.
                  </p>

                  {plans && plans.length > 0 ? (
                    <div className="space-y-3">
                      {plans.map((plan) => {
                        const price =
                          interval === 'monthly' ? plan.price_monthly : plan.price_yearly
                        return (
                          <div
                            key={plan.id}
                            className="rounded-2xl bg-white shadow-sm border border-moss-50/60 p-5 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-heading font-bold text-primary-800">
                                  {plan.name}
                                </h4>
                                <p className="text-xs text-primary-400 mt-0.5">
                                  {plan.description}
                                </p>
                              </div>
                              <p className="font-heading font-bold text-lg text-moss-700 shrink-0 ml-4">
                                ${price}
                                <span className="text-xs font-normal text-primary-400">
                                  /{interval === 'monthly' ? 'mo' : 'yr'}
                                </span>
                              </p>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              fullWidth
                              icon={subscribe.isPending ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                              disabled={subscribe.isPending}
                              onClick={() => handleSubscribe(plan.id)}
                              className="mt-3"
                            >
                              {subscribe.isPending ? 'Redirecting...' : 'Join Now'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      illustration="wildlife"
                      title="Coming soon"
                      description="Membership plans are being prepared. Check back soon!"
                      className="min-h-[160px]"
                    />
                  )}
                </motion.section>
              )}

              {/* ---- Divider ---- */}
              <div className="h-px bg-gradient-to-r from-transparent via-moss-200/60 to-transparent" />

              {/* ---- Member rewards & perks ---- */}
              <motion.section variants={fadeUp}>
                <div className="flex items-center gap-2 mb-1">
                  <Gift size={20} className="text-moss-500" />
                  <h3 className="font-heading font-semibold text-primary-800 text-lg">
                    Member Perks
                  </h3>
                </div>
                <p className="text-sm text-primary-400 mb-5">
                  {isActive
                    ? 'Exclusive rewards for Co-Exist members. Tap a code to copy it.'
                    : 'Become a member to unlock these exclusive perks and discounts.'}
                </p>

                {rewardsLoading ? (
                  <div className="space-y-3">
                    <Skeleton variant="card" />
                    <Skeleton variant="card" />
                  </div>
                ) : rewards && rewards.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(rewardsByCategory).map(([category, categoryRewards]) => (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-moss-400">
                            {categoryIcons[category as RewardCategory]}
                          </span>
                          <h4 className="font-heading text-sm font-semibold text-moss-600">
                            {REWARD_CATEGORIES[category as RewardCategory]}
                          </h4>
                          <Badge variant="default" size="sm">
                            {categoryRewards.length}
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {categoryRewards.map((reward) =>
                            isActive ? (
                              <RewardCard key={reward.id} reward={reward} />
                            ) : (
                              <div
                                key={reward.id}
                                className="rounded-2xl bg-white/50 shadow-sm border border-moss-50/60 p-4 opacity-60"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-moss-50 flex items-center justify-center text-moss-300">
                                    {categoryIcons[reward.category]}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-heading font-semibold text-sm text-primary-600">
                                      {reward.title}
                                    </p>
                                    {reward.partner_name && (
                                      <p className="text-xs text-primary-300 mt-0.5">
                                        {reward.partner_name}
                                      </p>
                                    )}
                                  </div>
                                  {reward.discount_percent && (
                                    <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-400">
                                      {reward.discount_percent}% off
                                    </span>
                                  )}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    illustration="empty"
                    title="Perks coming soon"
                    description="Kurt and the team are lining up partner deals and merch discounts. Watch this space!"
                    className="min-h-[160px]"
                  />
                )}
              </motion.section>
            </motion.div>
          </div>
        </div>
      </div>
    </Page>
  )
}
