/**
 * Human-readable labels for DB enum values used across admin pages.
 */

/** Canonical display labels for unified roles */
export const ROLE_LABELS: Record<string, string> = {
  participant: 'Participant',
  member: 'Participant',
  assist_leader: 'Assistant Leader',
  co_leader: 'Co-Leader',
  leader: 'Leader',
  national_leader: 'Leader',
  manager: 'Manager',
  admin: 'Admin',
  // Legacy non-role labels kept for other uses
  social_media: 'Social Media & Content',
  collective_leader: 'Collective Leader',
  assistant_leader: 'Assistant Leader',
  other: 'Other',
}

/**
 * snake_case (or any underscore-separated enum value) to Title Case.
 * "tree_planting" -> "Tree Planting".
 *
 * This one function replaced three byte-identical copies of the same two
 * chained replaces (this file's formatRole fallback, activity-types.ts's
 * formatActivityType, and the campaign template-variable label in
 * admin/email/campaigns-tab.tsx). Underscore-to-space alone is a DIFFERENT
 * transform used in about twenty other places that lean on CSS `capitalize`
 * for the casing; those are deliberately not this function's business.
 */
export function titleCaseFromSnake(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Format a role string for display. Use this instead of role.replace('_', ' ') */
export function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? titleCaseFromSnake(role)
}

export const SKILL_LABELS: Record<string, string> = {
  public_speaking: 'Public Speaking',
  event_organisation: 'Event Organisation',
  event_facilitation: 'Event Facilitation',
  social_media_content: 'Social Media Content Creation',
}
