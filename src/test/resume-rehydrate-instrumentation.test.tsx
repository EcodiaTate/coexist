import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/* Sentry issue 7669690336 (COEXIST-14) was named "App hanging between 3.3 and
   4.1 seconds" and had accumulated 236 events across 86 users by 2026-09-02.
   Not one event in the latest 120 fell in that band, and 107 of them sat
   between 5004ms and 5570ms with the middle 50% spanning fifteen milliseconds
   (p25 5011, p50 5017, p75 5026). No workload has that shape. A setTimeout
   does.

   The number the issue was reporting was its own safety net. `settle` was
   raced between `requestAnimationFrame` and `setTimeout(settle, 5000)`, and
   rAF does not fire while the document is hidden, which is the exact state a
   native resume begins in. So on every resume that did not paint promptly the
   5000ms timer won, and the reporter, which fires at anything over 2000ms,
   dutifully filed a slow-resume warning about the timer it had just armed.
   110 of the 114 sampled events carrying a lifecycle breadcrumb settled with
   the app last known BACKGROUND. Four events in 120 were genuine paint
   settles.

   The second defect doubled the volume. The resume listener is registered
   through two chained promises, and the cleanup read a handle variable that
   was still null whenever teardown beat them, so listeners accumulated across
   mounts. 123 of 135 consecutive `resume: start` breadcrumb pairs were 0ms
   apart, which is two listeners in one tick, not two resumes. The outliers
   land in same-timestamp pairs (291367/291423, 108489/108527, 365511/365527).

   Neither defect is visible at runtime. Every span closes, every message
   sends, the SDK reports success, and the issue graph rises convincingly. The
   only signal is a percentile that cannot move because it is pinned to a
   constant, so the invariants are pinned here instead. */

const captureMessage = vi.fn()
const addBreadcrumb = vi.fn()
const spanEnd = vi.fn()
const setAttribute = vi.fn()

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}))

vi.mock('@sentry/capacitor', () => ({
  startInactiveSpan: () => ({ setAttribute, end: spanEnd }),
  addBreadcrumb: (...a: unknown[]) => addBreadcrumb(...a),
  captureMessage: (...a: unknown[]) => captureMessage(...a),
}))

/* scheduleIdle is the deferral under test's control, not its subject. Run it
   synchronously so each test drives the rAF-versus-deadline race directly. */
vi.mock('@/lib/defer', () => ({
  scheduleIdle: (cb: () => void) => cb(),
}))

const listeners: Record<string, (() => void) | undefined> = {}
const removes: Record<string, ReturnType<typeof vi.fn>> = {}
let addListenerDeferred: Array<() => void> = []
/* When true, addListener resolves only once the test releases it, which is how
   a teardown-before-resolve is reproduced. */
let holdAddListener = false

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (name: string, cb: () => void) => {
      listeners[name] = cb
      removes[name] = vi.fn()
      const handle = { remove: removes[name] }
      if (!holdAddListener) return Promise.resolve(handle)
      return new Promise<typeof handle>((resolve) => {
        addListenerDeferred.push(() => resolve(handle))
      })
    },
  },
}))

function Wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

/** Resolve every pending microtask so the two chained promises settle. */
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() })

let now = 0
let rafQueue: FrameRequestCallback[] = []

beforeEach(() => {
  vi.clearAllMocks()
  /* `visibilityState` is redefined per test and the descriptor outlives the
     test that set it, so a hidden window would leak forward and quietly turn a
     later reporting assertion into a suppression one. Reset it first. */
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
  for (const k of Object.keys(listeners)) delete listeners[k]
  addListenerDeferred = []
  holdAddListener = false
  now = 0
  rafQueue = []
  vi.useFakeTimers()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb)
    return rafQueue.length
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Fire the queued rAF callbacks, which jsdom will not do on its own. */
const paint = () => act(() => { const q = rafQueue; rafQueue = []; for (const cb of q) cb(now) })

/* jsdom reports `visible` and never changes it, so every visibility case has to
   be driven explicitly. The hook latches on the transition, not on the value at
   settle time, so these fire a real `visibilitychange` rather than only setting
   the property. */
const setVisibility = (state: 'visible' | 'hidden') => act(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
})

describe('COEXIST-14 resume instrumentation', () => {
  it('does not report a slow resume when only the safety-net deadline fired on a hidden webview', async () => {
    /* The hidden-webview case: rAF never runs, the 5000ms timer settles the
       span, and this is what all 184 iOS events in the population did. A report
       here is the instrument measuring itself.

       This test used to assert the hidden case while leaving jsdom's document
       VISIBLE the whole time, so it passed on a guard that keyed off the settle
       source alone and never once exercised hiddenness. The window is now
       actually hidden, which is what the 5017ms cluster is. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()
    expect(listeners.resume, 'resume listener was never registered').toBeTypeOf('function')

    act(() => { listeners.resume!() })
    setVisibility('hidden')
    now = 5017
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(spanEnd, 'the span must still be closed so it is not leaked').toHaveBeenCalled()
    expect(
      captureMessage.mock.calls,
      'a deadline settle reported a hang: this is the 5017ms cluster',
    ).toEqual([])
  })

  it('does report a slow resume when a real paint settled above the threshold', async () => {
    /* The genuine signal the issue is supposed to carry. Without this case the
       first test would pass on a reporter that was simply deleted.

       The four events this comment used to name (2405, 2434, 2883, 2897ms) are
       NOT examples of it. Re-derived over the full 237-event population on
       2026-09-02, every one of those four is a stalled rAF from an earlier
       resume cycle firing after the app came back, with 0.9s to 1.4s of
       background sitting inside the measured window. The genuine paint settles
       are 9 other events, all Android, 2053 to 4153ms, whose windows were
       visible end to end. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    now = 2897
    await paint()

    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(captureMessage.mock.calls[0][0]).toBe('slow app resume web-rehydrate: 2897ms')
    expect(captureMessage.mock.calls[0][1]).toBe('warning')
  })

  it('does not report a fast paint settle below the threshold', async () => {
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    now = 900
    await paint()

    expect(captureMessage.mock.calls).toEqual([])
  })

  it('does not report wall clock accumulated across an OS suspend', async () => {
    /* 36 events in the full population ran 5.6s to 4852s, and 24 of them carry
       a `foreground` breadcrumb timestamped after their own settle.
       `performance.now()` keeps
       advancing while the process is suspended, so a settle that lands on the
       far side of a suspend measures the suspend. In the 291s case the
       `foreground` breadcrumb arrived AFTER the settle. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    now = 291367
    await paint()

    expect(captureMessage.mock.calls).toEqual([])
  })

  it('settles once even when the deadline and a paint both arrive', async () => {
    /* Hidden, because that is the race this describes: the app is off screen,
       the deadline wins, and the paint arrives afterwards when the app returns.
       Left visible, the deadline settle is now a reported hang and this would
       be asserting that a real hang stays silent. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    setVisibility('hidden')
    now = 5017
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    now = 5200
    await paint()

    expect(spanEnd).toHaveBeenCalledTimes(1)
    expect(captureMessage.mock.calls).toEqual([])
  })

  it('removes a resume listener that resolved after the effect was torn down', async () => {
    /* The leak: cleanup ran while the addListener promise was still pending,
       the handle variable was null, and the listener survived into the next
       mount. This is what put two to four `resume: start` breadcrumbs 0ms
       apart on 111 of 120 events. */
    holdAddListener = true
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    const { unmount } = renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    unmount()
    await act(async () => { for (const release of addListenerDeferred) release(); await Promise.resolve() })
    await flush()

    expect(
      removes.resume,
      'addListener never ran, so this test proves nothing',
    ).toBeTypeOf('function')
    expect(
      removes.resume!.mock.calls.length,
      'the resume listener outlived its effect: every later mount stacks another',
    ).toBeGreaterThan(0)
  })

  it('removes both listeners on an ordinary unmount', async () => {
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    const { unmount } = renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()
    unmount()
    expect(removes.resume!.mock.calls.length).toBeGreaterThan(0)
    expect(removes.pause!.mock.calls.length).toBeGreaterThan(0)
  })

  it('does not report a paint settle whose window was hidden part way through', async () => {
    /* The artifact the first fix still reported. rAF does not run while the
       document is hidden, so a paint settle that arrives after the app comes
       BACK is a stalled frame from the earlier resume, and its duration is
       mostly time off screen. Event 84a42639 reported 2405ms of which 335ms was
       the paint. 13 of the 22 sub-5000ms events in the population are this. A
       visibility check taken at settle time cannot see it: the document is
       visible again by then, which is why the hook latches the transition. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    setVisibility('hidden')
    setVisibility('visible')
    now = 2405
    await paint()

    expect(document.visibilityState, 'the document must be visible at settle, which is the point').toBe('visible')
    expect(
      captureMessage.mock.calls,
      'a cross-background rAF settle was reported as a slow resume',
    ).toEqual([])
  })

  it('does not report when the resume began with the webview already hidden', async () => {
    /* The iOS shape: foreground, then background 8ms later, then the resume
       listener runs. Event 505fbb26. Nothing transitions during the window, so
       the flag has to be seeded from the state at the start of it. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    act(() => { listeners.resume!() })
    now = 2897
    await paint()

    expect(captureMessage.mock.calls).toEqual([])
  })

  it('does report a deadline settle whose window stayed visible, which is a real hang', async () => {
    /* The signal that suppressing every deadline settle would delete. rAF
       starved for the full 5000ms while the user was looking at the app is
       frozen UI. It did not happen once in the 237-event population, so this
       path is silent today and only speaks when something new goes wrong.
       Distinct message so it groups as its own issue instead of landing back on
       COEXIST-14. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    now = 5017
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })

    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(captureMessage.mock.calls[0][0]).toBe('app resume never painted: visible 5017ms without a frame')
    expect(captureMessage.mock.calls[0][1]).toBe('error')

    // A frame arriving after the deadline must not file a second report.
    now = 5200
    await paint()
    expect(captureMessage, 'the late paint reported on top of the deadline').toHaveBeenCalledTimes(1)
    expect(spanEnd).toHaveBeenCalledTimes(1)
    expect(
      captureMessage.mock.calls[0][0],
      'the real-hang message must not group onto the slow-resume issue',
    ).not.toContain('slow app resume web-rehydrate')
  })

  it('removes the visibility listener when the effect is torn down before a settle', async () => {
    /* Defect 2 in this file was a listener that outlived its owner. The
       visibility listener is per-resume, so it needs its own drain. */
    const { useAppLifecycle } = await import('@/hooks/use-app-lifecycle')
    const removeSpy = vi.spyOn(document, 'removeEventListener')
    const { unmount } = renderHook(() => useAppLifecycle(), { wrapper: Wrapper })
    await flush()

    act(() => { listeners.resume!() })
    unmount()

    expect(
      removeSpy.mock.calls.some(([type]) => type === 'visibilitychange'),
      'the per-resume visibility listener survived the effect',
    ).toBe(true)
  })
})
