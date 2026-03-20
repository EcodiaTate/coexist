import { type ReactNode, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'

/** Global scroll-position cache keyed by history entry */
const scrollPositions = new Map<string, number>()

/** Cap cache size to prevent unbounded memory growth */
const MAX_SCROLL_ENTRIES = 100

function saveScrollPosition(key: string, pos: number) {
  if (scrollPositions.size >= MAX_SCROLL_ENTRIES) {
    // Evict oldest entry
    const firstKey = scrollPositions.keys().next().value
    if (firstKey !== undefined) scrollPositions.delete(firstKey)
  }
  scrollPositions.set(key, pos)
}

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

  const isDesktopNav = navMode === 'sidebar'

  // Restore saved scroll position on mount, or scroll to top for new routes
  useEffect(() => {
    if (noScrollRestore) return

    const saved = scrollPositions.get(scrollKey)

    if (isDesktopNav) {
      // Desktop: scroll the window itself
      if (saved !== undefined) {
        requestAnimationFrame(() => window.scrollTo(0, saved))
      } else {
        window.scrollTo(0, 0)
      }
    } else {
      // Mobile: scroll the inner container
      const el = scrollRef.current
      if (!el) return
      if (saved !== undefined) {
        requestAnimationFrame(() => { el.scrollTop = saved })
      } else {
        el.scrollTop = 0
      }
    }
  }, [scrollKey, noScrollRestore, isDesktopNav])

  // Save scroll position on unmount
  useEffect(() => {
    if (noScrollRestore) return

    if (isDesktopNav) {
      return () => {
        saveScrollPosition(scrollKey, window.scrollY)
      }
    }

    const el = scrollRef.current
    return () => {
      if (el) {
        saveScrollPosition(scrollKey, el.scrollTop)
      }
    }
  }, [scrollKey, noScrollRestore, isDesktopNav])

  const hasBottomTabs = navMode === 'bottom-tabs'

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
          // Side padding for all page content
          'px-4 lg:px-6',
          // Small gap between sidebar and page content on desktop
          isDesktopNav && 'pl-4',
          // Pad bottom: generous scroll buffer + tab bar + safe area
          hasBottomTabs
            ? 'pb-[calc(6rem+3.5rem+var(--safe-bottom))]'
            : 'pb-[calc(6rem+var(--safe-bottom))]',
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
              ? 'calc(3.5rem + var(--safe-bottom) + 1rem)'
              : 'calc(var(--safe-bottom) + 1rem)',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  )
}
