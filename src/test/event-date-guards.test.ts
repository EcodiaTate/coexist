import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { validateEventDates } from '@/hooks/use-event-form'

/* ------------------------------------------------------------------ */
/*  Date-order and past-date guards, and the draft/recurring block     */
/*                                                                     */
/*  The defect (audit finding 2.F4, live at 0c9302db). create-event     */
/*  blocked a past start and an end at or before the start;             */
/*  edit-event's handleSave and handlePublish checked NEITHER, and no    */
/*  DB CHECK backs either rule. Swapping which picker you filled first   */
/*  persisted an event that "ends" before it begins, which isPastEvent   */
/*  and every capacity/attendance surface reading date_end assume        */
/*  cannot happen. `grep -rl isDateInPast src/test` returned nothing.    */
/* ------------------------------------------------------------------ */

const H = 60 * 60 * 1000
// Floating-local: the app stores the host's wall-clock AS UTC, so tests build
// the same shape wallClockNow() returns rather than raw local Dates.
const wallClock = (offsetMs: number) =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60_000 + offsetMs)

describe('validateEventDates', () => {
  it('passes a normal future event', () => {
    expect(validateEventDates({ dateStart: wallClock(24 * H), dateEnd: wallClock(26 * H) })).toBeNull()
  })

  it('refuses an end before the start', () => {
    expect(validateEventDates({ dateStart: wallClock(26 * H), dateEnd: wallClock(24 * H) }))
      .toBe('End date must be after start date')
  })

  // A zero-length event is not a real event and reads as ended-at-creation.
  it('refuses an end exactly equal to the start', () => {
    const t = wallClock(24 * H)
    expect(validateEventDates({ dateStart: t, dateEnd: new Date(t.getTime()) }))
      .toBe('End date must be after start date')
  })

  it('refuses a past start on create, where every start is new', () => {
    expect(validateEventDates({ dateStart: wallClock(-2 * H), dateEnd: null }))
      .toBe('Start date cannot be in the past')
  })

  it('accepts a start later today, which is not the past', () => {
    expect(validateEventDates({ dateStart: wallClock(2 * H), dateEnd: null })).toBeNull()
  })

  /* The edit-side asymmetry, and the reason this is not a verbatim copy of
     create's guard. An event that has already started has a stored start in
     the past by definition. Refusing it would make every in-progress or
     finished event permanently uneditable: no fixing the address on the day,
     no correcting a description afterwards. */
  it('lets an already-started event be edited without moving its start', () => {
    const stored = wallClock(-3 * H)
    expect(validateEventDates({
      dateStart: new Date(stored.getTime()),
      dateEnd: wallClock(3 * H),
      storedStart: stored,
    })).toBeNull()
  })

  it('still refuses MOVING a start back into the past', () => {
    expect(validateEventDates({
      dateStart: wallClock(-2 * H),
      dateEnd: null,
      storedStart: wallClock(48 * H),
    })).toBe('Start date cannot be in the past')
  })

  // Day-of mode exists to adjust times on the day; the ordering rule stays.
  it('skips the past check in day-of mode but keeps the ordering rule', () => {
    expect(validateEventDates({ dateStart: wallClock(-2 * H), dateEnd: null, skipPastCheck: true }))
      .toBeNull()
    expect(validateEventDates({
      dateStart: wallClock(-2 * H),
      dateEnd: wallClock(-4 * H),
      skipPastCheck: true,
    })).toBe('End date must be after start date')
  })

  it('says nothing about an unset start (the form gates that separately)', () => {
    expect(validateEventDates({ dateStart: null, dateEnd: wallClock(H) })).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/*  Wiring: the rule protects nothing if a save path skips it          */
/* ------------------------------------------------------------------ */

const ROOT = resolve(__dirname, '../..')
const readSrc = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf8')

describe('both event forms run the shared date rule', () => {
  it.each([
    ['src/pages/events/create-event.tsx'],
    ['src/pages/events/edit-event.tsx'],
  ])('%s calls validateEventDates', (page) => {
    expect(readSrc(page)).toContain('validateEventDates({')
  })

  /* handleSave and handlePublish are two independent write paths in edit and
     the audit found BOTH unguarded. Guarding one is the same bug with a
     smaller surface. */
  it('edit guards both of its write paths, not just one', () => {
    const body = readSrc('src/pages/events/edit-event.tsx')
    expect(body.match(/validateEventDates\(\{/g) ?? []).toHaveLength(2)
  })

  it('edit compares against the stored start so a started event stays editable', () => {
    const body = readSrc('src/pages/events/edit-event.tsx')
    expect(body).toContain('storedStartRef.current = new Date(event.date_start)')
    expect(body).toContain('storedStart: storedStartRef.current')
  })

  it('neither page still hand-rolls the comparison it used to', () => {
    // create's inline `date_end <= date_start` is what edit failed to copy.
    // Leaving a second copy behind is how the two drift apart again.
    for (const page of ['src/pages/events/create-event.tsx', 'src/pages/events/edit-event.tsx']) {
      expect(readSrc(page)).not.toContain('Start date cannot be in the past')
      expect(readSrc(page)).not.toContain('End date must be after start date')
    }
  })
})

/* ------------------------------------------------------------------ */
/*  2.F5: a drafted recurring series lost its recurrence in silence    */
/* ------------------------------------------------------------------ */

describe('recurring series cannot be silently drafted away', () => {
  const CREATE = 'src/pages/events/create-event.tsx'

  /* The fan-out is gated on !isDraft and the events table has no recurrence
     columns, so a drafted series left NO trace that N occurrences were wanted,
     and edit-event has no recurring UI to recover the intent. Blocking is the
     honest half; persisting the intent needs a schema change (deferred). */
  it('refuses draft-save while a repeat is configured', () => {
    const body = readSrc(CREATE)
    expect(body).toContain('if (isDraft && extra.is_recurring && extra.recurring_count > 1)')
    expect(body).toMatch(/A recurring series cannot be saved as a draft/)
  })

  it('tells the user both ways out rather than only refusing', () => {
    expect(readSrc(CREATE)).toMatch(/Publish it now, or turn off Repeat/)
  })

  /* The block must sit BEFORE the event insert, or it refuses after having
     already written the single row it was preventing. */
  it('blocks before anything is written', () => {
    const body = readSrc(CREATE)
    const blockAt = body.indexOf('if (isDraft && extra.is_recurring')
    const insertAt = body.indexOf('await createEvent.mutateAsync(baseInsert)')
    expect(blockAt).toBeGreaterThan(-1)
    expect(blockAt).toBeLessThan(insertAt)
  })

  it('leaves a non-recurring draft alone', () => {
    // The guard is conjunctive on is_recurring, so an ordinary draft-save is
    // untouched. Pinned because widening it would break the common path.
    expect(readSrc(CREATE)).not.toContain('if (isDraft) {\n        toastApi.error(')
  })
})
