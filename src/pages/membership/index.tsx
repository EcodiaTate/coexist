import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { Loader2 } from 'lucide-react'
import { Page } from '@/components/page'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { MembershipHero } from '@/components/membership-hero'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import {
  useMembershipPlans,
  useMyMembership,
  useCreateMembership,
  useMembershipHeroImage,
  type MembershipInterval,
} from '@/hooks/use-membership'
import { cn } from '@/lib/cn'

const PERKS = [
  { title: 'Cheaper campout tickets', body: 'Member pricing on every Co-Exist campout.' },
  { title: 'More perks coming', body: 'Partner discounts and member drops are on the way.' },
]

/**
 * Membership join page (full-bleed). WEB-FIRST by design: purchase happens on the
 * website via Stripe. Inside the native app we never show a buy button (Apple
 * 3.1.1), only a pointer to manage it on the web.
 */
export default function MembershipPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const isNative = Capacitor.isNativePlatform()

  const { data: plans, isLoading: loadingPlans } = useMembershipPlans()
  const { data: myMembership } = useMyMembership()
  const { data: heroImage } = useMembershipHeroImage()
  const createMembership = useCreateMembership()

  const [interval, setInterval] = useState<MembershipInterval>('monthly')

  const plan = plans?.[0] ?? null
  const isMember =
    myMembership?.status === 'active' ||
    myMembership?.status === 'trialing' ||
    myMembership?.status === 'past_due'

  const handleJoin = async () => {
    if (!plan) return
    if (!user) { navigate('/'); return }
    try {
      const { url } = await createMembership.mutateAsync({ planId: plan.id, interval })
      window.location.href = url
    } catch {
      toast.error('We could not start your membership just now. Please try again.')
    }
  }

  return (
    <Page noBackground className="bg-surface-2">
      <MembershipHero
        variant="join"
        heroImage={heroImage}
        eyebrow="Co-Exist"
        title={plan?.name ?? 'Membership'}
      >
        <p className="text-sm text-white/85 mt-3 max-w-[32ch]">
          {plan?.description ?? 'Support Co-Exist and unlock member perks.'}
        </p>
      </MembershipHero>

      {/* De-chromed content */}
      <div className="px-1 pt-6 pb-12 space-y-7">
        {loadingPlans ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : !plan ? (
          <EmptyState
            illustration="empty"
            title="Membership is coming soon"
            description="Co-Exist membership is not open yet. Check back shortly."
          />
        ) : (
          <>
            {/* Perks - editorial text rows, no icon chrome */}
            <div className="divide-y divide-neutral-200/70">
              {PERKS.map((perk) => (
                <div key={perk.title} className="py-3.5 first:pt-0">
                  <p className="text-sm font-semibold text-neutral-900">{perk.title}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{perk.body}</p>
                </div>
              ))}
            </div>

            {isMember ? (
              <button
                type="button"
                onClick={() => navigate('/profile/membership')}
                className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-sprout-500 text-white active:scale-[0.99] transition-transform"
              >
                <span className="text-sm font-semibold">You are a member</span>
                <span className="text-xs text-white/90">Manage</span>
              </button>
            ) : (
              <div className="space-y-4">
                {/* Interval choice: "$5 a week" is the framing of the monthly price. */}
                <div className="grid grid-cols-2 gap-3">
                  <IntervalCard
                    active={interval === 'monthly'}
                    onClick={() => setInterval('monthly')}
                    title="Monthly"
                    price={`$${plan.price_monthly.toFixed(0)}`}
                    unit="/ month"
                    sub="about $5 a week"
                  />
                  <IntervalCard
                    active={interval === 'yearly'}
                    onClick={() => setInterval('yearly')}
                    title="Yearly"
                    price={`$${plan.price_yearly.toFixed(0)}`}
                    unit="/ year"
                    sub="best value"
                  />
                </div>

                {isNative ? (
                  <div className="rounded-2xl bg-white shadow-sm p-5 text-center">
                    <p className="text-sm text-neutral-800 font-semibold">Join on the web</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-[34ch] mx-auto">
                      Membership is managed at coexistaus.org. Your perks, like cheaper campout
                      tickets, apply automatically here once you have joined.
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleJoin}
                    disabled={createMembership.isPending}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-4 rounded-2xl bg-sprout-500 text-white active:scale-[0.99] transition-transform disabled:opacity-60"
                  >
                    {createMembership.isPending && <Loader2 size={16} className="animate-spin" />}
                    {user ? 'Join now' : 'Sign in to join'}
                  </button>
                )}
                <p className="text-[11px] text-neutral-400 text-center">Cancel anytime from your profile.</p>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  )
}

function IntervalCard({
  active, onClick, title, price, unit, sub,
}: {
  active: boolean; onClick: () => void; title: string; price: string; unit: string; sub: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 p-4 text-left transition-colors',
        active ? 'border-sprout-500 bg-sprout-50' : 'border-neutral-200 bg-white',
      )}
    >
      <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-neutral-900">
        <span className="text-2xl font-bold">{price}</span>
        <span className="text-xs text-neutral-400 font-medium"> {unit}</span>
      </p>
      <p className="text-[11px] text-neutral-400 mt-0.5">{sub}</p>
    </button>
  )
}
