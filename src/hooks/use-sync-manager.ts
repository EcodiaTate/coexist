import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOffline } from '@/hooks/use-offline'
import { useToast } from '@/components/toast'
import {
  syncAllOfflineActions,
  getPendingActionCount,
  setLastSyncTime,
  type SyncResult,
} from '@/lib/offline-sync'

/**
 * Manages the full online→offline→online sync cycle:
 *  1. When reconnecting, auto-syncs all queued actions
 *  2. Shows "Syncing…" → "All synced" or conflict toasts
 *  3. Refetches critical queries after sync
 */
export function useSyncManager() {
  const { justReconnected, isOnline } = useOffline()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const syncing = useRef(false)

  useEffect(() => {
    if (!justReconnected || syncing.current) return

    const pending = getPendingActionCount()
    if (pending === 0) {
      // No pending actions - just refetch stale queries
      queryClient.invalidateQueries()
      toast.success('Back online')
      return
    }

    syncing.current = true
    toast.info(`Syncing ${pending} pending action${pending === 1 ? '' : 's'}…`)

    syncAllOfflineActions()
      .then((result: SyncResult) => {
        setLastSyncTime()

        // Show conflict notifications
        for (const conflict of result.conflicts) {
          toast.warning(conflict, 6000)
        }

        if (result.conflicts.length === 0 && result.failed === 0) {
          toast.success('All synced')
        } else if (result.failed > 0) {
          toast.warning(`${result.failed} action${result.failed === 1 ? '' : 's'} will retry next time`)
        }

        // Refetch critical data after sync
        queryClient.invalidateQueries({ queryKey: ['my-events'] })
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] })
        queryClient.invalidateQueries({ queryKey: ['unread-counts'] })
      })
      .catch(() => {
        toast.error('Sync failed - will retry next time')
      })
      .finally(() => {
        syncing.current = false
      })
  }, [justReconnected, queryClient, toast])

  return { isOnline }
}
