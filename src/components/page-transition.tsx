import { type ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  mode?: 'push' | 'fade'
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      {children}
    </div>
  )
}
