# GREENPAY STAGING - DO NOT MERGE, DO NOT DEPLOY

**Branch:** `greenpay-staging`
**Status board:** `97ee9a1e-b6f0-4610-b4e5-c173b613b840` (GreenPay adoption over Stripe)
**Created:** 2026-08-11

## The constraint (hard)

Tate directive, 2026-08-11 verbatim:

> "I dont want it going live at all, just staged in some branch that wont get
> swept up and shipped to web or mobile."

This branch stages a GreenPay payment integration across every Co-Exist checkout
surface. **It must never reach users.** Any deploy of this code - web (Vercel),
native (iOS/Android/Capgo OTA), or Supabase edge functions - is a critical
failure. Do NOT merge to `main`. Do NOT open a PR. Do NOT run
`supabase functions deploy` for any function on this branch. Do NOT ship.

## What is staged here

GreenPay (greenpay.au) is a white-label of Fat Zebra (gateway.pmnts.io). We hold
NO GreenPay keys yet - sandbox keys are a founder-meeting ask. So everything
here is:

- **Feature-flagged OFF.** Client gate `VITE_GREENPAY_ENABLED` (default false) +
  publishable key presence. Server gate `GREENPAY_ENABLED` + `GREENPAY_USERNAME`
  + `GREENPAY_TOKEN`. Both unset today, so the active provider is always Stripe.
- **Zero secrets committed.** Only env-var placeholders in `.env.example`.
- **Stripe untouched and default.** The GreenPay branches are additive early
  returns / a pass-through refund helper; the Stripe code paths are byte-identical.

### Payment surfaces covered (full enumeration, 2026-08-11)

Client hooks/pages: `use-donations`, `use-orders`, `use-event-tickets`,
`use-admin-merch` (refund), `use-events` (cancel), `transfer-ticket-sheet`,
`event-detail` (revoke + ticket checkout), `shop/checkout`, `donate/*`.

Edge functions: `create-checkout` (donation one-time + monthly, merch,
event_ticket, cancel_subscription, billing_portal), `create-checkout-test`,
`public-checkout`, `guest-ticket-checkout`, `refund-order`, `cancel-event`,
`revoke-event-ticket`, `stripe-webhook` (twin: staged `greenpay-webhook/`),
`stripe-webhook-test`. `transfer-event-ticket` is a DB-only transfer (no
gateway op). Full wiring map: `supabase/functions/_shared/payments/README.md`.

## Isolation measures

1. **Branch-scoped deploy suppression** in `vercel.json`
   (`git.deploymentEnabled: { "greenpay-staging": false }`) as defense-in-depth.
2. **No push to the Vercel-connected origin.** Vercel's read location for a
   branch-local `git.deploymentEnabled` on a first push could not be proven
   pre-push, and a post-push check is too late if it fails. Under "any deploy is
   a critical failure" the fail-safe choice is: durability via a **private
   mirror with no Vercel connection**, not the connected origin. (See the board
   row for the recorded proof: zero Vercel deployments for this ref.)
3. **No native build config touched.** Web-layer TS/React + edge-function code
   only. The Co-Exist NATIVE-RELEASE HOLD is untouched.
4. **No Supabase deploy.** The `greenpay-webhook` skeleton and every edited
   function exist in-repo only. Deploys are manual per-function; none were run.

## To activate later (post founder meeting, with sandbox keys)

1. Fill the GreenPay env placeholders (client + edge) with sandbox keys.
2. Implement the gateway methods in `greenpay-gateway.ts` against the confirmed
   GreenPay endpoints (paths currently marked `UNVERIFIED` against the auth-gated
   gitbook).
3. Test on sandbox, keeping Stripe as the fallback rail (Fat Zebra has a
   documented outage history - see the board row). Do not rip-and-replace.
