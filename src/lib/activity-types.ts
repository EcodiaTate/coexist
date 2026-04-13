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
  | 'clean-up'
  | 'tree-planting'
  | 'ecosystem-restoration'
  | 'nature-hike'
  | 'camp-out'
  | 'spotlighting'
  | 'other'

export const activityToBadge: Record<string, ActivityBadgeSlug> = {
  clean_up: 'clean-up',
  tree_planting: 'tree-planting',
  ecosystem_restoration: 'ecosystem-restoration',
  nature_hike: 'nature-hike',
  camp_out: 'camp-out',
  spotlighting: 'spotlighting',
  other: 'other',
}

/* ------------------------------------------------------------------ */
/*  Card gradient (used on event list cards)                           */
/* ------------------------------------------------------------------ */

export const ACTIVITY_META: Record<string, { gradient: string }> = {
  clean_up: { gradient: 'from-sky-400 to-moss-500' },
  tree_planting: { gradient: 'from-success-400 to-primary-500' },
  ecosystem_restoration: { gradient: 'from-sprout-400 to-success-500' },
  nature_hike: { gradient: 'from-bark-400 to-bark-500' },
  camp_out: { gradient: 'from-moss-400 to-primary-500' },
  spotlighting: { gradient: 'from-amber-400 to-amber-500' },
  other: { gradient: 'from-neutral-400 to-neutral-500' },
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
  clean_up:               { gradient: 'from-sky-400 to-cyan-500',         glow: '',    bg: 'bg-sky-50',        text: 'text-sky-700',      border: 'border-sky-200/50' },
  tree_planting:           { gradient: 'from-emerald-400 to-green-500',    glow: '',    bg: 'bg-emerald-50',    text: 'text-emerald-700',  border: 'border-emerald-200/50' },
  ecosystem_restoration:   { gradient: 'from-lime-400 to-green-500',       glow: '',    bg: 'bg-lime-50',       text: 'text-lime-700',     border: 'border-lime-200/50' },
  nature_hike:             { gradient: 'from-teal-400 to-emerald-500',     glow: '',    bg: 'bg-teal-50',       text: 'text-teal-700',     border: 'border-teal-200/50' },
  camp_out:                { gradient: 'from-amber-400 to-orange-500',     glow: '',    bg: 'bg-amber-50',      text: 'text-amber-700',    border: 'border-amber-200/50' },
  spotlighting:            { gradient: 'from-indigo-400 to-violet-500',    glow: '',    bg: 'bg-indigo-50',     text: 'text-indigo-700',   border: 'border-indigo-200/50' },
  other:                   { gradient: 'from-neutral-400 to-neutral-500',  glow: '',    bg: 'bg-neutral-50',    text: 'text-neutral-700',  border: 'border-neutral-200/50' },
}

/* ------------------------------------------------------------------ */
/*  Display label                                                      */
/* ------------------------------------------------------------------ */

/** Converts a DB enum value to a human-readable label: "tree_planting" → "Tree Planting" */
export function formatActivityType(type: string | null | undefined): string {
  if (!type) return 'Event'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const defaultAccent: ActivityAccent = {
  gradient: 'from-primary-400 to-sprout-500',
  glow: '',
  bg: 'bg-primary-50',
  text: 'text-primary-700',
  border: 'border-primary-200/50',
}
