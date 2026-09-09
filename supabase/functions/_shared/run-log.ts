// Severity discipline for the excel-sync run log (2026-09-09).
//
// Each sync direction accumulates a single `errors: string[]`. That array is a
// MIXED log, not a failure list: deliberate skips, fallback resolutions that
// SUCCEEDED, and genuine failures all land in it, and the whole array is written
// verbatim to `excel_sync_runs.summary` so no telemetry is lost.
//
// The counter columns `to_excel_error_count` / `from_excel_error_count` must
// count ONLY genuine failures, because a counter that reads red on a healthy run
// is a counter nobody reads. Measured over the 7 days to 2026-09-09 on the live
// Co-Exist DB: 89,348 counted "errors" of which exactly 2 were real (a Graph API
// PATCH 502 on 2026-09-07 and a 404 on 2026-09-06). Signal to noise 1:44,673.
// Both real failures were invisible.
//
// That is not merely untidy. The EcodiaOS canary that watches this client
// (`backend/src/cron/coexistSyncHealth.js`, evalErrorSurge) alerts on a RELATIVE
// threshold, 7d_avg_per_run x 2 x 3. A phantom baseline of 191.73 errors per run
// set that threshold at 1150.4 against a recent-3 sum of 747, so 404 REAL
// failures inside 3 consecutive runs were needed before it would fire. With
// honest counters the same canary trips on 3.
//
// TWO RULES, and the split between them is the point:
//
//   note()       for anything DELIBERATE: a skip we chose, or a resolution that
//                succeeded through a fallback. Prefixes `INFO `.
//   errors.push() for an actual failure. Counted.
//
// The default is deliberately LOUD. realErrors() counts everything that is not
// `INFO `-prefixed, so a new failure path added by a future author is counted
// without them having to remember anything. Only the informational case needs an
// explicit call, and note() is what makes that intent visible in the code rather
// than hidden in a string literal.
//
// History, so the shape is not re-broken a third time: commit 1b7fe48c
// (2026-08-30) introduced the `INFO ` filter and fixed 41 of the 44 lines on a
// healthy run. The other 3 were Forms-signature duplicate skips whose author had
// not typed the prefix, so they kept counting as failures even though
// `skippedDuplicates` had ALREADY counted them in their own column. A convention
// an author must remember is a convention that decays; a helper is not.

/** Record a DELIBERATE, non-failure event in the mixed run log. */
export function note(errors: string[], msg: string): void {
  errors.push(`INFO ${msg}`)
}

/** True when a log line represents an actual failure rather than a note. */
export function isRealError(line: string): boolean {
  return !String(line).startsWith('INFO ')
}

/** Count only genuine failures in a mixed run log. */
export function realErrors(arr?: string[] | null): number {
  return (arr ?? []).filter(isRealError).length
}
