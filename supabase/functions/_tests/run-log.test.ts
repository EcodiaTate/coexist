// Unit tests for excel-sync run-log severity discipline (2026-09-09).
// Run: deno test supabase/functions/_tests/run-log.test.ts
//
// Every fixture line below is a VERBATIM shape taken from the live Co-Exist
// `excel_sync_runs` row 40b197ec-5a9e-41ae-84d9-e693ac301bc1 (run_at
// 2026-09-09 00:03:12Z), which recorded to_excel_error_count=44 on a run whose
// real failure count was 0. Ids are shortened but the prefixes, which are the
// only thing the classifier reads, are exact.
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { isRealError, note, realErrors } from '../_shared/run-log.ts'

// 41 of the 44 lines on that run. Filtered correctly since 1b7fe48c.
const SKIPPED_APPEND =
  'INFO Event 03a86787-7b44-45c7-a6ae-d09a49c6e118: skipped append (hasImpactData=false hasHappened=false)'

// The other 3. These are the lines this change fixes: a DELIBERATE duplicate
// skip that skippedDuplicates had already counted in its own column, but which
// counted a second time as a failure because nobody typed the INFO prefix.
const DUPE_SKIP =
  'Event 61a901b3-891d-4c34-b83e-803839a8f48c: skipped (matches Forms row signature perth|2026-05-16|whitfords nodes park clean up)'

// from-excel siblings of the same defect, each with its own counter column
// (from_excel_skipped_no_collective, from_excel_skipped_legacy).
const NO_COLLECTIVE = 'Row 261 (Forms ID 231): no collective match for "Wild Mountains" - skipped'
const BAD_DATE = 'Row 88 (Forms ID 402): unparseable date "n/a" - skipped'

// Both genuine failures found in the 7 days to 2026-09-09, verbatim heads.
const GRAPH_502 =
  "Failed to update row 362 (2f21dc7d-9e9a-4d5e-9e17-6c48ce719c2f): Graph API PATCH /range(address='A362:AB362') failed (502) after retries"
const GRAPH_404 =
  "Failed to update row 314 (9b825239-b243-4a98-9553-a07f0811928b): Graph API PATCH /range(address='A314:AB314') failed (404) after retries"

Deno.test('note() marks a line informational so it is not counted', () => {
  const errors: string[] = []
  note(errors, 'Event abc: skipped (matches Forms row signature x|y|z)')
  assertEquals(errors.length, 1, 'the line is still written to the mixed log verbatim')
  assertEquals(errors[0].startsWith('INFO '), true)
  assertEquals(realErrors(errors), 0)
})

Deno.test('a plain push is counted, so the DEFAULT is loud', () => {
  // This is the property that keeps a future failure path from going silent:
  // an author who adds a genuine failure and forgets everything still gets it
  // counted, because only the informational case needs an explicit call.
  const errors: string[] = []
  errors.push(GRAPH_502)
  assertEquals(realErrors(errors), 1)
  assertEquals(isRealError(GRAPH_502), true)
})

Deno.test('reproduces the live 44-error run: 44 raw, 3 after 1b7fe48c, 0 after this fix', () => {
  // BEFORE any fix: to_excel_error_count was the raw array length.
  const asLogged = [...Array(41).fill(SKIPPED_APPEND), ...Array(3).fill(DUPE_SKIP)]
  assertEquals(asLogged.length, 44, 'matches the live to_excel_error_count of 44')

  // AFTER 1b7fe48c (INFO filter only): the 3 unprefixed dupe skips survived.
  assertEquals(realErrors(asLogged), 3, 'the residual defect this change closes')

  // AFTER this change: the dupe-skip site calls note(), so the run reads clean.
  const errors: string[] = []
  for (let i = 0; i < 41; i++) {
    note(errors, 'Event 03a86787-7b44-45c7-a6ae-d09a49c6e118: skipped append (hasImpactData=false hasHappened=false)')
  }
  for (let i = 0; i < 3; i++) {
    note(errors, 'Event 61a901b3-891d-4c34-b83e-803839a8f48c: skipped (matches Forms row signature perth|2026-05-16|whitfords nodes park clean up)')
  }
  assertEquals(realErrors(errors), 0, 'a healthy run must record zero errors')
  assertEquals(errors.length, 44, 'and must lose no telemetry doing it')
})

Deno.test('the from-excel deliberate skips stop counting too', () => {
  const errors: string[] = []
  note(errors, 'Row 261 (Forms ID 231): no collective match for "Wild Mountains" - skipped')
  note(errors, 'Row 88 (Forms ID 402): unparseable date "n/a" - skipped')
  assertEquals(realErrors(errors), 0)
  // and the un-noted forms of the same text would have been counted, which is
  // what the live rows show: 670 no-collective + 393 dupe skips over 7 days.
  assertEquals(realErrors([NO_COLLECTIVE, BAD_DATE]), 2)
})

Deno.test('a real failure is still counted when mixed in with 44 notes', () => {
  // The discriminating case. This is the run that must NOT read clean, and the
  // reason the counter matters: on 2026-09-07 exactly this shape occurred and
  // was invisible inside the noise.
  const errors: string[] = []
  for (let i = 0; i < 41; i++) note(errors, 'Event x: skipped append (hasImpactData=false hasHappened=false)')
  for (let i = 0; i < 3; i++) note(errors, 'Event y: skipped (matches Forms row signature a|b|c)')
  errors.push(GRAPH_502)
  errors.push(GRAPH_404)
  assertEquals(realErrors(errors), 2, 'both Graph failures surface out of 46 log lines')
})

Deno.test('realErrors tolerates null and undefined logs', () => {
  assertEquals(realErrors(undefined), 0)
  assertEquals(realErrors(null), 0)
  assertEquals(realErrors([]), 0)
})
