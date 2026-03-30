/**
 * Canonical Impact Metrics Registry
 *
 * Single source of truth for impact metric types and helpers.
 * The DB table `impact_metric_defs` is the live source; the
 * FALLBACK_METRIC_DEFS array provides instant rendering while
 * the DB query loads.
 *
 * "Leaders Trained/Empowered" is NOT an impact metric — it's
 * derived from role assignments in collective_members.
 */

/* ------------------------------------------------------------------ */
/*  Core types                                                         */
/* ------------------------------------------------------------------ */

export interface ImpactMetricDef {
  id?: string
  /** DB column name (built-in) or custom key */
  key: string
  /** Human-readable label */
  label: string
  /** Display unit (e.g. 'kg', 'trees') */
  unit: string
  /** Icon key for fieldIcons mapping */
  icon: string
  /** Whether this is a decimal type (true) or integer (false) */
  decimal: boolean
  /** Display order */
  sort_order: number
  /** Whether this metric is currently enabled */
  is_active: boolean
  /** Whether this can be linked to survey questions */
  survey_linkable: boolean
}

/* ------------------------------------------------------------------ */
/*  Built-in columns                                                   */
/* ------------------------------------------------------------------ */

/**
 * The set of metric keys that map to real columns on event_impact.
 * Custom (admin-created) keys are stored in the custom_metrics jsonb
 * column instead. This set is immutable — DB schema changes are the
 * only way to add a built-in column.
 */
export const BUILTIN_COLUMNS = new Set([
  'trees_planted',
  'native_plants',
  'invasive_weeds_pulled',
  'rubbish_kg',
  'area_restored_sqm',
  'wildlife_sightings',
  'coastline_cleaned_m',
  'hours_total',
  // Column exists in DB (added in migration 041) but is intentionally not
  // displayed or aggregated — "leaders empowered" is derived from
  // collective_members role assignments, not event logging. Listed here so
  // isBuiltinMetric() routes it correctly if it ever appears as an impact_metric
  // tag on a survey question, instead of silently dumping it into custom_metrics.
  'leaders_trained',
])

export function isBuiltinMetric(key: string): boolean {
  return BUILTIN_COLUMNS.has(key)
}

/* ------------------------------------------------------------------ */
/*  Fallback / seed definitions                                        */
/* ------------------------------------------------------------------ */

/**
 * Hardcoded fallback used as placeholderData while the DB loads.
 * Matches the seed data in migration 063.
 */
export const FALLBACK_METRIC_DEFS: readonly ImpactMetricDef[] = [
  { key: 'trees_planted',         label: 'Trees Planted',         unit: 'trees',     icon: 'tree',  decimal: false, sort_order: 0, is_active: true, survey_linkable: true  },
  { key: 'native_plants',         label: 'Native Plants',         unit: 'plants',    icon: 'leaf',  decimal: false, sort_order: 1, is_active: true, survey_linkable: true  },
  { key: 'invasive_weeds_pulled', label: 'Invasive Weeds Pulled', unit: 'weeds',     icon: 'weed',  decimal: false, sort_order: 2, is_active: true, survey_linkable: true  },
  { key: 'rubbish_kg',            label: 'Rubbish Collected',     unit: 'kg',        icon: 'trash', decimal: true,  sort_order: 3, is_active: true, survey_linkable: true  },
  { key: 'area_restored_sqm',     label: 'Area Restored',         unit: 'sqm',       icon: 'area',  decimal: true,  sort_order: 4, is_active: true, survey_linkable: true  },
  { key: 'wildlife_sightings',    label: 'Wildlife Sightings',    unit: 'sightings', icon: 'eye',   decimal: false, sort_order: 5, is_active: true, survey_linkable: true  },
  { key: 'coastline_cleaned_m',   label: 'Coastline Cleaned',     unit: 'm',         icon: 'wave',  decimal: true,  sort_order: 6, is_active: true, survey_linkable: true  },
  { key: 'hours_total',           label: 'Est. Volunteer Hours',   unit: 'hours',     icon: 'clock', decimal: true,  sort_order: 7, is_active: true, survey_linkable: false },
]

/* ------------------------------------------------------------------ */
/*  Static derived helpers (don't need the hook)                       */
/* ------------------------------------------------------------------ */

/**
 * The DB columns to SELECT when fetching event_impact for aggregation.
 * Always selects all built-in columns + custom_metrics jsonb.
 * This is static because built-in columns never change at runtime.
 */
export const IMPACT_SELECT_COLUMNS =
  Array.from(BUILTIN_COLUMNS).join(', ') + ', custom_metrics'

/**
 * Sum a specific metric key across an array of impact rows.
 * Handles both built-in columns (top-level) and custom metrics (inside jsonb).
 */
export function sumMetric(rows: Record<string, unknown>[], key: string): number {
  if (BUILTIN_COLUMNS.has(key)) {
    return rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)
  }
  // Custom metric — stored in custom_metrics jsonb
  return rows.reduce((s, r) => {
    const cm = r.custom_metrics as Record<string, unknown> | null
    return s + (Number(cm?.[key]) || 0)
  }, 0)
}

/* ------------------------------------------------------------------ */
/*  Legacy re-exports for backward compatibility                       */
/* ------------------------------------------------------------------ */

/** @deprecated Use useImpactMetricDefs() hook for live data */
export const IMPACT_METRIC_DEFS = FALLBACK_METRIC_DEFS

/** @deprecated Use useImpactMetricDefs().validKeys */
export const VALID_IMPACT_METRICS = new Set(FALLBACK_METRIC_DEFS.map((m) => m.key))

/** @deprecated Use useImpactMetricDefs().surveyLinkableMetrics */
export const SURVEY_LINKABLE_METRICS = FALLBACK_METRIC_DEFS
  .filter((m) => m.survey_linkable)
  .map((m) => ({ key: m.key, label: m.label }))

/** @deprecated Use useImpactMetricDefs().metricLabels */
export const METRIC_LABELS: Record<string, string> = Object.fromEntries(
  FALLBACK_METRIC_DEFS.map((m) => [m.key, m.label]),
)

/** @deprecated Use useImpactMetricDefs().metricByKey */
export const METRIC_BY_KEY: Record<string, ImpactMetricDef> = Object.fromEntries(
  FALLBACK_METRIC_DEFS.map((m) => [m.key, m]),
)
