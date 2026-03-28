import { type ReactNode, useState, useEffect, useRef, createContext, useContext, useCallback, useMemo, Suspense } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'

import {
    LayoutDashboard,
    Users,
    CalendarDays,
    MapPin,
    ClipboardList, ClipboardCheck, FileText,
    Settings,
    Download,
    Heart,
    Bug,
    Image, Home,
    ShoppingBag,
    MoreHorizontal,
    Handshake,
    Mail,
    Megaphone,
    Phone,
    ArrowLeft,
    BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'
import { BottomTabBar, type Tab } from '@/components/bottom-tab-bar'
import { useMenuSheet } from '@/hooks/use-menu-sheet'
import type { NavItem, NavCategory } from '@/components/sidebar/types'

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
interface AdminHeaderOpts {
  subtitle?: string
  actions?: ReactNode
  heroContent?: ReactNode
  fullBleed?: boolean
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminHeader(
  title: string,
  opts?: AdminHeaderOpts | ReactNode,
) {
  const ctx = useContext(AdminHeaderContext)

  // Extract individual values so the effect only re-fires when they actually change,
  // not when a new wrapper object is created each render.
  const isOptsObject = opts != null && typeof opts === 'object' && !('$$typeof' in (opts as Record<string, unknown>)) && ('subtitle' in (opts as Record<string, unknown>) || 'actions' in (opts as Record<string, unknown>) || 'heroContent' in (opts as Record<string, unknown>) || 'fullBleed' in (opts as Record<string, unknown>))
  const optsRecord = isOptsObject ? (opts as AdminHeaderOpts) : undefined
  const subtitle = optsRecord?.subtitle
  const actions = optsRecord ? optsRecord.actions : (opts as ReactNode)
  const heroContent = optsRecord?.heroContent
  const fullBleed = optsRecord?.fullBleed

  useEffect(() => {
    ctx?.setHeader({ title, subtitle, actions, heroContent, fullBleed })
  }, [ctx, title, subtitle, actions, heroContent, fullBleed])
}

/* ------------------------------------------------------------------ */
/*  Per-page hero hue config - maps title → gradient hue + subtitle   */
/* ------------------------------------------------------------------ */

interface HeroCfg { hue: string; defaultSubtitle: string; tall?: boolean; f: number; w: number }

const PAGE_HERO_CONFIG: Record<string, HeroCfg> = {
  'Dashboard':           { hue: 'from-primary-800 via-primary-900 to-primary-950',  defaultSubtitle: 'National conservation overview',               f: 0, w: 0 },
  'Collectives':         { hue: 'from-primary-600 via-primary-700 to-primary-900',  defaultSubtitle: 'Manage local chapters across Australia',        f: 1, w: 1, tall: true },
  'User Management':     { hue: 'from-primary-800 via-primary-850 to-neutral-900',  defaultSubtitle: 'Manage members, roles, and permissions',        f: 2, w: 2, tall: true },
  'Workflows':           { hue: 'from-primary-700 via-primary-800 to-primary-950',  defaultSubtitle: 'Automate recurring tasks and track KPIs',       f: 3, w: 3, tall: true },
  'Events':              { hue: 'from-accent-700 via-accent-800 to-primary-950',    defaultSubtitle: 'Track and manage conservation activities',       f: 4, w: 4, tall: true },
  'Create':              { hue: 'from-primary-700 via-primary-800 to-primary-950',  defaultSubtitle: 'Workflows, surveys, and email campaigns',       f: 5, w: 0, tall: true },
  'Surveys':             { hue: 'from-primary-800 via-primary-850 to-neutral-900',  defaultSubtitle: 'Collect feedback and measure satisfaction',      f: 6, w: 1, tall: true },
  'Reports':             { hue: 'from-primary-700 via-primary-900 to-primary-950',  defaultSubtitle: 'Generate impact and compliance reports',         f: 7, w: 2, tall: true },
  'Email Marketing':     { hue: 'from-primary-900 via-primary-950 to-neutral-900',  defaultSubtitle: 'Campaigns, subscribers, and delivery health',    f: 8, w: 3, tall: true },
  'Charity Settings':    { hue: 'from-primary-800 via-primary-900 to-neutral-900',  defaultSubtitle: 'ACNC registration and compliance details',      f: 9, w: 4, tall: true },
  'Export Centre':       { hue: 'from-primary-700 via-primary-900 to-primary-950',  defaultSubtitle: 'Generate reports and download data',             f: 10, w: 0, tall: true },
  'Audit Log':           { hue: 'from-primary-900 via-primary-950 to-neutral-900',  defaultSubtitle: 'Track all administrative actions',               f: 11, w: 1, tall: true },
  'Branding & Images':   { hue: 'from-primary-800 via-primary-850 to-neutral-900',  defaultSubtitle: 'Manage app images and visual identity',          f: 0, w: 2, tall: true },
  'System':              { hue: 'from-primary-900 via-neutral-900 to-neutral-950',  defaultSubtitle: 'Infrastructure, feature flags, and health',      f: 1, w: 3, tall: true },
  'Merch Management':    { hue: 'from-primary-800 via-primary-900 to-primary-950',  defaultSubtitle: 'Products, orders, and inventory',                f: 3, w: 0, tall: true },
  'Applications':        { hue: 'from-sprout-700 via-primary-800 to-primary-950',   defaultSubtitle: 'Collective leadership applications',             f: 4, w: 1, tall: true },
  'Create Survey':       { hue: 'from-primary-800 via-primary-850 to-neutral-900',  defaultSubtitle: 'Design a new survey',                            f: 5, w: 2, tall: true },
  'Dev Tools':           { hue: 'from-primary-900 via-neutral-900 to-neutral-950',  defaultSubtitle: 'Testing and debugging utilities',                f: 6, w: 3, tall: true },
  'Partners & Sponsors': { hue: 'from-primary-700 via-primary-800 to-neutral-900',  defaultSubtitle: 'Manage organisations, offers, and programs',     f: 7, w: 4, tall: true },
  'Challenges':          { hue: 'from-accent-700 via-primary-800 to-primary-950',   defaultSubtitle: 'Create and track national conservation goals',   f: 8, w: 0, tall: true },
  'Content Moderation':  { hue: 'from-primary-900 via-primary-950 to-neutral-900',  defaultSubtitle: 'Review flagged content and manage reports',      f: 9, w: 1, tall: true },
  'Legal Pages':         { hue: 'from-primary-800 via-primary-900 to-neutral-900',  defaultSubtitle: 'Terms, privacy, and legal documentation',        f: 10, w: 2, tall: true },
  'Edit Legal Page':     { hue: 'from-primary-800 via-primary-900 to-neutral-900',  defaultSubtitle: 'Edit page content and settings',                 f: 10, w: 2, tall: true },
  'Updates':             { hue: 'from-secondary-700 via-primary-800 to-primary-950', defaultSubtitle: 'Manage and publish updates for participants',   f: 2, w: 3, tall: true },
  'New Update':          { hue: 'from-secondary-700 via-primary-800 to-primary-950', defaultSubtitle: 'Compose and publish a blog-post update',        f: 2, w: 3, tall: true },
  'Development':         { hue: 'from-amber-700 via-amber-800 to-primary-950',     defaultSubtitle: 'Learning modules, pathways, and certifications', f: 3, w: 4, tall: true },
  'Create Module':       { hue: 'from-amber-600 via-amber-700 to-primary-900',     defaultSubtitle: 'Build a new learning module',                    f: 4, w: 0, tall: true },
  'Edit Module':         { hue: 'from-amber-600 via-amber-700 to-primary-900',     defaultSubtitle: 'Update module content and settings',             f: 4, w: 0, tall: true },
  'Module Detail':       { hue: 'from-amber-600 via-amber-700 to-primary-900',     defaultSubtitle: 'Module preview and completion stats',            f: 5, w: 1, tall: true },
  'Create Section':      { hue: 'from-amber-700 via-amber-800 to-primary-950',     defaultSubtitle: 'Chain modules into a learning pathway',          f: 6, w: 2, tall: true },
  'Edit Section':        { hue: 'from-amber-700 via-amber-800 to-primary-950',     defaultSubtitle: 'Update pathway modules and settings',            f: 6, w: 2, tall: true },
  'Create Quiz':         { hue: 'from-amber-800 via-primary-800 to-primary-950',   defaultSubtitle: 'Design an assessment quiz',                      f: 7, w: 3, tall: true },
  'Edit Quiz':           { hue: 'from-amber-800 via-primary-800 to-primary-950',   defaultSubtitle: 'Update quiz questions and settings',              f: 7, w: 3, tall: true },
  'Development Results': { hue: 'from-amber-700 via-primary-900 to-primary-950',   defaultSubtitle: 'Completion rates, quiz scores, and learner data', f: 8, w: 4, tall: true },
  'Emergency Contacts':  { hue: 'from-red-700 via-primary-800 to-primary-950',    defaultSubtitle: 'Manage emergency and internal contact directory',  f: 9, w: 0, tall: true },
}

const DEFAULT_HERO: HeroCfg = { hue: 'from-primary-800 via-primary-900 to-primary-950', defaultSubtitle: '', tall: true, f: 11, w: 3 }

/* ------------------------------------------------------------------ */
/*  Wave paths – organic SVG dividers (1440×70 viewBox)               */
/* ------------------------------------------------------------------ */

const WAVE_PATHS = [
  // Gentle rolling hills with rocky spikes
  'M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z',
  // Soft dunes with single peak
  'M0,30 C120,28 200,22 320,26 C440,30 520,18 600,20 C680,22 720,14 760,16 L768,6 L774,4 L780,10 C820,18 920,28 1040,24 C1120,20 1200,26 1280,30 C1360,32 1400,28 1440,26 L1440,70 L0,70 Z',
  // Double crest ridge
  'M0,28 C80,24 160,20 240,22 C320,24 360,12 400,14 L408,5 L414,3 L420,8 C460,16 540,26 640,24 C740,22 800,18 880,20 C960,22 1000,10 1040,12 L1048,4 L1054,2 L1060,7 C1100,16 1180,28 1280,26 C1360,24 1400,28 1440,26 L1440,70 L0,70 Z',
  // Asymmetric shelf drop
  'M0,22 C100,20 200,24 300,26 C400,28 480,30 560,28 C640,26 700,22 780,20 C860,18 900,14 940,16 L948,7 L954,4 L960,9 C1000,16 1080,24 1160,28 C1240,32 1320,30 1400,26 L1440,24 L1440,70 L0,70 Z',
  // Choppy reef
  'M0,26 C40,24 80,20 120,22 L128,12 L133,8 L138,14 C180,22 240,28 320,24 C400,20 440,16 480,18 C520,20 560,26 640,28 C720,30 760,24 800,22 L808,14 L813,10 L818,16 C860,24 920,28 1000,26 C1080,24 1120,20 1160,22 L1168,14 L1173,10 L1178,16 C1220,24 1300,28 1380,26 C1410,24 1440,22 1440,22 L1440,70 L0,70 Z',
]

/* ------------------------------------------------------------------ */
/*  Shape formations – unique decorative geometry per page             */
/* ------------------------------------------------------------------ */

type ShapeFormation = Array<{ className: string }>

const SHAPE_FORMATIONS: ShapeFormation[] = [
  // 0 - Top-right cluster + bottom-left accent
  [
    { className: 'absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.05]' },
    { className: 'absolute -right-4 top-2 w-36 h-36 rounded-full border border-white/[0.08]' },
    { className: 'absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-white/[0.04]' },
    { className: 'absolute right-12 bottom-6 w-16 h-16 rounded-full border border-white/[0.10]' },
  ],
  // 1 - Diagonal drift (top-left → bottom-right)
  [
    { className: 'absolute -left-12 -top-12 w-56 h-56 rounded-full bg-white/[0.06]' },
    { className: 'absolute left-[30%] top-[20%] w-20 h-20 rounded-full border border-white/[0.08]' },
    { className: 'absolute right-[15%] bottom-[10%] w-32 h-32 rounded-full bg-white/[0.04]' },
    { className: 'absolute -right-8 -bottom-8 w-48 h-48 rounded-full border border-white/[0.06]' },
  ],
  // 2 - Centre constellation
  [
    { className: 'absolute left-[40%] -top-10 w-52 h-52 rounded-full bg-white/[0.05]' },
    { className: 'absolute left-[25%] top-[35%] w-16 h-16 rounded-full border border-white/[0.10]' },
    { className: 'absolute right-[20%] bottom-4 w-24 h-24 rounded-full bg-white/[0.04]' },
    { className: 'absolute -left-6 bottom-[20%] w-28 h-28 rounded-full border border-white/[0.07]' },
  ],
  // 3 - Bottom-heavy ring pair
  [
    { className: 'absolute -right-20 -bottom-20 w-72 h-72 rounded-full border border-white/[0.06]' },
    { className: 'absolute -right-8 -bottom-8 w-44 h-44 rounded-full border border-white/[0.04]' },
    { className: 'absolute -left-14 -top-14 w-44 h-44 rounded-full bg-white/[0.05]' },
    { className: 'absolute right-[30%] top-4 w-14 h-14 rounded-full bg-white/[0.06]' },
  ],
  // 4 - Scattered pebbles
  [
    { className: 'absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/[0.04]' },
    { className: 'absolute left-[10%] top-[15%] w-12 h-12 rounded-full bg-white/[0.08]' },
    { className: 'absolute right-[25%] top-[40%] w-10 h-10 rounded-full border border-white/[0.12]' },
    { className: 'absolute -left-8 -bottom-8 w-36 h-36 rounded-full border border-white/[0.06]' },
    { className: 'absolute left-[50%] bottom-3 w-8 h-8 rounded-full bg-white/[0.06]' },
  ],
  // 5 - Left pillar + right accent
  [
    { className: 'absolute -left-20 -top-20 w-72 h-72 rounded-full border border-white/[0.07]' },
    { className: 'absolute -left-8 -top-8 w-44 h-44 rounded-full bg-white/[0.05]' },
    { className: 'absolute right-6 top-6 w-20 h-20 rounded-full border border-white/[0.10]' },
    { className: 'absolute right-[10%] -bottom-6 w-32 h-32 rounded-full bg-white/[0.03]' },
  ],
  // 6 - Floating archipelago
  [
    { className: 'absolute right-[5%] -top-6 w-36 h-36 rounded-full bg-white/[0.05]' },
    { className: 'absolute -left-14 top-[30%] w-40 h-40 rounded-full border border-white/[0.06]' },
    { className: 'absolute left-[55%] bottom-[15%] w-20 h-20 rounded-full bg-white/[0.06]' },
    { className: 'absolute right-4 bottom-10 w-12 h-12 rounded-full border border-white/[0.10]' },
    { className: 'absolute left-[20%] -bottom-4 w-24 h-24 rounded-full bg-white/[0.04]' },
  ],
  // 7 - Twin moons
  [
    { className: 'absolute -right-16 top-[10%] w-56 h-56 rounded-full bg-white/[0.05]' },
    { className: 'absolute -left-16 bottom-[5%] w-56 h-56 rounded-full bg-white/[0.05]' },
    { className: 'absolute left-[45%] top-2 w-14 h-14 rounded-full border border-white/[0.10]' },
    { className: 'absolute right-[30%] bottom-8 w-10 h-10 rounded-full border border-white/[0.08]' },
  ],
  // 8 - Crescent sweep (right arc)
  [
    { className: 'absolute -right-24 top-[5%] w-72 h-72 rounded-full border border-white/[0.06]' },
    { className: 'absolute -right-12 top-[15%] w-48 h-48 rounded-full bg-white/[0.04]' },
    { className: 'absolute left-[8%] top-[10%] w-16 h-16 rounded-full bg-white/[0.07]' },
    { className: 'absolute left-[25%] bottom-6 w-20 h-20 rounded-full border border-white/[0.09]' },
  ],
  // 9 - Horizon line (mid-band emphasis)
  [
    { className: 'absolute -left-16 top-[30%] w-60 h-60 rounded-full bg-white/[0.05]' },
    { className: 'absolute right-[10%] top-[25%] w-36 h-36 rounded-full border border-white/[0.07]' },
    { className: 'absolute left-[45%] top-[40%] w-12 h-12 rounded-full bg-white/[0.08]' },
    { className: 'absolute -right-6 -bottom-10 w-40 h-40 rounded-full border border-white/[0.05]' },
  ],
  // 10 - Ascending bubbles (bottom-left → top-right)
  [
    { className: 'absolute -left-10 -bottom-14 w-52 h-52 rounded-full bg-white/[0.05]' },
    { className: 'absolute left-[20%] bottom-[30%] w-18 h-18 rounded-full border border-white/[0.09]' },
    { className: 'absolute left-[45%] top-[25%] w-14 h-14 rounded-full bg-white/[0.06]' },
    { className: 'absolute right-[10%] -top-8 w-44 h-44 rounded-full border border-white/[0.06]' },
    { className: 'absolute right-[30%] top-[15%] w-10 h-10 rounded-full bg-white/[0.07]' },
  ],
  // 11 - Solitary giant + orbiting specs
  [
    { className: 'absolute left-[15%] -top-20 w-80 h-80 rounded-full bg-white/[0.04]' },
    { className: 'absolute right-[5%] top-[20%] w-12 h-12 rounded-full border border-white/[0.12]' },
    { className: 'absolute right-[20%] bottom-[15%] w-8 h-8 rounded-full bg-white/[0.08]' },
    { className: 'absolute -left-4 bottom-4 w-24 h-24 rounded-full border border-white/[0.06]' },
  ],
]

/** Returns true when the component is rendered inside the admin layout. */
// eslint-disable-next-line react-refresh/only-export-components
export function useIsAdminLayout() {
  return useContext(AdminHeaderContext) !== null
}

/* ------------------------------------------------------------------ */
/*  Nav items                                                          */
/* ------------------------------------------------------------------ */

const _adminNavCategories: NavCategory[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Overview', path: '/admin', icon: <LayoutDashboard size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Users', path: '/admin/users', icon: <Users size={17} strokeWidth={1.5} />, capability: 'manage_users' },
      { label: 'Applications', path: '/admin/applications', icon: <ClipboardList size={17} strokeWidth={1.5} />, capability: 'manage_users' },
    ],
  },
  {
    label: 'Programme',
    items: [
      { label: 'Collectives', path: '/admin/collectives', icon: <MapPin size={17} strokeWidth={1.5} />, capability: 'manage_collectives' },
      { label: 'Events', path: '/admin/events', icon: <CalendarDays size={17} strokeWidth={1.5} />, capability: 'manage_events' },
      { label: 'Partners', path: '/admin/partners', icon: <Handshake size={17} strokeWidth={1.5} />, capability: 'manage_partners' },
      { label: 'Shop', path: '/admin/shop', icon: <ShoppingBag size={17} strokeWidth={1.5} />, capability: 'manage_merch' },
      { label: 'Contacts', path: '/admin/contacts', icon: <Phone size={17} strokeWidth={1.5} />, capability: 'manage_users' },
    ],
  },
  {
    label: 'Create',
    items: [
      { label: 'Tasks', path: '/admin/tasks', icon: <ClipboardCheck size={17} strokeWidth={1.5} />, capability: 'manage_workflows' },
      { label: 'Surveys', path: '/admin/surveys', icon: <ClipboardList size={17} strokeWidth={1.5} />, capability: 'manage_surveys' },
      { label: 'Email', path: '/admin/email', icon: <Mail size={17} strokeWidth={1.5} />, capability: 'manage_email' },
      { label: 'Updates', path: '/admin/updates', icon: <Megaphone size={17} strokeWidth={1.5} />, capability: 'send_announcements' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Charity', path: '/admin/charity', icon: <Heart size={17} strokeWidth={1.5} />, capability: 'manage_charity' },
      { label: 'Impact Metrics', path: '/admin/impact-metrics', icon: <BarChart3 size={17} strokeWidth={1.5} />, capability: 'manage_system' },
      { label: 'Branding', path: '/admin/branding', icon: <Image size={17} strokeWidth={1.5} />, capability: 'manage_system' },
      { label: 'System', path: '/admin/system', icon: <Settings size={17} strokeWidth={1.5} />, capability: 'manage_system' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Reports', path: '/admin/reports', icon: <FileText size={17} strokeWidth={1.5} />, capability: 'view_reports' },
      { label: 'Exports', path: '/admin/exports', icon: <Download size={17} strokeWidth={1.5} />, capability: 'manage_exports' },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <FileText size={17} strokeWidth={1.5} />, capability: 'view_audit_log' },
      { label: 'Dev Tools', path: '/admin/dev-tools', icon: <Bug size={17} strokeWidth={1.5} />, capability: 'manage_system' },
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
    key: 'more',
    label: 'More',
    path: '/more',
    exact: true,
    isMore: true,
    icon: <MoreHorizontal size={21} strokeWidth={1.5} />,
    activeIcon: <MoreHorizontal size={21} strokeWidth={2.2} />,
  },
]

/* ------------------------------------------------------------------ */
/*  Admin bottom tabs - wires More to sidebar                          */
/* ------------------------------------------------------------------ */

function AdminBottomTabs() {
  const { openMenu } = useMenuSheet()
  return (
    <BottomTabBar
      tabs={adminBottomTabs}
      layoutPrefix="admin-tab"
      accent="primary"
      onMorePress={openMenu}
    />
  )
}


/* ------------------------------------------------------------------ */
/*  AdminLayout  route-level layout, renders <Outlet />              */
/* ------------------------------------------------------------------ */

/** Pages that are top-level admin destinations (no back button needed). */
const TOP_LEVEL_ADMIN_PATHS = new Set([
  '/admin',
  '/admin/users',
  '/admin/applications',
  '/admin/collectives',
  '/admin/events',
  '/admin/partners',
  '/admin/shop',
  '/admin/contacts',
  '/admin/tasks',
  '/admin/surveys',
  '/admin/email',
  '/admin/updates',
  '/admin/development',
  '/admin/charity',
  '/admin/branding',
  '/admin/legal-pages',
  '/admin/system',
  '/admin/reports',
  '/admin/exports',
  '/admin/audit-log',
  '/admin/dev-tools',
])

export function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { navMode } = useLayout()
  const showBottomTabs = navMode === 'bottom-tabs'
  const showBackButton = !TOP_LEVEL_ADMIN_PATHS.has(location.pathname)
  const [header, setHeaderState] = useState<AdminHeaderState>({ title: '' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Scroll content to top on route change  instant to avoid fighting
  // with page transition animations
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  const setHeader = useCallback((opts: { title: string; subtitle?: string; actions?: ReactNode; heroContent?: ReactNode; fullBleed?: boolean }) => {
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
            const shapes = SHAPE_FORMATIONS[cfg.f % SHAPE_FORMATIONS.length]
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
                  paddingTop: cfg.tall ? '3.5rem' : '2rem',
                }}
              >
                {/* Decorative shapes - unique formation per page */}
                {shapes.map((s, i) => (
                  <div key={i} className={cn('pointer-events-none', s.className)} />
                ))}

                <div className="relative z-10">
                  {/* Back button - dark circle, consistent across all sub-pages */}
                  {showBackButton && (
                    <motion.button
                      type="button"
                      onClick={() => navigate(-1)}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className={cn(
                        'flex items-center justify-center',
                        'w-11 h-11 rounded-full mb-3',
                        'bg-black/40 text-white hover:bg-black/50',
                        'cursor-pointer select-none',
                        'transition-colors duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                      )}
                      aria-label="Go back"
                    >
                      <ArrowLeft size={22} />
                    </motion.button>
                  )}

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
          <AdminBottomTabs />
        )}
      </div>
    </AdminHeaderContext.Provider>
  )
}
