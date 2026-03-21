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
    PanelLeftClose,
    PanelLeftOpen,
    ArrowLeft,
    Menu,
    X,
    Bug,
    Image,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Admin header context  lets child pages set title + actions        */
/* ------------------------------------------------------------------ */

interface AdminHeaderState {
  title: string
  subtitle?: string
  actions?: ReactNode
  heroContent?: ReactNode
}

interface AdminHeaderContextValue {
  setHeader: (opts: { title: string; subtitle?: string; actions?: ReactNode; heroContent?: ReactNode }) => void
}

const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null)

/**
 * Call from any admin page to set the page header title and optional actions.
 * Pass subtitle and heroContent to populate the shared hero bar.
 */
export function useAdminHeader(
  title: string,
  opts?: { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode } | ReactNode,
) {
  const ctx = useContext(AdminHeaderContext)
  useEffect(() => {
    // Support legacy (title, actions) signature
    if (opts && typeof opts === 'object' && !('$$typeof' in (opts as any)) && ('subtitle' in (opts as any) || 'actions' in (opts as any) || 'heroContent' in (opts as any))) {
      const o = opts as { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode }
      ctx?.setHeader({ title, ...o })
    } else {
      ctx?.setHeader({ title, actions: opts as ReactNode })
    }
  }, [ctx, title, opts])
}

/* ------------------------------------------------------------------ */
/*  Per-page hero hue config — maps title → gradient hue + subtitle   */
/* ------------------------------------------------------------------ */

const PAGE_HERO_CONFIG: Record<string, { hue: string; defaultSubtitle: string }> = {
  'Dashboard':           { hue: 'from-primary-800 via-primary-900 to-primary-950',        defaultSubtitle: 'National conservation overview' },
  'Collectives':         { hue: 'from-primary-800 via-primary-900 to-primary-950',        defaultSubtitle: 'Manage local chapters across Australia' },
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

const DEFAULT_HERO = { hue: 'from-primary-800 via-primary-900 to-primary-950', defaultSubtitle: '' }

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
      { label: 'Overview', path: '/admin', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Collectives', path: '/admin/collectives', icon: <MapPin size={18} />, capability: 'manage_collectives' },
      { label: 'Workflows', path: '/admin/workflows', icon: <ClipboardCheck size={18} />, capability: 'manage_workflows' },
      { label: 'Events', path: '/admin/events', icon: <CalendarDays size={18} />, capability: 'manage_events' },
      { label: 'Challenges', path: '/admin/challenges', icon: <Trophy size={18} />, capability: 'manage_challenges' },
      { label: 'Surveys', path: '/admin/surveys', icon: <ClipboardList size={18} />, capability: 'manage_surveys' },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Partners', path: '/admin/partners', icon: <Handshake size={18} />, capability: 'manage_partners' },
      { label: 'Moderation', path: '/admin/moderation', icon: <AlertCircle size={18} />, capability: 'manage_content' },
      { label: 'Email', path: '/admin/email', icon: <Mail size={18} />, capability: 'manage_email' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: <FileText size={18} />, capability: 'view_reports' },
      { label: 'Impact', path: '/admin/national-impact', icon: <BarChart3 size={18} />, capability: 'view_reports' },
      { label: 'Exports', path: '/admin/exports', icon: <Download size={18} />, capability: 'manage_exports' },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <FileText size={18} />, capability: 'view_audit_log' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Charity', path: '/admin/charity', icon: <Heart size={18} />, capability: 'manage_charity' },
      { label: 'Branding', path: '/admin/branding', icon: <Image size={18} />, capability: 'manage_system' },
      { label: 'System', path: '/admin/system', icon: <Settings size={18} />, capability: 'manage_system' },
    ],
  },
  {
    label: 'Administration',
    superAdminOnly: true,
    items: [
      { label: 'Users', path: '/admin/users', icon: <Users size={18} />, capability: 'manage_users' },
      { label: 'Dev Tools', path: '/admin/dev-tools', icon: <Bug size={18} /> },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  AdminLayout  route-level layout, renders <Outlet />              */
/* ------------------------------------------------------------------ */

export function AdminLayout() {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { isSuperAdmin, hasCapability } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
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

  return (
    <AdminHeaderContext.Provider value={headerCtx}>
      <div className="flex flex-1 min-h-0">
        {/* Admin sidebar - hidden on mobile, shown on md+ */}
        <aside
          className={cn(
            'hidden md:flex flex-col',
            'sticky top-0 self-start max-h-dvh z-50',
            'bg-white shadow-2xl',
            'transition-[width] duration-250 ease-in-out',
            'overflow-y-auto',
            collapsed ? 'w-14' : 'w-56',
          )}
          aria-label="Admin navigation"
        >
          {/* Back to app */}
          <div className="bg-primary-50/30 px-1.5 py-2">
            <Link
              to="/"
              className={cn(
                'flex items-center gap-2',
                'rounded-lg text-[13px]',
                'text-primary-400 hover:text-primary-800 hover:bg-primary-50',
                'transition-colors duration-150',
                'cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
              )}
              title={collapsed ? 'Back to app' : undefined}
            >
              <ArrowLeft size={16} className="shrink-0" />
              {!collapsed && <span>Back to app</span>}
            </Link>
          </div>

          <div className="flex-1 py-3 px-1.5 space-y-0.5">
            {adminNavCategories.map((cat) => {
              if (cat.superAdminOnly && !isSuperAdmin) return null
              const visibleItems = cat.items.filter((item) => !item.capability || hasCapability(item.capability))
              if (visibleItems.length === 0) return null
              const showLabel = cat.label !== 'Overview'
              return (
                <div key={cat.label}>
                  {showLabel && (
                    <>
                      {!collapsed && (
                        <p className="text-[10px] uppercase tracking-wider text-primary-400 px-2.5 mt-4 mb-1">
                          {cat.label}
                        </p>
                      )}
                      {collapsed && <div className="my-2 h-px bg-primary-100/40" />}
                    </>
                  )}
                  {visibleItems.map((item) => {
                    const active = isActive(item.path)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'relative flex items-center gap-2.5',
                          'rounded-lg text-[13px]',
                          'transition-colors duration-150',
                          'cursor-pointer select-none',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                          collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
                          active
                            ? 'bg-white text-primary-400 font-medium'
                            : 'text-primary-400 hover:bg-primary-50 hover:text-primary-800',
                        )}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {active && !collapsed && (
                          <motion.span
                            layoutId={shouldReduceMotion ? undefined : 'admin-sidebar-active'}
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary-800"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="flex items-center justify-center shrink-0">
                          {item.icon}
                        </span>
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>

          <div className="bg-primary-50/30 p-1.5">
            <button
              type="button"
              onClick={() => setCollapsed((p) => !p)}
              className={cn(
                'flex items-center justify-center gap-2 w-full',
                'h-8 rounded-lg text-[13px]',
                'text-primary-400 hover:text-primary-800 hover:bg-primary-50',
                'cursor-pointer select-none',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* Mobile hamburger + drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="admin-backdrop"
                className="md:hidden fixed inset-0 z-40 bg-black/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
              />
              {/* Drawer */}
              <motion.aside
                key="admin-drawer"
                className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg flex flex-col overflow-y-auto"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
              >
                <div className="flex items-center justify-between px-4 py-3 bg-primary-50/30">
                  <Link
                    to="/"
                    className="flex items-center gap-2 text-[13px] text-primary-400 hover:text-primary-800 transition-colors"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to app</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>
                <nav className="flex-1 py-3 px-2 space-y-0.5">
                  {adminNavCategories.map((cat) => {
                    if (cat.superAdminOnly && !isSuperAdmin) return null
                    const visibleItems = cat.items.filter((item) => !item.capability || hasCapability(item.capability))
                    if (visibleItems.length === 0) return null
                    const showLabel = cat.label !== 'Overview'
                    return (
                      <div key={cat.label}>
                        {showLabel && (
                          <p className="text-[10px] uppercase tracking-wider text-primary-400 px-3 mt-4 mb-1">
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
                                'relative flex items-center gap-2.5 px-3 h-9',
                                'rounded-lg text-[13px]',
                                'transition-colors duration-150',
                                'cursor-pointer select-none',
                                active
                                  ? 'bg-primary-50 text-primary-800 font-medium'
                                  : 'text-primary-400 hover:bg-primary-50 hover:text-primary-800',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              {active && (
                                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary-800" />
                              )}
                              <span className="flex items-center justify-center shrink-0">{item.icon}</span>
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

        {/* Main content */}
        <div ref={scrollRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* ── Shared hero bar — never unmounts, gradient transitions between pages ── */}
          {header.title && header.title !== 'Dashboard' ? (() => {
            const cfg = PAGE_HERO_CONFIG[header.title] ?? DEFAULT_HERO
            const subtitle = header.subtitle ?? cfg.defaultSubtitle
            return (
              <div
                className={cn(
                  'relative overflow-hidden',
                  'bg-gradient-to-br transition-all duration-700 ease-in-out',
                  cfg.hue,
                  'px-6 pt-5 pb-10 sm:px-8 sm:pt-8 sm:pb-12',
                )}
              >
                {/* Decorative ambient circles */}
                <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/[0.04] blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/[0.03] blur-2xl" />

                <div className="relative z-10">
                  {/* Mobile menu button — inside hero */}
                  <button
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="md:hidden p-1.5 -ml-1.5 mb-3 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                    aria-label="Open admin menu"
                  >
                    <Menu size={20} />
                  </button>

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
          })() : (
            /* Dashboard — just mobile menu trigger */
            <div className="flex items-center px-6 py-3 md:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="p-1.5 -ml-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
                aria-label="Open admin menu"
              >
                <Menu size={20} />
              </button>
            </div>
          )}

          {/* Content  rendered by nested <Route> children */}
          <div className="flex-1 p-6">
            <Suspense fallback={
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
              </div>
            }>
              <Outlet key={location.pathname} />
            </Suspense>
          </div>
        </div>
      </div>
    </AdminHeaderContext.Provider>
  )
}
