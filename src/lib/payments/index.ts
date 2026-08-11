/**
 * Payment provider seam - client entry point.
 *
 * Every checkout call site imports `redirectToHostedCheckout` from here instead
 * of reaching into `@/lib/stripe` directly. The active provider is resolved at
 * call time: Stripe by default, GreenPay only when explicitly enabled AND keyed
 * (see config.ts). On greenpay-staging this always resolves to Stripe, so
 * behaviour is byte-identical to the pre-seam code.
 *
 * See GREENPAY-STAGING-DO-NOT-MERGE.md + status_board 97ee9a1e.
 */

import type { HostedCheckoutResult, PaymentProvider, PaymentProviderId } from './types'
import { resolvePaymentProviderId } from './config'
import { stripeProvider } from './stripe-provider'
import { greenPayProvider } from './greenpay-provider'

export type { HostedCheckoutResult, PaymentProvider, PaymentProviderId }
export { resolvePaymentProviderId } from './config'

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  greenpay: greenPayProvider,
}

/** Resolve the active payment provider (default: Stripe). */
export function getPaymentProvider(): PaymentProvider {
  return PROVIDERS[resolvePaymentProviderId()]
}

/**
 * Redirect the browser to the active provider's hosted checkout. Drop-in
 * replacement for the old inline
 *   `if (url) location.href = url; else redirectToCheckout(session_id)`.
 */
export async function redirectToHostedCheckout(result: HostedCheckoutResult): Promise<void> {
  return getPaymentProvider().redirectToHostedCheckout(result)
}
