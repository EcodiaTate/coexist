import { useState, useEffect } from 'react'
import { getPendingActionCount } from '@/lib/offline-sync'

/**
 * Tracks the count of pending offline actions.
 * Re-checks on storage events and every 2 seconds while there are pending items.
 */
export function usePendingSync() {
  const [count, setCount] = useState(() => getPendingActionCount())

  useEffect(() => {
    const refresh = () => setCount(getPendingActionCount())

    // Listen for cross-tab storage changes
    window.addEventListener('storage', refresh)

    // Poll while there are pending items (for same-tab updates)
    const interval = setInterval(refresh, 2000)

    return () => {
      window.removeEventListener('storage', refresh)
      clearInterval(interval)
    }
  }, [])

  return { count, hasPending: count > 0 }
}
