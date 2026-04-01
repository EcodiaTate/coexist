import { useState, useCallback } from 'react'
import { useToast } from '@/components/toast'
import type { UseMutationResult } from '@tanstack/react-query'

interface UseFormMutationOptions<TData, TVariables> {
  mutation: UseMutationResult<TData, Error, TVariables>
  onSuccess?: (data: TData) => void
  successMessage?: string
  errorMessage?: string
  resetForm?: () => void
}

/**
 * Wraps a TanStack Query mutation with consistent toast notifications,
 * error state, and optional form reset. Eliminates the repeated try/catch
 * + toast pattern across admin pages and forms.
 *
 * Usage:
 * ```ts
 * const createMutation = useCreateCollective()
 * const { handleSubmit, error, isLoading } = useFormMutation({
 *   mutation: createMutation,
 *   successMessage: 'Collective created',
 *   resetForm: () => setFormData(initialState),
 *   onSuccess: () => setOpen(false),
 * })
 * ```
 */
export function useFormMutation<TData, TVariables>({
  mutation,
  onSuccess,
  successMessage = 'Saved successfully',
  errorMessage,
  resetForm,
}: UseFormMutationOptions<TData, TVariables>) {
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSubmit = useCallback(
    async (payload: TVariables) => {
      setError(null)
      try {
        const data = await mutation.mutateAsync(payload)
        toast.success(successMessage)
        resetForm?.()
        onSuccess?.(data)
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : (errorMessage ?? 'Operation failed')
        setError(message)
        toast.error(message)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutation.mutateAsync, onSuccess, successMessage, errorMessage, resetForm, toast],
  )

  return {
    handleSubmit,
    error,
    setError,
    isLoading: mutation.isPending,
  }
}
