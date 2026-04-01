/**
 * Canonical impact data fetcher.
 *
 * Single source of truth for all event_impact queries across the app.
 * Every dashboard, hook, and page MUST go through fetchImpactRows() —
 * never query event_impact directly for aggregation purposes.
 *
 * Rules enforced here (and nowhere else):
 *  1. Baseline date: only rows from events on/after 2026-01-01 are returned
 *     from the live DB. Pre-baseline totals are covered by baseline constants.
 *  2. Legacy row exclusion: rows with notes LIKE 'Legacy import:%' are
 *     excluded from live queries (they are pre-baseline attendance records).
 *     Pass includeLegacy=true only when a collective needs all-time totals.
 *  3. Scope: collective and user scopes always use a two-step event-IDs-first
 *     approach — embedded PostgREST join filters are unreliable for scoping.
 *  4. Baseline constants: defined once here, re-exported for all consumers.
 */

import { supabase } from '@/lib/supabase'
import { IMPACT_SELECT_COLUMNS } from '@/lib/impact-metrics'

/* ------------------------------------------------------------------ */
/*  Baseline constants — single source of truth                        */
/* ------------------------------------------------------------------ */

export const IMPACT_BASELINE_DATE      = '2026-01-01'
export const BASELINE_TREES            = 35_000
export const BASELINE_RUBBISH_KG       = 4_794
export const BASELINE_EVENTS           = 340
export const BASELINE_ATTENDEES        = 5_500
export const BASELINE_HOURS            = 11_000

/* ------------------------------------------------------------------ */
/*  Scope types                                                        */
/* ------------------------------------------------------------------ */

export type ImpactTimeRange = 'all-time' | 'current-year' | 'custom'

export interface ImpactScope {
  /** Filter to a single collective. Omit for national/global. */
  collectiveId?: string
  /** Filter to a specific list of event IDs (e.g. events a user attended). */
  eventIds?: string[]
  timeRange?: ImpactTimeRange
  /** Custom start date (ISO string). Used when timeRange='custom'. */
  rangeStart?: string
  /**
   * Include legacy import rows (notes LIKE 'Legacy import:%').
   * Only set true for collective all-time queries that need pre-2026 attendance.
   * National queries never include legacy rows — the baseline constants cover them.
   */
  includeLegacy?: boolean
  /**
   * Skip the baseline date lower-bound filter.
   * Only set true for public-stats which intentionally sums all non-legacy rows.
   */
  skipBaselineDateFilter?: boolean
}

/* ------------------------------------------------------------------ */
/*  Row types                                                          */
/* ------------------------------------------------------------------ */

export type ImpactRow = Record<string, unknown>

export interface FetchImpactResult {
  /** Live (non-legacy) rows from post-baseline events */
  rows: ImpactRow[]
  /** Legacy import rows — only populated when includeLegacy=true */
  legacyRows: ImpactRow[]
  /** All event IDs that matched the scope (post-baseline) */
  eventIds: string[]
  /** Count of events that matched the scope */
  eventCount: number
}

/* ------------------------------------------------------------------ */
/*  Core fetcher                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fetch impact rows for the given scope.
 *
 * Step 1 — resolve event IDs for the scope (if needed).
 * Step 2 — fetch event_impact rows scoped to those IDs.
 *
 * Returns live rows and optionally legacy rows separately so callers
 * can combine them or keep them apart as needed.
 */
export async function fetchImpactRows(scope: ImpactScope = {}): Promise<FetchImpactResult> {
  const {
    collectiveId,
    eventIds: providedEventIds,
    timeRange = 'all-time',
    rangeStart,
    includeLegacy = false,
    skipBaselineDateFilter = false,
  } = scope

  const now = new Date().toISOString()
  const baselineDate = new Date(IMPACT_BASELINE_DATE).toISOString()
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()

  // Determine the effective lower date bound for event_start.
  // When includeLegacy=true we need pre-2026 events (backfill + legacy imports),
  // so the baseline date floor must not apply to the ID resolution query.
  let effectiveStart: string | null
  if (includeLegacy) {
    // All-time collective view: no lower bound — pick up everything
    effectiveStart = null
  } else if (skipBaselineDateFilter) {
    effectiveStart = null
  } else if (timeRange === 'current-year') {
    effectiveStart = yearStart > baselineDate ? yearStart : baselineDate
  } else if (timeRange === 'custom' && rangeStart) {
    effectiveStart = rangeStart
  } else {
    // all-time national/admin: baseline date is the floor (pre-2026 covered by constants)
    effectiveStart = baselineDate
  }

  // ── Step 1: resolve event IDs ────────────────────────────────────────

  let resolvedEventIds: string[]
  let eventCount: number

  if (providedEventIds) {
    // Caller already knows the event IDs (e.g. user's attended events)
    resolvedEventIds = providedEventIds
    eventCount = providedEventIds.length
  } else if (collectiveId || effectiveStart) {
    // Resolve from events table — always reliable, avoids embedded join bugs.
    // When including legacy rows we need IDs from ALL events (including backfill/import
    // which may be 'draft'), but eventCount should only reflect real published/completed events.
    const buildQuery = (statusFilter: boolean) => {
      let q = supabase
        .from('events')
        .select('id', { count: 'exact' })
        .lt('date_start', now)
      if (statusFilter) q = q.in('status', ['published', 'completed'])
      if (collectiveId) q = q.eq('collective_id', collectiveId)
      if (effectiveStart) q = q.gte('date_start', effectiveStart)
      return q
    }

    if (includeLegacy) {
      // Fetch all event IDs (no status filter) for impact row scoping,
      // plus a count of real events for display purposes.
      const [allEventsRes, realEventsRes] = await Promise.all([
        buildQuery(false),
        buildQuery(true),
      ])
      if (allEventsRes.error) throw allEventsRes.error
      resolvedEventIds = (allEventsRes.data ?? []).map((e) => e.id)
      eventCount = realEventsRes.count ?? 0
    } else {
      const eventsRes = await buildQuery(true)
      if (eventsRes.error) throw eventsRes.error
      resolvedEventIds = (eventsRes.data ?? []).map((e) => e.id)
      eventCount = eventsRes.count ?? 0
    }
  } else {
    // National / global — no event ID pre-filter needed; date filter applied via
    // a separate events query in step 2 approach. We still need IDs to avoid
    // pulling 999_backfill rows. Fetch all post-baseline event IDs.
    const eventsRes = await supabase
      .from('events')
      .select('id', { count: 'exact' })
      .lt('date_start', now)
      .gte('date_start', baselineDate)
    if (eventsRes.error) throw eventsRes.error

    resolvedEventIds = (eventsRes.data ?? []).map((e) => e.id)
    eventCount = eventsRes.count ?? 0
  }

  // ── Step 2: fetch impact rows ────────────────────────────────────────

  if (resolvedEventIds.length === 0) {
    return { rows: [], legacyRows: [], eventIds: [], eventCount: 0 }
  }

  // Build the base query scoped to the resolved event IDs.
  // Split into chunks if necessary to stay under PostgREST URL limits.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchChunked = async (filter: (q: any) => any) => {
    const CHUNK = 200
    const allRows: ImpactRow[] = []
    for (let i = 0; i < resolvedEventIds.length; i += CHUNK) {
      const chunk = resolvedEventIds.slice(i, i + CHUNK)
      const q = filter(
        supabase
          .from('event_impact')
          .select(IMPACT_SELECT_COLUMNS)
          .in('event_id', chunk)
          .range(0, 9999)
      )
      const { data, error } = await q
      if (error) throw error
      allRows.push(...((data ?? []) as ImpactRow[]))
    }
    return allRows
  }

  // Live rows: exclude legacy imports
  const liveRows = await fetchChunked((q) =>
    q.or('notes.is.null,notes.not.like.Legacy import:%')
  )

  // Legacy rows: only if requested
  let legacyRows: ImpactRow[] = []
  if (includeLegacy) {
    legacyRows = await fetchChunked((q) =>
      q.like('notes', 'Legacy import:%')
    )
  }

  return {
    rows: liveRows,
    legacyRows,
    eventIds: resolvedEventIds,
    eventCount,
  }
}

/* ------------------------------------------------------------------ */
/*  Baseline helpers                                                   */
/* ------------------------------------------------------------------ */

/** Load baseline numbers from app_settings (used by national/admin hooks). */
export async function fetchBaselineSettings(): Promise<{
  attendees: number
  events: number
  trees: number
  rubbishKg: number
  hours: number
}> {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', [
      'impact_baseline_attendees',
      'impact_baseline_events',
      'impact_baseline_trees',
      'impact_baseline_rubbish_kg',
      'impact_baseline_hours',
    ])

  const m: Record<string, number> = {}
  for (const row of data ?? []) {
    m[row.key] = (row.value as { count?: number })?.count ?? 0
  }

  return {
    attendees: m['impact_baseline_attendees'] ?? BASELINE_ATTENDEES,
    events:    m['impact_baseline_events']    ?? BASELINE_EVENTS,
    trees:     m['impact_baseline_trees']     ?? BASELINE_TREES,
    rubbishKg: m['impact_baseline_rubbish_kg'] ?? BASELINE_RUBBISH_KG,
    hours:     m['impact_baseline_hours']     ?? BASELINE_HOURS,
  }
}
