/**
 * Provider-aware refund helper - STAGED seam for the three refund surfaces
 * (refund-order, cancel-event, revoke-event-ticket).
 *
 * By default (provider = stripe) this is a pure pass-through to
 * `stripe.refunds.create({ payment_intent })`, so Stripe refund behaviour is
 * byte-identical. When GreenPay is enabled + keyed it routes to the GreenPay
 * gateway instead. On greenpay-staging the provider is always Stripe.
 *
 * See GREENPAY-STAGING-DO-NOT-MERGE.md + status_board 97ee9a1e.
 */

import { activePaymentProvider } from './provider.ts'
import { greenPayGateway } from './greenpay-gateway.ts'
import type { RefundResult } from './types.ts'

/** Minimal shape of the Stripe SDK refund call the functions already use. */
interface StripeRefundApi {
  refunds: {
    create(params: { payment_intent: string; amount?: number }): Promise<{ id: string; amount?: number | null }>
  }
}

/**
 * Create a full (or partial) refund via the active provider.
 * @param stripe   the Stripe SDK instance the calling function already holds
 * @param paymentReference  Stripe payment_intent id (or GreenPay txn ref)
 */
export async function createRefundViaActiveProvider(
  stripe: StripeRefundApi,
  paymentReference: string,
  amountCents?: number,
): Promise<RefundResult> {
  if (activePaymentProvider() === 'greenpay') {
    // Staged: refuses until GreenPay is configured (fails closed).
    return await greenPayGateway.createRefund({ payment_reference: paymentReference, amount_cents: amountCents })
  }
  // Default Stripe path - identical to the prior inline call.
  const refund = await stripe.refunds.create(
    amountCents != null
      ? { payment_intent: paymentReference, amount: amountCents }
      : { payment_intent: paymentReference },
  )
  return { refund_id: refund.id, amount_refunded_cents: refund.amount ?? amountCents ?? 0 }
}
