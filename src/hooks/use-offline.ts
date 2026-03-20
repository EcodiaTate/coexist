import { useState, useEffect, useCallback, useRef } from 'react'
import { Capacitor } from '@capacitor/core'

interface OfflineState {
  /** Whether the device is currently online */
  isOnline: boolean
  /** Whether the device is currently offline */
  isOffline: boolean
  /** Whether we just transitioned from offline → online */
  justReconnected: boolean
}

/**
 * Detects online/offline state using the Capacitor Network plugin
 * when running natively, and the browser navigator.onLine API on web.
 */
export function useOffline(): OfflineState {
  const [isOnline, setIsOnline] = useState(true)
  const [justReconnected, setJustReconnected] = useState(false)
  const wasOffline = useRef(false)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()

  const handleStatusChange = useCallback((online: boolean) => {
    setIsOnline(online)

    if (online && wasOffline.current) {
      setJustReconnected(true)
      clearTimeout(reconnectTimer.current)
      reconnectTimer.current = setTimeout(() => setJustReconnected(false), 3000)
    }

    wasOffline.current = !online
  }, [])

  useEffect(() => {
    // Set initial state from browser API
    setIsOnline(navigator.onLine)
    wasOffline.current = !navigator.onLine

    let cleanup: (() => void) | undefined

    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Network plugin for native
      let cancelled = false

      async function setup() {
        try {
          const { Network } = await import('@capacitor/network')

          // Get initial status
          const status = await Network.getStatus()
          if (!cancelled) handleStatusChange(status.connected)

          // Listen for changes
          const listener = await Network.addListener('networkStatusChange', (s) => {
            if (!cancelled) handleStatusChange(s.connected)
          })

          cleanup = () => {
            cancelled = true
            listener.remove()
          }
        } catch {
          // Network plugin not available — fall back to browser API
        }
      }

      setup()
    } else {
      // Web: use browser events
      const onOnline = () => handleStatusChange(true)
      const onOffline = () => handleStatusChange(false)

      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)

      cleanup = () => {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    }

    return () => {
      cleanup?.()
      clearTimeout(reconnectTimer.current)
    }
  }, [handleStatusChange])

  return {
    isOnline,
    isOffline: !isOnline,
    justReconnected,
  }
}
