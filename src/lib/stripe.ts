import { supabase } from '@/lib/supabase'
import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

/**
 * Redirect to Stripe Checkout.
 * The `sessionId` comes from the `create-checkout` Edge Function.
 *
 * Note: `stripe.redirectToCheckout()` was removed from the Stripe.js types.
 * We cast through `unknown` to call it at runtime where it still exists.
 * Callers should prefer the checkout session `url` when available (see donate/shop pages).
 */
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe failed to initialise')
  const { error } = await (stripe as unknown as {
    redirectToCheckout: (opts: { sessionId: string }) => Promise<{ error?: { message: string } }>
  }).redirectToCheckout({ sessionId })
  if (error) throw error
}

/* ------------------------------------------------------------------ */
/*  create-checkout invocation                                         */
/* ------------------------------------------------------------------ */

/**
 * Call the `create-checkout` Edge Function and unwrap its result.
 *
 * The three lines this replaces (invoke, `if (res.error) throw res.error`,
 * `return res.data as T`) were repeated at seven mutation sites across
 * use-donations, use-orders and use-membership. Every one of them threw on
 * error and cast the payload, so there was nothing to vary, only somewhere for
 * a site to forget the throw.
 *
 * `type` is the Edge Function's discriminator (donation, merch, membership,
 * cancel_subscription, cancel_membership, billing_portal, membership_portal)
 * and is required, since a body without it reaches the function and fails
 * there rather than here.
 *
 * The cast is the caller's to name because the return shape varies by type: a
 * checkout returns `{ session_id, url }`, a portal returns `{ url }`, a
 * cancellation returns nothing. `void` is a legitimate T.
 */
export async function invokeCheckout<T = unknown>(
  body: { type: string } & Record<string, unknown>,
): Promise<T> {
  const res = await supabase.functions.invoke('create-checkout', { body })
  if (res.error) throw res.error
  return res.data as T
}
