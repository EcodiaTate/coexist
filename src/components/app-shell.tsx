import { type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar } from '@/components/bottom-tab-bar'
import { SidebarNav } from '@/components/sidebar-nav'
import { WebFooter } from '@/components/web-footer'
import { OfflineBanner } from '@/components/offline-banner'
import { useSyncManager } from '@/hooks/use-sync-manager'

interface AppShellProps {
  children: ReactNode
  /** Hide all navigation chrome (for splash, onboarding, auth) */
  bare?: boolean
}

export function AppShell({ children, bare = false }: AppShellProps) {
  const { isMobile, isWeb, navMode } = useLayout()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')

  // Handles auto-sync on reconnect + toast notifications
  useSyncManager()

  if (bare) {
    return <div className="flex flex-col min-h-dvh">{children}</div>
  }

  const showBottomTabs = navMode === 'bottom-tabs'
  const showSidebar = navMode === 'sidebar'

  const isChatRoute = location.pathname.startsWith('/chat/')

  return (
    <div className={cn(
      'flex flex-col bg-white',
      // Chat pages need fixed viewport height to prevent scroll bleed
      // Other pages can grow beyond viewport for natural page scrolling
      isChatRoute ? 'h-dvh overflow-hidden' : 'min-h-dvh',
    )}>
      {/* Offline connectivity banner */}
      <OfflineBanner />

      {/* Sidebar + content row */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar - hidden on admin pages (AdminLayout has its own) */}
        {showSidebar && !isAdminRoute && <SidebarNav />}

        {/* Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          {children}
        </main>
      </div>

      {/* Web footer - full width, below the sidebar row so sidebar unsticks at footer */}
      {isWeb && !isMobile && !isChatRoute && <WebFooter />}

      {/* Bottom tab bar (mobile + native) */}
      {showBottomTabs && <BottomTabBar />}
    </div>
  )
}
