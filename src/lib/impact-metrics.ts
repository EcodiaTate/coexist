/**
 * Canonical Impact Metrics Registry
 *
 * Single source of truth for all impact metric definitions.
 * Every hook, dashboard, form, and query that touches impact data
 * MUST read from this registry to stay aligned.
 *
 * "Leaders Trained" is NOT an impact metric — it's derived from
 * role assignments (collective_members with leadership roles).
 */

/* ------------------------------------------------------------------ */
/*  Core metric definition                                             */
/* ------------------------------------------------------------------ */

export interface ImpactMetricDef {
  /** DB column name in event_impact table */
  key: string
  /** Human-readable label */
  label: string
  /** Display unit (e.g. 'kg', 'trees') */
  unit: string
  /** Icon key for fieldIcons mapping */
  icon: string
  /** Whether this is a numeric(x,y) column (true) or integer (false) */
  decimal: boolean
}

/* ------------------------------------------------------------------ */
/*  The registry                                                       */
/* ------------------------------------------------------------------ */

/**
 * All loggable impact metrics — ordered by display priority.
 * Add new metrics here; every consumer auto-picks them up.
 */
export const IMPACT_METRIC_DEFS: readonly ImpactMetricDef[] = [
  { key: 'trees_planted',         label: 'Trees Planted',          unit: 'trees',     icon: 'tree',  decimal: false },
  { key: 'native_plants',         label: 'Native Plants',          unit: 'plants',    icon: 'leaf',  decimal: false },
  { key: 'invasive_weeds_pulled', label: 'Invasive Weeds Pulled',  unit: 'weeds',     icon: 'weed',  decimal: false },
  { key: 'rubbish_kg',            label: 'Rubbish Collected',       unit: 'kg',        icon: 'trash', decimal: true  },
  { key: 'area_restored_sqm',     label: 'Area Restored',          unit: 'sqm',       icon: 'area',  decimal: true  },
  { key: 'wildlife_sightings',    label: 'Wildlife Sightings',     unit: 'sightings', icon: 'eye',   decimal: false },
  { key: 'coastline_cleaned_m',   label: 'Coastline Cleaned',      unit: 'm',         icon: 'wave',  decimal: true  },
  { key: 'hours_total',           label: 'Volunteer Hours',        unit: 'hours',     icon: 'clock', decimal: true  },
] as const

/* ------------------------------------------------------------------ */
/*  Derived helpers                                                    */
/* ------------------------------------------------------------------ */

/** Set of valid metric column names — for runtime validation */
export const VALID_IMPACT_METRICS = new Set(IMPACT_METRIC_DEFS.map((m) => m.key))

/** Metric key → label lookup */
export const METRIC_LABELS: Record<string, string> = Object.fromEntries(
  IMPACT_METRIC_DEFS.map((m) => [m.key, m.label]),
)

/** Metric key → full def lookup */
export const METRIC_BY_KEY: Record<string, ImpactMetricDef> = Object.fromEntries(
  IMPACT_METRIC_DEFS.map((m) => [m.key, m]),
)

/**
 * Flat list for survey builder dropdown (excludes hours_total which
 * is always computed from duration x attendees, not entered directly).
 */
export const SURVEY_LINKABLE_METRICS = IMPACT_METRIC_DEFS
  .filter((m) => m.key !== 'hours_total')
  .map((m) => ({ key: m.key, label: m.label }))

/**
 * The DB columns to SELECT when fetching event_impact for aggregation.
 * Excludes meta columns (id, event_id, logged_by, etc).
 */
export const IMPACT_SELECT_COLUMNS = IMPACT_METRIC_DEFS.map((m) => m.key).join(', ')

/**
 * Sum helper: given an array of impact rows, sum a specific metric key.
 */
export function sumMetric(rows: Record<string, unknown>[], key: string): number {
  return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
}
