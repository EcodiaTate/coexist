export const APP_NAME = 'Co-Exist'
export const TAGLINE = 'Expand. Connect. Protect.'
export const PHILOSOPHY = 'Do good, feel good'

export const CONTACT_EMAIL = 'hello@coexistaus.org'
export const WEBSITE_URL = 'https://www.coexistaus.org'
export const INSTAGRAM_URL = 'https://www.instagram.com/coexistaus'
export const FACEBOOK_URL = 'https://www.facebook.com/coexistaus'
export const ECODIA_CODE_URL = 'https://code.ecodia.au'

export const CURRENT_TOS_VERSION = '1.1'

export const TOS_CHANGE_SUMMARY = [
  'Updated data privacy practices in line with GDPR and Australian Privacy Act',
  'Added data export and account deletion rights',
  'Clarified content moderation and reporting policies',
  'Updated age verification requirements (18+)',
  'Added cookie consent and analytics disclosure',
] as const

export const TOS_CHANGE_HIGHLIGHTS = [
  { label: 'Zero tolerance for objectionable content', detail: 'users who post abusive, offensive, or objectionable content will have the content removed and their account suspended or terminated' },
  { label: 'User-generated content policy', detail: 'added guidelines for acceptable use, content reporting, and user blocking' },
] as const

export const TOS_COMMUNITY_STANDARDS =
  "Co-Exist has zero tolerance for objectionable content or abusive behaviour. Content that is offensive, hateful, discriminatory, sexually explicit, violent, or otherwise inappropriate will be removed, and the responsible user may be permanently banned. All users can report content and block other users. Reports are reviewed within 24 hours."

export const TIERS = ['New', 'Active', 'Committed', 'Dedicated', 'Lifetime'] as const
export type Tier = (typeof TIERS)[number]

/* ------------------------------------------------------------------ */
/*  Role hierarchy ranks                                               */
/* ------------------------------------------------------------------ */

/**
 * Unified role hierarchy - used by BOTH profiles.role and collective_members.role.
 * participant < assist_leader < co_leader < leader < manager < admin
 */
export const ROLE_RANK: Record<string, number> = {
  participant: 0,
  member: 0,           // legacy alias for participant
  assist_leader: 1,
  co_leader: 2,
  leader: 3,
  national_leader: 3,  // legacy alias for leader
  national_staff: 3,   // legacy alias for leader
  manager: 4,
  national_admin: 4,   // legacy alias for manager
  admin: 5,
  super_admin: 5,      // legacy alias for admin
} as const

/** @deprecated Use ROLE_RANK instead */
export const COLLECTIVE_ROLE_RANK = ROLE_RANK
/** @deprecated Use ROLE_RANK instead */
export const GLOBAL_ROLE_RANK = ROLE_RANK

/**
 * Collective-membership roles that grant leader-suite access.
 *
 * One definition. It was written out twice, byte-identical, in
 * use-leader-collective-scope.ts and route-guard.tsx, which is two places to
 * remember when a role is added to the `collective_role` enum.
 *
 * MEMBERSHIP IS SPELLED OUT, NOT DERIVED BY RANK PREDICATE, and that is
 * deliberate. `ROLE_RANK` carries legacy global aliases (national_staff,
 * national_admin, super_admin) that are not `collective_role` values at all, so
 * a `rank >= 1 && rank <= 3` filter over its keys would admit roles this list
 * has never contained. The rank table stays the single source of ORDER; this
 * list is the single source of MEMBERSHIP, and src/test/role-hierarchy.test.ts
 * pins the two together so neither can drift from the other unnoticed.
 */
export const LEADER_ROLES = ['assist_leader', 'co_leader', 'leader'] as const

/**
 * Global roles allowed to see another member's sensitive PII, client-side.
 *
 * Moved here from profile-visibility.ts so the role hierarchy has one home.
 * The canonical security boundary is still the get_user_profile_v1 RPC; this
 * gates UI only.
 *
 * Same reason as LEADER_ROLES for spelling the membership out: deriving it as
 * "every ROLE_RANK key with rank >= 1" returns EIGHT roles where this set has
 * six, silently admitting `national_staff` and `national_admin` to a PII gate.
 * Widening who can read someone's medical notes is not a refactor.
 */
export const STAFF_ROLES: ReadonlySet<string> = new Set<string>([
  'assist_leader',
  'co_leader',
  'leader',
  'national_leader',
  'manager',
  'admin',
])

/**
 * The highest-ranked role in a set of collective memberships, or null.
 *
 * Existed as an inlined `{ member: 0, assist_leader: 1, co_leader: 2, leader: 3 }`
 * object twice inside use-updates.ts. That copy had no `manager` or `admin` key,
 * so `rank[m.role] ?? 0` scored a manager and an admin at ZERO: below every
 * leader and level with a plain member. A manager's collective membership could
 * therefore never win the reduce, and the updates surface treated them as a
 * member when deciding which audience an announcement reached.
 */
export function highestRankedRole<T extends { role: string }>(memberships: readonly T[]): string | null {
  if (memberships.length === 0) return null
  return memberships.reduce((best, m) =>
    (ROLE_RANK[m.role] ?? 0) > (ROLE_RANK[best.role] ?? 0) ? m : best,
  ).role
}

/* ------------------------------------------------------------------ */
/*  Chat role badge styling                                            */
/* ------------------------------------------------------------------ */

export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Leader: { bg: 'bg-primary-100', text: 'text-primary-700' },
  'Co-Leader': { bg: 'bg-primary-50', text: 'text-primary-600' },
  'Assistant Leader': { bg: 'bg-primary-50', text: 'text-primary-600' },
}
