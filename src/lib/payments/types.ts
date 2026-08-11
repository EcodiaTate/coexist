/**
 * Payment provider abstraction - client-side types.
 *
 * STAGING ONLY. This seam lets Co-Exist route every hosted-checkout redirect
 * through one of two providers: Stripe (the live default) or GreenPay (staged,
 * gated OFF, no keys held). See GREENPAY-STAGING-DO-NOT-MERGE.md at the repo
 * root and status_board row 97ee9a1e-b6f0-4610-b4e5-c173b613b840.
 */

export type PaymentProviderId = 'stripe' | 'greenpay'

/**
 * The result an edge function returns for a hosted-checkout surface. Either a
 * fully-formed redirect `url` (preferred - both Stripe and GreenPay return one)
 * or a `session_id` the provider SDK resolves into a redirect.
 */
export interface HostedCheckoutResult {
  url?: string | null
  session_id?: string | null
}

/**
 * A client payment provider. The default (Stripe) delegates to the existing
 * `src/lib/stripe.ts`; the GreenPay implementation is a staged skeleton that
 * throws until real keys are configured.
 */
export interface PaymentProvider {
  readonly id: PaymentProviderId
  /** True only when the provider has the publishable config it needs. */
  isConfigured(): boolean
  /**
   * Redirect the browser to the provider's hosted checkout. Prefers `url`;
   * falls back to resolving `session_id` through the provider SDK.
   */
  redirectToHostedCheckout(result: HostedCheckoutResult): Promise<void>
}
