import { useEffect } from 'react'
import { useMyMembership, useMembershipRewards } from '@/hooks/use-membership'
import { useCart, type MemberDiscount } from '@/hooks/use-cart'

/**
 * Auto-applies the best merch-category membership discount to the cart.
 * Call this in any shop/cart page to ensure members get their discount.
 */
export function useMemberAutoDiscount() {
  const { data: membership } = useMyMembership()
  const { data: rewards } = useMembershipRewards()
  const setMemberDiscount = useCart((s) => s.setMemberDiscount)
  const currentDiscount = useCart((s) => s.memberDiscount)

  const isActive = membership?.status === 'active' || membership?.status === 'trialing'

  useEffect(() => {
    if (!isActive) {
      if (currentDiscount) setMemberDiscount(null)
      return
    }

    // Find the best merch-category reward with a discount_percent
    const merchRewards = (rewards ?? []).filter(
      (r) => r.category === 'merch' && r.discount_percent && r.discount_percent > 0,
    )

    if (merchRewards.length === 0) {
      if (currentDiscount) setMemberDiscount(null)
      return
    }

    // Pick the highest discount
    const best = merchRewards.reduce((a, b) =>
      (b.discount_percent ?? 0) > (a.discount_percent ?? 0) ? b : a,
    )

    const discount: MemberDiscount = {
      title: best.title,
      discount_percent: best.discount_percent!,
    }

    // Only update if different to avoid render loops
    if (
      currentDiscount?.discount_percent !== discount.discount_percent ||
      currentDiscount?.title !== discount.title
    ) {
      setMemberDiscount(discount)
    }
  }, [isActive, rewards, setMemberDiscount, currentDiscount])

  return { isActive, memberDiscount: isActive ? currentDiscount : null }
}
