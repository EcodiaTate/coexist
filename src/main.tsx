// Runtime built-in polyfills for old Android System WebViews. MUST be first -
// installs Object.hasOwn / structuredClone / replaceAll / at / findLast before
// any vendor code (framer-motion etc.) runs. See src/lib/polyfills.ts.
import '@/lib/polyfills'

// Pre-mount render-failure overlay. The GLOBAL window 'error' /
// 'unhandledrejection' listeners that used to live here were REMOVED 2026-06-08:
// being a second, ungated copy of the index.html boot overlay, they painted a
// white screen over a fully-working app on any post-mount rejection (e.g. a
// transient Realtime resubscribe). The index.html overlay (BOOT_WINDOW_MS +
// window.__APP_MOUNTED gated) already covers global pre-mount errors. This
// helper remains ONLY for the synchronous createRoot().render() catch below and
// self-gates on __APP_MOUNTED so it can never paint over a mounted app. Do not
// reattach global error listeners here.
function showBootError(label: string, payload: unknown) {
  try {
    if ((window as unknown as { __APP_MOUNTED?: boolean }).__APP_MOUNTED) return
    let div = document.getElementById('boot-error')
    if (!div) {
      div = document.createElement('div')
      div.id = 'boot-error'
      div.style.cssText =
        'position:fixed;inset:0;background:#fff;color:#000;padding:20px;font:13px ui-monospace,monospace;white-space:pre-wrap;overflow:auto;z-index:99999'
      document.body.appendChild(div)
    }
    const err = payload as { stack?: string; message?: string } | string | undefined
    const text =
      typeof err === 'string'
        ? err
        : err?.stack || err?.message || JSON.stringify(err)
    div.textContent = `${div.textContent || ''}\n[${label}] ${text}`
  } catch {
    // last-resort, swallow
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import {
    QueryClient,
    QueryClientProvider,
    dehydrate,
    hydrate,
} from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from '@/components/auth-provider'
import { ToastProvider } from '@/components/toast'
import {
    attachOfflineSyncListener,
    restoreQueryCache,
    persistQueryCache,
} from '@/lib/offline-sync'
import { CookieConsentBanner } from '@/components/cookie-consent'
import { initSentry, SentryErrorBoundary } from '@/lib/sentry'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { clearChunkReloadGuard } from '@/lib/lazy-with-retry'
import { isWebViewBelowFloor } from '@/lib/webview-floor'
import App from './App'
import './styles/globals.css'

// If we got here, the entry bundle (which lazily imports App + every page
// chunk reference) loaded successfully. That proves we're on a fresh build,
// so it's safe to release the chunk-reload guard now - before any lazy
// import runs and before App.tsx mounts. Doing it inside App's useEffect
// (the previous behaviour) was too late: a failed lazy import on a deep
// route would prevent App from ever mounting, leaving the guard latched
// and turning every subsequent refresh into a permanent white screen.
clearChunkReloadGuard()

// Dismiss the Capacitor SplashScreen plugin overlay immediately on native.
// The system splash (Android 12+ Theme.SplashScreen / iOS LaunchScreen) covers
// the launch gap; the React `SplashPage` component handles the in-app splash.
// The plugin's WebView overlay would otherwise flash a stretched/cropped image
// between the system splash and the React splash.
if (Capacitor.isNativePlatform()) {
  SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => { /* plugin not present */ })

  // Force the status bar to fully overlay the WebView with a transparent
  // background. Without this Android can render an opaque (or scrimmed) bar
  // in the notch area which breaks our full-bleed pages.
  //
  // setBackgroundColor is intentionally NOT called - on Android 15+ (SDK 35+)
  // setStatusBarColor is a no-op, and Play Console flags the call as deprecated
  // API usage. Theme android:statusBarColor=@android:color/transparent +
  // EdgeToEdge.enable(this) in MainActivity already give us transparent bars.
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {})
    StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  }).catch(() => { /* plugin not present */ })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'offlineFirst' as const,
      refetchOnWindowFocus: false,
    },
  },
})

// Restore cached query data from localStorage on startup
const savedCache = restoreQueryCache()
if (savedCache) {
  try {
    hydrate(queryClient, savedCache)
  } catch {
    // Corrupted cache - ignore
  }
}

// Persist critical query cache to localStorage periodically + on visibility change.
// Event-day prefixes (event, event-attendees, event-impact, event-waitlist) added
// 9 May 2026 for 1.8.5 mid-event resilience: leaders refresh the day-of dashboard
// over patchy mobile networks; without persisted cache, a refresh wipes the
// attendee list and requires the network to come back before the leader can
// keep checking people in. Origin: Tate verbatim 17:11 AEST 9 May 2026.
const CRITICAL_QUERY_PREFIXES = [
  'profile',
  'profile-collectives',
  'profile-stats',
  'my-events',
  'chat-messages',
  'event',
  'event-attendees',
  'event-impact',
  'event-waitlist',
  'home',
]

function persistCriticalCache() {
  const state = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey[0] as string
      return CRITICAL_QUERY_PREFIXES.includes(key)
    },
  })
  persistQueryCache(state)
}

// Save cache every 30 seconds
setInterval(persistCriticalCache, 30_000)

// Save cache when user navigates away or tabs out
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    persistCriticalCache()
  }
})

// Auto-sync offline check-ins when connectivity is restored
attachOfflineSyncListener()

// Attach the push-notification tap listener as early as possible so cold-launch
// taps route correctly. Capacitor delivers pushNotificationActionPerformed at
// app boot when the user opened the app by tapping a notification; if no
// listener is attached at that moment, the action is dropped and the user
// lands on '/'. usePushRegistration inside AppShell is gated on auth-resolve
// so it attaches too late. The early listener buffers the resolved route
// until AppShell wires a consumer (which calls react-router navigate).
if (Capacitor.isNativePlatform()) {
  import('@/hooks/use-push').then(({ attachEarlyTapListener }) => {
    attachEarlyTapListener().catch((err) => console.warn('[push] early tap listener attach failed:', err))
  })

  // Race AppDelegate.didReceive against React mount. AppDelegate writes
  // 'pendingPushRoute' to Preferences when iOS delivers a tap response
  // (1.8.7(13)+). On cold-launch this can happen before OR after React mounts.
  // If before: we read it here, rewrite the URL with history.replaceState
  // BEFORE BrowserRouter reads the location, so the app renders the deep
  // route on first paint - no home-page flash, no late navigate. If after:
  // the in-hook poll inside usePushRegistration catches it (3s window).
  import('@capacitor/preferences').then(async ({ Preferences }) => {
    let attempts = 0
    const tryConsume = async (): Promise<boolean> => {
      try {
        const got = await Preferences.get({ key: 'pendingPushRoute' })
        const route = got?.value
        if (route && route.startsWith('/') && !route.includes('://') && route.length < 512) {
          await Preferences.remove({ key: 'pendingPushRoute' })
          await Preferences.remove({ key: 'pendingPushRouteAt' })
          // Rewrite URL AND notify react-router via popstate so it re-matches.
          // replaceState alone doesn't trigger router re-render once BrowserRouter
          // has already mounted (1.8.7(16) regression: replaceState fired but
          // app stayed on home page because the dynamic import resolved after
          // React mount, missing the BrowserRouter initial-read window).
          window.history.replaceState(null, '', route)
          window.dispatchEvent(new PopStateEvent('popstate'))
          console.info('[push] cold-launch route consumed:', route)
          return true
        }
      } catch { /* best-effort */ }
      return false
    }
    if (await tryConsume()) return
    // Poll every 50ms for 2s to catch the case where AppDelegate writes
    // after main.tsx starts but before / during React mount.
    const iv = setInterval(async () => {
      attempts++
      if (await tryConsume() || attempts > 40) {
        clearInterval(iv)
      }
    }, 50)
  })
}

// Initialize Sentry error reporting (no-op if VITE_SENTRY_DSN is not set)
initSentry()

// Below the Tailwind v4 CSS floor (oklch / color-mix, ~Chrome 111 / Safari 16.4)
// the app's stylesheet cannot apply: position:fixed utilities drop, dvh units are
// unsupported, and the layout grows to a ~21,000px document with the phone gate
// and nav rendered far off-screen. The 2026-07-05 build-target + polyfill fix
// cured the JS syntax/API crash class but does NOT touch CSS, so below the CSS
// floor the app still renders broken. Rather than mount that, render a plain
// upgrade screen and skip mounting the app entirely. The screen uses ONLY inline
// styles, hex colours and normal document flow (no oklch, no position:fixed
// dependence, no dvh) so it renders correctly on the very engine that fails the
// modern stylesheet. See src/lib/webview-floor.ts.
function renderWebViewUpgradeScreen() {
  const root = document.getElementById('root')
  if (!root) return
  // The index.html boot-error overlay is gated on __APP_MOUNTED; set it so a
  // stray boot-window error can never paint white over this screen.
  ;(window as unknown as { __APP_MOUNTED?: boolean }).__APP_MOUNTED = true

  let isIOS = false
  try {
    isIOS = Capacitor.getPlatform() === 'ios'
  } catch { /* Capacitor not resolvable - fall back to UA sniff */ }
  if (!isIOS) {
    const ua = navigator.userAgent || ''
    // iOS Safari / WKWebView carries no "Chrome" / "CriOS" / "Android" token.
    isIOS = /iPad|iPhone|iPod/.test(ua) || (/Safari/.test(ua) && !/Chrome|CriOS|Android/.test(ua))
  }

  const OLIVE = '#869e62'
  const OLIVE_DARK = '#4a5c34'
  const INK = '#333f2b'
  const MUTED = '#5c6d47'
  const BG = '#f5f7f0'
  const WEBVIEW_URL = 'https://play.google.com/store/apps/details?id=com.google.android.webview'
  const WEB_URL = 'https://app.coexistaus.org'

  const heading = isIOS ? 'Please update to the latest iOS' : 'Please update your system browser'
  const body = isIOS
    ? 'Co-Exist needs a newer version of iOS to run correctly. Updating takes a few minutes and fixes this.'
    : 'Co-Exist needs a newer version of the Android System WebView (the component that runs the app). Updating takes a minute and fixes this.'

  const primaryBtn = isIOS
    ? ''
    : '<a href="' + WEBVIEW_URL + '" style="display:inline-block;background:' + OLIVE + ';color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 22px;border-radius:10px;margin-top:8px;">Update Android System WebView</a>'

  const secondary = isIOS
    ? ''
    : '<p style="margin:22px 0 0;font-size:15px;color:' + MUTED + ';">Or open Co-Exist in Chrome: <a href="' + WEB_URL + '" style="color:' + OLIVE_DARK + ';font-weight:700;text-decoration:none;">app.coexistaus.org</a></p>'

  root.innerHTML =
    '<div style="min-height:100vh;background:' + BG + ';margin:0;padding:24px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">' +
      '<div style="max-width:420px;margin:0 auto;padding-top:14vh;text-align:center;">' +
        '<div style="font-size:22px;font-weight:800;letter-spacing:0.5px;color:' + OLIVE + ';margin-bottom:28px;">Co-Exist</div>' +
        '<h1 style="font-size:24px;line-height:1.25;font-weight:800;color:' + INK + ';margin:0 0 14px;">' + heading + '</h1>' +
        '<p style="font-size:16px;line-height:1.5;color:' + MUTED + ';margin:0 0 24px;">' + body + '</p>' +
        primaryBtn +
        secondary +
      '</div>' +
    '</div>'
}

const belowFloor = isWebViewBelowFloor()

if (belowFloor) {
  renderWebViewUpgradeScreen()
} else {
  try {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AuthProvider>
                <ToastProvider>
                  <SentryErrorBoundary>
                    <App />
                  </SentryErrorBoundary>
                  <CookieConsentBanner />
                </ToastProvider>
              </AuthProvider>
            </BrowserRouter>
          </QueryClientProvider>
        </HelmetProvider>
      </StrictMode>,
    )
  } catch (err) {
    showBootError('render', err)
  }
}

// Service worker registration is WEB-ONLY.
//
// On native Capacitor the app shell is already served from the on-device
// bundle (androidScheme: https://localhost), so it is fully offline-capable
// with NO network. The SW's network-first navigation handler (public/sw.js)
// would instead insert a network round trip on every navigation, and on a
// flaky or offline cold start with an empty cache it resolves the navigation
// request to nothing - a blank white screen that never recovers. That is the
// network-dependent blank first paint tracked by status_board 1b1e718d: one
// cold-clear launch paints in ~3s, a later relaunch blanks past 60s because a
// lingering controlled SW serves an empty cache offline. So we never register
// it on native, and we proactively unregister any SW (and drop its caches)
// left behind by an earlier native build so updated installs shed it. On web
// (app.coexistaus.org) the SW keeps its genuine PWA offline value.
if ('serviceWorker' in navigator && Capacitor.isNativePlatform()) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((reg) => reg.unregister().catch(() => {})))
    .catch(() => {})
  if ('caches' in window) {
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => {})
  }
} else if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates periodically (every 30 min)
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000)

      // When a new SW is waiting, tell it to activate and reload
      function onNewSW() {
        const waiting = reg.waiting
        if (!waiting) return
        waiting.postMessage({ type: 'SKIP_WAITING' })
        waiting.addEventListener('statechange', () => {
          if (waiting.state === 'activated') {
            window.location.reload()
          }
        })
      }

      // SW already waiting (e.g. user revisits after deploy)
      if (reg.waiting) onNewSW()

      // New SW installed while page is open
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing
        if (!installing) return
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            onNewSW()
          }
        })
      })
    }).catch(() => {
      // Service worker registration failed - silent fallback
    })
  })
}
