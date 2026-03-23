import { type ReactNode, useState, useEffect, useRef, createContext, useContext, useCallback, useMemo, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
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
    Bug,
    Image, Home,
    ShoppingBag
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar, type Tab } from '@/components/bottom-tab-bar'

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

  // Extract individual values so the effect only re-fires when they actually change,
  // not when a new wrapper object is created each render.
  const isOptsObject = opts && typeof opts === 'object' && !('$$typeof' in (opts as any)) && ('subtitle' in (opts as any) || 'actions' in (opts as any) || 'heroContent' in (opts as any) || 'fullBleed' in (opts as any))
  const subtitle = isOptsObject ? (opts as any).subtitle : undefined
  const actions = isOptsObject ? (opts as any).actions : (opts as ReactNode)
  const heroContent = isOptsObject ? (opts as any).heroContent : undefined
  const fullBleed = isOptsObject ? (opts as any).fullBleed : undefined

  useEffect(() => {
    ctx?.setHeader({ title, subtitle, actions, heroContent, fullBleed })
  }, [ctx, title, subtitle, actions, heroContent, fullBleed])
}

/* ------------------------------------------------------------------ */
/*  Per-page hero hue config - maps title → gradient hue + subtitle   */
/* ------------------------------------------------------------------ */

const PAGE_HERO_CONFIG: Record<string, { hue: string; defaultSubtitle: string; tall?: boolean }> = {
  'Dashboard':           { hue: 'from-primary-800 via-primary-900 to-primary-950',        defaultSubtitle: 'National conservation overview' },
  'Collectives':         { hue: 'from-primary-600 via-primary-700 to-primary-900',        defaultSubtitle: 'Manage local chapters across Australia', tall: true },
  'Users':               { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Manage members, roles, and permissions', tall: true },
  'User Management':     { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Manage members, roles, and permissions', tall: true },
  'Workflows':           { hue: 'from-primary-700 via-primary-800 to-primary-950',        defaultSubtitle: 'Automate recurring tasks and track KPIs', tall: true },
  'Events':              { hue: 'from-accent-700 via-accent-800 to-primary-950',          defaultSubtitle: 'Track and manage conservation activities', tall: true },
  'Partners & Sponsors': { hue: 'from-primary-700 via-primary-800 to-neutral-900',        defaultSubtitle: 'Manage organisations, offers, and programs', tall: true },
  'Challenges':          { hue: 'from-accent-700 via-primary-800 to-primary-950',         defaultSubtitle: 'Create and track national conservation goals', tall: true },
  'Surveys':             { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Collect feedback and measure satisfaction', tall: true },
  'Reports':             { hue: 'from-primary-700 via-primary-900 to-primary-950',        defaultSubtitle: 'Generate impact and compliance reports', tall: true },
  'Content Moderation':  { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Review flagged content and manage reports', tall: true },
  'Email & Delivery':    { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Monitor bounces, complaints, and delivery', tall: true },
  'Email Marketing':     { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Campaigns, subscribers, and delivery health', tall: true },
  'Charity Settings':    { hue: 'from-primary-800 via-primary-900 to-neutral-900',        defaultSubtitle: 'ACNC registration and compliance details', tall: true },
  'Export Centre':       { hue: 'from-primary-700 via-primary-900 to-primary-950',        defaultSubtitle: 'Generate reports and download data', tall: true },
  'Audit Log':           { hue: 'from-primary-900 via-primary-950 to-neutral-900',        defaultSubtitle: 'Track all administrative actions', tall: true },
  'Branding & Images':   { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Manage app images and visual identity', tall: true },
  'System':              { hue: 'from-primary-900 via-neutral-900 to-neutral-950',        defaultSubtitle: 'Infrastructure, feature flags, and health', tall: true },
  'Membership':          { hue: 'from-primary-700 via-primary-800 to-primary-950',        defaultSubtitle: 'Manage rewards and membership plans', tall: true },
  'Merch Management':    { hue: 'from-primary-800 via-primary-900 to-primary-950',        defaultSubtitle: 'Products, orders, and inventory', tall: true },
  'Create Survey':       { hue: 'from-primary-800 via-primary-850 to-neutral-900',        defaultSubtitle: 'Design a new survey', tall: true },
  'Dev Tools':           { hue: 'from-primary-900 via-neutral-900 to-neutral-950',        defaultSubtitle: 'Testing and debugging utilities', tall: true },
}

const DEFAULT_HERO = { hue: 'from-primary-800 via-primary-900 to-primary-950', defaultSubtitle: '', tall: true }

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
  const { navMode } = useLayout()
  const showBottomTabs = navMode === 'bottom-tabs'
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

  return (
    <AdminHeaderContext.Provider value={headerCtx}>
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar is handled by UnifiedSidebar in AppShell */}

        {/* Mobile drawer + hamburger removed - handled by UnifiedSidebar in AppShell */}

        {/* Main content */}
        <div ref={scrollRef} className={cn(
          'flex-1 flex flex-col min-w-0 min-h-0 bg-surface-1',
          showBottomTabs && 'overflow-y-auto overscroll-none',
        )}>
          {/* ── Shared hero bar - only for non-fullBleed pages ── */}
          {!header.fullBleed && header.title && header.title !== 'Dashboard' ? (() => {
            const cfg = PAGE_HERO_CONFIG[header.title] ?? DEFAULT_HERO
            const subtitle = header.subtitle ?? cfg.defaultSubtitle
            return (
              <div
                className={cn(
                  'relative overflow-hidden shrink-0',
                  'bg-gradient-to-br transition-[background] duration-700 ease-in-out',
                  cfg.hue,
                  cfg.tall
                    ? 'px-6 pb-14 sm:px-8 sm:pb-16'
                    : 'px-6 pb-10 sm:px-8 sm:pb-12',
                  // Extend the gradient above the hero so overscroll never exposes the surface bg
                  'before:absolute before:inset-x-0 before:bottom-full before:h-[200px] before:bg-inherit',
                )}
                style={{
                  paddingTop: cfg.tall
                    ? 'calc(var(--safe-top, 0px) + 3.5rem)'
                    : 'calc(var(--safe-top, 0px) + 2rem)',
                }}
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
            !header.fullBleed && 'bg-gradient-to-b from-primary-50/40 via-white to-primary-50/20',
            showBottomTabs && 'pb-[calc(5rem+var(--safe-bottom))]',
          )}>

            <Suspense fallback={null}>
              <Outlet />
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
