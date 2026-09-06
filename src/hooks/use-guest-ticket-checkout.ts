import { guestSafetyPayload, type GuestSafetyAnswers } from '@/lib/dietary'
import type { TicketAnswers } from '@/hooks/use-event-ticket-questions'

/**
 * The guest-ticket-checkout request, built in one place (finding 1.F5).
 *
 * public/event.tsx and public/campout-type.tsx each hand-built this POST: the
 * same url, the same anon-key headers, the same body keys. Two copies of a
 * payment request on the surface that takes money from people who do not have
 * an account, and the safety-gate suite already exists because ONE of those
 * copies once forgot a field and dead-ended every camp-out purchase (Keely de
 * Klerk and the Northern Rivers team, 2026-08-28).
 *
 * ZERO semantic change is the requirement here, so this deliberately extracts
 * only the request and the redirect. The two pages' state machines stay where
 * they are: they are NOT the same. public/event.tsx leaves its modals open on
 * failure so the buyer can retry from where they stand, while campout-type.tsx
 * closes both and returns them to the date list. Merging those would change
 * behaviour on the payment path, which is what this lane is not allowed to do.
 * Checkout SEMANTICS beyond the request shape are the spine audit's.
 *
 * The safety fields still route through guestSafetyPayload, which
 * safety-gate-coverage.test.ts scans the call sites for. That scan follows the
 * fetch, so it now reads this module.
 */

export interface GuestCheckoutRequest {
  eventId: string
  ticketTypeId: string
  email: string
  name: string
  answers?: TicketAnswers | null
  safety?: GuestSafetyAnswers | null
}

/**
 * The exact body both pages used to build inline. Exported so a parity test
 * can snapshot it rather than trusting that the extraction preserved it.
 *
 * Note email/name are trimmed HERE, as both call sites did at the boundary.
 */
export function buildGuestCheckoutBody(req: GuestCheckoutRequest) {
  return {
    event_id: req.eventId,
    ticket_type_id: req.ticketTypeId,
    email: req.email.trim(),
    name: req.name.trim(),
    quantity: 1,
    answers: req.answers ?? null,
    ...(req.safety ? guestSafetyPayload(req.safety) : {}),
  }
}

/**
 * POST the checkout and hand back the Stripe url. Throws the server's own
 * message, or the generic one both pages used, so each caller's catch keeps
 * behaving exactly as it did.
 */
export async function requestGuestCheckoutUrl(req: GuestCheckoutRequest): Promise<string> {
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guest-ticket-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(buildGuestCheckoutBody(req)),
  })
  const out = await res.json()
  if (!res.ok || !out.url) throw new Error(out.error || 'Could not start checkout')
  return out.url as string
}

/** Send the buyer to Stripe. Separate so a test can build the request without
 *  navigating, and so the redirect reads as the deliberate act it is. */
export async function startGuestCheckout(req: GuestCheckoutRequest): Promise<void> {
  window.location.href = await requestGuestCheckoutUrl(req)
}
