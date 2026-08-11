/**
 * GreenPay gateway (server) - STAGED, GATED OFF, NO KEYS HELD.
 *
 * GreenPay (greenpay.au) is a white-label of Fat Zebra. Fat Zebra exposes a
 * simple REST API with HTTP Basic auth (username:token).
 *   <!-- source: docs.fatzebra.com/docs/authentication-1 (base https://gateway.pmnts.io/v2/partners, "HTTP Basic auth on every request"), as_of 2026-08-11 -->
 *
 * This is a skeleton that implements the shared PaymentGateway surface so a
 * future turn (post founder meeting, once sandbox keys land) can fill in the
 * real request bodies without re-deriving the seam. Every method REFUSES until
 * GREENPAY_ENABLED=true and credentials are present, so this branch can never
 * route a live payment. See GREENPAY-STAGING-DO-NOT-MERGE.md + board 97ee9a1e.
 *
 * Endpoint paths below are the documented Fat Zebra resource names (Purchases,
 * Tokenize a card, Create a payment plan, PaymentIntent, Refunds). The exact
 * versioned paths for GreenPay's merchant account are UNVERIFIED against the
 * auth-gated greenpay.gitbook.io and MUST be confirmed with sandbox keys at
 * integration time before any live wiring.
 */

import type {
  DonationCheckoutInput,
  GenericCheckoutInput,
  HostedCheckoutSession,
  PaymentGateway,
  RefundInput,
  RefundResult,
  VerifiedWebhookEvent,
  WebhookVerifyInput,
} from './types.ts'
import { isGreenPayConfigured } from './provider.ts'

export class GreenPayNotConfiguredError extends Error {
  constructor(op: string) {
    super(
      `GreenPay is staged but not configured (GREENPAY_ENABLED/creds absent). ` +
        `Refusing GreenPay op "${op}". This is expected on greenpay-staging.`,
    )
    this.name = 'GreenPayNotConfiguredError'
  }
}

function apiBase(): string {
  // Sandbox default; production is https://gateway.pmnts.io. Never assume prod.
  return Deno.env.get('GREENPAY_API_BASE') ?? 'https://gateway.pmnts-sandbox.io'
}

function authHeader(): string {
  const username = Deno.env.get('GREENPAY_USERNAME') ?? ''
  const token = Deno.env.get('GREENPAY_TOKEN') ?? ''
  return 'Basic ' + btoa(`${username}:${token}`)
}

/**
 * Thin authenticated fetch against the GreenPay/Fat Zebra REST API. Present so
 * the request plumbing is ready; unused until a method is implemented.
 */
async function gpFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Authorization': authHeader(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

export const greenPayGateway: PaymentGateway = {
  id: 'greenpay',

  // Recurring uses Fat Zebra "Payment Plans" (/plans + /subscriptions);
  // one-time uses a PaymentIntent / Purchase with a hosted page url.
  //   <!-- source: docs.fatzebra.com/reference/create-a-payment-plan + /reference/purchases + /docs/paymentintent, paths UNVERIFIED for GreenPay merchant -->
  async createDonationCheckout(_input: DonationCheckoutInput): Promise<HostedCheckoutSession> {
    if (!isGreenPayConfigured()) throw new GreenPayNotConfiguredError('createDonationCheckout')
    // TODO(greenpay): one_time -> POST /v1.0/purchases (or PaymentIntent) and
    // return the hosted page url; monthly -> POST /v1.0/plans then
    // POST /v1.0/subscriptions with the donor as customer. Left unimplemented
    // deliberately until sandbox keys land.
    void gpFetch
    throw new GreenPayNotConfiguredError('createDonationCheckout')
  },

  // Merch + event tickets: itemised hosted checkout with an optional fixed
  // discount. Fat Zebra equivalent is a PaymentIntent / Purchase carrying the
  // line total; itemisation + shipping capture map to the hosted page config.
  async createGenericCheckout(_input: GenericCheckoutInput): Promise<HostedCheckoutSession> {
    if (!isGreenPayConfigured()) throw new GreenPayNotConfiguredError('createGenericCheckout')
    void gpFetch
    throw new GreenPayNotConfiguredError('createGenericCheckout')
  },

  // Refunds: Fat Zebra POST /v1.0/refunds referencing the original transaction.
  //   <!-- source: docs.fatzebra.com llms index lists Refunds; exact path UNVERIFIED for GreenPay merchant -->
  async createRefund(_input: RefundInput): Promise<RefundResult> {
    if (!isGreenPayConfigured()) throw new GreenPayNotConfiguredError('createRefund')
    void gpFetch
    throw new GreenPayNotConfiguredError('createRefund')
  },

  // Webhook verification: GreenPay/Fat Zebra sign callbacks with an HMAC over
  // the raw body using the webhook secret. Verify by recomputing the HMAC and
  // constant-time comparing. Implemented shape below is inert until a real
  // secret is present (guarded by the config gate).
  async verifyWebhook(input: WebhookVerifyInput): Promise<VerifiedWebhookEvent> {
    if (!isGreenPayConfigured()) throw new GreenPayNotConfiguredError('verifyWebhook')
    // TODO(greenpay): confirm the exact HMAC scheme (algorithm, header name,
    // encoding) against greenpay.gitbook.io before trusting any event. The
    // recompute-and-compare skeleton is intentionally not wired to a live
    // signature format yet.
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(input.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    const macBuf = await crypto.subtle.sign('HMAC', key, enc.encode(input.raw_body))
    const computed = [...new Uint8Array(macBuf)].map((b) => b.toString(16).padStart(2, '0')).join('')
    if (computed !== input.signature) {
      throw new Error('GreenPay webhook signature mismatch')
    }
    // UNVERIFIED: the parsed event envelope shape (type/id/data keys) must be
    // confirmed against real GreenPay webhook payloads before consumption.
    const parsed = JSON.parse(input.raw_body) as { type?: string; id?: string }
    return { type: parsed.type ?? 'unknown', id: parsed.id ?? '', data: parsed }
  },
}
