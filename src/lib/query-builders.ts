import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Status filter constants                                             */
/* ------------------------------------------------------------------ */

/**
 * Canonical status filter groups used in Supabase `.in('status', ...)` queries.
 * Centralised here so changes propagate everywhere without grep-and-replace.
 */
export const STATUS_FILTERS = {
  events: {
    /** Events visible to participants (published or already completed) */
    ACTIVE: ['published', 'completed'] as const,
    /** Events not yet open to the public */
    PENDING: ['draft', 'scheduled'] as const,
    /** Registrations that count as "attending" */
    REGISTRATION: ['registered', 'attended'] as const,
    /** Registrations for users who are in or will likely attend */
    REGISTRATION_OPEN: ['registered', 'invited'] as const,
  },
  tasks: {
    OPEN: ['pending', 'active'] as const,
    COMPLETED: ['completed'] as const,
  },
} as const

/* ------------------------------------------------------------------ */
/*  Common ordering helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Append a descending order clause to any Supabase query builder.
 * Defaults to `created_at` which covers 90%+ of use cases.
 *
 * Usage:
 * ```ts
 * const query = supabase.from('events').select('*')
 * return withDefaultOrdering(query).limit(50)
 * ```
 */
export function withDefaultOrdering<T>(
  query: T & { order: (col: string, opts: { ascending: boolean }) => T },
  column: string = 'created_at',
): T {
  return query.order(column, { ascending: false })
}

/* ------------------------------------------------------------------ */
/*  Batch query helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Build a Supabase select query filtered by a list of IDs.
 * Returns the builder so callers can chain further modifiers.
 *
 * Usage:
 * ```ts
 * const { data } = await buildBatchQuery('event_registrations', 'event_id', eventIds)
 * ```
 */
/**
 * Count occurrences of each unique value of `key` across `rows`.
 *
 * Usage:
 * ```ts
 * const memberCounts = countByField(rows, 'collective_id')
 * const count = memberCounts.get(id) ?? 0
 * ```
 */
export function countByField<T>(rows: T[], key: keyof T): Map<unknown, number> {
  const map = new Map<unknown, number>()
  for (const row of rows) {
    const val = row[key]
    map.set(val, (map.get(val) ?? 0) + 1)
  }
  return map
}

export function buildBatchQuery(
  table: string,
  field: string,
  ids: (string | number)[],
  selectColumns = '*',
) {
  return supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from(table as any)
    .select(selectColumns)
    .in(field, ids)
}
