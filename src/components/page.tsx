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
  /** Sticky header rendered inside the scroll container — floats over content
   *  (use for full-bleed hero pages where header must overlay the hero) */
  stickyOverlay?: ReactNode
  /** Optional sticky bottom CTA */
  footer?: ReactNode
  /** Page content */
  children: ReactNode
  /** Additional class names */
  className?: string
  /** Disable scroll restoration (e.g. for modals, sheets) */
  noScrollRestore?: boolean
  /** Hide the default atmospheric background (when the page provides its own) */
  noBackground?: boolean
  /** @deprecated Swipe-back is now handled globally by KeepAlive */
  swipeBack?: boolean
}

export function Page({
  header,
  stickyOverlay,
  footer,
  children,
  className,
  noScrollRestore = false,
  noBackground = false,
}: PageProps) {
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { navMode } = useLayout()

  // Use location.key (unique per history entry) so back-nav restores position
  // while forward-nav starts at top (no saved position for new keys)
  const scrollKey = location.key ?? location.pathname

  const isDesktopNav = navMode === 'sidebar'

  // Restore saved scroll position on mount, or scroll to top for new routes.
  // Double-rAF ensures the cached page is visible and laid out before we scroll,
  // preventing the "teleport to top" flash on back-navigation.
  useEffect(() => {
    if (noScrollRestore) return

    const saved = scrollPositions.get(scrollKey)

    const restore = () => {
      if (isDesktopNav) {
        if (saved !== undefined) {
          window.scrollTo({ top: saved, behavior: 'instant' })
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' })
        }
      } else {
        const el = scrollRef.current
        if (!el) return
        if (saved !== undefined) {
          el.scrollTop = saved
        } else {
          el.scrollTop = 0
        }
      }
    }

    // Double-rAF: first rAF queues after React commit, second rAF fires after
    // the browser has painted the new layout (KeepAlive display:none → visible).
    requestAnimationFrame(() => {
      requestAnimationFrame(restore)
    })
  }, [scrollKey, noScrollRestore, isDesktopNav])

  // Continuously save scroll position so it's always fresh for back-nav.
  // Also saves on unmount as a fallback.
  useEffect(() => {
    if (noScrollRestore) return

    let rafId = 0
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        if (isDesktopNav) {
          saveScrollPosition(scrollKey, window.scrollY)
        } else {
          const el = scrollRef.current
          if (el) saveScrollPosition(scrollKey, el.scrollTop)
        }
      })
    }

    if (isDesktopNav) {
      window.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        window.removeEventListener('scroll', onScroll)
        cancelAnimationFrame(rafId)
        saveScrollPosition(scrollKey, window.scrollY)
      }
    }

    const el = scrollRef.current
    if (el) {
      el.addEventListener('scroll', onScroll, { passive: true })
      return () => {
        el.removeEventListener('scroll', onScroll)
        cancelAnimationFrame(rafId)
        saveScrollPosition(scrollKey, el.scrollTop)
      }
    }
  }, [scrollKey, noScrollRestore, isDesktopNav])

  const hasBottomTabs = navMode === 'bottom-tabs'

  // header is rendered inside the scroll container as a sticky overlay so it
  // never pushes content down. When header is present (without stickyOverlay)
  // we add top padding so non-hero content clears the back-button area.
  const hasInlineHeader = !!header && !stickyOverlay

  return (
    <div className={cn('flex flex-col flex-1', !isDesktopNav && 'min-h-0')}>
      <main
        id="main-content"
        ref={scrollRef}
        className={cn(
          'relative flex-1',
          // On mobile/native, use inner scroll container for tab-bar offset + scroll restore
          // On desktop, clip overflow so sticky bg doesn't paint over the web footer
          isDesktopNav ? 'overflow-clip' : 'overflow-y-auto overflow-x-hidden overscroll-none',
          // Base gradient painted on element itself so first paint has colour (no flash)
          !noBackground && 'bg-gradient-to-b from-primary-50/50 via-white to-moss-50/20',
          // Side padding for all page content
          'px-4 lg:px-6',
          // Small gap between sidebar and page content on desktop
          isDesktopNav && 'pl-4',
          // Pad bottom: tab bar height + safe area (content bleeds behind drag handle)
          hasBottomTabs
            ? 'pb-[calc(3.5rem+var(--safe-bottom))]'
            : 'pb-[var(--safe-bottom)]',
          className,
        )}
      >
        {/* Atmospheric background - sticky so it stays viewport-pinned while
            content scrolls over it. Negative margin collapses it out of flow. */}
        {!noBackground && (
          <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] -z-10 -mx-4 lg:-mx-6 overflow-hidden" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-50/50 via-white to-moss-50/20" />
            {/* Large soft ring - top right */}
            <div className="absolute -top-20 -right-20 w-[340px] h-[340px] rounded-full border-2 border-moss-200/25" />
            {/* Concentric inner ring */}
            <div className="absolute -top-6 -right-6 w-[220px] h-[220px] rounded-full border border-primary-200/15" />
            {/* Soft glow - bottom left */}
            <div className="absolute -bottom-20 -left-16 w-[300px] h-[300px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-moss-100/25 to-transparent" />
            {/* Small ring - mid left */}
            <div className="absolute top-[45%] -left-8 w-[100px] h-[100px] rounded-full border border-primary-100/25" />
            {/* Warm glow - center right */}
            <div className="absolute top-[20%] -right-10 w-[200px] h-[200px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-50/18 to-transparent" />
            {/* Small filled accent - lower right */}
            <div className="absolute bottom-[15%] right-[8%] w-[60px] h-[60px] rounded-full bg-moss-100/20" />
            {/* Dots */}
            <div className="absolute top-16 left-[14%] w-2 h-2 rounded-full bg-moss-200/30" />
            <div className="absolute top-[30%] right-[10%] w-1.5 h-1.5 rounded-full bg-primary-200/25" />
            <div className="absolute bottom-[22%] left-[20%] w-2 h-2 rounded-full bg-moss-200/20" />
          </div>
        )}

        {/* Header rendered as sticky overlay inside the scroll container.
            -mb-14 collapses layout space so it floats over content.
            stickyOverlay pages supply their own (usually transparent). */}
        {stickyOverlay}
        {hasInlineHeader && (
          <div className="-mb-14">
            {header}
          </div>
        )}

        <div
          className="relative"
          style={hasInlineHeader ? { paddingTop: 'calc(3.5rem + var(--safe-top))' } : undefined}
        >
          {children}
        </div>
      </main>

      {footer && (
        <div
          className={cn(
            'sticky bottom-0 z-30',
            'bg-surface-0',
            'border-t border-primary-100',
            'shadow-[0_-4px_16px_-2px_rgba(0,0,0,0.08)]',
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
