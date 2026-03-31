import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'
import { useOffline } from '@/hooks/use-offline'
import { useToast } from '@/components/toast'
import { queueOfflineAction, type OfflineActionType } from '@/lib/offline-sync'

/**
 * Wraps a standard useMutation to automatically queue the action when offline.
 *
 * When online: runs mutationFn normally (with optimistic updates, rollback, etc.)
 * When offline: queues the action for later sync, fires onMutate for optimistic UI,
 *               shows a "queued" toast, and skips onSettled query invalidation.
 *
 * DO NOT use for operations that need real-time validation (stock, payments, capacity).
 */
export function useOfflineMutation<TData, TError, TVariables, TContext>(
  options: UseMutationOptions<TData, TError, TVariables, TContext> & {
    /** The offline action type to queue */
    offlineActionType: OfflineActionType
    /** Transform mutation variables into an offline queue payload */
    toOfflinePayload: (variables: TVariables) => Record<string, unknown>
    /** Custom toast message when queued offline (default: "Saved offline — will sync when back online") */
    offlineToast?: string
    /** Query keys to invalidate after successful online mutation (used in onSettled) */
    invalidateKeys?: unknown[][]
  },
) {
  const { isOffline } = useOffline()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const {
    offlineActionType,
    toOfflinePayload,
    offlineToast = 'Saved offline — will sync when back online',
    invalidateKeys,
    mutationFn,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...rest
  } = options

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    mutationFn: async (variables: TVariables) => {
      if (isOffline) {
        queueOfflineAction(offlineActionType, toOfflinePayload(variables))
        // Return undefined cast — the optimistic update already applied via onMutate
        return undefined as unknown as TData
      }
      if (!mutationFn) throw new Error('mutationFn is required')
      return mutationFn(variables)
    },
    onMutate: async (variables: TVariables) => {
      // Always run optimistic updates (online or offline)
      if (onMutate) return onMutate(variables)
      return undefined as TContext
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      // Only rollback on real errors (online), not on offline queue
      if (!isOffline && onError) {
        onError(error, variables, context)
      }
    },
    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      if (isOffline) {
        toast.info(offlineToast)
        return
      }
      if (onSuccess) onSuccess(data, variables, context)
    },
    onSettled: (data, error, variables, context) => {
      if (isOffline) {
        // Don't invalidate queries while offline — cache is stale anyway
        return
      }
      if (onSettled) {
        onSettled(data, error, variables, context)
      } else if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key })
        }
      }
    },
  })
}
