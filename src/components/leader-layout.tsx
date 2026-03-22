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
  ArrowLeft,
  Menu,
  X,
  MapPin,
  Home,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar, type Tab } from '@/components/bottom-tab-bar'
import { SidebarShell, type SidebarNavCategory } from '@/components/sidebar-shell'

/* ------------------------------------------------------------------ */
/*  Leader header context — lets child pages set title + actions       */
/* ------------------------------------------------------------------ */

interface LeaderHeaderState {
  title: string
  subtitle?: string
  actions?: ReactNode
  heroContent?: ReactNode
  /** When true, the layout skips the hero bar and uses p-0 — page owns its entire background */
  fullBleed?: boolean
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
  opts?: { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode; fullBleed?: boolean } | ReactNode,
) {
  const ctx = useContext(LeaderHeaderContext)
  useEffect(() => {
    if (opts && typeof opts === 'object' && !('$$typeof' in (opts as any)) && ('subtitle' in (opts as any) || 'actions' in (opts as any) || 'heroContent' in (opts as any) || 'fullBleed' in (opts as any))) {
      const o = opts as { subtitle?: string; actions?: ReactNode; heroContent?: ReactNode; fullBleed?: boolean }
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

const leaderNavCategories: SidebarNavCategory[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', path: '/leader', icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Events', path: '/leader/events', icon: <CalendarDays size={17} strokeWidth={1.5} /> },
      { label: 'Members', path: '/leader/members', icon: <Users size={17} strokeWidth={1.5} /> },
      { label: 'Tasks', path: '/leader/tasks', icon: <ClipboardCheck size={17} strokeWidth={1.5} /> },
      { label: 'Announcements', path: '/leader/announcements', icon: <Megaphone size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Impact', path: '/leader/impact', icon: <TreePine size={17} strokeWidth={1.5} /> },
      { label: 'Reports', path: '/leader/reports', icon: <BarChart3 size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Actions',
    items: [
      { label: 'Create Event', path: '/leader/events/create', icon: <Plus size={17} strokeWidth={1.5} /> },
      { label: 'Invite Members', path: '/leader/invite', icon: <Send size={17} strokeWidth={1.5} /> },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Mobile bottom tab bar tabs for leader suite                        */
/* ------------------------------------------------------------------ */

const leaderBottomTabs: Tab[] = [
  {
    key: 'back',
    label: 'App',
    path: '/',
    exact: true,
    icon: <Home size={22} strokeWidth={1.5} />,
    activeIcon: <Home size={22} strokeWidth={2} fill="currentColor" />,
  },
  {
    key: 'leader-home',
    label: 'Dashboard',
    path: '/leader',
    exact: true,
    icon: <LayoutDashboard size={22} strokeWidth={1.5} />,
    activeIcon: <LayoutDashboard size={22} strokeWidth={2} fill="currentColor" />,
  },
  {
    key: 'leader-events',
    label: 'Events',
    path: '/leader/events',
    icon: <CalendarDays size={22} strokeWidth={1.5} />,
    activeIcon: <CalendarDays size={22} strokeWidth={2} fill="currentColor" />,
  },
  {
    key: 'leader-tasks',
    label: 'Tasks',
    path: '/leader/tasks',
    icon: <ClipboardCheck size={22} strokeWidth={1.5} />,
    activeIcon: <ClipboardCheck size={22} strokeWidth={2} fill="currentColor" />,
  },
  {
    key: 'leader-impact',
    label: 'Impact',
    path: '/leader/impact',
    icon: <TreePine size={22} strokeWidth={1.5} />,
    activeIcon: <TreePine size={22} strokeWidth={2} fill="currentColor" />,
  },
]

/* ------------------------------------------------------------------ */
/*  Shared nav link component                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  LeaderLayout  route-level layout, renders <Outlet />              */
/* ------------------------------------------------------------------ */

export function LeaderLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { collectiveRoles } = useAuth()
  const { navMode } = useLayout()
  const showBottomTabs = navMode === 'bottom-tabs'
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
  const collectiveNameRaw = collectiveDetail?.name ?? 'My Collective'
  // Strip trailing "Collective" — e.g. "Byron Bay Collective" → "Byron Bay"
  const collectiveName = collectiveNameRaw.replace(/\s+Collective$/i, '')

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
        <SidebarShell
          ariaLabel="Leader navigation"
          categories={leaderNavCategories}
          accent="moss"
          layoutId="leader-sidebar-active"
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
                    'text-primary-300 hover:text-primary-700 hover:bg-moss-50/50',
                    'transition-all duration-200',
                    'cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss-400',
                    collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-8',
                  )}
                  title={collapsed ? 'Back to app' : undefined}
                >
                  <ArrowLeft size={15} strokeWidth={1.5} className="shrink-0" />
                  {!collapsed && <span>Back to app</span>}
                </Link>
              </div>

              {/* Collective name badge */}
              {!collapsed && (
                <div className="px-3 py-3 mx-2.5 mb-1 rounded-xl bg-gradient-to-br from-moss-50/80 to-moss-50/30 border border-moss-100/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shrink-0 shadow-sm">
                      <TreePine size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-moss-500 uppercase tracking-[0.08em] leading-none">Leader</p>
                      <p className="text-[13px] font-medium text-primary-800 truncate mt-0.5">{collectiveName}</p>
                    </div>
                  </div>
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center py-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shadow-sm">
                    <TreePine size={14} className="text-white" />
                  </div>
                </div>
              )}
            </>
          )}
        />

        {/* ── Mobile drawer ── */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                key="leader-backdrop"
                className="md:hidden fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                key="leader-drawer"
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
                    className="flex items-center justify-center w-8 h-8 rounded-xl text-primary-300 hover:text-primary-700 hover:bg-moss-50/50 transition-all"
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

                {/* Collective name badge — mobile */}
                <div className="px-4 py-3 mx-3 mb-2 rounded-xl bg-gradient-to-br from-moss-50/80 to-moss-50/30 border border-moss-100/30">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-moss-400 to-moss-600 flex items-center justify-center shrink-0 shadow-sm">
                      <TreePine size={14} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-moss-500 uppercase tracking-[0.08em] leading-none">Leader</p>
                      <p className="text-[13px] font-medium text-primary-800 truncate mt-0.5">{collectiveName}</p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 py-2 px-3 space-y-0.5">
                  {leaderNavCategories.map((cat) => {
                    const showLabel = cat.label !== 'Overview'
                    return (
                      <div key={cat.label}>
                        {showLabel && (
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-300 px-3 mt-4 mb-1.5">
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
                                'relative flex items-center gap-2.5 px-3 h-10',
                                'rounded-xl text-[13px]',
                                'transition-all duration-200',
                                'cursor-pointer select-none',
                                active
                                  ? 'bg-moss-50/70 text-moss-800 font-medium'
                                  : 'text-primary-400 hover:bg-moss-50/40 hover:text-moss-700',
                              )}
                              aria-current={active ? 'page' : undefined}
                            >
                              {active && (
                                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-moss-400 to-moss-600" />
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
        <div ref={scrollRef} className={cn(
          'flex-1 flex flex-col min-w-0 min-h-0',
          showBottomTabs && 'overflow-y-auto overscroll-contain',
        )}>
          {/* Shared hero bar — only for non-fullBleed pages */}
          {!header.fullBleed && header.title ? (() => {
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
          <div className={cn(
            'relative flex-1',
            header.fullBleed ? 'p-0' : 'p-6',
            showBottomTabs && 'pb-[calc(5rem+var(--safe-bottom))]',
          )}>
            {/* Atmospheric background for non-fullBleed pages */}
            {!header.fullBleed && (
              <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div className="absolute inset-0 bg-gradient-to-b from-moss-50/40 via-white to-primary-50/20" />
                <div className="absolute -top-16 -right-20 w-[300px] h-[300px] rounded-full border-2 border-moss-200/20" />
                <div className="absolute -top-4 -right-6 w-[200px] h-[200px] rounded-full border border-moss-200/12" />
                <div className="absolute -bottom-20 -left-16 w-[280px] h-[280px] rounded-full bg-moss-100/25 blur-3xl" />
                <div className="absolute top-[40%] -left-6 w-[90px] h-[90px] rounded-full border border-primary-100/20" />
                <div className="absolute top-[18%] -right-8 w-[180px] h-[180px] rounded-full bg-primary-50/15 blur-3xl" />
                <div className="absolute bottom-[12%] right-[10%] w-[50px] h-[50px] rounded-full bg-moss-100/15" />
                <div className="absolute top-12 left-[12%] w-1.5 h-1.5 rounded-full bg-moss-200/25" />
                <div className="absolute top-[28%] right-[8%] w-2 h-2 rounded-full bg-primary-200/20" />
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

        {/* Leader bottom tab bar — mobile only */}
        {showBottomTabs && (
          <BottomTabBar
            tabs={leaderBottomTabs}
            layoutPrefix="leader-tab"
            accent="moss"
          />
        )}
      </div>
    </LeaderHeaderContext.Provider>
  )
}
