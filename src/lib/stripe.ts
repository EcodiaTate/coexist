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
