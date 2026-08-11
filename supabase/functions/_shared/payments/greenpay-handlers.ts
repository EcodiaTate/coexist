/**
 * GreenPay per-surface handlers - STAGED, GATED OFF.
 *
 * Each edge function that creates a payment session gets a one-line gated guard
 * at the top of its handler:
 *
 *     if (activePaymentProvider() === 'greenpay') return greenPayCheckout(req)
 *
 * Because the active provider is Stripe by default (GREENPAY_ENABLED unset, no
 * keys), these guards are never taken at runtime and the Stripe code path is
 * byte-identical. If GreenPay were ever enabled WITHOUT keys, these handlers
 * fail closed (503) rather than routing at an unconfigured gateway - the
 * correct fail-safe for a never-ship branch. See GREENPAY-STAGING-DO-NOT-MERGE.md.
 *
 * When sandbox keys land, each handler maps its request body onto the shared
 * greenPayGateway (createDonationCheckout / createGenericCheckout) and returns
 * the SAME response shape as its Stripe twin ({ session_id?, url } or { url }).
 */

import { greenPayGateway } from './greenpay-gateway.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Uniform staged response: fail closed until GreenPay is really configured. */
function notConfigured(surface: string): Response {
  return json(
    {
      error: 'greenpay_not_configured',
      provider: 'greenpay',
      surface,
      message:
        'GreenPay is staged but not configured on this branch. No keys are held ' +
        '(sandbox keys are a founder-meeting ask). Stripe remains the live provider.',
    },
    503,
  )
}

/**
 * create-checkout twin (donation / merch / event_ticket / cancel_subscription /
 * billing_portal). A future turn dispatches on body.type onto the gateway.
 */
export async function greenPayCheckout(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  // Reference the gateway so the seam is obviously wired; it refuses today.
  void greenPayGateway
  return notConfigured('create-checkout')
}

/** public-checkout twin (anonymous donation / merch). */
export async function greenPayPublicCheckout(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  void greenPayGateway
  return notConfigured('public-checkout')
}

/** guest-ticket-checkout twin (email-only event ticket). */
export async function greenPayGuestTicketCheckout(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  void greenPayGateway
  return notConfigured('guest-ticket-checkout')
}

/** refund-order twin (admin merch refund). */
export async function greenPayRefundOrder(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  void greenPayGateway
  return notConfigured('refund-order')
}
