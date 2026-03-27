import { type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface QueryErrorFallbackProps {
  error?: Error | null
  resetErrorBoundary?: () => void
}

/**
 * Fallback UI for query errors. Shows a user-friendly error
 * with retry button instead of an eternal loading skeleton.
 */
export function QueryErrorFallback({ error, resetErrorBoundary }: QueryErrorFallbackProps) {
  const queryClient = useQueryClient()

  const handleRetry = () => {
    queryClient.invalidateQueries()
    resetErrorBoundary?.()
  }

  const isNetworkError = error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('NetworkError') ||
    error?.message?.includes('network')

  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
      <AlertTriangle className="h-8 w-8 text-amber-500" />
      <p className="text-sm font-medium text-gray-700">
        {isNetworkError
          ? 'Unable to connect. Please check your internet connection.'
          : 'Something went wrong loading this data.'}
      </p>
      <button
        onClick={handleRetry}
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )
}

/**
 * Inline error state for individual query hooks.
 * Use this in page components: `if (isError) return <QueryError error={error} refetch={refetch} />`
 */
export function QueryError({
  error,
  refetch,
  compact = false,
}: {
  error?: Error | null
  refetch?: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <button
        onClick={refetch}
        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
      >
        <AlertTriangle className="h-3 w-3" />
        Failed to load
        {refetch && <RefreshCw className="h-3 w-3" />}
      </button>
    )
  }

  return <QueryErrorFallback error={error} resetErrorBoundary={refetch} />
}

/**
 * HOC to wrap a children prop with error handling from a query hook.
 */
export function WithQueryError({
  isError,
  error,
  refetch,
  children,
}: {
  isError: boolean
  error?: Error | null
  refetch?: () => void
  children: ReactNode
}) {
  if (isError) return <QueryError error={error} refetch={refetch} />
  return <>{children}</>
}
