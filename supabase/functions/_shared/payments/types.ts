/**
 * Payment gateway abstraction - edge-function (server) side.
 *
 * This interface is the union of every distinct Stripe operation Co-Exist's
 * payment edge functions perform today, catalogued from the live functions on
 * 2026-08-11:
 *   - checkout.sessions.create      (donation / merch / event ticket / public / guest)
 *   - products.search|create + prices.create   (recurring donation product+price)
 *   - subscriptions.retrieve|cancel (recurring management)
 *   - billingPortal.sessions.create (card update / manage recurring gift)
 *   - promotionCodes.list + coupons.create     (discounts)
 *   - refunds.create                (refund-order / cancel-event / revoke-event-ticket)
 *   - webhooks.constructEventAsync  (webhook signature verify)
 *
 * The GreenPay gateway implements the same surface against Fat Zebra
 * (gateway.pmnts.io). Staged, gated OFF. See GREENPAY-STAGING-DO-NOT-MERGE.md.
 */

export interface HostedCheckoutSession {
  /** Provider-side session/intent id, when the provider issues one. */
  session_id?: string
  /** Hosted payment page URL to redirect the buyer to. */
  url: string
}

export interface DonationCheckoutInput {
  amount: number
  frequency: 'one_time' | 'monthly'
  customer_email?: string
  success_url: string
  cancel_url: string
  metadata: Record<string, string>
}

export interface LineItem {
  name: string
  unit_amount_cents: number
  quantity: number
  image_url?: string
}

export interface GenericCheckoutInput {
  line_items: LineItem[]
  customer_email?: string
  success_url: string
  cancel_url: string
  metadata: Record<string, string>
  /** Fixed discount to apply to the order, in cents. */
  discount_cents?: number
  collect_shipping_address?: boolean
  collect_phone?: boolean
}

export interface RefundInput {
  /** Provider payment reference to refund (Stripe payment_intent id equivalent). */
  payment_reference: string
  amount_cents?: number
}

export interface RefundResult {
  refund_id: string
  amount_refunded_cents: number
}

export interface WebhookVerifyInput {
  raw_body: string
  signature: string
  secret: string
}

export interface VerifiedWebhookEvent {
  type: string
  id: string
  data: unknown
}

/**
 * The provider-agnostic gateway. Stripe's implementation is the inline code
 * that already lives in each edge function; the GreenPay implementation is the
 * staged skeleton in greenpay-gateway.ts.
 */
export interface PaymentGateway {
  readonly id: 'stripe' | 'greenpay'
  createDonationCheckout(input: DonationCheckoutInput): Promise<HostedCheckoutSession>
  createGenericCheckout(input: GenericCheckoutInput): Promise<HostedCheckoutSession>
  createRefund(input: RefundInput): Promise<RefundResult>
  verifyWebhook(input: WebhookVerifyInput): Promise<VerifiedWebhookEvent>
}
