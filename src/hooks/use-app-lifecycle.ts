import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Handles native app lifecycle events (pause/resume).
 * On resume: invalidates all queries so stale data refreshes.
 * Call once in AppShell.
 */
export function useAppLifecycle() {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let resumeHandle: { remove: () => void } | null = null
    let pauseHandle: { remove: () => void } | null = null

    // Dynamic import to match existing pattern and avoid pulling @capacitor/app into main chunk
    import('@capacitor/app').then(({ App }) => {
      App.addListener('resume', () => {
        queryClient.invalidateQueries()
      }).then(h => { resumeHandle = h })

      // Pause: no-op for now. Realtime subscriptions auto-reconnect.
      App.addListener('pause', () => {}).then(h => { pauseHandle = h })
    })

    return () => {
      resumeHandle?.remove()
      pauseHandle?.remove()
    }
  }, [queryClient])
}
