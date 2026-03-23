import { type ReactNode, Suspense } from 'react'

interface PageTransitionProps {
  children: ReactNode
  mode?: 'push' | 'fade'
}

/**
 * Page transition wrapper.
 *
 * Animation is handled by KeepAlive at the outlet level.
 *
 * This wrapper provides a local Suspense boundary so that lazy-loaded
 * pages suspend HERE (inside KeepAlive / inside AppShell) rather than
 * bubbling up to the root Suspense and unmounting the sidebar + tabs.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <Suspense fallback={<div className="flex-1 min-h-0 bg-surface-1" />}>
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </Suspense>
  )
}
