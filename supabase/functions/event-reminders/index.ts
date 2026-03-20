// @ts-nocheck - Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * event-reminders - Scheduled Supabase Edge Function
 *
 * Called by pg_cron every 30 minutes. Finds upcoming events and sends
 * reminder emails to registered attendees:
 *   - 24 hours before event start
 *   - 2 hours before event start
 *
 * Uses the `email_reminders_sent` table to track which reminders have
 * already been sent, preventing duplicates.
 */

serve(async (req: Request) => {
  try {
    // Verify this is called by cron (check for service role or cron header)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const now = new Date()
    const results = { reminders_24h: 0, reminders_2h: 0, errors: 0 }

    // ── 24-hour reminders ──
    // Find events starting between 23.5 and 24.5 hours from now
    const h24Start = new Date(now.getTime() + 23.5 * 60 * 60 * 1000)
    const h24End = new Date(now.getTime() + 24.5 * 60 * 60 * 1000)

    const { data: events24h } = await supabase
      .from('events')
      .select('id, title, date_start, address')
      .eq('status', 'published')
      .gte('date_start', h24Start.toISOString())
      .lte('date_start', h24End.toISOString())

    if (events24h?.length) {
      for (const event of events24h) {
        const sent = await sendReminders(supabase, event, '24h', 'tomorrow')
        results.reminders_24h += sent.sent
        results.errors += sent.errors
      }
    }

    // ── 2-hour reminders ──
    // Find events starting between 1.5 and 2.5 hours from now
    const h2Start = new Date(now.getTime() + 1.5 * 60 * 60 * 1000)
    const h2End = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)

    const { data: events2h } = await supabase
      .from('events')
      .select('id, title, date_start, address')
      .eq('status', 'published')
      .gte('date_start', h2Start.toISOString())
      .lte('date_start', h2End.toISOString())

    if (events2h?.length) {
      for (const event of events2h) {
        const sent = await sendReminders(supabase, event, '2h', 'in 2 hours')
        results.reminders_2h += sent.sent
        results.errors += sent.errors
      }
    }

    console.log('[event-reminders]', JSON.stringify(results))

    return new Response(JSON.stringify({ success: true, ...results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[event-reminders] Error:', err)
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})

// ── Send reminders for a single event ──

interface EventRow {
  id: string
  title: string
  date_start: string
  address: string | null
}

async function sendReminders(
  supabase: ReturnType<typeof createClient>,
  event: EventRow,
  reminderType: '24h' | '2h',
  timeUntil: string,
): Promise<{ sent: number; errors: number }> {
  let sent = 0
  let errors = 0

  // Check which reminders have already been sent for this event + type
  const { data: alreadySent } = await supabase
    .from('email_reminders_sent')
    .select('user_id')
    .eq('event_id', event.id)
    .eq('reminder_type', reminderType)

  const alreadySentIds = new Set((alreadySent ?? []).map((r) => r.user_id))

  // Get all registered attendees
  const { data: registrations } = await supabase
    .from('event_registrations')
    .select('user_id, profiles!inner(display_name)')
    .eq('event_id', event.id)
    .eq('status', 'registered')

  if (!registrations?.length) return { sent: 0, errors: 0 }

  const eventDate = new Date(event.date_start).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  for (const reg of registrations) {
    if (alreadySentIds.has(reg.user_id)) continue

    try {
      const displayName = (reg as any).profiles?.display_name ?? 'there'

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'event_reminder',
          userId: reg.user_id,
          data: {
            name: displayName,
            event_title: event.title,
            event_date: eventDate,
            event_location: event.address ?? '',
            event_url: `https://app.coexistaus.org/events/${event.id}`,
            time_until: timeUntil,
          },
        },
      })

      // Record that this reminder was sent
      await supabase.from('email_reminders_sent').insert({
        event_id: event.id,
        user_id: reg.user_id,
        reminder_type: reminderType,
      })

      sent++
    } catch (err) {
      console.error(`[event-reminders] Failed for user ${reg.user_id}:`, (err as Error).message)
      errors++
    }
  }

  return { sent, errors }
}
