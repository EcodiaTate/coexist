import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOffline } from '@/hooks/use-offline'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import {
  syncAllOfflineActions,
  getPendingActionCount,
  setLastSyncTime,
  onSyncIssueChange,
  type SyncResult,
} from '@/lib/offline-sync'
import type { SyncIssue } from '@/components/sync-status-banner'

/**
 * Manages the full online→offline→online sync cycle:
 *  1. When reconnecting, auto-syncs all queued actions
 *  2. Shows "Syncing…" → "All synced" or conflict toasts
 *  3. Persists a sync issue banner (auth-expired / storage-full) until resolved
 *  4. Auto-retries pending queue after re-authentication
 *  5. Refetches critical queries after sync
 */
export function useSyncManager() {
  const { justReconnected, isOnline } = useOffline()
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const syncing = useRef(false)
  const [syncIssue, setSyncIssue] = useState<SyncIssue>(null)
  const prevUserId = useRef<string | null>(null)

  // Register the sync issue callback so offline-sync.ts can push state changes
  useEffect(() => {
    onSyncIssueChange((issue) => setSyncIssue(issue))
    return () => onSyncIssueChange(() => {})
  }, [])

  // Listen for storage-full events dispatched by safeSet
  useEffect(() => {
    const handler = () => setSyncIssue('storage-full')
    window.addEventListener('coexist:storage-full', handler)
    return () => window.removeEventListener('coexist:storage-full', handler)
  }, [])

  const runSync = useCallback(async (reason: 'reconnect' | 'reauth') => {
    if (syncing.current) return

    const pending = getPendingActionCount()
    if (pending === 0) {
      if (reason === 'reconnect') {
        queryClient.invalidateQueries()
        toast.success('Back online')
      }
      setSyncIssue(null)
      return
    }

    syncing.current = true
    toast.info(`Syncing ${pending} pending action${pending === 1 ? '' : 's'}…`)

    try {
      const result: SyncResult = await syncAllOfflineActions()
      setLastSyncTime()

      // Show conflict notifications
      for (const conflict of result.conflicts) {
        // Don't show the "Session expired" toast if we're showing the persistent banner
        if (conflict.includes('Session expired')) continue
        toast.warning(conflict, 6000)
      }

      if (result.conflicts.length === 0 && result.failed === 0) {
        toast.success('All synced')
        setSyncIssue(null)
      } else if (result.failed > 0 && !result.conflicts.some(c => c.includes('Session expired'))) {
        toast.warning(`${result.failed} action${result.failed === 1 ? '' : 's'} will retry next time`)
      }

      // Refetch all data that may have been mutated offline
      invalidatePostSync(queryClient)
    } catch {
      toast.error('Sync failed - will retry next time')
    } finally {
      syncing.current = false
    }
  }, [queryClient, toast])

  // Auto-sync on reconnect
  useEffect(() => {
    if (!justReconnected) return
    runSync('reconnect')
  }, [justReconnected, runSync])

  // Auto-retry pending queue after re-authentication
  // (user was null → now has a user, meaning they just signed back in)
  useEffect(() => {
    const currentId = user?.id ?? null
    const wasNull = prevUserId.current === null
    prevUserId.current = currentId

    if (currentId && wasNull && syncIssue === 'auth-expired' && isOnline) {
      runSync('reauth')
    }
  }, [user?.id, syncIssue, isOnline, runSync])

  return { isOnline, syncIssue, pendingCount: getPendingActionCount() }
}

/** Invalidate all query keys that may have been affected by offline mutations */
function invalidatePostSync(queryClient: ReturnType<typeof useQueryClient>) {
  const keys = [
    'my-events', 'profile', 'chat-messages', 'unread-counts',
    'my-tasks', 'collective-tasks', 'leader-todos', 'blocked-users',
    'notifications', 'notifications-unread', 'event-impact', 'impact-stats',
    'profile-stats', 'national-impact', 'collective-impact', 'moderation-queue',
    'chat-polls', 'chat-announcement', 'dev-my-module-progress',
    'dev-my-section-progress', 'dev-quiz-attempts', 'pending-surveys',
    'leader-dashboard', 'admin-kpi-dashboard', 'pending-impact-form-tasks',
  ]
  for (const key of keys) {
    queryClient.invalidateQueries({ queryKey: [key] })
  }
}
