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

        let settled = false
        const settle = (source: 'paint' | 'deadline') => {
          if (settled) return
          settled = true
          const durationMs = Math.round(performance.now() - startedAt)
          Sentry.addBreadcrumb({
            category: 'app.lifecycle',
            message: 'resume: settled',
            level: 'info',
            data: { duration_ms: durationMs, source },
          })
          span.setAttribute('duration_ms', durationMs)
          span.setAttribute('settle_source', source)
          span.end()
          // Breadcrumbs only attach to a co-firing error, and the span is
          // sampled (tracesSampleRate 0.1 in prod). Surface a slow resume as
          // its own searchable event so it is visible on issue 7616758580 even
          // when no hang error is captured.
          //
          // ONLY A PAINT SETTLE MEASURES A RESUME A USER WAITED THROUGH.
          // A deadline settle means requestAnimationFrame never fired, and rAF
          // does not fire while the document is hidden (the safety net below
          // exists for exactly that case). So on any resume that lands with the
          // webview still off screen the deadline ALWAYS wins and ALWAYS
          // reports at least RESUME_SETTLE_DEADLINE_MS, which is above the slow
          // threshold by construction. Reporting it captured the timer, not the
          // app.
          //
          // Measured 2026-09-02 over the latest 120 events on issue 7669690336
          // (Sentry REST /issues/7669690336/events/?full=true, 12 pages):
          // 107 of 120 sat in a 5004ms to 5570ms band whose middle 50% spans
          // 15ms (p25 5011, p50 5017, p75 5026), which is the shape of a
          // setTimeout and not of a hang; and 110 of the 114 events carrying a
          // lifecycle crumb settled with the app last known BACKGROUND. Only 4
          // of 120 were genuine paint settles (2405, 2434, 2883, 2897ms, all
          // Android, all after a foreground transition). Not one event in the
          // whole sample fell in the 3.3s to 4.1s band the issue is named for.
          if (source !== 'paint') return
          // A paint settle far beyond the deadline is not work either: it means
          // both the deadline timer and rAF were frozen by an OS suspend and
          // `performance.now()` accumulated wall clock across it. The same
          // sample carried 7 such events between 77.8s and 365.5s, every one of
          // them with the app backgrounded and, in the 291s case, with the
          // `foreground` crumb landing AFTER the settle.
          if (durationMs > RESUME_SETTLE_DEADLINE_MS) return
          if (durationMs >= SLOW_RESUME_THRESHOLD_MS) {
            Sentry.captureMessage(
              `slow app resume web-rehydrate: ${durationMs}ms`,
              'warning',
            )
          }
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
        // This path closes the span so it is not leaked; it does NOT report.
        setTimeout(() => settle('deadline'), RESUME_SETTLE_DEADLINE_MS)
      }).then(track)

      // Pause: no-op for now. Realtime subscriptions auto-reconnect.
      App.addListener('pause', () => {}).then(track)
    })

    return () => {
      disposed = true
      for (const h of handles) h.remove()
      handles.length = 0
    }
  }, [queryClient])
}
