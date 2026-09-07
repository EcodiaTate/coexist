import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  cheapestActiveTicketTypeByEvent,
  type ActiveTicketTypeRow,
} from '@/lib/campout-groups'

/* ------------------------------------------------------------------ */
/*  CA3 finding 1.F7. One cheapest-active-tier reducer.                */
/*                                                                     */
/*  The /campouts index and the /campouts/:type page each ran the same  */
/*  fetch-then-compare loop. lib/campout-groups.ts drives both public   */
/*  marketing surfaces and had ZERO test coverage before this file      */
/*  (`grep -rln "campout-groups" src/test` -> 0 hits), which is the      */
/*  reason a price shown to a logged-out visitor was never asserted.    */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

const row = (event_id: string, id: string, price_cents: number): ActiveTicketTypeRow =>
  ({ event_id, id, price_cents })

describe('cheapestActiveTicketTypeByEvent', () => {
  it('picks the cheapest tier for each event independently', () => {
    const out = cheapestActiveTicketTypeByEvent([
      row('e1', 't1', 9000),
      row('e1', 't2', 4500),
      row('e2', 't3', 12000),
      row('e1', 't4', 7000),
      row('e2', 't5', 30000),
    ])
    expect(out.e1).toEqual({ id: 't2', price_cents: 4500 })
    expect(out.e2).toEqual({ id: 't3', price_cents: 12000 })
  })

  it('returns the winning tier id, which is what the type page books against', () => {
    // The index only needs the price; the type page threads this id into its
    // booking link. Returning both is why one helper can serve both pages.
    expect(cheapestActiveTicketTypeByEvent([row('e1', 'cheap', 100), row('e1', 'dear', 200)]).e1.id)
      .toBe('cheap')
  })

  it('keeps the FIRST tier on a price tie, matching both prior copies', () => {
    // Both copies compared with strictly-less-than. Pinned because switching
    // to <= is a one-character change that silently reorders which tier a
    // visitor is sent to when two are priced the same.
    const out = cheapestActiveTicketTypeByEvent([row('e1', 'first', 5000), row('e1', 'second', 5000)])
    expect(out.e1.id).toBe('first')
  })

  it('handles a free tier without treating zero as missing', () => {
    // The obvious wrong implementation is a falsy check on the running
    // minimum, which reads 0 as "nothing yet" and lets a paid tier win.
    const out = cheapestActiveTicketTypeByEvent([row('e1', 'free', 0), row('e1', 'paid', 2500)])
    expect(out.e1).toEqual({ id: 'free', price_cents: 0 })
  })

  it('returns an empty map for empty, null and undefined input', () => {
    expect(cheapestActiveTicketTypeByEvent([])).toEqual({})
    expect(cheapestActiveTicketTypeByEvent(null)).toEqual({})
    expect(cheapestActiveTicketTypeByEvent(undefined)).toEqual({})
  })

  it('does not invent an entry for an event with no active tier', () => {
    const out = cheapestActiveTicketTypeByEvent([row('e1', 't1', 100)])
    expect(Object.keys(out)).toEqual(['e1'])
    expect(out.e2).toBeUndefined()
  })
})

describe('both campout pages use the one reducer', () => {
  it('neither page rebuilds the compare-and-set loop', () => {
    for (const f of ['src/pages/public/campouts.tsx', 'src/pages/public/campout-type.tsx']) {
      const src = read(f)
      expect(src, `${f} should call the shared reducer`).toContain('cheapestActiveTicketTypeByEvent(')
      expect(src, `${f} should not compare price_cents by hand`).not.toMatch(/<\s*cur\.price_cents|<\s*priceByEvent\[/)
    }
  })

  it('both pages still fetch the tier id, which the reducer needs', () => {
    // The index used to select only event_id and price_cents. Adopting the
    // shared reducer means it must fetch the id too, and a select that
    // silently drops it would hand every event an undefined tier id.
    for (const f of ['src/pages/public/campouts.tsx', 'src/pages/public/campout-type.tsx']) {
      expect(read(f)).toContain("select('event_id, id, price_cents')")
    }
  })

  it('both pages still filter to active tiers only', () => {
    for (const f of ['src/pages/public/campouts.tsx', 'src/pages/public/campout-type.tsx']) {
      expect(read(f)).toContain(".eq('is_active', true)")
    }
  })
})
