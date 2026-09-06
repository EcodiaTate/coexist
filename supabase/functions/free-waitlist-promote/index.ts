// Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { withSentry } from '../_shared/sentry.ts'

/**
 * free-waitlist-promote - scheduled sweep for the FREE-event (RSVP) waitlist.
 *
 * Called by pg_cron every 5 minutes (`cron_free_waitlist_promote`). Runs
 * `promote_free_event_waitlist()`, which FIFO-promotes waitlisted
 * registrations into free seats across every eligible event, then emails each
 * promoted person. Sibling of waitlist-notify (the TICKETED drain); the two
 * mechanics stay separate on purpose - see 20260905120000_event_waitlist.sql.
 *
 * WHY A SWEEP: handle_registration_cancel already backfills one seat per
 * cancellation, but a seat also comes back from a row delete, an organiser
 * raising capacity, or a registrations freeze being lifted (the Merri
 * Mornings 2026-09-06 case: capacity lifted to NULL with 74 people stranded
 * on the waitlist and no path that would ever promote them). A sweep covers
 * every freeing path that exists and every one added later.
 *
 * PROMOTE-THEN-EMAIL, the opposite stamp order to the ticketed drain: a free
 * RSVP promotion is a grant, not a 24h purchase offer. The seat stands even
 * if Resend fails; the member still has the in-app notification (written by
 * the RPC) and their my-events list shows them registered.
 */

const APP_URL = 'https://app.coexistaus.org'

interface Promoted {
  out_event_id: string
  out_user_id: string
  out_display_name: string | null
  out_email: string | null
  out_event_title: string
  out_event_date: string
}

/** Wall-clock-as-UTC, matching how the rest of the app formats event dates. */
function formatEventLong(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
  }).format(d)
}

Deno.serve(withSentry('free-waitlist-promote', async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supabase.rpc('promote_free_event_waitlist', { p_limit: 50 })
  if (error) {
    console.error('[free-waitlist-promote] promote rpc failed:', error.message)
    return json({ error: error.message }, 500)
  }

  const promoted = (data ?? []) as Promoted[]
  if (promoted.length === 0) {
    return json({ ok: true, promoted: 0, emailed: 0, reason: 'nobody to promote' })
  }

  // One batch send per event: N recipients cost ceil(N/100) Resend calls, the
  // same path the host reminder and the ticketed drain use, never a fan-out.
  const byEvent = new Map<string, Promoted[]>()
  for (const p of promoted) {
    const list = byEvent.get(p.out_event_id) ?? []
    list.push(p)
    byEvent.set(p.out_event_id, list)
  }

  let emailed = 0
  const failures: string[] = []

  for (const [evId, group] of byEvent) {
    const eventUrl = `${APP_URL}/events/${evId}`
    const recipients = group
      .filter((p) => p.out_email)
      .map((p) => ({
        userId: p.out_user_id,
        to: p.out_email!,
        data: {
          name: p.out_display_name || 'there',
          event_title: p.out_event_title,
          event_date: formatEventLong(p.out_event_date),
          event_url: eventUrl,
        },
      }))
    if (recipients.length === 0) continue

    // The Authorization header is EXPLICIT and load-bearing. A client built
    // with the service-role key does not put that key on an invoke() call by
    // itself; send-email's own bearer check then rejects the request. Measured
    // on waitlist-notify's first live fire, 2026-09-05.
    const { error: sendErr } = await supabase.functions.invoke('send-email', {
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}` },
      body: { type: 'waitlist_promoted', recipients },
    })

    if (sendErr) {
      // The promotion stands; the email is a courtesy on top of the in-app
      // notification, so a failed send is logged and NOT retried by re-demoting
      // anybody.
      console.error(`[free-waitlist-promote] send failed for event ${evId}:`, sendErr.message)
      failures.push(`${evId}: send ${sendErr.message}`)
      continue
    }
    emailed += recipients.length
  }

  return json({ ok: failures.length === 0, promoted: promoted.length, emailed, failures })
}))
