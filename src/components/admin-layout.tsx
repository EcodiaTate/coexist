import { type ReactNode, useState, useEffect, useRef, createContext, useContext, useCallback, useMemo, Suspense } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    MapPin,
    Handshake,
    Trophy,
    ClipboardList,
    ClipboardCheck,
    FileText,
    Settings,
    Download,
    Mail,
    Heart,
    BarChart3,
    AlertCircle,
    ArrowLeft,
    Menu,
    X,
    Bug,
    Image,
    Shield,
    Home,
    ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar, type Tab } from '@/components/bottom-tab-bar'
import { SidebarShell, type SidebarNavCategory } from '@/components/sidebar-shell'

/* ------------------------------------------------------------------ */
/*  Admin header context  lets child pages set title + actions        */
/* ------------------------------------------------------------------ */

interface AdminHeaderState {
  title: string
  subtitle?: string
  actions?: ReactNode
  heroContent?: ReactNode
  fullBleed?: boolean
}

interface AdminHeaderContextValue {
  setHeader: (opts: { title: string; subtitle?: string; actions?: ReactNode; heroContent?: ReactNode; fullBleed?: boolean }) => void
}

const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null)

/**
 * Call from any admin page to set the page header title and optional actions.
 * Pass subtitle and heroContent to populate the shared hero bar.
 */
export function useAdminHeader(
  title: string,
  opts?: { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode; fullBleed?: boolean } | ReactNode,
) {
  const ctx = useContext(AdminHeaderContext)
  useEffect(() => {
    // Support legacy (title, actions) signature
    if (opts && typeof opts === 'object' && !('$$typeof' in (opts as any)) && ('subtitle' in (opts as any) || 'actions' in (opts as any) || 'heroContent' in (opts as any) || 'fullBleed' in (opts as any))) {
      const o = opts as { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode; fullBleed?: boolean }
      ctx?.setHeader({ title, ...o })
    } else {
      ctx?.setHeader({ title, actions: opts as ReactNode })
    }
  }, [ctx, title, opts])
}

/* ------------------------------------------------------------------ */
/*  Per-page hero hue config - maps title → gradient hue + subtitle   */
/* ------------------------------------------------------------------ */

const PAGE_HERO_CONFIG: Record<string, { hue: string; defaultSubtitle: string; tall?: boolean }> = {
  'Dashboard':           { hue: 'from-primary-800 via-primary-900 to-primary-950',        defaultSubtitle: 'National conservation overview' },
  'Collectives':         { hue: 'from-primary-600 via-primary-700 to-primary-900',        defaultSubtitle: 'Manage local chapters across Australia', tall: true },
  'Users':               { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Manage members, roles, and permissions' },
  'User Management':     { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Manage members, roles, and permissions' },
  'Workflows':           { hue: 'from-primary-700 via-primary-800 to-primary-950',        defaultSubtitle: 'Automate recurring tasks and track KPIs' },
  'Events':              { hue: 'from-accent-700 via-accent-800 to-primary-950',          defaultSubtitle: 'Track and manage conservation activities' },
  'Partners & Sponsors': { hue: 'from-primary-700 via-primary-800 to-neutral-900',        defaultSubtitle: 'Manage organisations, offers, and programs' },
  'Challenges':          { hue: 'from-accent-700 via-primary-800 to-primary-950',         defaultSubtitle: 'Create and track national conservation goals' },
  'Surveys':             { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Collect feedback and measure satisfaction' },
  'Reports':             { hue: 'from-primary-700 via-primary-900 to-primary-950',        defaultSubtitle: 'Generate impact and compliance reports' },
  'Content Moderation':  { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Review flagged content and manage reports' },
  'Email & Delivery':    { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Monitor bounces, complaints, and delivery' },
  'Email Marketing':     { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Campaigns, subscribers, and delivery health' },
  'Charity Settings':    { hue: 'from-primary-800 via-primary-900 to-neutral-900',        defaultSubtitle: 'ACNC registration and compliance details' },
  'Export Centre':       { hue: 'from-primary-700 via-primary-900 to-primary-950',        defaultSubtitle: 'Generate reports and download data' },
  'Audit Log':           { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Track all administrative actions' },
  'Branding & Images':   { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Manage app images and visual identity' },
  'System':              { hue: 'from-primary-900 via-neutral-900 to-neutral-950',        defaultSubtitle: 'Infrastructure, feature flags, and health' },
  'Membership':          { hue: 'from-primary-700 via-primary-800 to-primary-950',        defaultSubtitle: 'Manage rewards and membership plans' },
  'Merch Management':    { hue: 'from-primary-800 via-primary-900 to-primary-950',        defaultSubtitle: 'Products, orders, and inventory' },
  'Create Survey':       { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Design a new survey' },
  'Dev Tools':           { hue: 'from-primary-900 via-neutral-900 to-neutral-950',        defaultSubtitle: 'Testing and debugging utilities' },
}

const DEFAULT_HERO = { hue: 'from-primary-800 via-primary-900 to-primary-950', defaultSubtitle: '', tall: false }

/** Returns true when the component is rendered inside the admin layout. */
export function useIsAdminLayout() {
  return useContext(AdminHeaderContext) !== null
}

/* ------------------------------------------------------------------ */
/*  Nav items                                                          */
/* ------------------------------------------------------------------ */

interface AdminNavItem {
  label: string
  path: string
  icon: React.ReactNode
  /** If set, only shown when user has this capability */
  capability?: string
}

interface AdminNavCategory {
  label: string
  items: AdminNavItem[]
  /** If true, only rendered for super admins */
  superAdminOnly?: boolean
}

const adminNavCategories: AdminNavCategory[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Overview', path: '/admin', icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Collectives', path: '/admin/collectives', icon: <MapPin size={17} strokeWidth={1.5} />, capability: 'manage_collectives' },
      { label: 'Workflows', path: '/admin/workflows', icon: <ClipboardCheck size={17} strokeWidth={1.5} />, capability: 'manage_workflows' },
      { label: 'Events', path: '/admin/events', icon: <CalendarDays size={17} strokeWidth={1.5} />, capability: 'manage_events' },
      { label: 'Challenges', path: '/admin/challenges', icon: <Trophy size={17} strokeWidth={1.5} />, capability: 'manage_challenges' },
      { label: 'Surveys', path: '/admin/surveys', icon: <ClipboardList size={17} strokeWidth={1.5} />, capability: 'manage_surveys' },
      { label: 'Shop', path: '/admin/shop', icon: <ShoppingBag size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Partners', path: '/admin/partners', icon: <Handshake size={17} strokeWidth={1.5} />, capability: 'manage_partners' },
      { label: 'Moderation', path: '/admin/moderation', icon: <AlertCircle size={17} strokeWidth={1.5} />, capability: 'manage_content' },
      { label: 'Email', path: '/admin/email', icon: <Mail size={17} strokeWidth={1.5} />, capability: 'manage_email' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: <FileText size={17} strokeWidth={1.5} />, capability: 'view_reports' },
      { label: 'Impact', path: '/admin/national-impact', icon: <BarChart3 size={17} strokeWidth={1.5} />, capability: 'view_reports' },
      { label: 'Exports', path: '/admin/exports', icon: <Download size={17} strokeWidth={1.5} />, capability: 'manage_exports' },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <FileText size={17} strokeWidth={1.5} />, capability: 'view_audit_log' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Charity', path: '/admin/charity', icon: <Heart size={17} strokeWidth={1.5} />, capability: 'manage_charity' },
      { label: 'Branding', path: '/admin/branding', icon: <Image size={17} strokeWidth={1.5} />, capability: 'manage_system' },
      { label: 'System', path: '/admin/system', icon: <Settings size={17} strokeWidth={1.5} />, capability: 'manage_system' },
    ],
  },
  {
    label: 'Administration',
    superAdminOnly: true,
    items: [
      { label: 'Users', path: '/admin/users', icon: <Users size={17} strokeWidth={1.5} />, capability: 'manage_users' },
      { label: 'Dev Tools', path: '/admin/dev-tools', icon: <Bug size={17} strokeWidth={1.5} /> },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Mobile bottom tab bar tabs for admin suite                         */
/* ------------------------------------------------------------------ */

const adminBottomTabs: Tab[] = [
  {
    key: 'back',
    label: 'App',
    path: '/',
    exact: true,
    icon: <Home size={21} strokeWidth={1.5} />,
    activeIcon: <Home size={21} strokeWidth={2.2} />,
  },
  {
    key: 'admin-home',
    label: 'Overview',
    path: '/admin',
    exact: true,
    icon: <LayoutDashboard size={21} strokeWidth={1.5} />,
    activeIcon: <LayoutDashboard size={21} strokeWidth={2.2} />,
  },
  {
    key: 'admin-collectives',
    label: 'Collectives',
    path: '/admin/collectives',
    icon: <MapPin size={21} strokeWidth={1.5} />,
    activeIcon: <MapPin size={21} strokeWidth={2.2} />,
  },
  {
    key: 'admin-events',
    label: 'Events',
    path: '/admin/events',
    icon: <CalendarDays size={21} strokeWidth={1.5} />,
    activeIcon: <CalendarDays size={21} strokeWidth={2.2} />,
  },
  {
    key: 'admin-users',
    label: 'Users',
    path: '/admin/users',
    icon: <Users size={21} strokeWidth={1.5} />,
    activeIcon: <Users size={21} strokeWidth={2.2} />,
  },
]

/* ------------------------------------------------------------------ */
/*  AdminLayout  route-level layout, renders <Outlet />              */
/* ------------------------------------------------------------------ */

export function AdminLayout() {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { isSuperAdmin, hasCapability } = useAuth()
  const { navMode } = useLayout()
  const showBottomTabs = navMode === 'bottom-tabs'
  const [mobileOpen, setMobileOpen] = useState(false)
  const [header, setHeaderState] = useState<AdminHeaderState>({ title: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll admin content area to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const setHeader = useCallback((opts: { title: string; subtitle?: string; actions?: ReactNode; heroContent?: ReactNode }) => {
    setHeaderState(opts)
  }, [])

  const headerCtx = useMemo(() => ({ setHeader }), [setHeader])

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  // Build capability-filtered categories for the shared sidebar shell
  const adminSidebarCategories = useMemo<SidebarNavCategory[]>(() =>
    adminNavCategories
      .filter((cat) => !cat.superAdminOnly || isSuperAdmin)
      .map((cat) => ({
        label: cat.label,
        items: cat.items.filter((item) => !item.capability || hasCapability(item.capability)),
      }))
      .filter((cat) => cat.items.length > 0),
    [isSuperAdmin, hasCapability],
  )

  return (
    <AdminHeaderContext.Provider value={headerCtx}>
      <div className="flex flex-1 min-h-0">
        {/* Admin sidebar - hidden on mobile, shown on md+ */}
        <SidebarShell
          ariaLabel="Admin navigation"
          categories={adminSidebarCategories}
          accent="primary"
          layoutId="admin-sidebar-active"
          hideOnMobile
          header={(collapsed) => (
            <>
              {/* Back to app */}
              <div className="px-2.5">
                <Link
                  to="/"
                  className={cn(
                    'flex items-center gap-2',
                    'rounded-xl text-[13px]',
                    'text-primary-300 hover:text-primary-700 hover:bg-primary-50/50',
                    'transition-all duration-200',
                    'cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
                  )}
                  title={collapsed ? 'Back to app' : undefined}
                >
                  <ArrowLeft size={15} strokeWidth={1.5} className="shrink-0" />
                  {!collapsed && <span>Back to app</span>}
                </Link>
              </div>

              {/* Admin badge */}
              {!collapsed && (
                <div className="px-3 py-3 mx-2.5 mb-1 rounded-xl bg-gradient-to-br from-primary-50/80 to-primary-50/30 border border-primary-100/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center shrink-0 shadow-sm">
                      <Shield size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-[0.08em] leading-none">Admin</p>
                      <p className="text-[13px] font-medium text-primary-800 truncate mt-0.5">Co-Exist</p>
                    </div>
                  </div>
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center py-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center shadow-sm">
                    <Shield size={14} className="text-white" />
                  </div>
                </div>
              )}
            </>
          )}
        />

        {/* Mobile hamburger + drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="admin-backdrop"
                className="md:hidden fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
              />
              {/* Drawer */}
              <motion.aside
                key="admin-drawer"
                className="md:hidden fixed inset-y-0 right-0 z-50 w-[min(76vw,300px)] bg-white shadow-[-12px_0_40px_-8px_rgba(51,63,43,0.15)] flex flex-col overflow-y-auto"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
              >
                {/* Wordmark centered + close */}
                <div className="flex items-center justify-between px-4 py-3">
                  <Link
                    to="/"
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-primary-300 hover:text-primary-700 hover:bg-primary-50/50 transition-all"
                    aria-label="Back to app"
                  >
                    <ArrowLeft size={15} strokeWidth={1.5} />
                  </Link>
                  <img
                    src="/logos/black-wordmark.png"
                    alt="Co-Exist"
                    className="h-5 w-auto"
                  />
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-xl bg-primary-50/50 text-primary-400 hover:bg-primary-100/50 cursor-pointer transition-all"
                    aria-label="Close menu"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Admin badge - mobile */}
                <div className="px-3 py-3 mx-3 mb-2 rounded-xl bg-gradient-to-br from-primary-50/80 to-primary-50/30 border border-primary-100/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center shrink-0 shadow-sm">
                      <Shield size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-primary-500 uppercase tracking-[0.08em] leading-none">Admin</p>
                      <p className="text-[13px] font-medium text-primary-800 truncate mt-0.5">Co-Exist</p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 py-2 px-3 space-y-0.5">
                  {adminNavCategories.map((cat) => {
                    if (cat.superAdminOnly && !isSuperAdmin) return null
                    const visibleItems = cat.items.filter((item) => !item.capability || hasCapability(item.capability))
                    if (visibleItems.length === 0) return null
                    const showLabel = cat.label !== 'Overview'
                    return (
                      <div key={cat.label}>
                        {showLabel && (
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-300 px-3 mt-4 mb-1.5">
                            {cat.label}
                          </p>
                        )}
                        {visibleItems.map((item) => {
                          const active = isActive(item.path)
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={cn(
                                'relative flex items-center gap-2.5 px-3 h-10',
                                'rounded-xl text-[13px]',
                                'transition-all duration-200',
                                'cursor-pointer select-none',
                                active
                                  ? 'bg-primary-50/70 text-primary-800 font-medium'
                                  : 'text-primary-400 hover:bg-primary-50/40 hover:text-primary-700',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              {active && (
                                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary-500 to-primary-700" />
                              )}
                              <span className={cn(
                                'flex items-center justify-center shrink-0 transition-transform duration-200',
                                active && 'scale-105',
                              )}>{item.icon}</span>
                              <span className="truncate">{item.label}</span>
                            </Link>
                          )
                        })}
                      </div>
                    )
                  })}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Fixed mobile hamburger - top-right, white, no background */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed right-1 z-40 flex items-center justify-center w-11 h-11 text-white cursor-pointer select-none"
          style={{
            top: 'calc(var(--safe-top, 0px) + 0.25rem)',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4)) drop-shadow(0 0 8px rgba(0,0,0,0.15))',
          }}
          aria-label="Open admin menu"
        >
          <Menu size={22} />
        </button>

        {/* Main content */}
        <div ref={scrollRef} className={cn(
          'flex-1 flex flex-col min-w-0 min-h-0 bg-white',
          showBottomTabs && 'overflow-y-auto overscroll-contain',
        )}>
          {/* ── Shared hero bar - only for non-fullBleed pages ── */}
          {!header.fullBleed && header.title && header.title !== 'Dashboard' ? (() => {
            const cfg = PAGE_HERO_CONFIG[header.title] ?? DEFAULT_HERO
            const subtitle = header.subtitle ?? cfg.defaultSubtitle
            return (
              <div
                className={cn(
                  'relative overflow-hidden',
                  'bg-gradient-to-br transition-all duration-700 ease-in-out',
                  cfg.hue,
                  cfg.tall
                    ? 'px-6 pt-8 pb-14 sm:px-8 sm:pt-12 sm:pb-16'
                    : 'px-6 pt-5 pb-10 sm:px-8 sm:pt-8 sm:pb-12',
                )}
              >
                {/* Decorative ambient circles */}
                <div className={cn('pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-2xl', cfg.tall ? 'bg-white/[0.07]' : 'bg-white/[0.04]')} />
                <div className={cn('pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full blur-2xl', cfg.tall ? 'bg-white/[0.05]' : 'bg-white/[0.03]')} />

                <div className="relative z-10">
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {header.title}
                      </h1>
                      {subtitle && (
                        <p className="mt-1 text-sm text-white/40">{subtitle}</p>
                      )}
                    </div>
                    {header.actions && (
                      <div className="flex items-center gap-2 shrink-0">{header.actions}</div>
                    )}
                  </div>

                  {/* Per-page hero content (stats, etc.) */}
                  {header.heroContent && (
                    <div className="mt-5">{header.heroContent}</div>
                  )}
                </div>
              </div>
            )
          })() : null}

          {/* Content rendered by nested <Route> children */}
          <div className={cn(
            'relative flex-1 overflow-clip',
            header.fullBleed ? 'p-0' : 'p-6',
            showBottomTabs && 'pb-[calc(5rem+var(--safe-bottom))]',
          )}>
            {/* Atmospheric background — sticky keeps it viewport-pinned */}
            {!header.fullBleed && (
              <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute inset-0 bg-gradient-to-b from-primary-50/40 via-white to-primary-50/20" />
                <div className="absolute -top-20 -right-20 w-[350px] h-[350px] rounded-full bg-primary-100/10 blur-3xl" />
                <div className="absolute -bottom-16 -left-12 w-[280px] h-[280px] rounded-full bg-primary-50/15 blur-3xl" />
              </div>
            )}

            <Suspense fallback={
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              </div>
            }>
              <Outlet key={location.pathname} />
            </Suspense>
          </div>
        </div>

        {/* Admin bottom tab bar - mobile only */}
        {showBottomTabs && (
          <BottomTabBar
            tabs={adminBottomTabs}
            layoutPrefix="admin-tab"
            accent="primary"
          />
        )}
      </div>
    </AdminHeaderContext.Provider>
  )
}
