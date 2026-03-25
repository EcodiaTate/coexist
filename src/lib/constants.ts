export const APP_NAME = 'Co-Exist'
export const TAGLINE = 'Explore. Connect. Protect.'
export const PHILOSOPHY = 'Do good, feel good'

export const CONTACT_EMAIL = 'hello@coexistaus.org'
export const WEBSITE_URL = 'https://www.coexistaus.org'
export const INSTAGRAM_URL = 'https://www.instagram.com/coexistaus'
export const FACEBOOK_URL = 'https://www.facebook.com/coexistaus'

export const CURRENT_TOS_VERSION = '1.0'

export const TIERS = ['New', 'Active', 'Committed', 'Dedicated', 'Lifetime'] as const
export type Tier = (typeof TIERS)[number]
