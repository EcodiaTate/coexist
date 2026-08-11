/**
 * GreenPay payment provider (client) - STAGED, GATED OFF, NO KEYS HELD.
 *
 * GreenPay (greenpay.au) is a white-label of Fat Zebra (gateway.pmnts.io). Its
 * browser SDK exposes a PaymentIntent object with `load` / `verifyCard` methods
 * that collect a PaymentMethod inside the page, comparable to Stripe.js running
 * in a Capacitor WebView.
 *   <!-- source: status_board 97ee9a1e (research 2026-08-09) + docs.fatzebra.com/docs/authentication-1 + /docs/paymentintent, as_of 2026-08-11 -->
 *
 * This skeleton exists so a future turn (post founder meeting, once sandbox
 * keys land) can implement the real SDK load without re-deriving the seam. It
 * MUST throw until configured - there are no GreenPay keys today and this
 * branch must never route a real payment. See GREENPAY-STAGING-DO-NOT-MERGE.md.
 *
 * Integration TODO (when keys arrive):
 *   1. Load the GreenPay/Fat Zebra browser SDK (script tag or npm package -
 *      exact name UNVERIFIED against the auth-gated greenpay.gitbook.io; the
 *      Fat Zebra equivalent is the "Payment Intents" JS library).
 *   2. `sdk.load(clientToken)` -> render the card fields -> `verifyCard()` to
 *      tokenize the PaymentMethod, then confirm the PaymentIntent server-side.
 *   3. For a hosted-redirect parity with Stripe Checkout, GreenPay returns a
 *      hosted payment page `url`; when present, prefer navigating to it (below).
 */

import type { HostedCheckoutResult, PaymentProvider } from './types'
import { greenPayPublishableKey, isGreenPayConfigured } from './config'

class GreenPayNotConfiguredError extends Error {
  constructor() {
    super(
      'GreenPay is staged but not configured (no VITE_GREENPAY_ENABLED / key). ' +
        'Refusing to start a GreenPay checkout. This is expected on greenpay-staging.',
    )
    this.name = 'GreenPayNotConfiguredError'
  }
}

/**
 * Placeholder for the real SDK load. Intentionally unimplemented: loading and
 * driving the GreenPay browser SDK lands with real sandbox keys after the
 * founder meeting.
 */
async function loadGreenPaySdk(): Promise<never> {
  // Reference the key so the seam is obviously key-driven, then refuse.
  void greenPayPublishableKey()
  throw new GreenPayNotConfiguredError()
}

export const greenPayProvider: PaymentProvider = {
  id: 'greenpay',

  isConfigured(): boolean {
    return isGreenPayConfigured()
  },

  async redirectToHostedCheckout(result: HostedCheckoutResult): Promise<void> {
    if (!isGreenPayConfigured()) {
      throw new GreenPayNotConfiguredError()
    }
    // Parity with Stripe: a hosted-page url is the preferred redirect.
    if (result.url) {
      window.location.href = result.url
      return
    }
    // Otherwise the GreenPay SDK would resolve a client token / intent id into
    // an in-page card collection. Staged - not wired until keys exist.
    await loadGreenPaySdk()
  },
}
