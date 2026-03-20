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
 */
export async function redirectToCheckout(sessionId: string) {
  const stripe = await getStripe()
  if (!stripe) throw new Error('Stripe failed to initialise')
  const { error } = await stripe.redirectToCheckout({ sessionId })
  if (error) throw error
}
