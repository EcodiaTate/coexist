/**
 * Payment provider resolution - edge-function (server) side.
 *
 * STAGING ONLY. Mirrors the client double-gate: an edge function routes to
 * GreenPay ONLY when GREENPAY_ENABLED === 'true' AND the GreenPay credentials
 * are present in the environment. Absent either, every function stays on Stripe
 * (the live default). GreenPay is a white-label of Fat Zebra (gateway.pmnts.io)
 * and no keys are held today, so this always resolves to 'stripe'.
 *
 * See GREENPAY-STAGING-DO-NOT-MERGE.md + status_board 97ee9a1e.
 */

export type PaymentProviderId = 'stripe' | 'greenpay'

export function isGreenPayEnabledFlag(): boolean {
  return Deno.env.get('GREENPAY_ENABLED') === 'true'
}

/** True only when the reseller Basic-auth credentials are both present. */
export function isGreenPayConfigured(): boolean {
  const username = Deno.env.get('GREENPAY_USERNAME') ?? ''
  const token = Deno.env.get('GREENPAY_TOKEN') ?? ''
  return isGreenPayEnabledFlag() && username.length > 0 && token.length > 0
}

/** Resolve the active provider. Defaults to 'stripe'. */
export function activePaymentProvider(): PaymentProviderId {
  return isGreenPayConfigured() ? 'greenpay' : 'stripe'
}
