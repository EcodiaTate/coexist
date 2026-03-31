export const APP_NAME = 'Co-Exist'
export const TAGLINE = 'Explore. Connect. Protect.'
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

/** Collective-scoped role hierarchy (collective_members.role). */
export const COLLECTIVE_ROLE_RANK: Record<string, number> = {
  member: 0,
  assist_leader: 1,
  co_leader: 2,
  leader: 3,
} as const

/** Global role hierarchy (profiles.role). */
export const GLOBAL_ROLE_RANK: Record<string, number> = {
  participant: 0,
  national_leader: 1,
  national_staff: 1,   // legacy alias
  manager: 2,
  national_admin: 2,   // legacy alias
  admin: 3,
  super_admin: 3,      // legacy alias
} as const
