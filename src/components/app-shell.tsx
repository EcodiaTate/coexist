import { type ReactNode, memo } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { UnifiedSidebar } from '@/components/unified-sidebar'
import { WebFooter } from '@/components/web-footer'
import { OfflineBanner } from '@/components/offline-banner'
import { MenuSheetProvider, useMenuSheet } from '@/hooks/use-menu-sheet'
import { useSyncManager } from '@/hooks/use-sync-manager'
import { usePushRegistration } from '@/hooks/use-push'

interface AppShellProps {
  children: ReactNode
  /** Hide all navigation chrome (for splash, onboarding, auth) */
  bare?: boolean
}

export function AppShell({ children, bare = false }: AppShellProps) {
  if (bare) {
    return <div className="flex flex-col min-h-dvh">{children}</div>
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
 * Stable mobile sidebar + hamburger - only depends on menu open/close
 * state, not on the current pathname.
 */
const MobileNav = memo(function MobileNav() {
  const { open, openMenu, closeMenu } = useMenuSheet()

  return (
    <>
      {/* Fixed hamburger (mobile + native) - always visible, top-right, white, no background */}
      <button
        type="button"
        onClick={openMenu}
        className="fixed right-1 z-40 flex items-center justify-center w-12 h-12 text-white cursor-pointer select-none"
        style={{
          top: 'calc(var(--safe-top, 0px) + 0.25rem)',
        }}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Unified sidebar - mobile: slide-in overlay from right with suite switcher */}
      <UnifiedSidebar mobileOpen={open} onMobileClose={closeMenu} />
    </>
  )
})

/**
 * Location-aware chrome (footer, bottom tabs) - isolated so that
 * pathname changes only re-render this leaf, not the sidebar.
 */
function LocationAwareChrome({ showBottomTabs }: { showBottomTabs: boolean }) {
  const { isMobile, isWeb } = useLayout()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const isLeaderRoute = location.pathname.startsWith('/leader') && !location.pathname.startsWith('/leaderboard')
  const isChatRoute = location.pathname.startsWith('/chat/')

  return (
    <>
      {/* Web footer - full width, below the sidebar row so sidebar unsticks at footer */}
      {isWeb && !isMobile && !isChatRoute && <WebFooter />}

      {/* Bottom tab bar (mobile + native) - hidden on admin/leader pages (they have their own) */}
      {showBottomTabs && !isAdminRoute && !isLeaderRoute && <BottomTabBar />}
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

  const showBottomTabs = navMode === 'bottom-tabs'
  const showSidebar = navMode === 'sidebar'

  return (
    <div className={cn(
      'flex flex-col bg-surface-1',
      // Mobile/native: fixed viewport - only inner Page <main> scrolls (native app feel)
      // Desktop web: document can grow for natural window scrolling + WebFooter
      showBottomTabs ? 'h-dvh overflow-hidden' : 'min-h-dvh',
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

      {/* Mobile nav (hamburger + overlay sidebar) */}
      {showBottomTabs && <MobileNav />}
    </div>
  )
}
