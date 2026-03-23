import { type ReactNode, Suspense } from 'react'

interface PageTransitionProps {
  children: ReactNode
  mode?: 'push' | 'fade'
}

/**
 * Page transition wrapper.
 *
 * Animation is handled by KeepAlive at the outlet level for smooth,
 * coordinated enter transitions with GPU compositing.
 *
 * This wrapper provides a local Suspense boundary so that lazy-loaded
 * pages suspend HERE (inside KeepAlive / inside AppShell) rather than
 * bubbling up to the root Suspense and unmounting the sidebar + tabs.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <Suspense fallback={<PageShimmer />}>
      <div className="flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </Suspense>
  )
}

/**
 * Minimal shimmer placeholder shown while a lazy page chunk downloads.
 * Matches the page background to avoid white flashes.
 * CSS-only animation — zero JS overhead.
 */
function PageShimmer() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-1">
      <div className="animate-pulse opacity-30 p-6 space-y-4">
        <div className="h-6 w-48 bg-primary-200/50 rounded" />
        <div className="h-4 w-72 bg-primary-200/30 rounded" />
        <div className="h-32 w-full bg-primary-200/20 rounded-xl mt-4" />
      </div>
    </div>
  )
}
