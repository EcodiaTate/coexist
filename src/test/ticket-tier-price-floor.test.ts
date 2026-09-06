import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  validateTicketTierDrafts,
  buildTicketTypeRow,
  type TicketTypeDraft,
} from '@/hooks/use-event-tickets'

/* ------------------------------------------------------------------ */
/*  Ticket-tier price floor: the rule, and the wiring that reaches it   */
/*                                                                     */
/*  The defect (audit finding 2.F1, live at 0c9302db). useSaveTicketTypes */
/*  refuses a tier under A$0.50 because Stripe rejects unit_amount 0,    */
/*  and its only caller was edit-event.tsx. create-event.tsx built the   */
/*  same event_ticket_types rows and inserted them RAW, filtered on      */
/*  nothing but a non-blank name. So a $0 tier created through the       */
/*  wizard saved silently and dead-ended later at checkout, as a         */
/*  production incident rather than a form error, and the second insert  */
/*  (the recurring fan-out) copied it onto every occurrence in the       */
/*  series.                                                             */
/*                                                                     */
/*  The whole payment path had zero test coverage before this file:      */
/*  `grep -rl "TicketTierDraft\|useSaveTicketTypes" src/test` returned   */
/*  nothing.                                                            */
/* ------------------------------------------------------------------ */

function tier(overrides: Partial<TicketTypeDraft> = {}): TicketTypeDraft {
  return {
    id: 't-1',
    name: 'General Admission',
    description: '',
    price_dollars: '25',
    capacity: '',
    is_active: true,
    ...overrides,
  }
}

describe('validateTicketTierDrafts', () => {
  it('refuses a $0 tier, naming the tier so the leader knows which one', () => {
    expect(() => validateTicketTierDrafts([tier({ name: 'Free entry', price_dollars: '0' })]))
      .toThrowError(/"Free entry" needs a price of at least \$0\.50/)
  })

  // The wizard's price input starts empty, so this is the shape a leader
  // actually produces: add a tier, name it, publish without typing a price.
  it('refuses a tier whose price was never typed', () => {
    expect(() => validateTicketTierDrafts([tier({ price_dollars: '' })]))
      .toThrowError(/at least \$0\.50/)
  })

  // 49c rounds to 49 cents, one under the floor. Pins the boundary rather
  // than trusting that "0 is refused" implies the rule is right.
  it.each([
    ['0.49', true],
    ['0.50', false],
  ])('price %s refused=%s', (price, shouldThrow) => {
    const run = () => validateTicketTierDrafts([tier({ price_dollars: price })])
    if (shouldThrow) expect(run).toThrowError(/at least \$0\.50/)
    else expect(run()).toHaveLength(1)
  })

  it('refuses a priced tier with no name rather than dropping it silently', () => {
    expect(() => validateTicketTierDrafts([tier({ name: '  ', price_dollars: '25' })]))
      .toThrowError(/Give every ticket tier a name/)
  })

  // A row the leader added and never touched is not an error, it is noise.
  it('ignores a fully-blank row', () => {
    const rows = validateTicketTierDrafts([
      tier({ id: 'blank', name: '', description: '', price_dollars: '', capacity: '' }),
      tier(),
    ])
    expect(rows.map((t) => t.id)).toEqual(['t-1'])
  })

  it('returns a valid tier untouched', () => {
    expect(validateTicketTierDrafts([tier({ price_dollars: '25' })])).toHaveLength(1)
  })
})

describe('buildTicketTypeRow', () => {
  it('shapes dollars into the cents the ticket tables store', () => {
    expect(buildTicketTypeRow(tier({ price_dollars: '25.50', capacity: '40' }), 2)).toEqual({
      name: 'General Admission',
      description: null,
      price_cents: 2550,
      capacity: 40,
      sort_order: 2,
      is_active: true,
    })
  })

  it('leaves an unset capacity null rather than 0 (0 would read as sold out)', () => {
    expect(buildTicketTypeRow(tier({ capacity: '' }), 0).capacity).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  The wiring guard TypeScript cannot be.                             */
/*                                                                     */
/*  The rule above only protects anything if every write reaches it.    */
/*  A future hand-rolled `.from('event_ticket_types').insert({...})`    */
/*  compiles perfectly and re-opens the exact hole 2.F1 describes, so   */
/*  the guard is a source scan over the pages that write tiers.         */
/* ------------------------------------------------------------------ */

const ROOT = resolve(__dirname, '../..')
const readSrc = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')

describe('create-event reaches the shared validation', () => {
  const CREATE = 'src/pages/events/create-event.tsx'

  it('imports the shared validator instead of re-deriving a price rule', () => {
    const body = readSrc(CREATE)
    expect(body).toContain('validateTicketTierDrafts')
    expect(body).toContain('useSaveTicketTypes')
  })

  /* The ordering IS the fix. useSaveTicketTypes needs an event id, so it can
     only run after the event row exists; validating only there would refuse
     the tier AFTER publishing an event that then has no tickets on it. create
     validates first and returns, so a rejected tier leaves nothing behind. */
  it('validates tiers BEFORE it inserts the event row', () => {
    const body = readSrc(CREATE)
    const validateAt = body.indexOf('validateTicketTierDrafts(extra.ticket_tiers)')
    const insertAt = body.indexOf('await createEvent.mutateAsync(baseInsert)')
    expect(validateAt).toBeGreaterThan(-1)
    expect(insertAt).toBeGreaterThan(-1)
    expect(validateAt).toBeLessThan(insertAt)
  })

  /* The recurring fan-out was the second unguarded insert. It still bulk
     inserts (one round trip for N occurrences beats N hook calls), but it
     may only shape rows through the shared builder. */
  it('builds fanned-out series tiers with the shared row builder', () => {
    expect(readSrc(CREATE)).toContain('buildTicketTypeRow(t, idx)')
  })

  it('no longer hand-rolls a price_cents row anywhere', () => {
    // price_cents appears only inside buildTicketTypeRow now. A call site
    // computing it again is how the floor gets bypassed a third time.
    expect(readSrc(CREATE)).not.toContain('price_cents:')
  })
})

describe('every event_ticket_types write goes through the shared surface', () => {
  // Discovered rather than listed, so a brand-new write surface is covered
  // the day it is added.
  function writerFiles(): string[] {
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    const { join, relative, sep } = require('node:path') as typeof import('node:path')
    const found: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) { if (entry.name !== 'test') walk(full) }
        else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name)) {
          const body = readFileSync(full, 'utf8')
          if (/from\('event_ticket_types'\)[\s\S]{0,120}\.insert\(/.test(body)) {
            found.push(relative(ROOT, full).split(sep).join('/'))
          }
        }
      }
    }
    walk(resolve(ROOT, 'src'))
    return found.sort()
  }

  it('finds the writers it is meant to be guarding', () => {
    // If discovery breaks, every assertion below would pass vacuously.
    expect(writerFiles()).toEqual([
      'src/hooks/use-event-tickets.ts',
      'src/pages/events/create-event.tsx',
    ])
  })

  it.each(writerFiles())('%s builds its rows through buildTicketTypeRow', (file) => {
    expect(readSrc(file)).toContain('buildTicketTypeRow')
  })
})
