import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
    ArrowLeft,
    Crown,
    Check,
    Gift,
    Tag,
    ShoppingBag,
    Ticket,
    Star,
    Copy,
    Loader2,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { Badge } from '@/components/badge'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useProfile } from '@/hooks/use-profile'
import {
    useMembershipPlans,
    useMyMembership,
    useMembershipRewards,
    useSubscribeMembership,
} from '@/hooks/use-membership'
import { redirectToCheckout } from '@/lib/stripe'
import type { MembershipPlanInterval, MembershipReward, RewardCategory } from '@/types/membership'
import { REWARD_CATEGORIES } from '@/types/membership'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import MembershipCard from '@/pages/profile/membership-card'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionHeader({
  children,
  icon,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {icon && <span className="text-white/50">{icon}</span>}
      <h2 className="font-heading text-sm font-bold text-white/50 uppercase tracking-widest">
        {children}
      </h2>
    </div>
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
/*  Reward card - dark theme                                           */
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
    <div className="rounded-2xl bg-white/[0.12] backdrop-blur-md p-5 space-y-3 hover:bg-white/[0.18] transition-colors duration-200">
      <div className="flex items-start gap-3">
        {reward.partner_logo_url ? (
          <img
            src={reward.partner_logo_url}
            alt={reward.partner_name ?? ''}
            className="w-10 h-10 rounded-xl object-cover bg-white/10"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/70">
            {categoryIcons[reward.category]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm text-white leading-tight">
            {reward.title}
          </p>
          {reward.partner_name && (
            <p className="text-xs text-white/40 mt-0.5">{reward.partner_name}</p>
          )}
        </div>
        {reward.discount_percent && (
          <span className="shrink-0 rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-0.5 text-xs font-bold text-white/90">
            {reward.discount_percent}% off
          </span>
        )}
      </div>

      <p className="text-xs text-white/50 leading-relaxed">{reward.description}</p>

      {reward.discount_code && (
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 w-full rounded-xl bg-white/[0.08] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.14] cursor-pointer"
        >
          <code className="flex-1 font-mono text-sm font-bold text-white/90 tracking-wider">
            {reward.discount_code}
          </code>
          {copied ? (
            <Check size={14} className="text-white/70 shrink-0" />
          ) : (
            <Copy size={14} className="text-white/40 shrink-0" />
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
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { toast } = useToast()

  const { data: profile, isLoading: profileLoading } = useProfile()
  const { data: plans, isLoading: plansLoading } = useMembershipPlans()
  const { data: membership, isLoading: membershipLoading } = useMyMembership()
  const { data: rewards, isLoading: rewardsLoading } = useMembershipRewards()
  const subscribe = useSubscribeMembership()

  const [interval, setInterval] = useState<MembershipPlanInterval>('monthly')

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    : ''

  const isLoading = profileLoading || plansLoading || membershipLoading
  const showLoading = useDelayedLoading(isLoading)

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

  if (showLoading) {
    return (
      <Page className="!px-0 !pb-0 !bg-transparent">
        <div className="relative min-h-dvh overflow-clip">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-600 via-primary-800 to-secondary-900" />
          {/* Shapes for loading state */}
          <div className="absolute -right-[15%] -top-[12%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] rounded-full bg-white/[0.05]" />
          <div className="absolute -left-[20%] bottom-[5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-white/[0.06]" />
          <div className="relative z-10">
            {/* Back button */}
            <div className="px-4" style={{ paddingTop: 'var(--safe-top)' }}>
              <div className="flex items-center h-14">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-white/80 hover:bg-white/10 cursor-pointer transition-colors duration-150"
                  aria-label="Go back"
                >
                  <ArrowLeft size={22} />
                </button>
              </div>
            </div>
            <div className="px-6 pb-6 max-w-2xl mx-auto space-y-6">
              <Skeleton variant="card" className="h-56 !bg-white/[0.08]" />
              <Skeleton variant="card" className="h-36 !bg-white/[0.08]" />
              <Skeleton variant="card" className="h-36 !bg-white/[0.08]" />
            </div>
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
    <Page className="!px-0 !pb-0 !bg-transparent">
      <div className="relative min-h-dvh">
        {/* ── Background — sticky keeps it viewport-pinned, negative margin collapses it ── */}
        <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-600 via-primary-800 to-secondary-900" />

          {/* ── Geometric shapes ── */}
          <motion.div
            initial={rm ? {} : { scale: 0.6, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{ scale: { duration: 22, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.4, ease: 'easeOut' } }}
            className="absolute -right-[15%] -top-[12%] w-[55vw] h-[55vw] max-w-[500px] max-h-[500px] rounded-full bg-white/[0.05]"
          />
          <motion.div
            initial={rm ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.04, 1], opacity: 1 }}
            transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.6, delay: 0.3, ease: 'easeOut' } }}
            className="absolute -left-[20%] bottom-[5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-white/[0.07]"
          />
          <motion.div
            initial={rm ? {} : { scale: 0.5, opacity: 0 }}
            animate={{ scale: [1, 1.06, 1], opacity: 1 }}
            transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.6, delay: 0.6, ease: 'easeOut' } }}
            className="absolute -left-[14%] bottom-[10%] w-[42vw] h-[42vw] max-w-[420px] max-h-[420px] rounded-full border border-white/[0.05]"
          />
          <motion.div
            initial={rm ? {} : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute left-[8%] top-[45%] w-[70px] h-[70px] rounded-full bg-white/[0.04]"
          />
          {/* Floating dots */}
          <motion.div
            initial={rm ? {} : { opacity: 0 }}
            animate={{ y: [0, -9, 0], opacity: [0.25, 0.5, 0.25] }}
            transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.8, delay: 1 } }}
            className="absolute right-[18%] top-[22%] w-2 h-2 rounded-full bg-white/30"
          />
          <motion.div
            initial={rm ? {} : { opacity: 0 }}
            animate={{ y: [0, 6, 0], opacity: [0.2, 0.4, 0.2] }}
            transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }, opacity: { duration: 0.8, delay: 1.4 } }}
            className="absolute left-[12%] top-[30%] w-1.5 h-1.5 rounded-full bg-white/25"
          />
          <motion.div
            initial={rm ? {} : { opacity: 0 }}
            animate={{ y: [0, -6, 0], opacity: [0.2, 0.45, 0.2] }}
            transition={{ y: { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 3 }, opacity: { duration: 0.8, delay: 1.8 } }}
            className="absolute right-[30%] bottom-[20%] w-2.5 h-2.5 rounded-full bg-white/20"
          />
        </div>

        {/* ── Back button (inside gradient) ── */}
        <div className="relative z-10 px-4" style={{ paddingTop: 'var(--safe-top)' }}>
          <div className="flex items-center h-14">
            <motion.button
              type="button"
              onClick={() => navigate(-1)}
              whileTap={rm ? undefined : { scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-white/80 hover:bg-white/10 cursor-pointer select-none transition-colors duration-150"
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </motion.button>
          </div>
        </div>

        {/* ── Title ── */}
        <motion.div
          className="relative z-10 px-6 pt-4 max-w-2xl mx-auto"
          initial={rm ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 backdrop-blur-sm shadow-sm">
              <Crown size={15} className="text-white" />
            </div>
            <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">
              Membership
            </h1>
          </div>
        </motion.div>

        {/* ── Content ── */}
        <motion.div
          className="relative z-10 px-6 pb-24 max-w-2xl mx-auto"
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-10">
            {/* ── Digital membership card (hero) ── */}
            {profile && (
              <motion.section variants={rm ? undefined : fadeUp}>
                <MembershipCard
                  name={profile.display_name ?? ''}
                  memberId={profile.id.substring(0, 8).toUpperCase()}
                  userId={profile.id}
                  tier="new"
                  memberSince={memberSince}
                  avatarUrl={profile.avatar_url}
                />
              </motion.section>
            )}

            {/* ── Active membership banner ── */}
            {isActive && membership && (
              <motion.section variants={rm ? undefined : fadeUp}>
                <div className="relative overflow-hidden rounded-2xl bg-white/[0.14] backdrop-blur-md p-6">
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/[0.05]" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm">
                        <Crown size={20} className="text-white/90" />
                      </div>
                      <div>
                        <p className="font-heading font-bold text-white">
                          {membership.plan.name}
                        </p>
                        <p className="text-xs text-white/40">
                          Active until{' '}
                          {new Date(membership.current_period_end).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Thanks for being a member! You have access to all the perks below.
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {/* ── Plan selection (show when not subscribed) ── */}
            {!isActive && (
              <motion.section variants={rm ? undefined : fadeUp}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-bold text-white text-lg">
                    Become a Member
                  </h3>
                  {/* Interval toggle */}
                  <div className="flex items-center rounded-full bg-white/[0.10] backdrop-blur-sm p-0.5">
                    {(['monthly', 'yearly'] as const).map((i) => (
                      <button
                        key={i}
                        onClick={() => setInterval(i)}
                        className={cn(
                          'rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer',
                          interval === i
                            ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm'
                            : 'text-white/40 hover:text-white/60',
                        )}
                      >
                        {i === 'monthly' ? 'Monthly' : 'Yearly'}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-sm text-white/40 mb-5">
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
                          className="relative overflow-hidden rounded-2xl bg-white/[0.12] backdrop-blur-md p-6 hover:bg-white/[0.18] transition-all duration-200"
                        >
                          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/[0.04]" />
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-heading font-bold text-white">
                                  {plan.name}
                                </h4>
                                <p className="text-xs text-white/40 mt-0.5">
                                  {plan.description}
                                </p>
                              </div>
                              <p className="font-heading font-bold text-2xl text-white shrink-0 ml-4 tabular-nums">
                                ${price}
                                <span className="text-xs font-normal text-white/40">
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
                              className="mt-4"
                            >
                              {subscribe.isPending ? 'Redirecting...' : 'Join Now'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/[0.08] backdrop-blur-md p-8 text-center">
                    <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-white/15 mb-4">
                      <Crown size={26} className="text-white/60" />
                    </div>
                    <p className="text-sm font-medium text-white/70">Coming soon</p>
                    <p className="text-xs text-white/40 mt-1">
                      Membership plans are being prepared. Check back soon!
                    </p>
                  </div>
                )}
              </motion.section>
            )}

            {/* ── Divider ── */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

            {/* ── Member rewards & perks ── */}
            <motion.section variants={rm ? undefined : fadeUp}>
              <SectionHeader icon={<Gift size={15} />}>
                Member Perks
              </SectionHeader>
              <p className="text-sm text-white/40 mb-6 -mt-3">
                {isActive
                  ? 'Exclusive rewards for Co-Exist members. Tap a code to copy it.'
                  : 'Become a member to unlock these exclusive perks and discounts.'}
              </p>

              {rewardsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.08] p-5 animate-pulse space-y-3" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.08] shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 rounded-full bg-white/[0.06]" />
                          <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : rewards && rewards.length > 0 ? (
                <div className="space-y-8">
                  {Object.entries(rewardsByCategory).map(([category, categoryRewards]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-white/50">
                          {categoryIcons[category as RewardCategory]}
                        </span>
                        <h4 className="font-heading text-xs font-semibold text-white/50 uppercase tracking-wider">
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
                              className="rounded-2xl bg-white/[0.06] backdrop-blur-md p-5 opacity-50"
                            >
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/[0.10] flex items-center justify-center text-white/30">
                                  {categoryIcons[reward.category]}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-heading font-semibold text-sm text-white/70">
                                    {reward.title}
                                  </p>
                                  {reward.partner_name && (
                                    <p className="text-xs text-white/30 mt-0.5">
                                      {reward.partner_name}
                                    </p>
                                  )}
                                </div>
                                {reward.discount_percent && (
                                  <span className="shrink-0 rounded-full bg-white/[0.08] px-2.5 py-0.5 text-xs font-bold text-white/40">
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
                <div className="rounded-2xl bg-white/[0.08] backdrop-blur-md p-8 text-center">
                  <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-white/15 mb-4">
                    <Gift size={26} className="text-white/60" />
                  </div>
                  <p className="text-sm font-medium text-white/70">Perks coming soon</p>
                  <p className="text-xs text-white/40 mt-1">
                    Kurt and the team are lining up partner deals and merch discounts. Watch this space!
                  </p>
                </div>
              )}
            </motion.section>
          </div>
        </motion.div>
      </div>
    </Page>
  )
}
