import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  eventRequiresSafetySet,
  guestSafetyPayload,
  hasEmergencyContact,
  hasFourWheelDriveAnswer,
  LIVE_REGISTRATION_STATUSES,
  LIVE_TICKET_STATUSES,
  SAFETY_SET_EVENT_OR_FILTER,
  safetyGateHeading,
} from '@/lib/dietary'

/* ------------------------------------------------------------------ */
/*  Safety-data coverage gate                                          */
/*                                                                     */
/*  Pins the rules that decide WHO gets asked for the retreat safety   */
/*  set (dietary, medical, emergency contact). Written 2026-08-28       */
/*  after a live probe of the Murbpook Outback Campout (2026-09-19,    */
/*  Morgan SA, 15 seats) found 4 seats with a gap, and a fleet-wide     */
/*  sweep found 10 of 57 seats on upcoming overnight events with no    */
/*  reachable emergency contact.                                        */
/* ------------------------------------------------------------------ */

describe('LIVE_TICKET_STATUSES', () => {
  // The defect. An organiser hold (reserve-event-spot) writes status
  // 'reserved'. It was absent from the eligibility filter, so a held seat was
  // never asked for anything: not at hold time (the organiser does not know
  // the member's contact) and not on app open (this filter excluded them).
  it('counts an organiser hold as a live seat', () => {
    expect(LIVE_TICKET_STATUSES).toContain('reserved')
  })

  it('counts every pre-attendance state that implies someone will turn up', () => {
    expect(LIVE_TICKET_STATUSES).toContain('pending')
    expect(LIVE_TICKET_STATUSES).toContain('confirmed')
    expect(LIVE_TICKET_STATUSES).toContain('checked_in')
  })

  // A seat that is gone must not nag its former holder.
  it('excludes seats that no longer exist', () => {
    expect(LIVE_TICKET_STATUSES).not.toContain('cancelled')
    expect(LIVE_TICKET_STATUSES).not.toContain('refunded')
  })

  // Guards against a future status being added to the DB check constraint
  // and silently not being considered here.
  it('covers exactly the live half of the status domain', () => {
    const domain = ['pending', 'confirmed', 'cancelled', 'refunded', 'checked_in', 'reserved']
    const dead = ['cancelled', 'refunded']
    expect([...LIVE_TICKET_STATUSES].sort()).toEqual(domain.filter((s) => !dead.includes(s)).sort())
  })
})

describe('LIVE_REGISTRATION_STATUSES', () => {
  it('counts a real registration', () => {
    expect(LIVE_REGISTRATION_STATUSES).toContain('registered')
    expect(LIVE_REGISTRATION_STATUSES).toContain('attended')
  })

  // 'invited' is the bulk-import state, 4,861 rows as at 2026-08-28, most of
  // whom never accepted. Arming a blocking modal on it would nag thousands of
  // people who hold no seat.
  it('does not count a bulk invite as a seat', () => {
    expect(LIVE_REGISTRATION_STATUSES).not.toContain('invited')
    expect(LIVE_REGISTRATION_STATUSES).not.toContain('waitlisted')
    expect(LIVE_REGISTRATION_STATUSES).not.toContain('cancelled')
  })
})

describe('hasEmergencyContact', () => {
  it('needs both a name and a phone', () => {
    expect(hasEmergencyContact({ emergency_contact_name: 'Sarah', emergency_contact_phone: '0403507939' })).toBe(true)
    // A name with no number is not reachable, which is the whole point.
    expect(hasEmergencyContact({ emergency_contact_name: 'Sarah', emergency_contact_phone: null })).toBe(false)
    expect(hasEmergencyContact({ emergency_contact_name: null, emergency_contact_phone: '0403507939' })).toBe(false)
  })

  it('treats whitespace as unanswered', () => {
    expect(hasEmergencyContact({ emergency_contact_name: '  ', emergency_contact_phone: '0403507939' })).toBe(false)
    expect(hasEmergencyContact({ emergency_contact_name: 'Sarah', emergency_contact_phone: '   ' })).toBe(false)
  })

  it('treats a missing or absent profile as unanswered rather than throwing', () => {
    expect(hasEmergencyContact(null)).toBe(false)
    expect(hasEmergencyContact(undefined)).toBe(false)
    expect(hasEmergencyContact({})).toBe(false)
  })

  // Unlike dietary and medical there is no "None" quick-fill, so the string
  // 'None' is a real contact name and must not be special-cased away. This
  // pins the asymmetry so nobody "tidies" it later.
  it('does not special-case a None sentinel', () => {
    expect(hasEmergencyContact({ emergency_contact_name: 'None', emergency_contact_phone: '000' })).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/*  Guest checkout payload coverage                                    */
/*                                                                     */
/*  The gate TypeScript cannot be.                                     */
/*                                                                     */
/*  guest-ticket-checkout hard-requires an emergency contact and 400s   */
/*  without one. A caller that collects the contact and forgets to      */
/*  forward it does not degrade, it DEAD-ENDS: the buyer fills the form */
/*  in, the server says it is blank, and no amount of retrying works.   */
/*  That shipped on 2026-08-28 (Keely de Klerk, and the Northern        */
/*  Rivers team, could not buy a camp-out ticket at all) because        */
/*  campout-type.tsx typed its handler `(reqs: {dietary, medical})` and */
/*  a handler taking FEWER properties is structurally assignable to one */
/*  taking more. The compiler had nothing to say. So the guard is a     */
/*  source scan: every fetch of guest-ticket-checkout builds its safety */
/*  fields through guestSafetyPayload, and nobody hand-rolls the keys.  */
/* ------------------------------------------------------------------ */

describe('guest checkout safety payload', () => {
  const ROOT = path.resolve(__dirname, '../..')
  /* One file since 2026-09-06 (consolidation finding 1.F5). The two public buy
     pages each hand-built this POST; the request now lives in one module and
     both pages call it. That is a REDUCTION in what this guard has to watch,
     not a hole in it: there is exactly one place left that can forget a safety
     key, and the walk below still discovers rather than assumes, so a page
     that goes back to building its own fetch reappears here and fails the
     expectation. The pages' own state machines were deliberately NOT merged,
     because they differ on failure. */
  const CALLER_GLOB = ['src/hooks/use-guest-ticket-checkout.ts']

  // Every source file that POSTs to the function, discovered rather than
  // listed, so a brand-new buy surface is covered the day it is added.
  function callerFiles(): string[] {
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        // Test sources name the endpoint in order to talk about it (this file
        // included). Scanning them would make the guard discover itself and
        // fail on its own fixture.
        if (entry.isDirectory()) { if (entry.name !== 'test') walk(full) }
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          const body = fs.readFileSync(full, 'utf8')
          if (body.includes('functions/v1/guest-ticket-checkout')) {
            found.push(path.relative(ROOT, full).split(path.sep).join('/'))
          }
        }
      }
    }
    walk(path.join(ROOT, 'src'))
    return found.sort()
  }

  it('finds the buy surfaces it is meant to be guarding', () => {
    // If this fails the discovery walk broke and every assertion below would
    // pass vacuously over an empty list.
    expect(callerFiles()).toEqual(CALLER_GLOB.sort())
  })

  it.each(callerFiles())('%s forwards the whole safety set', (file) => {
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(body).toContain('guestSafetyPayload')
  })

  it.each(callerFiles())('%s does not hand-roll the safety keys', (file) => {
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    // Hand-building any one of these at a call site is how the set drifts:
    // it compiles, and it silently omits whatever the author forgot.
    for (const key of ['emergency_name:', 'emergency_phone:', 'emergency_relationship:', 'dietary:', 'medical:']) {
      expect(body).not.toContain(key)
    }
  })

  it('sends every field the server reads, under the exact keys it reads them by', () => {
    // Pinned against supabase/functions/guest-ticket-checkout/index.ts, which
    // reads body.emergency_name / body.emergency_phone /
    // body.emergency_relationship / body.dietary / body.medical.
    expect(guestSafetyPayload({
      dietary: 'Coeliac',
      medical: 'Gluten',
      emergencyName: 'Mel de Klerk',
      emergencyPhone: '0449791006',
      emergencyRelationship: 'Mother',
    })).toEqual({
      dietary: 'Coeliac',
      medical: 'Gluten',
      emergency_name: 'Mel de Klerk',
      emergency_phone: '0449791006',
      emergency_relationship: 'Mother',
    })
  })

  // The server treats a whitespace-only name or phone as absent, so passing
  // one through unchanged is correct: it must fail the gate, not sneak past it.
  it('does not launder a blank contact into a present-looking one', () => {
    const out = guestSafetyPayload({
      dietary: 'None', medical: 'None',
      emergencyName: '   ', emergencyPhone: '', emergencyRelationship: '',
    })
    expect(out.emergency_name.trim()).toBe('')
    expect(out.emergency_phone.trim()).toBe('')
  })
})

/* ------------------------------------------------------------------ */
/*  Four-wheel drive: the fourth member of the set                     */
/*                                                                     */
/*  Added 2026-08-30 on Tate's direction that all four things are      */
/*  asked at ONE point. The column is nullable and the third state is  */
/*  the whole mechanism, so the tests below are about telling          */
/*  "answered: no" apart from "never asked".                           */
/* ------------------------------------------------------------------ */

describe('hasFourWheelDriveAnswer', () => {
  it('treats an explicit no as answered', () => {
    // The defect this exists to stop. A truthiness check reads `false` as
    // unanswered, so every member without a 4WD would be re-asked on every
    // app open forever and would learn to dismiss the prompt unread.
    expect(hasFourWheelDriveAnswer({ has_four_wheel_drive: false })).toBe(true)
  })

  it('treats an explicit yes as answered', () => {
    expect(hasFourWheelDriveAnswer({ has_four_wheel_drive: true })).toBe(true)
  })

  it('treats null and undefined as never asked', () => {
    expect(hasFourWheelDriveAnswer({ has_four_wheel_drive: null })).toBe(false)
    expect(hasFourWheelDriveAnswer({})).toBe(false)
    expect(hasFourWheelDriveAnswer(null)).toBe(false)
    expect(hasFourWheelDriveAnswer(undefined)).toBe(false)
  })
})

describe('safetyGateHeading', () => {
  // The heading has to name what the body actually shows. The gate can open
  // on any one of four fields, so each single-field case gets its own
  // heading and anything plural falls through to the generic one.
  it('names the single field being asked', () => {
    expect(safetyGateHeading({ dietary: false, medical: false, emergency: true })).toBe('Who should we call in an emergency?')
    expect(safetyGateHeading({ dietary: false, medical: true, emergency: false })).toBe('Any medical needs or allergies?')
    expect(safetyGateHeading({ dietary: true, medical: false, emergency: false })).toBe('Any dietary requirements?')
    expect(safetyGateHeading({ dietary: false, medical: false, emergency: false, fourWheelDrive: true }))
      .toBe('Do you have a four-wheel drive?')
  })

  it('goes generic once more than one field is shown', () => {
    expect(safetyGateHeading({ dietary: true, medical: false, emergency: false, fourWheelDrive: true }))
      .toBe('A couple of details for your event')
  })

  it('does not call a 4WD-only gate a dietary one', () => {
    // Before fourWheelDrive was counted, a gate open on 4WD alone fell
    // through to the dietary heading over a body with no dietary field,
    // which is the exact shape that made the emergency-only gate read as
    // broken in August.
    expect(safetyGateHeading({ dietary: false, medical: false, emergency: false, fourWheelDrive: true }))
      .not.toBe('Any dietary requirements?')
  })
})

/* ------------------------------------------------------------------ */
/*  Intake-surface coverage                                            */
/*                                                                     */
/*  The set has drifted THREE times by a surface being missed rather   */
/*  than a rule being wrong: 65646d56 added the emergency contact to   */
/*  two of three surfaces, campout-type.tsx silently dropped three     */
/*  fields while type-checking clean, and the app-open backstop        */
/*  filtered organiser holds out of its own eligibility. So the guard  */
/*  is a source scan of the surfaces themselves, not of the rule.      */
/* ------------------------------------------------------------------ */

describe('every signed-in intake surface asks the whole set', () => {
  const ROOT = path.resolve(__dirname, '../..')

  // The three points a SIGNED-IN member can be asked. The guest path is
  // deliberately absent: a guest has no profile row to write to, and their
  // 4WD is collected by the organiser-authored per-event question instead.
  const SURFACES = [
    'src/pages/onboarding/steps/step-safety.tsx',
    'src/components/campout-requirements-modal.tsx',
    'src/components/dietary-gate.tsx',
  ]

  /* CONSOLIDATION 2026-09-06 (1.F4 + 4.F1). The two gate surfaces no longer
     hold the field set or the write themselves: both now render
     SafetyRequirementsFields and persist through safetyProfileUpdates, so the
     literals this walk used to find in each file live in ONE module each.

     This is a NARROWING, not a weakening, and it is the same move CA1 made to
     CALLER_GLOB. Before, three files each had to be caught doing the right
     thing separately. Now there is exactly one renderer and one writer that
     can be got wrong, plus a routing assertion per surface: a gate that goes
     back to hand-rolling the form stops importing the shared component and
     fails here immediately. The onboarding surfaces are NOT part of the
     extraction and keep their original assertions verbatim. */

  const SHARED_FIELDS = 'src/components/safety-requirements-fields.tsx'
  const SHARED_LOGIC = 'src/lib/safety-requirements.ts'

  // The gates route; onboarding still owns its own field, so it is asserted
  // directly the way it always was.
  const ROUTED_SURFACES = [
    'src/components/campout-requirements-modal.tsx',
    'src/components/dietary-gate.tsx',
  ]

  it('the one shared field set renders the shared 4WD control', () => {
    const body = fs.readFileSync(path.join(ROOT, SHARED_FIELDS), 'utf8')
    expect(body).toContain('FourWheelDriveField')
  })

  it('the onboarding step still renders the shared 4WD control itself', () => {
    const body = fs.readFileSync(path.join(ROOT, 'src/pages/onboarding/steps/step-safety.tsx'), 'utf8')
    expect(body).toContain('FourWheelDriveField')
  })

  it.each(ROUTED_SURFACES)('%s renders the shared field set rather than its own', (file) => {
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(body).toContain('<SafetyRequirementsFields')
  })

  it.each([...SURFACES, SHARED_FIELDS])('%s does not hand-roll the 4WD control', (file) => {
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    // A surface that builds its own yes/no is how the copy, the help text and
    // the null-vs-false handling drift apart across three screens.
    expect(body).not.toContain('four-wheel drive?</label>')
  })

  it.each(ROUTED_SURFACES)('%s reads the shared answered-predicate', (file) => {
    // The two GATES must decide "already answered" through the shared
    // predicate. The onboarding step is exempt: it asks unconditionally and
    // holds no opinion about whether the answer already exists.
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(body).toMatch(/hasFourWheelDriveAnswer|needFourWheelDrive/)
  })

  // THE GUEST PATH MUST STAY 4WD-FREE, and the extraction is what makes this
  // worth asserting: before it, the guest modal could not have rendered a 4WD
  // control without someone writing one. Now it renders the same component the
  // gates do and is one flipped flag away from asking a guest a question we
  // have nowhere to store. A guest has no profile row; their 4WD is collected
  // by the organiser-authored per-event question instead.
  it('the guest modal asks the shared field set for no four-wheel drive', () => {
    const body = fs.readFileSync(path.join(ROOT, 'src/components/campout-guest-requirements-modal.tsx'), 'utf8')
    expect(body).toMatch(/fourWheelDrive:\s*false/)
    expect(body).not.toMatch(/fourWheelDrive:\s*true/)
  })

  // Where each surface's answer is actually PERSISTED. The onboarding step is
  // a controlled input that lifts its value; the single write for the whole
  // flow lives in onboarding.tsx, so that is the file the guard must read.
  // Naming the writer rather than the renderer is the point: a surface can
  // render the field perfectly and still throw the answer away, which is
  // precisely what campout-type.tsx did with three fields on 2026-08-28.
  const WRITERS = [
    'src/pages/onboarding/onboarding.tsx',
    SHARED_LOGIC,
  ]

  it.each(WRITERS)('%s writes the answer to the profile column', (file) => {
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(body).toContain('has_four_wheel_drive')
  })

  it.each(ROUTED_SURFACES)('%s persists through the shared updates builder', (file) => {
    // The gates no longer hand-build the profile patch. If one starts again,
    // it stops calling this and the drift is back.
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(body).toContain('safetyProfileUpdates(')
  })

  it.each(WRITERS)('%s does not launder a null answer into a false one', (file) => {
    // `false` is a real answer and `null` means never asked. A writer that
    // coerces (`?? false`, `!!value`, `Boolean(...)`) permanently answers "no
    // 4WD" for someone who skipped, and no later gate can ever tell.
    const body = fs.readFileSync(path.join(ROOT, file), 'utf8')
    expect(body).not.toMatch(/has_four_wheel_drive\s*[:=]\s*(!!|Boolean\(|.*\?\?\s*false)/)
  })
})


/* ------------------------------------------------------------------ */
/*  Which EVENTS the safety set is asked for                           */
/*                                                                     */
/*  Added 2026-09-06. Every enforcement surface keyed on is_ticketed    */
/*  alone, which reads "takes payment" as "carries duty of care".       */
/*  Measured on production the same day, across every upcoming event:   */
/*  2 of 66 live registrants on ticketed events had no reachable        */
/*  emergency contact, against 264 of 471 on non-ticketed ones. A bare  */
/*  registration is the ONLY way into a non-ticketed event             */
/*  (useRegisterForEvent rejects ticketed ones), and that path had no   */
/*  gate at all, so nothing anywhere asked those 264 people.           */
/* ------------------------------------------------------------------ */

describe('eventRequiresSafetySet', () => {
  it('requires the set for any ticketed event', () => {
    expect(eventRequiresSafetySet({ is_ticketed: true, activity_type: 'clean_up' })).toBe(true)
  })

  // The defect. A camp-out that does not sell tickets is the most remote
  // thing Co-Exist runs and was the one case nothing asked.
  it('requires the set for a camp-out even when it is not ticketed', () => {
    expect(eventRequiresSafetySet({ is_ticketed: false, activity_type: 'camp_out' })).toBe(true)
  })

  // The deliberate limit. Widening to every event puts a blocking modal in
  // front of 264 people registered for two-hour clean-ups and hikes; that is
  // Co-Exist's product call, tracked on status_board d87e8024, not a fix to
  // make unilaterally. If this test is changed, that decision was taken.
  it('does NOT require the set for an ordinary non-ticketed activity', () => {
    expect(eventRequiresSafetySet({ is_ticketed: false, activity_type: 'clean_up' })).toBe(false)
    expect(eventRequiresSafetySet({ is_ticketed: false, activity_type: 'nature_hike' })).toBe(false)
    expect(eventRequiresSafetySet({ is_ticketed: false, activity_type: 'ecosystem_restoration' })).toBe(false)
  })

  it('treats a missing or unknown event as not requiring it', () => {
    expect(eventRequiresSafetySet(null)).toBe(false)
    expect(eventRequiresSafetySet(undefined)).toBe(false)
    expect(eventRequiresSafetySet({})).toBe(false)
    expect(eventRequiresSafetySet({ is_ticketed: null, activity_type: null })).toBe(false)
  })
})

describe('SAFETY_SET_EVENT_OR_FILTER', () => {
  // The predicate and the query that decides who is even CONSIDERED must
  // agree. They live in two languages, so this pins the translation: every
  // disjunct of the filter is a case the predicate answers true for.
  it('encodes exactly the same rule as the predicate', () => {
    const disjuncts = SAFETY_SET_EVENT_OR_FILTER.split(',')
    expect(disjuncts).toContain('is_ticketed.eq.true')
    expect(disjuncts).toContain('activity_type.eq.camp_out')
    expect(disjuncts).toHaveLength(2)
    for (const d of disjuncts) {
      const [column, , value] = d.split('.')
      const event = column === 'is_ticketed'
        ? { is_ticketed: true, activity_type: 'clean_up' }
        : { is_ticketed: false, activity_type: value }
      expect(eventRequiresSafetySet(event)).toBe(true)
    }
  })
})

/* ------------------------------------------------------------------ */
/*  Every seat-taking entry point passes the gate                      */
/*                                                                     */
/*  The gate TypeScript cannot be, in the same shape as the guest       */
/*  checkout scan above. Three RSVP buttons existed in event-detail and */
/*  one of them (the invited "Accept & Register") called the register    */
/*  mutation directly, so a gate added to the other two would have      */
/*  looked complete and left a hole. The rule is that the page's own    */
/*  register mutation is invoked from exactly one place.               */
/* ------------------------------------------------------------------ */

describe('registration entry points', () => {
  const ROOT = path.resolve(__dirname, '../..')
  const EVENT_DETAIL = path.join(ROOT, 'src/pages/events/event-detail.tsx')

  function body(): string {
    return fs.readFileSync(EVENT_DETAIL, 'utf8')
  }

  it('invokes the register mutation from exactly one place', () => {
    const calls = body().match(/registerMutation\.mutate\(/g) ?? []
    expect(calls).toHaveLength(1)
  })

  it('makes that one call site the gated helper, not a button handler', () => {
    // doRegister is the only caller, and handleRegister is the only thing that
    // reaches it from the UI. A button wired straight to registerMutation is
    // what this guards against.
    const src = body()
    expect(src).toMatch(/const doRegister = useCallback\(\(asWaitlist: boolean\) => \{/)
    expect(src).toMatch(/if \(user && registrationBlocked\) \{/)
    expect(src).not.toMatch(/onClick=\{\(\) => registerMutation\.mutate/)
  })

  it('re-arms the app-open backstop when a seat is taken', () => {
    // A gate that only re-evaluates on the next app open never reaches
    // someone who does not open the app again, which is how three Wild
    // Mountains ticket-holders reached the campsite un-asked.
    const hook = fs.readFileSync(path.join(ROOT, 'src/hooks/use-events.ts'), 'utf8')
    expect(hook).toContain('DIETARY_GATE_QUERY_KEY')
  })
})

/* ------------------------------------------------------------------ */
/*  Seat-taking writes are enumerated, not assumed                     */
/*                                                                     */
/*  Added 2026-09-06 by the lane C1 verifier. The guard above          */
/*  ("registration entry points") reads ONE file and counts calls to   */
/*  registerMutation. A handler that writes event_registrations        */
/*  directly is invisible to it by construction, and one did:          */
/*  chat-message-list.tsx upserted status 'registered' from the chat   */
/*  invite "Going" button, which is the primary way a camp-out invite  */
/*  is accepted. The 2026-09-06 fix funnelled the three RSVP entry     */
/*  points inside event-detail.tsx and this fourth one, in another     */
/*  file, kept taking seats with no surface that could ask.            */
/*                                                                     */
/*  So enumerate the writes instead of watching one call site: every   */
/*  file that can put a row into event_registrations must be listed    */
/*  here with a reason it is safe. A new raw write fails this until    */
/*  someone gates it or consciously allowlists it.                     */
/* ------------------------------------------------------------------ */
describe('every write that can take a seat is enumerated and reasoned', () => {
  const ROOT = path.resolve(__dirname, '../..')

  // The first method chained onto .from('event_registrations') is what the
  // statement does. Matching the chain rather than scanning a byte window
  // means a read followed by an unrelated insert cannot read as a write.
  const WRITE_METHODS = ['insert', 'upsert', 'update']

  function seatWriters(): string[] {
    const found = new Set<string>()
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        // This file names the table in order to talk about it. Scanning the
        // test tree would make the guard discover itself.
        if (entry.isDirectory()) { if (entry.name !== 'test') walk(full) }
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          const body = fs.readFileSync(full, 'utf8')
          const re = /\.from\('event_registrations'\)\s*\.\s*(\w+)\(/g
          let m: RegExpExecArray | null
          while ((m = re.exec(body))) {
            if (WRITE_METHODS.includes(m[1])) {
              found.add(path.relative(ROOT, full).split(path.sep).join('/'))
            }
          }
        }
      }
    }
    walk(path.join(ROOT, 'src'))
    return [...found].sort()
  }

  // Why each of these is allowed to put someone in the going set.
  const ALLOWED: Record<string, string> = {
    'src/hooks/use-events.ts':
      'the gated useRegisterForEvent mutation, plus waitlist promotion of someone who already passed the gate to be waitlisted, plus bulk invite which writes status invited and is not a seat',
    'src/hooks/use-event-tickets.ts':
      'registration derived from a ticket that has already been bought, and the pre-checkout gate ran before the purchase',
    'src/pages/chat/chat-message-list.tsx':
      'routes a ticketed or safety-set event to the event page instead of upserting, and refuses to write while the event is still loading',
    'src/pages/onboarding/steps/step-first-event.tsx':
      'lists only events that need no safety set, so its one-tap RSVP cannot reach one',
    'src/pages/events/event-day.tsx':
      'a leader adding someone in front of them on the day and marking them attended, not a self-serve seat; capture at check-in is the open follow-up on status_board d87e8024',
    'src/pages/events/check-in.tsx':
      'check-in of someone already holding a seat, and check-in-form.tsx requires an emergency contact before it will complete',
    'src/lib/offline-sync.ts':
      'replay of check-in actions already taken while offline, never a new seat decision',
    'src/pages/admin/dev-tools.tsx':
      'admin dev tooling, not a member-reachable surface',
  }

  it('finds the seat-taking writes it is meant to be guarding', () => {
    // Without this the walk could silently break and every assertion below
    // would pass vacuously over an empty list.
    const writers = seatWriters()
    expect(writers.length).toBeGreaterThan(0)
    // The two the 2026-09-06 verifier fixed must both still be discovered,
    // so a regression that removes the gate is caught rather than the file
    // simply dropping off the list.
    expect(writers).toContain('src/pages/chat/chat-message-list.tsx')
    expect(writers).toContain('src/pages/onboarding/steps/step-first-event.tsx')
  })

  it.each(seatWriters())('%s is a known seat-taking path with a stated reason', (file) => {
    expect(Object.keys(ALLOWED)).toContain(file)
    expect(ALLOWED[file].length).toBeGreaterThan(20)
  })

  it('the chat RSVP decides on the shared predicate, not on is_ticketed alone', () => {
    const body = fs.readFileSync(path.join(ROOT, 'src/pages/chat/chat-message-list.tsx'), 'utf8')
    expect(body).toContain('eventRequiresSafetySet(eventDetail)')
    // The pre-fix shape: one branch keyed on is_ticketed, so every
    // non-ticketed event fell through to the raw upsert below it.
    expect(body).not.toMatch(/isEventType && eventId && eventDetail\?\.is_ticketed/)
  })

  it('the chat RSVP will not take a seat before it knows what the event is', () => {
    const body = fs.readFileSync(path.join(ROOT, 'src/pages/chat/chat-message-list.tsx'), 'utf8')
    // eventDetail undefined and a raw upsert below is a seat taken before
    // either the ticket question or the safety question could be asked.
    expect(body).toMatch(/if \(!eventDetail\) \{/)
  })

  it('the onboarding one-tap list cannot offer an event that needs the safety set', () => {
    const body = fs.readFileSync(path.join(ROOT, 'src/pages/onboarding/steps/step-first-event.tsx'), 'utf8')
    expect(body).toContain("neq('activity_type', CAMPOUT_ACTIVITY_TYPE)")
  })
})
