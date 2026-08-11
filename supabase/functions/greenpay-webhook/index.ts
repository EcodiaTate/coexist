/**
 * greenpay-webhook - Supabase Edge Function - STAGED, NOT DEPLOYED, GATED OFF.
 *
 * The GreenPay twin of `stripe-webhook`. When GreenPay is live, its callbacks
 * land here; this function verifies the signature and reconciles the SAME
 * domain state the Stripe webhook owns (donations, recurring gifts, merch
 * orders, event tickets, refunds).
 *
 * DO NOT DEPLOY THIS. It exists in-repo only, as a staged skeleton, so a future
 * turn can wire it once sandbox keys land. It fails closed until
 * GREENPAY_ENABLED=true and credentials are present. There are no GreenPay keys
 * today. See GREENPAY-STAGING-DO-NOT-MERGE.md + status_board 97ee9a1e.
 *
 * When wiring for real:
 *   1. Confirm the GreenPay/Fat Zebra callback signature scheme + header name
 *      against greenpay.gitbook.io (the verifyWebhook HMAC shape is UNVERIFIED).
 *   2. Map GreenPay event types onto the reconciliation the Stripe webhook does:
 *        purchase succeeded        -> donation / merch / event-ticket confirm
 *        payment plan charge       -> recurring donation charge
 *        payment plan cancelled    -> recurring cancellation
 *        refund succeeded          -> order/ticket refunded + inventory restore
 *   3. Reuse the same DB writes + send-email invocations as stripe-webhook so
 *      the two providers converge on identical records.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withSentry } from '../_shared/sentry.ts'
import { greenPayGateway } from '../_shared/payments/greenpay-gateway.ts'
import { isGreenPayConfigured } from '../_shared/payments/provider.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-greenpay-signature',
}

Deno.serve(withSentry('greenpay-webhook', async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Fail closed: this staged function refuses until GreenPay is configured.
  if (!isGreenPayConfigured()) {
    return new Response(
      JSON.stringify({ error: 'greenpay_not_configured', staged: true }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  const secret = Deno.env.get('GREENPAY_WEBHOOK_SECRET') ?? ''
  const signature = req.headers.get('x-greenpay-signature') ?? ''
  const rawBody = await req.text()

  let event: { type: string; id: string; data: unknown }
  try {
    event = await greenPayGateway.verifyWebhook({ raw_body: rawBody, signature, secret })
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 })
  }

  // Service-role client, ready for the reconciliation writes (staged - the
  // per-event handlers below are intentionally TODO until event shapes are
  // confirmed against real GreenPay payloads).
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  void supabase

  switch (event.type) {
    // TODO(greenpay): mirror stripe-webhook's handlers once GreenPay event
    // types + payload shapes are confirmed with sandbox keys.
    default:
      console.log('[greenpay-webhook] staged - unhandled event type:', event.type)
  }

  return new Response(JSON.stringify({ received: true, staged: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}))
