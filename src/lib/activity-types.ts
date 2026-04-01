/**
 * Centralised activity-type metadata.
 *
 * Three maps that were previously copy-pasted across event-hero, events/index,
 * and event-detail are merged here as the single source of truth.
 */

/* ------------------------------------------------------------------ */
/*  Badge slug mapping  (activity_type DB enum → Badge component prop) */
/* ------------------------------------------------------------------ */

export type ActivityBadgeSlug =
  | 'shore-cleanup'
  | 'tree-planting'
  | 'land-regeneration'
  | 'nature-walk'
  | 'camp-out'
  | 'retreat'
  | 'film-screening'
  | 'marine-restoration'
  | 'workshop'

export const activityToBadge: Record<string, ActivityBadgeSlug> = {
  shore_cleanup: 'shore-cleanup',
  tree_planting: 'tree-planting',
  land_regeneration: 'land-regeneration',
  nature_walk: 'nature-walk',
  camp_out: 'camp-out',
  retreat: 'retreat',
  film_screening: 'film-screening',
  marine_restoration: 'marine-restoration',
  workshop: 'workshop',
}

/* ------------------------------------------------------------------ */
/*  Card gradient (used on event list cards)                           */
/* ------------------------------------------------------------------ */

export const ACTIVITY_META: Record<string, { gradient: string }> = {
  shore_cleanup: { gradient: 'from-sky-400 to-moss-500' },
  tree_planting: { gradient: 'from-success-400 to-primary-500' },
  land_regeneration: { gradient: 'from-sprout-400 to-success-500' },
  nature_walk: { gradient: 'from-bark-400 to-bark-500' },
  camp_out: { gradient: 'from-moss-400 to-primary-500' },
  retreat: { gradient: 'from-plum-400 to-plum-500' },
  film_screening: { gradient: 'from-coral-400 to-coral-500' },
  marine_restoration: { gradient: 'from-primary-400 to-moss-500' },
  workshop: { gradient: 'from-bark-400 to-warning-500' },
}

/* ------------------------------------------------------------------ */
/*  Detail-page colour accents (gradient, glow, bg, text, border)     */
/* ------------------------------------------------------------------ */

export interface ActivityAccent {
  gradient: string
  glow: string
  bg: string
  text: string
  border: string
}

export const activityAccent: Record<string, ActivityAccent> = {
  shore_cleanup:      { gradient: 'from-sky-400 to-cyan-500',         glow: 'shadow-sky-400/25',    bg: 'bg-sky-50',        text: 'text-sky-700',      border: 'border-sky-200/50' },
  tree_planting:      { gradient: 'from-emerald-400 to-green-500',    glow: 'shadow-emerald-400/25', bg: 'bg-emerald-50',    text: 'text-emerald-700',  border: 'border-emerald-200/50' },
  land_regeneration:  { gradient: 'from-lime-400 to-green-500',       glow: 'shadow-lime-400/25',   bg: 'bg-lime-50',       text: 'text-lime-700',     border: 'border-lime-200/50' },
  nature_walk:        { gradient: 'from-teal-400 to-emerald-500',     glow: 'shadow-teal-400/25',   bg: 'bg-teal-50',       text: 'text-teal-700',     border: 'border-teal-200/50' },
  camp_out:           { gradient: 'from-amber-400 to-orange-500',     glow: 'shadow-amber-400/25',  bg: 'bg-amber-50',      text: 'text-amber-700',    border: 'border-amber-200/50' },
  retreat:            { gradient: 'from-violet-400 to-purple-500',    glow: 'shadow-violet-400/25', bg: 'bg-violet-50',     text: 'text-violet-700',   border: 'border-violet-200/50' },
  film_screening:     { gradient: 'from-rose-400 to-pink-500',        glow: 'shadow-rose-400/25',   bg: 'bg-rose-50',       text: 'text-rose-700',     border: 'border-rose-200/50' },
  marine_restoration: { gradient: 'from-blue-400 to-indigo-500',      glow: 'shadow-blue-400/25',   bg: 'bg-blue-50',       text: 'text-blue-700',     border: 'border-blue-200/50' },
  workshop:           { gradient: 'from-fuchsia-400 to-purple-500',   glow: 'shadow-fuchsia-400/25', bg: 'bg-fuchsia-50',   text: 'text-fuchsia-700',  border: 'border-fuchsia-200/50' },
}

/* ------------------------------------------------------------------ */
/*  Display label                                                      */
/* ------------------------------------------------------------------ */

/** Converts a DB enum value to a human-readable label: "shore_cleanup" → "Shore Cleanup" */
export function formatActivityType(type: string | null | undefined): string {
  if (!type) return 'Event'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const defaultAccent: ActivityAccent = {
  gradient: 'from-primary-400 to-sprout-500',
  glow: 'shadow-primary-400/25',
  bg: 'bg-primary-50',
  text: 'text-primary-700',
  border: 'border-primary-200/50',
}
