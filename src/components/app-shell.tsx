import { type ReactNode, memo, Suspense, useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { UnifiedSidebar } from '@/components/unified-sidebar'
import { WebFooter } from '@/components/web-footer'
import { OfflineBanner } from '@/components/offline-banner'
import { MenuSheetProvider, useMenuSheet } from '@/hooks/use-menu-sheet'
import { useSyncManager } from '@/hooks/use-sync-manager'
import { usePushRegistration } from '@/hooks/use-push'
import { useKeyboard } from '@/hooks/use-keyboard'
import { useRolePrefetch } from '@/hooks/use-role-prefetch'
import { useDataPrefetch } from '@/hooks/use-data-prefetch'
import { useUnreadCounts } from '@/hooks/use-chat'

interface AppShellProps {
  children: ReactNode
  /** Hide all navigation chrome (for splash, onboarding, auth) */
  bare?: boolean
}

export function AppShell({ children, bare = false }: AppShellProps) {
  // Scroll focused inputs into view when native keyboard opens
  // must run in BOTH bare and full shells so auth/onboarding pages work too.
  useKeyboard()

  if (bare) {
    return (
      <div className="flex flex-col min-h-dvh">
        <Suspense fallback={<div className="flex-1 bg-surface-1" />}>
          {children}
        </Suspense>
      </div>
    )
  }

  return (
    <MenuSheetProvider>
      <AppShellInner>{children}</AppShellInner>
    </MenuSheetProvider>
  )
}

/**
 * Stable sidebar wrapper - never re-renders on navigation because it
 * has no location/path dependencies. The UnifiedSidebar reads
 * useLocation() internally for active-link highlighting.
 */
const StableSidebar = memo(function StableSidebar() {
  return <UnifiedSidebar />
})

/**
 * Mobile sidebar overlay - depends on menu open/close state only.
 * The hamburger FAB is removed; "More" bottom tab opens this instead.
 */
const MobileSidebar = memo(function MobileSidebar() {
  const { open, closeMenu } = useMenuSheet()

  return (
    <UnifiedSidebar mobileOpen={open} onMobileClose={closeMenu} />
  )
})

/**
 * Location-aware chrome (footer, bottom tabs) - isolated so that
 * pathname changes only re-render this leaf, not the sidebar.
 */
function LocationAwareChrome({ showBottomTabs }: { showBottomTabs: boolean }) {
  const { isMobile, isWeb } = useLayout()
  const location = useLocation()
  const { openMenu } = useMenuSheet()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isLeaderRoute = location.pathname.startsWith('/leader') && !location.pathname.startsWith('/leaderboard') && !location.pathname.startsWith('/leadership')
  const isChatRoute = location.pathname.startsWith('/chat/')

  // Compute total unread chat messages for the badge
  const { data: unreadCounts } = useUnreadCounts()
  const totalUnread = useMemo(
    () => Object.values(unreadCounts ?? {}).reduce((sum, n) => sum + (n as number), 0),
    [unreadCounts],
  )

  return (
    <>
      {/* Web footer - full width, below the sidebar row so sidebar unsticks at footer */}
      {isWeb && !isMobile && !isChatRoute && <WebFooter />}

      {/* Bottom tab bar (mobile + native) - hidden on admin/leader pages (they have their own) */}
      {showBottomTabs && !isAdminRoute && !isLeaderRoute && (
        <BottomTabBar onMorePress={openMenu} chatBadge={totalUnread} />
      )}
    </>
  )
}

function AppShellInner({ children }: { children: ReactNode }) {
  const { navMode } = useLayout()

  // Handles auto-sync on reconnect + toast notifications
  useSyncManager()

  // Push notification registration - sets up FCM/APNs listeners,
  // stores token in DB, handles deep-link routing on tap,
  // re-registers on app resume. Runs once for all authenticated users.
  usePushRegistration()

  // Role-aware chunk prefetch  downloads the user's top 5 pages first,
  // then remaining common pages, so nav targets are instant.
  useRolePrefetch()

  // Role-aware data prefetch  warms TanStack Query cache with the
  // actual Supabase data each page needs, so first navigation renders
  // the final state with zero loading spinners.
  useDataPrefetch()

  const showBottomTabs = navMode === 'bottom-tabs'
  const showSidebar = navMode === 'sidebar'

  return (
    <div className={cn(
      'flex flex-col bg-surface-1',
      // Mobile/native: fixed viewport - only inner Page <main> scrolls (native app feel).
      // Use h-full (not h-dvh) so the shell tracks the body height after Capacitor
      // keyboard resize, keeping inputs visible above the native keyboard.
      // Desktop web: document can grow for natural window scrolling + WebFooter
      showBottomTabs ? 'h-full overflow-hidden' : 'min-h-dvh',
    )}>
      {/* Offline connectivity banner */}
      <OfflineBanner />

      {/* Sidebar + content row */}
      <div className="flex flex-1 min-h-0">
        {/* Unified sidebar - desktop: permanent left sidebar (stable, no remount) */}
        {showSidebar && <StableSidebar />}

        {/* Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </main>
      </div>

      {/* Location-aware chrome (footer + bottom tabs) - isolated to prevent sidebar re-renders */}
      <LocationAwareChrome showBottomTabs={showBottomTabs} />

      {/* Mobile sidebar overlay (opened via "More" tab in bottom bar) */}
      {showBottomTabs && <MobileSidebar />}
    </div>
  )
}
