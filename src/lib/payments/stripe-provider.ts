/**
 * Stripe payment provider (client) - the live default.
 *
 * This is a THIN wrapper over the existing `src/lib/stripe.ts`. It does not
 * change Stripe behaviour in any way; it only presents the shared
 * `PaymentProvider` shape so the checkout call sites can be provider-agnostic.
 * Stripe remains untouched and default.
 */

import { getStripe, redirectToCheckout } from '@/lib/stripe'
import type { HostedCheckoutResult, PaymentProvider } from './types'

export const stripeProvider: PaymentProvider = {
  id: 'stripe',

  isConfigured(): boolean {
    return Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  },

  async redirectToHostedCheckout(result: HostedCheckoutResult): Promise<void> {
    if (result.url) {
      window.location.href = result.url
      return
    }
    if (result.session_id) {
      // Warm the SDK, then use the existing redirect helper (unchanged path).
      await getStripe()
      await redirectToCheckout(result.session_id)
      return
    }
    throw new Error('No checkout url or session_id returned')
  },
}
