import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, CreditCard, AlertTriangle, Loader2 } from 'lucide-react'
import {
  useMyMembership,
  useCancelMembership,
  useMembershipPortal,
  useMembershipHeroImage,
  type Membership,
} from '@/hooks/use-membership'
import { Page } from '@/components/page'
import { MembershipHero } from '@/components/membership-hero'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

const STATUS_BADGE: Record<Membership['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-white/20 text-white' },
  trialing: { label: 'Trial', className: 'bg-white/20 text-white' },
  past_due: { label: 'Payment failed', className: 'bg-error-500/80 text-white' },
  cancelled: { label: 'Cancelled', className: 'bg-white/15 text-white/80' },
}

export default function MembershipManagePage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: membership, isLoading } = useMyMembership()
  const { data: heroImage } = useMembershipHeroImage()
  const cancelMutation = useCancelMembership()
  const portalMutation = useMembershipPortal()
  const showLoading = useDelayedLoading(isLoading)

  const [confirmCancel, setConfirmCancel] = useState(false)

  const handleCancel = async () => {
    setConfirmCancel(false)
    if (!membership?.stripe_subscription_id) return
    try {
      await cancelMutation.mutateAsync(membership.stripe_subscription_id)
      toast.success('Your membership has been cancelled.')
    } catch {
      toast.error('We could not cancel that just now. Please try again.')
    }
  }

  const handleUpdateCard = async () => {
    if (!membership?.stripe_subscription_id) return
    try {
      const { url } = await portalMutation.mutateAsync(membership.stripe_subscription_id)
      window.location.href = url
    } catch {
      toast.error('Card management is not available right now. Please try again.')
    }
  }

  const badge = membership ? STATUS_BADGE[membership.status] : null
  const isLive =
    membership?.status === 'active' ||
    membership?.status === 'trialing' ||
    membership?.status === 'past_due'
  const priceLabel = membership
    ? membership.interval === 'yearly'
      ? `$${Number(membership.membership_plans?.price_yearly ?? 0).toFixed(0)} / year`
      : `$${Number(membership.membership_plans?.price_monthly ?? 0).toFixed(0)} / month`
    : ''

  return (
    <Page noBackground className="bg-surface-2">
      <MembershipHero
        variant="manage"
        heroImage={heroImage}
        eyebrow="My Membership"
        title={membership?.membership_plans?.name ?? 'Co-Exist Membership'}
        imageClassName={cn(membership && !isLive && 'grayscale')}
        badge={badge && (
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm uppercase tracking-wide', badge.className)}>
            {badge.label}
          </span>
        )}
      >
        {membership && (
          <p className="text-sm text-white/85 mt-1">{priceLabel}</p>
        )}
        {membership?.current_period_end && isLive && (
          <p className="text-[11px] text-white/75 mt-1.5 flex items-center gap-1">
            <Calendar size={11} />
            Renews {fmtDate(membership.current_period_end)}
          </p>
        )}
      </MembershipHero>

      {/* De-chromed content */}
      <div className="px-1 pt-6 pb-12 space-y-5">
        {showLoading ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : !membership ? (
          <EmptyState
            illustration="empty"
            title="No membership yet"
            description="Join Co-Exist membership for cheaper campout tickets and member perks."
            action={{ label: 'See membership', to: '/membership' }}
          />
        ) : (
          <>
            {membership.status === 'past_due' && (
              <div className="flex items-start gap-2 rounded-2xl bg-error-50 p-4">
                <AlertTriangle size={16} className="text-error-600 mt-0.5 shrink-0" />
                <p className="text-xs text-error-700">
                  Your last payment did not go through. Update your card to keep your membership.
                </p>
              </div>
            )}

            {isLive && (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleUpdateCard}
                  disabled={portalMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-4 rounded-2xl bg-sprout-500 text-white active:scale-[0.99] transition-transform disabled:opacity-60"
                >
                  {portalMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Update payment method
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="w-full text-sm font-semibold px-4 py-4 rounded-2xl bg-white text-neutral-600 shadow-sm active:scale-[0.99] transition-transform"
                >
                  Cancel membership
                </button>
              </div>
            )}

            {membership.status === 'cancelled' && (
              <button
                type="button"
                onClick={() => navigate('/membership')}
                className="w-full text-sm font-semibold px-4 py-4 rounded-2xl bg-sprout-500 text-white active:scale-[0.99] transition-transform"
              >
                Rejoin membership
              </button>
            )}
          </>
        )}
      </div>

      <ConfirmationSheet
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancel}
        title="Cancel membership?"
        description="Your membership will stop and you will not be charged again. You can rejoin any time."
        confirmLabel="Cancel membership"
        variant="warning"
      />
    </Page>
  )
}
