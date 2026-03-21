import { type ReactNode, useState, useEffect, useRef, createContext, useContext, useCallback, useMemo, Suspense } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  Plus,
  Megaphone,
  BarChart3,
  TreePine,
  Send,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  Menu,
  X,
  MapPin,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'

/* ------------------------------------------------------------------ */
/*  Leader header context — lets child pages set title + actions       */
/* ------------------------------------------------------------------ */

interface LeaderHeaderState {
  title: string
  subtitle?: string
  actions?: ReactNode
  heroContent?: ReactNode
}

interface LeaderHeaderContextValue {
  setHeader: (opts: LeaderHeaderState) => void
  collectiveId: string | undefined
  collectiveSlug: string | undefined
}

const LeaderHeaderContext = createContext<LeaderHeaderContextValue | null>(null)

/**
 * Call from any leader page to set the page header title and optional actions.
 */
export function useLeaderHeader(
  title: string,
  opts?: { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode } | ReactNode,
) {
  const ctx = useContext(LeaderHeaderContext)
  useEffect(() => {
    if (opts && typeof opts === 'object' && !('$$typeof' in (opts as any)) && ('subtitle' in (opts as any) || 'actions' in (opts as any) || 'heroContent' in (opts as any))) {
      const o = opts as { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode }
      ctx?.setHeader({ title, ...o })
    } else {
      ctx?.setHeader({ title, actions: opts as ReactNode })
    }
  }, [ctx, title, opts])
}

/** Access the leader's collective context from any leader sub-page */
export function useLeaderContext() {
  const ctx = useContext(LeaderHeaderContext)
  return { collectiveId: ctx?.collectiveId, collectiveSlug: ctx?.collectiveSlug }
}

/** Returns true when the component is rendered inside the leader layout. */
export function useIsLeaderLayout() {
  return useContext(LeaderHeaderContext) !== null
}

/* ------------------------------------------------------------------ */
/*  Per-page hero config — earthy/nature-inspired gradients            */
/* ------------------------------------------------------------------ */

const PAGE_HERO_CONFIG: Record<string, { hue: string; defaultSubtitle: string }> = {
  'Dashboard':      { hue: 'from-moss-600 via-moss-700 to-primary-900',          defaultSubtitle: 'Your collective at a glance' },
  'Events':         { hue: 'from-moss-600 via-primary-700 to-primary-900',       defaultSubtitle: 'Manage and create conservation events' },
  'Members':        { hue: 'from-primary-600 via-primary-700 to-moss-900',       defaultSubtitle: 'Your collective community' },
  'Tasks':          { hue: 'from-bark-600 via-bark-700 to-primary-900',          defaultSubtitle: 'Stay on top of your responsibilities' },
  'Announcements':  { hue: 'from-secondary-600 via-secondary-700 to-primary-900', defaultSubtitle: 'Communicate with your collective' },
  'Impact':         { hue: 'from-moss-700 via-primary-800 to-primary-950',       defaultSubtitle: 'Track your environmental contributions' },
  'Reports':        { hue: 'from-primary-700 via-primary-800 to-moss-900',       defaultSubtitle: 'Generate impact and activity reports' },
  'Create Event':   { hue: 'from-moss-500 via-moss-600 to-primary-800',         defaultSubtitle: 'Plan a new conservation activity' },
  'Invite':         { hue: 'from-sky-600 via-primary-700 to-primary-900',        defaultSubtitle: 'Grow your collective' },
}

const DEFAULT_HERO = { hue: 'from-moss-600 via-moss-700 to-primary-900', defaultSubtitle: '' }

/* ------------------------------------------------------------------ */
/*  Nav items                                                          */
/* ------------------------------------------------------------------ */

interface LeaderNavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface LeaderNavCategory {
  label: string
  items: LeaderNavItem[]
}

const leaderNavCategories: LeaderNavCategory[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/leader', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Events', path: '/leader/events', icon: <CalendarDays size={18} /> },
      { label: 'Members', path: '/leader/members', icon: <Users size={18} /> },
      { label: 'Tasks', path: '/leader/tasks', icon: <ClipboardCheck size={18} /> },
      { label: 'Announcements', path: '/leader/announcements', icon: <Megaphone size={18} /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Impact', path: '/leader/impact', icon: <TreePine size={18} /> },
      { label: 'Reports', path: '/leader/reports', icon: <BarChart3 size={18} /> },
    ],
  },
  {
    label: 'Actions',
    items: [
      { label: 'Create Event', path: '/leader/events/create', icon: <Plus size={18} /> },
      { label: 'Invite Members', path: '/leader/invite', icon: <Send size={18} /> },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  LeaderLayout  route-level layout, renders <Outlet />              */
/* ------------------------------------------------------------------ */

export function LeaderLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { collectiveRoles } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [header, setHeaderState] = useState<LeaderHeaderState>({ title: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Get user's primary collective where they are leader
  const collectiveId = useMemo(() => {
    const membership = collectiveRoles.find(
      (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
    )
    return membership?.collective_id
  }, [collectiveRoles])

  const { data: collectiveDetail } = useCollective(collectiveId)
  const collectiveSlug = collectiveDetail?.slug ?? collectiveId
  const collectiveName = collectiveDetail?.name ?? 'My Collective'

  // Scroll content to top on route change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const setHeader = useCallback((opts: LeaderHeaderState) => {
    setHeaderState(opts)
  }, [])

  const headerCtx = useMemo(() => ({ setHeader, collectiveId, collectiveSlug }), [setHeader, collectiveId, collectiveSlug])

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isActive = (path: string) => {
    if (path === '/leader') return location.pathname === '/leader'
    return location.pathname.startsWith(path)
  }

  return (
    <LeaderHeaderContext.Provider value={headerCtx}>
      <div className="flex flex-1 min-h-0">
        {/* ── Leader sidebar — desktop ── */}
        <aside
          className={cn(
            'hidden md:flex flex-col',
            'sticky top-0 self-start max-h-dvh z-50',
            'bg-white shadow-2xl',
            'transition-[width] duration-250 ease-in-out',
            'overflow-y-auto',
            collapsed ? 'w-14' : 'w-56',
          )}
          aria-label="Leader navigation"
        >
          {/* Back to app */}
          <div className="bg-moss-50/40 px-1.5 py-2">
            <Link
              to="/"
              className={cn(
                'flex items-center gap-2',
                'rounded-lg text-[13px]',
                'text-primary-400 hover:text-primary-800 hover:bg-moss-50',
                'transition-colors duration-150',
                'cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400',
                collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
              )}
              title={collapsed ? 'Back to app' : undefined}
            >
              <ArrowLeft size={16} className="shrink-0" />
              {!collapsed && <span>Back to app</span>}
            </Link>
          </div>

          {/* Collective name badge */}
          {!collapsed && (
            <div className="px-3 py-2.5 border-b border-moss-100/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shrink-0">
                  <TreePine size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-moss-600 uppercase tracking-wider leading-none">Leader</p>
                  <p className="text-xs font-medium text-primary-700 truncate mt-0.5">{collectiveName}</p>
                </div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center py-2.5 border-b border-moss-100/50">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center">
                <TreePine size={14} className="text-white" />
              </div>
            </div>
          )}

          <div className="flex-1 py-3 px-1.5 space-y-0.5">
            {leaderNavCategories.map((cat) => {
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
                      {collapsed && <div className="my-2 h-px bg-moss-100/40" />}
                    </>
                  )}
                  {cat.items.map((item) => {
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
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400',
                          collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
                          active
                            ? 'bg-moss-50 text-moss-800 font-medium'
                            : 'text-primary-400 hover:bg-moss-50/60 hover:text-primary-800',
                        )}
                        aria-current={active ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {active && !collapsed && (
                          <motion.span
                            layoutId={shouldReduceMotion ? undefined : 'leader-sidebar-active'}
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-moss-600"
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

          <div className="bg-moss-50/40 p-1.5">
            <button
              type="button"
              onClick={() => setCollapsed((p) => !p)}
              className={cn(
                'flex items-center justify-center gap-2 w-full',
                'h-8 rounded-lg text-[13px]',
                'text-primary-400 hover:text-primary-800 hover:bg-moss-50',
                'cursor-pointer select-none',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400',
              )}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
              {!collapsed && <span>Collapse</span>}
            </button>
          </div>
        </aside>

        {/* ── Mobile drawer ── */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                key="leader-backdrop"
                className="md:hidden fixed inset-0 z-40 bg-black/30"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                key="leader-drawer"
                className="md:hidden fixed inset-y-0 right-0 z-50 w-[min(72vw,280px)] bg-white shadow-[-8px_0_30px_-12px_rgba(0,0,0,0.12)] flex flex-col overflow-y-auto"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 35 }}
              >
                <div className="flex items-center justify-between px-4 py-3 bg-moss-50/40">
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
                    className="p-1.5 rounded-lg text-primary-400 hover:bg-moss-50 cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Collective name badge — mobile */}
                <div className="px-4 py-2.5 border-b border-moss-100/50">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shrink-0">
                      <TreePine size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-moss-600 uppercase tracking-wider leading-none">Leader</p>
                      <p className="text-xs font-medium text-primary-700 truncate mt-0.5">{collectiveName}</p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 py-3 px-2 space-y-0.5">
                  {leaderNavCategories.map((cat) => {
                    const showLabel = cat.label !== 'Overview'
                    return (
                      <div key={cat.label}>
                        {showLabel && (
                          <p className="text-[10px] uppercase tracking-wider text-primary-400 px-3 mt-4 mb-1">
                            {cat.label}
                          </p>
                        )}
                        {cat.items.map((item) => {
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
                                  ? 'bg-moss-50 text-moss-800 font-medium'
                                  : 'text-primary-400 hover:bg-moss-50/60 hover:text-primary-800',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              {active && (
                                <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-moss-600" />
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

        {/* Fixed mobile hamburger — top-right, white, no background */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed right-1 z-40 flex items-center justify-center w-11 h-11 text-white cursor-pointer select-none"
          style={{
            top: 'calc(var(--safe-top, 0px) + 0.25rem)',
            filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4)) drop-shadow(0 0 8px rgba(0,0,0,0.15))',
          }}
          aria-label="Open leader menu"
        >
          <Menu size={22} />
        </button>

        {/* ── Main content ── */}
        <div ref={scrollRef} className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Shared hero bar */}
          {header.title === 'Dashboard' ? null : header.title ? (() => {
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
                {/* Decorative ambient — leaf-like circles */}
                <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/[0.05] blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />
                <div className="pointer-events-none absolute top-6 right-1/4 h-24 w-24 rounded-full bg-white/[0.03] blur-xl" />

                <div className="relative z-10">
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                      <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {header.title}
                      </h1>
                      {subtitle && (
                        <p className="mt-1 text-sm text-white/50">{subtitle}</p>
                      )}
                    </div>
                    {header.actions && (
                      <div className="flex items-center gap-2 shrink-0">{header.actions}</div>
                    )}
                  </div>

                  {header.heroContent && (
                    <div className="mt-5">{header.heroContent}</div>
                  )}
                </div>
              </div>
            )
          })() : null}

          {/* Content rendered by nested <Route> children */}
          <div className={cn('flex-1', header.title === 'Dashboard' ? 'p-0' : 'p-6')}>
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
    </LeaderHeaderContext.Provider>
  )
}
