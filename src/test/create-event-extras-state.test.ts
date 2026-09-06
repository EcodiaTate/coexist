import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { INITIAL_EXTRAS, splitExtrasPatch, type EventExtras } from '@/hooks/use-event-form'

/* ------------------------------------------------------------------ */
/*  create-event's duplicate copy of EventExtras                       */
/*                                                                     */
/*  The defect (audit finding 2.F6, the structural root cause behind    */
/*  2.F1/2.F2/2.F11). use-event-form.ts owns EventExtras and exposes    */
/*  fields.extras + updateExtras for exactly this purpose; edit-event    */
/*  uses them. create-event redeclared all eight fields verbatim in its  */
/*  own CreateExtraFields and drove them through a second useState, so   */
/*  `grep -n "form.fields.extras" create-event.tsx` returned 0 and every */
/*  INITIAL_EXTRAS object the hook built for create was dead weight.     */
/*  That is why create kept re-deriving abstractions edit already had.   */
/*                                                                     */
/*  This is a no-behaviour-change refactor, so the test that matters is  */
/*  an equivalence proof, not a source scan: the merge-and-split that    */
/*  replaced the single useState must round-trip every field exactly.    */
/* ------------------------------------------------------------------ */

// The two halves, as create now models them.
const SHARED_KEYS = Object.keys(INITIAL_EXTRAS) as (keyof EventExtras)[]
const CREATE_ONLY_KEYS = [
  'selected_collective_ids',
  'is_recurring',
  'recurring_type',
  'recurring_count',
  'invite_collective',
  'is_ticketed',
  'ticket_tiers',
  'ticket_questions',
  'checkin_window_minutes',
] as const

/* THE REAL FUNCTION create-event calls, not a copy of it.
   A local reimplementation here passed while the page used truthiness instead
   of a key check: the test proved the copy right and said nothing about the
   shipped code. That is why splitExtrasPatch is exported from the hook. */
const splitPatch = (updates: Record<string, unknown>) =>
  splitExtrasPatch(updates as Partial<EventExtras>)

describe('the shared/create-only split covers the old shape exactly', () => {
  /* The union must equal the old CreateExtraFields. A key in NEITHER half is
     a field the wizard writes and nothing stores. */
  it('loses no field and invents none', () => {
    const union = [...SHARED_KEYS, ...CREATE_ONLY_KEYS].sort()
    expect(union).toEqual([
      'checkin_window_minutes', 'difficulty', 'invite_collective', 'is_recurring',
      'is_ticketed', 'meeting_point', 'meeting_spot_photo_url', 'partner_name',
      'recurring_count', 'recurring_type', 'selected_collective_ids', 'terrain',
      'ticket_questions', 'ticket_tiers', 'what_to_bring', 'what_to_wear',
      'wheelchair_access',
    ])
  })

  it('puts no key in both halves', () => {
    const overlap = (SHARED_KEYS as string[]).filter((k) => (CREATE_ONLY_KEYS as readonly string[]).includes(k))
    expect(overlap).toEqual([])
  })

  it('routes each of the eight shared fields to the form hook', () => {
    for (const key of SHARED_KEYS) {
      const { shared, local } = splitPatch({ [key]: 'x' })
      expect(Object.keys(shared)).toEqual([key])
      expect(local).toEqual({})
    }
  })

  it('keeps every create-only field local to the wizard', () => {
    for (const key of CREATE_ONLY_KEYS) {
      const { shared, local } = splitPatch({ [key]: 'x' })
      expect(Object.keys(local)).toEqual([key])
      expect(shared).toEqual({})
    }
  })

  /* Wizard steps patch several fields at once, and StepDetails patches across
     BOTH halves in one call. Dropping either side is a silent data loss. */
  it('splits a mixed patch without dropping either side', () => {
    const { shared, local } = splitPatch({
      what_to_bring: 'Water',
      terrain: 'Beach sand',
      checkin_window_minutes: 0,
      is_ticketed: true,
    })
    expect(shared).toEqual({ what_to_bring: 'Water', terrain: 'Beach sand' })
    expect(local).toEqual({ checkin_window_minutes: 0, is_ticketed: true })
  })

  /* A falsy value must still be written. `if (value)` instead of a key check
     is the classic version of this bug: it would silently refuse to clear a
     text field or turn a toggle off. */
  it('writes falsy values rather than skipping them', () => {
    const { shared, local } = splitPatch({
      wheelchair_access: false,
      what_to_bring: '',
      checkin_window_minutes: 0,
    })
    expect(shared).toEqual({ wheelchair_access: false, what_to_bring: '' })
    expect(local).toEqual({ checkin_window_minutes: 0 })
  })

  /* The merged view a step reads back: shared wins, because it is where the
     eight fields now live. */
  it('merges back into one object the wizard steps can read', () => {
    const merged = { ...{ is_ticketed: true }, ...{ ...INITIAL_EXTRAS, terrain: 'Bushland' } }
    expect(merged.terrain).toBe('Bushland')
    expect(merged.is_ticketed).toBe(true)
  })
})

const ROOT = resolve(__dirname, '../..')
const CREATE = readFileSync(resolve(ROOT, 'src/pages/events/create-event.tsx'), 'utf8')

describe('create-event consumes the hook it was ignoring', () => {
  it('reads and writes the hook extras instead of a second useState', () => {
    expect(CREATE).toContain('form.fields.extras')
    expect(CREATE).toContain('form.updateExtras')
  })

  it('no longer redeclares the eight shared fields', () => {
    // The old CreateExtraFields listed each of these. Any one of them
    // reappearing in a local interface means the copy is growing back.
    const localInterface = CREATE.slice(
      CREATE.indexOf('interface CreateOnlyFields {'),
      CREATE.indexOf('const INITIAL_CREATE_ONLY'),
    )
    for (const key of SHARED_KEYS) {
      expect(localInterface).not.toContain(`${key}:`)
    }
  })

  /* The payload used to re-list all eight fields, so a field added to
     EventExtras would have been silently dropped on create until someone
     remembered this call site. */
  it('writes the whole extras shape rather than a hand-listed subset', () => {
    expect(CREATE).toContain('event_extras: { ...form.fields.extras }')
  })

  /* The wizard keeps its own layout: these fields sit across three steps and
     create's difficulty control carries icons edit's does not. Rendering
     edit's single ExtrasFields block here would relocate two fields and
     downgrade a control, which is 2.F8/2.F9 territory, not this finding's. */
  it('leaves the wizard step layout alone', () => {
    for (const step of ['function StepLocation', 'function StepDetails', 'function StepPartner']) {
      expect(CREATE).toContain(step)
    }
    expect(CREATE).not.toContain('<ExtrasFields')
  })
})
