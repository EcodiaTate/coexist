import { type ReactNode, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'

/** Global scroll-position cache keyed by history entry */
const scrollPositions = new Map<string, number>()

interface PageProps {
  /** Optional header component (e.g. <Header />) */
  header?: ReactNode
  /** Optional sticky bottom CTA */
  footer?: ReactNode
  /** Page content */
  children: ReactNode
  /** Additional class names */
  className?: string
  /** Disable scroll restoration (e.g. for modals, sheets) */
  noScrollRestore?: boolean
}

export function Page({
  header,
  footer,
  children,
  className,
  noScrollRestore = false,
}: PageProps) {
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { navMode } = useLayout()

  // Use location.key (unique per history entry) so back-nav restores position
  // while forward-nav starts at top (no saved position for new keys)
  const scrollKey = location.key ?? location.pathname

  // Restore saved scroll position on mount, or scroll to top for new routes
  useEffect(() => {
    if (noScrollRestore) return
    const el = scrollRef.current
    if (!el) return

    const saved = scrollPositions.get(scrollKey)
    if (saved !== undefined) {
      el.scrollTop = saved
    } else {
      el.scrollTo(0, 0)
    }
  }, [scrollKey, noScrollRestore])

  // Save scroll position on unmount
  useEffect(() => {
    if (noScrollRestore) return
    const el = scrollRef.current
    return () => {
      if (el) {
        scrollPositions.set(scrollKey, el.scrollTop)
      }
    }
  }, [scrollKey, noScrollRestore])

  const hasBottomTabs = navMode === 'bottom-tabs'

  const isDesktopNav = navMode === 'sidebar'

  return (
    <div className={cn('flex flex-col flex-1', !isDesktopNav && 'min-h-0')}>
      {header}

      <main
        id="main-content"
        ref={scrollRef}
        className={cn(
          'flex-1',
          // On mobile/native, use inner scroll container for tab-bar offset + scroll restore
          // On desktop, let the browser handle scrolling naturally
          !isDesktopNav && 'overflow-y-auto overflow-x-hidden overscroll-contain',
          // Small gap between sidebar and page content on desktop
          isDesktopNav && 'pl-4',
          // Pad bottom for bottom tab bar + safe area
          hasBottomTabs && 'pb-[calc(3.5rem+var(--safe-bottom))]',
          className,
        )}
      >
        {children}
      </main>

      {footer && (
        <div
          className={cn(
            'sticky bottom-0 z-30',
            'bg-white/95 backdrop-blur-md',
            'border-t border-primary-100',
            'px-4 py-3',
          )}
          style={{
            paddingBottom: hasBottomTabs
              ? 'calc(3.5rem + var(--safe-bottom) + 0.75rem)'
              : 'calc(var(--safe-bottom) + 0.75rem)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
