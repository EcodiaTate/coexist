import { type ReactNode, useState, useEffect, useRef, createContext, useContext, useCallback, useMemo, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import {
    LayoutDashboard,
    CalendarDays,
    MoreHorizontal,
    Home,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar, type Tab } from '@/components/bottom-tab-bar'
import { useMenuSheet } from '@/hooks/use-menu-sheet'

/* ------------------------------------------------------------------ */
/*  Leader header context - lets child pages set title + actions       */
/* ------------------------------------------------------------------ */

interface LeaderHeaderState {
  title: string
  subtitle?: string
  actions?: ReactNode
  heroContent?: ReactNode
  /** When true, the layout skips the hero bar and uses p-0 - page owns its entire background */
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
  // Destructure opts to get stable primitive deps - avoids re-firing on every render
  // when callers pass an inline object literal like { fullBleed: true }
  const isOptsObject = opts && typeof opts === 'object' && !('$$typeof' in (opts as any)) && ('subtitle' in (opts as any) || 'actions' in (opts as any) || 'heroContent' in (opts as any) || 'fullBleed' in (opts as any))
  const subtitle = isOptsObject ? (opts as any).subtitle : undefined
  const actions = isOptsObject ? (opts as any).actions : (!isOptsObject ? opts as ReactNode : undefined)
  const heroContent = isOptsObject ? (opts as any).heroContent : undefined
  const fullBleed = isOptsObject ? (opts as any).fullBleed : undefined

  useEffect(() => {
    if (isOptsObject) {
      ctx?.setHeader({ title, subtitle, actions, heroContent, fullBleed })
    } else {
      ctx?.setHeader({ title, actions })
    }
  }, [ctx, title, isOptsObject, subtitle, actions, heroContent, fullBleed])
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
/*  Per-page hero config - earthy/nature-inspired gradients            */
/* ------------------------------------------------------------------ */

interface LeaderHeroCfg { hue: string; defaultSubtitle: string; f: number; w: number }

const PAGE_HERO_CONFIG: Record<string, LeaderHeroCfg> = {
  'Dashboard':      { hue: 'from-moss-600 via-moss-700 to-primary-900',    defaultSubtitle: 'Your collective at a glance',              f: 0, w: 0 },
  'Events':         { hue: 'from-moss-600 via-primary-700 to-primary-900', defaultSubtitle: 'Manage and create conservation events',     f: 1, w: 1 },
  'Tasks':          { hue: 'from-bark-600 via-bark-700 to-primary-900',    defaultSubtitle: 'Stay on top of your responsibilities',      f: 2, w: 2 },
  'Reports':        { hue: 'from-primary-700 via-primary-800 to-moss-900', defaultSubtitle: 'Generate impact and activity reports',       f: 3, w: 3 },
  'Create Event':   { hue: 'from-moss-500 via-moss-600 to-primary-800',   defaultSubtitle: 'Plan a new conservation activity',           f: 0, w: 1 },
}

const DEFAULT_HERO: LeaderHeroCfg = { hue: 'from-moss-600 via-moss-700 to-primary-900', defaultSubtitle: '', f: 2, w: 0 }

/* ------------------------------------------------------------------ */
/*  Wave paths – organic SVG dividers (1440×70 viewBox)               */
/* ------------------------------------------------------------------ */

const WAVE_PATHS = [
  // Soft dunes with single peak
  'M0,30 C120,28 200,22 320,26 C440,30 520,18 600,20 C680,22 720,14 760,16 L768,6 L774,4 L780,10 C820,18 920,28 1040,24 C1120,20 1200,26 1280,30 C1360,32 1400,28 1440,26 L1440,70 L0,70 Z',
  // Double crest ridge
  'M0,28 C80,24 160,20 240,22 C320,24 360,12 400,14 L408,5 L414,3 L420,8 C460,16 540,26 640,24 C740,22 800,18 880,20 C960,22 1000,10 1040,12 L1048,4 L1054,2 L1060,7 C1100,16 1180,28 1280,26 C1360,24 1400,28 1440,26 L1440,70 L0,70 Z',
  // Asymmetric shelf drop
  'M0,22 C100,20 200,24 300,26 C400,28 480,30 560,28 C640,26 700,22 780,20 C860,18 900,14 940,16 L948,7 L954,4 L960,9 C1000,16 1080,24 1160,28 C1240,32 1320,30 1400,26 L1440,24 L1440,70 L0,70 Z',
  // Gentle rolling hills with rocky spikes
  'M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z',
]

/* ------------------------------------------------------------------ */
/*  Shape formations – unique decorative geometry per page             */
/* ------------------------------------------------------------------ */

type LeaderShapeFormation = Array<{ className: string }>

const LEADER_FORMATIONS: LeaderShapeFormation[] = [
  // 0 - Canopy cluster (top-heavy)
  [
    { className: 'absolute -right-14 -top-14 w-60 h-60 rounded-full bg-white/[0.06]' },
    { className: 'absolute -right-2 top-4 w-32 h-32 rounded-full border border-white/[0.09]' },
    { className: 'absolute -left-8 bottom-2 w-36 h-36 rounded-full bg-white/[0.04]' },
    { className: 'absolute right-10 bottom-8 w-14 h-14 rounded-full border border-white/[0.10]' },
  ],
  // 1 - Understory scatter
  [
    { className: 'absolute -left-16 -top-16 w-52 h-52 rounded-full bg-white/[0.05]' },
    { className: 'absolute left-[35%] top-[25%] w-20 h-20 rounded-full border border-white/[0.10]' },
    { className: 'absolute -right-10 -bottom-10 w-44 h-44 rounded-full border border-white/[0.06]' },
    { className: 'absolute right-[15%] top-2 w-12 h-12 rounded-full bg-white/[0.07]' },
  ],
  // 2 - Root system (bottom-heavy rings)
  [
    { className: 'absolute -right-20 -bottom-16 w-64 h-64 rounded-full border border-white/[0.07]' },
    { className: 'absolute -right-6 -bottom-4 w-40 h-40 rounded-full border border-white/[0.04]' },
    { className: 'absolute -left-12 -top-12 w-40 h-40 rounded-full bg-white/[0.05]' },
    { className: 'absolute left-[50%] top-6 w-10 h-10 rounded-full bg-white/[0.06]' },
  ],
  // 3 - Creek stones (scattered small)
  [
    { className: 'absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/[0.04]' },
    { className: 'absolute left-[12%] top-[18%] w-10 h-10 rounded-full bg-white/[0.08]' },
    { className: 'absolute right-[28%] top-[42%] w-8 h-8 rounded-full border border-white/[0.12]' },
    { className: 'absolute -left-6 -bottom-6 w-32 h-32 rounded-full border border-white/[0.06]' },
    { className: 'absolute left-[48%] bottom-4 w-6 h-6 rounded-full bg-white/[0.07]' },
  ],
]

/* ------------------------------------------------------------------ */
/*  Nav items                                                          */
/* ------------------------------------------------------------------ */

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
    key: 'more',
    label: 'More',
    path: '/more',
    exact: true,
    isMore: true,
    icon: <MoreHorizontal size={22} strokeWidth={1.5} />,
    activeIcon: <MoreHorizontal size={22} strokeWidth={2} />,
  },
]

/* ------------------------------------------------------------------ */
/*  Shared nav link component                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Leader bottom tabs - wires More to sidebar                         */
/* ------------------------------------------------------------------ */

function LeaderBottomTabs() {
  const { openMenu } = useMenuSheet()
  return (
    <BottomTabBar
      tabs={leaderBottomTabs}
      layoutPrefix="leader-tab"
      accent="moss"
      onMorePress={openMenu}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  LeaderLayout  route-level layout, renders <Outlet />              */
/* ------------------------------------------------------------------ */

export function LeaderLayout() {
  const location = useLocation()
  const { collectiveRoles } = useAuth()
  const { navMode } = useLayout()
  const showBottomTabs = navMode === 'bottom-tabs'
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
  // Strip trailing "Collective" - e.g. "Byron Bay Collective" → "Byron Bay"
  const collectiveName = collectiveNameRaw.replace(/\s+Collective$/i, '')

  // Scroll content to top on route change — instant to avoid fighting
  // with page transition animations
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const setHeader = useCallback((opts: LeaderHeaderState) => {
    setHeaderState((prev) => {
      // Skip state update if nothing changed - prevents cascading re-renders
      if (
        prev.title === opts.title &&
        prev.subtitle === opts.subtitle &&
        prev.fullBleed === opts.fullBleed &&
        prev.actions === opts.actions &&
        prev.heroContent === opts.heroContent
      ) return prev
      return opts
    })
  }, [])

  const headerCtx = useMemo(() => ({ setHeader, collectiveId, collectiveSlug }), [setHeader, collectiveId, collectiveSlug])

  return (
    <LeaderHeaderContext.Provider value={headerCtx}>
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar is handled by UnifiedSidebar in AppShell */}

        {/* Mobile drawer + hamburger removed - handled by UnifiedSidebar in AppShell */}

        {/* ── Main content ── */}
        <div ref={scrollRef} className={cn(
          'flex-1 flex flex-col min-w-0 min-h-0 bg-surface-1',
          showBottomTabs && 'overflow-y-auto overscroll-none',
        )}>
          {/* Shared hero bar - only for non-fullBleed pages */}
          {!header.fullBleed && header.title ? (() => {
            const cfg = PAGE_HERO_CONFIG[header.title] ?? DEFAULT_HERO
            const subtitle = header.subtitle ?? cfg.defaultSubtitle
            const shapes = LEADER_FORMATIONS[cfg.f % LEADER_FORMATIONS.length]
            return (
              <div
                className={cn(
                  'relative overflow-hidden',
                  'bg-gradient-to-br',
                  cfg.hue,
                  'px-6 pt-12 pb-14 sm:px-8 sm:pt-16 sm:pb-16',
                  'before:absolute before:inset-x-0 before:bottom-full before:h-[200px] before:bg-inherit',
                )}
              >
                {/* Decorative shapes - unique formation per page */}
                {shapes.map((s, i) => (
                  <div key={i} className={cn('pointer-events-none', s.className)} />
                ))}

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

                {/* Wave divider */}
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  <svg
                    viewBox="0 0 1440 70"
                    preserveAspectRatio="none"
                    className="w-full h-7 sm:h-10 block"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d={WAVE_PATHS[cfg.w % WAVE_PATHS.length]} className="fill-surface-1" />
                  </svg>
                </div>
              </div>
            )
          })() : null}

          {/* Content rendered by nested <Route> children */}
          <div className={cn(
            'relative flex-1 overflow-clip',
            header.fullBleed ? 'p-0 bg-white' : 'p-6',
            !header.fullBleed && 'bg-gradient-to-b from-moss-50/40 via-white to-primary-50/20',
            showBottomTabs && 'pb-[calc(5rem+var(--safe-bottom))]',
          )}>

            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </div>

        {/* Leader bottom tab bar - mobile only */}
        {showBottomTabs && (
          <LeaderBottomTabs />
        )}
      </div>
    </LeaderHeaderContext.Provider>
  )
}
