import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, relative, sep } from 'node:path'
import {
  buildGuestCheckoutBody,
  requestGuestCheckoutUrl,
} from '@/hooks/use-guest-ticket-checkout'
import { guestSafetyPayload, type GuestSafetyAnswers } from '@/lib/dietary'

/* ------------------------------------------------------------------ */
/*  Guest-checkout extraction: PARITY, not improvement                 */
/*                                                                     */
/*  Finding 1.F5. public/event.tsx and public/campout-type.tsx each     */
/*  hand-built the same guest-ticket-checkout POST, on the surface that */
/*  takes money from people with no account, with no tests. The brief   */
/*  scopes this as mechanical extraction with ZERO semantic change, so  */
/*  the test is an equivalence proof: the request the module builds     */
/*  must be byte-identical to the object each call site built inline    */
/*  at 0c9302db. Checkout semantics beyond the request shape are the    */
/*  spine audit's, not this lane's.                                     */
/* ------------------------------------------------------------------ */

const answers = { 'q-1': 'Yes', 'q-2': ['Tent'] }
const safety: GuestSafetyAnswers = {
  dietary: 'Coeliac',
  medical: 'Gluten',
  emergencyName: 'Mel de Klerk',
  emergencyPhone: '0449791006',
  emergencyRelationship: 'Mother',
}

/* VERBATIM from public/event.tsx:145-153 at 0c9302db, the version this
   extraction replaced. Kept as a literal so the comparison is against what
   actually shipped, not against a paraphrase of it. */
function legacyEventBody(args: {
  id: string; activeTypeId: string; buyEmail: string; buyName: string
  answers?: typeof answers; safety: GuestSafetyAnswers | null
}) {
  return {
    event_id: args.id,
    ticket_type_id: args.activeTypeId,
    email: args.buyEmail.trim(),
    name: args.buyName.trim(),
    quantity: 1,
    answers: args.answers ?? null,
    ...(args.safety ? guestSafetyPayload(args.safety) : {}),
  }
}

/* VERBATIM from public/campout-type.tsx:148 at 0c9302db. Note it spread
   guestSafetyPayload UNCONDITIONALLY: every camp-out booking carries the
   safety set by design, and the server 400s without it. */
function legacyCampoutBody(args: {
  selected: { id: string; ticket_type_id: string }
  email: string; name: string; answers?: typeof answers; reqs: GuestSafetyAnswers
}) {
  return {
    event_id: args.selected.id,
    ticket_type_id: args.selected.ticket_type_id,
    email: args.email.trim(),
    name: args.name.trim(),
    quantity: 1,
    answers: args.answers ?? null,
    ...guestSafetyPayload(args.reqs),
  }
}

describe('the extracted request equals what each page built inline', () => {
  it('matches public/event.tsx, safety present', () => {
    expect(buildGuestCheckoutBody({
      eventId: 'e-1', ticketTypeId: 'tt-1', email: 'buyer@example.com', name: 'Sam', answers, safety,
    })).toEqual(legacyEventBody({
      id: 'e-1', activeTypeId: 'tt-1', buyEmail: 'buyer@example.com', buyName: 'Sam', answers, safety,
    }))
  })

  /* The non-campout path: no safety modal ran, so the safety keys are ABSENT
     rather than present-and-null. The server distinguishes the two. */
  it('matches public/event.tsx with no safety collected, omitting the keys entirely', () => {
    const built = buildGuestCheckoutBody({
      eventId: 'e-1', ticketTypeId: 'tt-1', email: 'buyer@example.com', name: 'Sam', answers, safety: null,
    })
    expect(built).toEqual(legacyEventBody({
      id: 'e-1', activeTypeId: 'tt-1', buyEmail: 'buyer@example.com', buyName: 'Sam', answers, safety: null,
    }))
    expect(Object.keys(built)).not.toContain('emergency_name')
  })

  it('matches public/campout-type.tsx', () => {
    expect(buildGuestCheckoutBody({
      eventId: 'e-2', ticketTypeId: 'tt-2', email: 'k@example.com', name: 'Keely', answers, safety,
    })).toEqual(legacyCampoutBody({
      selected: { id: 'e-2', ticket_type_id: 'tt-2' }, email: 'k@example.com', name: 'Keely', answers, reqs: safety,
    }))
  })

  it('keeps the key ORDER, so the serialised body is byte-identical', () => {
    const built = JSON.stringify(buildGuestCheckoutBody({
      eventId: 'e-1', ticketTypeId: 'tt-1', email: 'a@b.co', name: 'Sam', answers, safety,
    }))
    const legacy = JSON.stringify(legacyEventBody({
      id: 'e-1', activeTypeId: 'tt-1', buyEmail: 'a@b.co', buyName: 'Sam', answers, safety,
    }))
    expect(built).toBe(legacy)
  })

  it('still trims email and name at the boundary, as both pages did', () => {
    const built = buildGuestCheckoutBody({
      eventId: 'e-1', ticketTypeId: 'tt-1', email: '  a@b.co  ', name: '  Sam  ', safety: null,
    })
    expect(built.email).toBe('a@b.co')
    expect(built.name).toBe('Sam')
  })

  it('sends answers as null, never undefined, when none were asked', () => {
    // undefined drops the key in JSON; the server reads body.answers.
    const built = buildGuestCheckoutBody({ eventId: 'e', ticketTypeId: 't', email: 'a@b.co', name: 'S', safety: null })
    expect(built.answers).toBeNull()
    expect(JSON.stringify(built)).toContain('"answers":null')
  })
})

describe('the request itself', () => {
  const origFetch = global.fetch
  beforeEach(() => { vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.co'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key') })
  afterEach(() => { global.fetch = origFetch; vi.unstubAllEnvs() })

  function captureFetch(response: unknown, ok = true) {
    const spy = vi.fn().mockResolvedValue({ ok, json: async () => response })
    global.fetch = spy as unknown as typeof fetch
    return spy
  }

  it('posts to the guest endpoint with the anon key in both header slots', async () => {
    const spy = captureFetch({ url: 'https://checkout.stripe.com/x' })
    await requestGuestCheckoutUrl({ eventId: 'e', ticketTypeId: 't', email: 'a@b.co', name: 'S', safety })
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe('https://db.example.co/functions/v1/guest-ticket-checkout')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      apikey: 'anon-key',
      Authorization: 'Bearer anon-key',
    })
    expect(JSON.parse(init.body).emergency_phone).toBe('0449791006')
  })

  /* Both pages surfaced the SERVER's message when there was one, which is how
     a buyer learns the event sold out rather than seeing a generic failure. */
  it('throws the server message when the server sends one', async () => {
    captureFetch({ error: 'This ticket type is sold out' }, false)
    await expect(requestGuestCheckoutUrl({ eventId: 'e', ticketTypeId: 't', email: 'a@b.co', name: 'S', safety: null }))
      .rejects.toThrow('This ticket type is sold out')
  })

  it('falls back to the same generic message both pages used', async () => {
    captureFetch({}, false)
    await expect(requestGuestCheckoutUrl({ eventId: 'e', ticketTypeId: 't', email: 'a@b.co', name: 'S', safety: null }))
      .rejects.toThrow('Could not start checkout')
  })

  /* A 200 with no url is the shape that would otherwise redirect to
     "undefined". Both pages guarded it with `!out.url`. */
  it('treats a 200 with no url as a failure', async () => {
    captureFetch({ ok: true })
    await expect(requestGuestCheckoutUrl({ eventId: 'e', ticketTypeId: 't', email: 'a@b.co', name: 'S', safety: null }))
      .rejects.toThrow('Could not start checkout')
  })
})

describe('the pages kept the state machines that differ between them', () => {
  const ROOT = resolve(__dirname, '../..')
  const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')

  it('neither page hand-builds the request any more', () => {
    for (const page of ['src/pages/public/event.tsx', 'src/pages/public/campout-type.tsx']) {
      expect(read(page)).toContain('startGuestCheckout({')
      expect(read(page)).not.toContain('functions/v1/guest-ticket-checkout')
    }
  })

  /* NOT merged on purpose: campout-type closes both modals on failure and
     event.tsx leaves them open. Collapsing that would change behaviour on the
     payment path, which this lane may not do. */
  it('campout-type still closes its modals on failure', () => {
    const book = read('src/pages/public/campout-type.tsx')
    const catchBlock = book.slice(book.indexOf('} catch (e) {'), book.indexOf('} catch (e) {') + 320)
    expect(catchBlock).toContain('setShowReqs(false)')
    expect(catchBlock).toContain('setShowQuestions(false)')
  })

  it('public/event still leaves its modals open on failure', () => {
    const body = read('src/pages/public/event.tsx')
    const catchBlock = body.slice(body.indexOf('} catch (e) {'), body.indexOf('} catch (e) {') + 260)
    expect(catchBlock).not.toContain('setShowGuestQuestions(false)')
  })

  /* The safety-gate suite scans whichever file holds the fetch. It must find
     exactly the module, so that guard did not quietly stop watching anything. */
  it('exactly one file in src builds the checkout fetch', () => {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'test') walk(full) }
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          if (readFileSync(full, 'utf8').includes('functions/v1/guest-ticket-checkout')) {
            found.push(relative(ROOT, full).split(sep).join('/'))
          }
        }
      }
    }
    walk(resolve(ROOT, 'src'))
    expect(found).toEqual(['src/hooks/use-guest-ticket-checkout.ts'])
  })
})
