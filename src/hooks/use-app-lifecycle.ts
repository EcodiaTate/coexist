import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'
import * as Sentry from '@sentry/capacitor'
import { scheduleIdle } from '@/lib/defer'

/**
 * Query-key prefixes that must be fresh the moment the app returns to the
 * foreground: chat, unread badges, notifications, updates and the home feed.
 * These are the "what changed while I was away" surfaces a returning user looks
 * at first. Everything else (event lists, leader dashboards, admin suite,
 * profiles, collectives) keeps its normal staleTime (5 min, set in main.tsx)
 * and refetches lazily when its screen is next mounted, so a resume does not
 * fire a full-cache refetch storm on the already-contended main thread.
 * Origin: Sentry COEXIST-K resume hang, issue 7616758580.
 */
const RESUME_REFRESH_PREFIXES = new Set([
  'home',
  'chat-messages',
  'channel-messages',
  'chat-poll',
  'unread-counts',
  'channel-unread',
  'notifications',
  'notifications-unread',
  'updates-unread',
  'my-events',
  'my-tasks',
  // Event-day is the live check-in gate. A leader who backgrounds the app
  // mid-event and comes back must not be shown the roster and walk-in tallies
  // from before they left, which is what happened at the Darwin East Point
  // Beach Clean Up on 2026-08-30.
  'event-roster',
  'event-walk-ins',
])

/** A resume that takes at least this long to settle is the COEXIST-K signature. */
const SLOW_RESUME_THRESHOLD_MS = 2000

/**
 * Safety-net deadline for ending the span when a paint never comes.
 *
 * This number is load-bearing for reading the issue, not just for the timer.
 * A settle that lands on this deadline measures the deadline, so it must never
 * be reported as a slow resume. See the note on `settle` below.
 */
const RESUME_SETTLE_DEADLINE_MS = 5000

/**
 * Handles native app lifecycle events (pause/resume).
 *
 * On resume the previous behaviour was a synchronous, blanket
 * `queryClient.invalidateQueries()` (every query in the cache) fired inside the
 * `resume` tick. After a long background iOS jettisons the WKWebView
 * WebContent process; on resume WebKit must relaunch and re-render it, and the
 * native main thread parks waiting on that IPC (Sentry COEXIST-K, issue
 * 7616758580, Family B: WebKit AuxiliaryProcessProxy::sendWithAsyncReply).
 * Dumping a full invalidate + refetch storm into that same tick lengthens the
 * visible hang.
 *
 * Now the invalidation is (1) deferred off the synchronous resume tick so first
 * paint is not blocked, and (2) narrowed to the freshness-critical prefixes
 * above so resume does not refetch every batch query at once. The whole window
 * is wrapped in a Sentry span (`app.resume.web-rehydrate`) plus breadcrumbs and
 * a slow-resume message so native-main-to-web-resume duration is measured on
 * the issue going forward.
 *
 * HONEST CAVEAT: the native WebContent relaunch itself happens while JS is not
 * running, so it is not directly observable from the WebView. This span
 * measures the app-side resume-to-settle window (the portion we control), not
 * the native relaunch latency.
 *
 * Call once in AppShell.
 */
export function useAppLifecycle() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // THE HANDLE HAS TO BE TRACKED THROUGH A DISPOSED FLAG, NOT A BARE `let`.
    // The listener is registered inside two chained promises (the dynamic
    // import, then addListener). The previous code assigned the handle in the
    // final `.then()` and the cleanup read a variable that was still null
    // whenever teardown beat those promises, so the listener outlived the
    // effect and the next mount added another one on top of it.
    //
    // Measured 2026-09-02 on Sentry issue 7669690336, latest 120 events: 123 of
    // 135 consecutive `resume: start` breadcrumb pairs were 0ms apart, which is
    // two or more live listeners firing inside a single resume tick rather than
    // two separate resumes. 99 events carried exactly 2 starts and 12 carried
    // 4; exactly one carried 1. Every duplicate listener opens its own span,
    // arms its own deadline timer and sends its own captureMessage, so roughly
    // half the issue's raw event count was one resume counted twice. The
    // outliers prove it directly: they arrive in pairs on the same timestamp
    // (291367/291423, 108489/108527, 365511/365527).
    let disposed = false
    const handles: Array<{ remove: () => void }> = []
    // Visibility listeners are per-resume, not per-effect, so they need their
    // own drain on teardown.
    const releases: Array<() => void> = []
    const track = (h: { remove: () => void }) => {
      if (disposed) h.remove()
      else handles.push(h)
    }

    // Dynamic import to match existing pattern and avoid pulling @capacitor/app into main chunk
    import('@capacitor/app').then(({ App }) => {
      App.addListener('resume', () => {
        const startedAt = performance.now()
        const span = Sentry.startInactiveSpan({
          name: 'app.resume.web-rehydrate',
          op: 'app.resume',
          forceTransaction: true,
        })
        Sentry.addBreadcrumb({
          category: 'app.lifecycle',
          message: 'resume: start',
          level: 'info',
        })

        // WHETHER THE WINDOW WAS EVER HIDDEN IS THE MEASUREMENT, NOT WHETHER
        // IT IS HIDDEN NOW. Checking visibility at settle time is the obvious
        // guard and it is wrong: a paint settle that arrives because the app
        // came BACK from the background is visible at the instant it settles,
        // which is exactly the artifact this guard exists to drop. Sampled
        // 2026-09-02 on event 84a42639 (Android, reported 2405ms): foreground
        // 09:36:04.840, resume start .886, BACKGROUND 09:36:05.993, foreground
        // 09:36:06.930, settle 09:36:07.270. Only 335ms of that 2405ms window
        // was the paint. The rest was the app off screen, and a settle-time
        // check would have waved it through.
        //
        // So the flag latches on any hidden transition across the whole window
        // and is seeded from the state at window start, which is the iOS case:
        // the resume listener routinely fires AFTER the app has already gone
        // back to background (event 505fbb26, foreground 05:45:24.131,
        // background .139, resume start .140).
        let hiddenDuringWindow =
          typeof document !== 'undefined' && document.visibilityState === 'hidden'
        const onVisibilityChange = () => {
          if (document.visibilityState === 'hidden') hiddenDuringWindow = true
        }
        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', onVisibilityChange)
        }
        const releaseVisibility = () => {
          if (typeof document !== 'undefined') {
            document.removeEventListener('visibilitychange', onVisibilityChange)
          }
        }
        // Registered against the effect too: a resume whose settle never runs
        // because the process was killed must not leave the listener behind.
        // Defect 2 in this file was exactly a listener that outlived its owner.
        releases.push(releaseVisibility)

        let settled = false
        const settle = (source: 'paint' | 'deadline') => {
          if (settled) return
          settled = true
          releaseVisibility()
          const durationMs = Math.round(performance.now() - startedAt)
          Sentry.addBreadcrumb({
            category: 'app.lifecycle',
            message: 'resume: settled',
            level: 'info',
            data: {
              duration_ms: durationMs,
              source,
              hidden_during_window: hiddenDuringWindow,
            },
          })
          span.setAttribute('duration_ms', durationMs)
          span.setAttribute('settle_source', source)
          span.setAttribute('hidden_during_window', hiddenDuringWindow)
          span.end()
          // Breadcrumbs only attach to a co-firing error, and the span is
          // sampled (tracesSampleRate 0.1 in prod). Surface a slow resume as
          // its own searchable event so it is visible on issue 7616758580 even
          // when no hang error is captured.
          //
          // A WINDOW THAT WAS EVER HIDDEN MEASURES THE HIDING, NOT THE APP.
          // rAF does not run while the document is hidden, so on a resume that
          // lands with the webview off screen the deadline wins by
          // construction and reports at least RESUME_SETTLE_DEADLINE_MS, which
          // clears the slow threshold without anything being slow.
          //
          // Re-derived 2026-09-02 over ALL 237 events on issue 7669690336
          // (Sentry REST /issues/7669690336/events/?full=true, 24 pages to the
          // end of the population, not a recency window): p50 5018ms with the
          // middle 50% spanning 100ms, and the oldest 117 events carry the same
          // 5018ms p50, so the cluster is the timer and not a recent
          // regression. iOS produced 184 events and its FASTEST was 5001ms: not
          // once in nineteen days did an iOS resume paint before the deadline.
          // Reconstructing each window from its breadcrumbs and integrating the
          // visible time: 75 windows fully hidden, 131 partly (iOS typically
          // 0.1 to 5 per cent visible, a foreground blip then straight back),
          // 22 unattributable, and 9 fully visible. Those 9 are the only real
          // measurements in the issue, all Android, 2053 to 4153ms.
          if (hiddenDuringWindow) return
          if (source === 'paint') {
            // A paint settle far beyond the deadline is not work either: both
            // the timer and rAF were frozen by an OS suspend and
            // `performance.now()` accumulated wall clock across it. 36 events
            // ran from 5.6s to 4852s, and 24 of them carry a `foreground`
            // breadcrumb timestamped AFTER their own settle. On cca9e997 the
            // app backgrounded 7ms after the resume tick and the settle landed
            // 365527ms later, 91ms before the foreground crumb.
            if (durationMs > RESUME_SETTLE_DEADLINE_MS) return
            if (durationMs >= SLOW_RESUME_THRESHOLD_MS) {
              Sentry.captureMessage(
                `slow app resume web-rehydrate: ${durationMs}ms`,
                'warning',
              )
            }
            return
          }
          // A DEADLINE SETTLE ON A WINDOW THAT STAYED VISIBLE IS THE REAL HANG.
          // rAF starved for the full deadline while the user was looking at the
          // app is frozen UI, and suppressing every deadline settle to kill the
          // false positives would delete this signal with them. It did not
          // occur once in the 237-event population, so this path costs nothing
          // today and only speaks when something genuinely new happens. It
          // carries its own message so it groups as its own Sentry issue rather
          // than re-polluting COEXIST-14.
          //
          // UNVERIFIED: that `document.visibilityState` flips to 'hidden' in a
          // backgrounded WKWebView was not exercised on a real iOS device in
          // the pass that wrote this. It is the same premise the rAF-starvation
          // diagnosis already rests on. If it is wrong on some platform this
          // path gets noisy in a clearly-named new issue rather than corrupting
          // the existing one.
          Sentry.captureMessage(
            `app resume never painted: visible ${durationMs}ms without a frame`,
            'error',
          )
        }

        // Defer the cache work off the synchronous resume tick so first paint
        // is not blocked by an invalidate/refetch storm while WebKit is still
        // rehydrating the WebContent process.
        scheduleIdle(() => {
          queryClient.invalidateQueries({
            predicate: (query) =>
              RESUME_REFRESH_PREFIXES.has(query.queryKey[0] as string),
          })
          // Approximate "first settle after resume": one paint after the
          // invalidation was dispatched.
          requestAnimationFrame(() => settle('paint'))
        })
        // Safety net: end the span even if a paint never comes because the app
        // was re-backgrounded before settling (rAF does not fire when hidden).
        // This path closes the span so it is not leaked. It reports only when
        // the window stayed visible throughout, which is a genuine hang.
        setTimeout(() => settle('deadline'), RESUME_SETTLE_DEADLINE_MS)
      }).then(track)

      // Pause: no-op for now. Realtime subscriptions auto-reconnect.
      App.addListener('pause', () => {}).then(track)
    })

    return () => {
      disposed = true
      for (const h of handles) h.remove()
      handles.length = 0
      for (const release of releases) release()
      releases.length = 0
    }
  }, [queryClient])
}
