/* ------------------------------------------------------------------ */
/*  Analytics Abstraction                                              */
/*                                                                     */
/*  Pluggable analytics that supports:                                 */
/*  - PostHog (recommended for product analytics)                      */
/*  - Mixpanel                                                         */
/*  - Plausible (privacy-first web analytics)                          */
/*                                                                     */
/*  Switch provider by changing the adapter. All call sites use        */
/*  the same `analytics.track()` API regardless of backend.            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AnalyticsProvider = 'posthog' | 'mixpanel' | 'plausible' | 'none'

interface AnalyticsAdapter {
  init: () => void
  identify: (userId: string, traits?: Record<string, unknown>) => void
  track: (event: string, properties?: Record<string, unknown>) => void
  page: (name: string, properties?: Record<string, unknown>) => void
  reset: () => void
}

/* ------------------------------------------------------------------ */
/*  Event names - all key events tracked in one place                  */
/* ------------------------------------------------------------------ */

export const ANALYTICS_EVENTS = {
  // Auth
  SIGNUP: 'signup',
  LOGIN: 'login',
  LOGOUT: 'logout',

  // Events
  EVENT_VIEWED: 'event_viewed',
  EVENT_REGISTERED: 'event_registered',
  EVENT_UNREGISTERED: 'event_unregistered',
  EVENT_CHECKED_IN: 'event_checked_in',

  // Collectives
  COLLECTIVE_JOINED: 'collective_joined',
  COLLECTIVE_LEFT: 'collective_left',

  // Gamification
  TIER_UP: 'tier_up',

  // Social
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  POST_CREATED: 'post_created',
  ANNOUNCEMENT_READ: 'announcement_read',

  // Commerce
  DONATION_STARTED: 'donation_started',
  DONATION_COMPLETED: 'donation_completed',
  PURCHASE_STARTED: 'purchase_started',
  PURCHASE_COMPLETED: 'purchase_completed',

  // Impact
  IMPACT_LOGGED: 'impact_logged',

  // Referral
  REFERRAL_SHARED: 'referral_shared',
  REFERRAL_ACCEPTED: 'referral_accepted',
} as const

/* ------------------------------------------------------------------ */
/*  No-op adapter (default / when analytics disabled)                  */
/* ------------------------------------------------------------------ */

const noopAdapter: AnalyticsAdapter = {
  init: () => {},
  identify: () => {},
  track: () => {},
  page: () => {},
  reset: () => {},
}

/* ------------------------------------------------------------------ */
/*  PostHog adapter                                                    */
/* ------------------------------------------------------------------ */

function createPostHogAdapter(): AnalyticsAdapter {
  let posthog: {
    init: (key: string, opts: Record<string, unknown>) => void
    identify: (id: string, props?: Record<string, unknown>) => void
    capture: (event: string, props?: Record<string, unknown>) => void
    reset: () => void
  } | null = null

  return {
    init: () => {
      const key = import.meta.env.VITE_POSTHOG_KEY
      const host = import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com'
      if (!key) {
        console.warn('[analytics] PostHog key not configured')
        return
      }
      // Dynamic import to avoid bundling if not used
      // @ts-expect-error posthog-js is an optional dependency
      import('posthog-js').then((mod) => {
        posthog = mod.default as NonNullable<typeof posthog>
        posthog!.init(key, {
          api_host: host,
          capture_pageview: false, // we handle this manually
          persistence: 'localStorage',
          autocapture: false,
        })
      }).catch(() => {
        console.warn('[analytics] posthog-js not installed')
      })
    },
    identify: (userId, traits) => posthog?.identify(userId, traits),
    track: (event, props) => posthog?.capture(event, props),
    page: (name, props) => posthog?.capture('$pageview', { page: name, ...props }),
    reset: () => posthog?.reset(),
  }
}

/* ------------------------------------------------------------------ */
/*  Plausible adapter                                                  */
/* ------------------------------------------------------------------ */

function createPlausibleAdapter(): AnalyticsAdapter {
  return {
    init: () => {
      // Plausible uses a script tag - check if it's loaded
      if (typeof window !== 'undefined' && !window.plausible) {
        console.warn('[analytics] Plausible script not loaded. Add <script data-domain="app.coexistaus.org" src="https://plausible.io/js/script.js"></script>')
      }
    },
    identify: () => {
      // Plausible is privacy-first - no user identification
    },
    track: (event, props) => {
      if (typeof window !== 'undefined' && window.plausible) {
        window.plausible(event, { props })
      }
    },
    page: () => {
      // Plausible auto-tracks pageviews via script
    },
    reset: () => {},
  }
}

/* ------------------------------------------------------------------ */
/*  Analytics singleton                                                */
/* ------------------------------------------------------------------ */

const PROVIDER: AnalyticsProvider =
  (import.meta.env.VITE_ANALYTICS_PROVIDER as AnalyticsProvider) || 'none'

function createAdapter(): AnalyticsAdapter {
  switch (PROVIDER) {
    case 'posthog':
      return createPostHogAdapter()
    case 'plausible':
      return createPlausibleAdapter()
    case 'mixpanel':
      // TODO: implement Mixpanel adapter if needed
      return noopAdapter
    default:
      return noopAdapter
  }
}

const adapter = createAdapter()

/* ------------------------------------------------------------------ */
/*  Cookie consent integration                                         */
/* ------------------------------------------------------------------ */

const CONSENT_KEY = 'coexist-cookie-consent'

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return parsed.consent?.analytics === true
  } catch {
    return false
  }
}

/**
 * Consent-gated analytics wrapper.
 * All tracking calls are no-ops until the user explicitly accepts analytics cookies.
 */
export const analytics = {
  init: () => {
    if (hasAnalyticsConsent()) adapter.init()
  },

  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (hasAnalyticsConsent()) adapter.identify(userId, traits)
  },

  track: (event: string, properties?: Record<string, unknown>) => {
    if (hasAnalyticsConsent()) adapter.track(event, properties)
  },

  page: (name: string, properties?: Record<string, unknown>) => {
    if (hasAnalyticsConsent()) adapter.page(name, properties)
  },

  reset: () => adapter.reset(),
}

/* ------------------------------------------------------------------ */
/*  Global type augmentation for Plausible                             */
/* ------------------------------------------------------------------ */

// Re-init analytics when cookie consent changes
if (typeof window !== 'undefined') {
  window.addEventListener('coexist:consent-changed', () => {
    if (hasAnalyticsConsent()) {
      adapter.init()
    }
  })
}

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void
  }
}
