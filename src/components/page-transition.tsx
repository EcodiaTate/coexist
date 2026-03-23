import { type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  mode?: 'push' | 'fade'
}

/**
 * Page transition wrapper.
 *
 * Animation is now handled by KeepAlive at the outlet level for
 * smooth, coordinated enter transitions with GPU compositing.
 * This wrapper remains for API compatibility — no per-page animation
 * needed since KeepAlive orchestrates the transition.
 */
export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {children}
    </div>
  )
}
