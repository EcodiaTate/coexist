# Payment provider seam (edge functions) - STAGED, GATED OFF

GreenPay staging for Co-Exist. GreenPay (greenpay.au) is a white-label of Fat
Zebra (gateway.pmnts.io). This directory stages a GreenPay path alongside the
live Stripe path so a future turn can activate it after the founder meeting,
once sandbox keys land.

**Never ship this branch.** No GreenPay keys are held today. See the repo-root
`GREENPAY-STAGING-DO-NOT-MERGE.md` and status_board row
`97ee9a1e-b6f0-4610-b4e5-c173b613b840`.

## How the gate works

Both client and server use the same double gate:

- Server: `activePaymentProvider()` (provider.ts) returns `greenpay` ONLY when
  `GREENPAY_ENABLED=true` AND `GREENPAY_USERNAME` + `GREENPAY_TOKEN` are set.
  Otherwise it returns `stripe`. All of these are unset today, so every function
  stays on Stripe and the GreenPay branches are never taken.
- If GreenPay were enabled WITHOUT keys, the gateway + handlers fail **closed**
  (503), never routing at an unconfigured gateway.

Stripe is untouched and default. The GreenPay branches are additive early
returns / a pass-through helper; the Stripe code paths are byte-identical.

## Files

| File | Role |
|---|---|
| `provider.ts` | `activePaymentProvider()`, `isGreenPayConfigured()` - the server gate |
| `types.ts` | `PaymentGateway` interface = union of every Stripe op the functions use |
| `greenpay-gateway.ts` | Fat Zebra REST adapter skeleton (HTTP Basic); refuses until configured |
| `greenpay-handlers.ts` | Per-surface `Response` builders for the checkout guards |
| `refund-helper.ts` | Provider-aware refund used by the 3 refund surfaces |

## Surface -> GreenPay path wiring map

| Enumerated Stripe surface | GreenPay staging |
|---|---|
| `create-checkout` (donation / merch / event_ticket / cancel_subscription / billing_portal) | top-of-handler guard -> `greenPayCheckout` |
| `create-checkout-test` | top-of-handler guard -> `greenPayCheckout` |
| `public-checkout` (anon donation / merch) | top-of-handler guard -> `greenPayPublicCheckout` |
| `guest-ticket-checkout` (email-only ticket) | top-of-handler guard -> `greenPayGuestTicketCheckout` |
| `refund-order` (admin merch refund) | top-of-handler guard -> `greenPayRefundOrder` |
| `cancel-event` (embedded refund loop) | refund call -> `createRefundViaActiveProvider` |
| `revoke-event-ticket` (embedded refund) | refund call -> `createRefundViaActiveProvider` |
| `stripe-webhook` | staged twin function `greenpay-webhook/` (NOT deployed) |
| `stripe-webhook-test` | mirrored by `greenpay-webhook/` when a test twin is needed |
| `transfer-event-ticket` | not a payment surface (DB-only transfer, no gateway op) |

## Endpoint verification debt (do before any live wiring)

The Fat Zebra base URL + Basic auth are grounded from docs.fatzebra.com. The
specific versioned resource paths (`/v1.0/purchases`, `/plans`, `/subscriptions`,
`/refunds`) and the webhook signature scheme are marked `UNVERIFIED` in the
gateway - the GreenPay gitbook is auth-gated and must be confirmed with sandbox
keys at integration time.
