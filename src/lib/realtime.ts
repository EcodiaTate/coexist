import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Subscribe to a Supabase realtime channel with automatic reconnect
 * and status monitoring. Replaces bare `.subscribe()` calls.
 *
 * Usage:
 *   const channel = supabase.channel('my-channel').on(...)
 *   subscribeWithReconnect(channel, { onStatusChange })
 *
 * Returns a cleanup function.
 */
export function subscribeWithReconnect(
  channel: RealtimeChannel,
  options?: {
    /** Called when subscription status changes */
    onStatusChange?: (status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR') => void
    /** Max reconnect attempts before giving up (default: 5) */
    maxRetries?: number
  },
): () => void {
  const maxRetries = options?.maxRetries ?? 5
  let retryCount = 0
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let isCleanedUp = false

  function attemptSubscribe() {
    channel.subscribe((status) => {
      if (isCleanedUp) return

      options?.onStatusChange?.(status)

      if (status === 'SUBSCRIBED') {
        retryCount = 0
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        if (retryCount < maxRetries && !isCleanedUp) {
          retryCount++
          const delay = Math.min(1000 * 2 ** retryCount, 30000)
          retryTimer = setTimeout(() => {
            if (!isCleanedUp) {
              channel.unsubscribe()
              attemptSubscribe()
            }
          }, delay)
        }
      }
    })
  }

  attemptSubscribe()

  return () => {
    isCleanedUp = true
    if (retryTimer) clearTimeout(retryTimer)
    channel.unsubscribe()
  }
}
