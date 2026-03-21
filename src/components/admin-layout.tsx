import { type ReactNode, useState, useEffect, createContext, useContext, useCallback } from 'react'
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
    Shield,
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
  actions?: ReactNode
}

interface AdminHeaderContextValue {
  setHeader: (title: string, actions?: ReactNode) => void
}

const AdminHeaderContext = createContext<AdminHeaderContextValue | null>(null)

/**
 * Call from any admin page to set the page header title and optional actions.
 */
export function useAdminHeader(title: string, actions?: ReactNode) {
  const ctx = useContext(AdminHeaderContext)
  useEffect(() => {
    ctx?.setHeader(title, actions)
  }, [ctx, title, actions])
}

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

const adminNavItems: AdminNavItem[] = [
  { label: 'Overview', path: '/admin', icon: <LayoutDashboard size={18} /> },
  { label: 'Collectives', path: '/admin/collectives', icon: <MapPin size={18} />, capability: 'manage_collectives' },
  { label: 'Users', path: '/admin/users', icon: <Users size={18} />, capability: 'manage_users' },
  { label: 'Workflows', path: '/admin/workflows', icon: <ClipboardCheck size={18} />, capability: 'manage_workflows' },
  { label: 'Events', path: '/admin/events', icon: <CalendarDays size={18} />, capability: 'manage_events' },
  { label: 'Partners', path: '/admin/partners', icon: <Handshake size={18} />, capability: 'manage_partners' },
  { label: 'Challenges', path: '/admin/challenges', icon: <Trophy size={18} />, capability: 'manage_challenges' },
  { label: 'Surveys', path: '/admin/surveys', icon: <ClipboardList size={18} />, capability: 'manage_surveys' },
  { label: 'Reports', path: '/admin/reports', icon: <FileText size={18} />, capability: 'view_reports' },
  { label: 'Impact', path: '/admin/national-impact', icon: <BarChart3 size={18} />, capability: 'view_reports' },
  { label: 'Moderation', path: '/admin/moderation', icon: <AlertCircle size={18} />, capability: 'manage_content' },
  { label: 'Email', path: '/admin/email', icon: <Mail size={18} />, capability: 'manage_email' },
  { label: 'Charity', path: '/admin/charity', icon: <Heart size={18} />, capability: 'manage_charity' },
  { label: 'Exports', path: '/admin/exports', icon: <Download size={18} />, capability: 'manage_exports' },
  { label: 'Audit Log', path: '/admin/audit-log', icon: <FileText size={18} />, capability: 'view_audit_log' },
  { label: 'Branding', path: '/admin/branding', icon: <Image size={18} />, capability: 'manage_system' },
  { label: 'System', path: '/admin/system', icon: <Settings size={18} />, capability: 'manage_system' },
]

const superAdminNavItems: AdminNavItem[] = [
  { label: 'Staff & Permissions', path: '/admin/super', icon: <Shield size={18} /> },
  { label: 'Dev Tools', path: '/admin/dev-tools', icon: <Bug size={18} /> },
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

  const setHeader = useCallback((title: string, actions?: ReactNode) => {
    setHeaderState({ title, actions })
  }, [])

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isActive = (path: string) => {
    if (path === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(path)
  }

  return (
    <AdminHeaderContext.Provider value={{ setHeader }}>
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
            {adminNavItems.filter((item) => !item.capability || hasCapability(item.capability)).map((item) => {
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

            {isSuperAdmin && (
              <>
                {!collapsed && (
                  <p className="text-[10px] uppercase tracking-wider text-primary-400 px-2.5 mt-4 mb-1">
                    Super Admin
                  </p>
                )}
                {collapsed && <div className="my-2 h-px bg-primary-100/40" />}
                {superAdminNavItems.map((item) => {
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
                      <span className="flex items-center justify-center shrink-0">
                        {item.icon}
                      </span>
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </>
            )}
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
                  {adminNavItems.filter((item) => !item.capability || hasCapability(item.capability)).map((item) => {
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

                  {isSuperAdmin && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-primary-400 px-3 mt-4 mb-1">
                        Super Admin
                      </p>
                      {superAdminNavItems.map((item) => {
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
                            <span className="flex items-center justify-center shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </>
                  )}
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Mobile menu trigger + optional page actions (no title, no border) */}
          <div className="flex items-center justify-between px-6 py-3 md:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
              aria-label="Open admin menu"
            >
              <Menu size={20} />
            </button>
            {header.actions && <div className="flex items-center gap-2 shrink-0">{header.actions}</div>}
          </div>

          {/* Desktop: show actions row only when actions exist */}
          {header.actions && (
            <div className="hidden md:flex items-center justify-end px-6 py-3">
              <div className="flex items-center gap-2 shrink-0">{header.actions}</div>
            </div>
          )}

          {/* Content  rendered by nested <Route> children */}
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </AdminHeaderContext.Provider>
  )
}
