import { useState, useRef, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Home,
  Compass,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  Shield,
  TrendingUp,
  Trophy,
  ShoppingBag,
  Heart,
  Crown,
  MessageCircle,
  Bell,
  Megaphone,
  PanelLeftClose,
  LayoutDashboard,
  MapPin,
  Handshake,
  ClipboardList,
  ClipboardCheck,
  FileText,
  Download,
  Mail,
  AlertCircle,
  Bug,
  Image,
  Plus,
  Send,
  TreePine,
  Leaf,
  Star,
  Share2,
  Gift,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'
import { useLayout } from '@/hooks/use-layout'
import { usePointsBalance, getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string
  path: string
  icon: ReactNode
  capability?: string
  superAdminOnly?: boolean
  /** Only show on mobile sidebar (not desktop) */
  mobileOnly?: boolean
}

interface NavCategory {
  label: string
  items: NavItem[]
  superAdminOnly?: boolean
  /** Only show on mobile sidebar (not desktop) */
  mobileOnly?: boolean
}

type Suite = 'main' | 'admin' | 'leader'

/* ------------------------------------------------------------------ */
/*  Widths                                                             */
/* ------------------------------------------------------------------ */

const EXPANDED_WIDTH = 'w-[240px]'
const COLLAPSED_WIDTH = 'w-[60px]'

/* ------------------------------------------------------------------ */
/*  Tier labels                                                        */
/* ------------------------------------------------------------------ */

const tierLabels: Record<TierName, string> = {
  new: 'New',
  active: 'Active',
  committed: 'Committed',
  dedicated: 'Dedicated',
  lifetime: 'Lifetime',
}

/* ------------------------------------------------------------------ */
/*  Nav definitions                                                    */
/* ------------------------------------------------------------------ */

const mainNavCategories: NavCategory[] = [
  {
    label: 'Main',
    items: [
      { label: 'Home', path: '/', icon: <Home size={17} strokeWidth={1.5} /> },
      { label: 'My Events', path: '/events', icon: <CalendarDays size={17} strokeWidth={1.5} /> },
      { label: 'Community', path: '/community', icon: <Users size={17} strokeWidth={1.5} /> },
      { label: 'Chat', path: '/chat', icon: <MessageCircle size={17} strokeWidth={1.5} /> },
      { label: 'Notifications', path: '/notifications', icon: <Bell size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Activity',
    items: [
      { label: 'Impact', path: '/impact', icon: <TrendingUp size={17} strokeWidth={1.5} /> },
      { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={17} strokeWidth={1.5} /> },
      { label: 'Points History', path: '/points', icon: <Star size={17} strokeWidth={1.5} />, mobileOnly: true },
      { label: 'National Impact', path: '/impact/national', icon: <MapPin size={17} strokeWidth={1.5} />, mobileOnly: true },
    ],
  },
  {
    label: 'Discover',
    items: [
      { label: 'Explore', path: '/explore', icon: <Compass size={17} strokeWidth={1.5} /> },
      { label: 'Announcements', path: '/announcements', icon: <Megaphone size={17} strokeWidth={1.5} /> },
      { label: 'Membership', path: '/membership', icon: <Crown size={17} strokeWidth={1.5} /> },
      { label: 'Shop', path: '/shop', icon: <ShoppingBag size={17} strokeWidth={1.5} /> },
      { label: 'Donate', path: '/donate', icon: <Heart size={17} strokeWidth={1.5} /> },
      { label: 'Partner Offers', path: '/shop', icon: <Gift size={17} strokeWidth={1.5} />, mobileOnly: true },
    ],
  },
  {
    label: 'Community',
    mobileOnly: true,
    items: [
      { label: 'Collectives', path: '/collectives', icon: <Users size={17} strokeWidth={1.5} />, mobileOnly: true },
      { label: 'Invite Friends', path: '/referral', icon: <Share2 size={17} strokeWidth={1.5} />, mobileOnly: true },
    ],
  },
]

const adminNavCategories: NavCategory[] = [
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

const leaderNavCategories: NavCategory[] = [
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
/*  Suite identity config — every suite gets a card                     */
/* ------------------------------------------------------------------ */

interface SuiteIdentity {
  key: Suite
  label: string
  subtitle: string
  path: string
  icon: ReactNode
  iconSmall: ReactNode
  iconGradient: string
  badgeBg: string
  badgeBorder: string
  labelColor: string
  pillHover: string
}

function getSuiteIdentity(suite: Suite, collectiveName: string): SuiteIdentity {
  switch (suite) {
    case 'admin':
      return {
        key: 'admin',
        label: 'Admin',
        subtitle: 'Co-Exist',
        path: '/admin',
        icon: <Shield size={14} className="text-white" />,
        iconSmall: <Shield size={12} className="text-white" />,
        iconGradient: 'from-primary-700 to-primary-900',
        badgeBg: 'from-primary-50/80 to-primary-50/30',
        badgeBorder: 'border-primary-100/30',
        labelColor: 'text-primary-500',
        pillHover: 'hover:bg-primary-50/60',
      }
    case 'leader':
      return {
        key: 'leader',
        label: 'Leader',
        subtitle: collectiveName,
        path: '/leader',
        icon: <TreePine size={14} className="text-white" />,
        iconSmall: <TreePine size={12} className="text-white" />,
        iconGradient: 'from-moss-400 to-moss-600',
        badgeBg: 'from-moss-50/80 to-moss-50/30',
        badgeBorder: 'border-moss-100/30',
        labelColor: 'text-moss-500',
        pillHover: 'hover:bg-moss-50/60',
      }
    default:
      return {
        key: 'main',
        label: 'Member',
        subtitle: 'Co-Exist',
        path: '/',
        icon: <Leaf size={14} className="text-white" />,
        iconSmall: <Leaf size={12} className="text-white" />,
        iconGradient: 'from-sprout-500 to-primary-600',
        badgeBg: 'from-sprout-50/80 to-primary-50/30',
        badgeBorder: 'border-sprout-100/30',
        labelColor: 'text-sprout-600',
        pillHover: 'hover:bg-sprout-50/60',
      }
  }
}

/* ------------------------------------------------------------------ */
/*  Suite Switcher — inactive pills + active card                      */
/* ------------------------------------------------------------------ */

const EASE = [0.25, 0.1, 0.25, 1] as const

function SuiteSwitcher({
  suite,
  collapsed,
  collectiveName,
  availableSuites,
  reduced,
  skipInitial,
  onSuiteChange,
}: {
  suite: Suite
  collapsed: boolean
  collectiveName: string
  availableSuites: Suite[]
  reduced: boolean
  /** True on very first render — suppresses entry animation */
  skipInitial: boolean
  /** If provided, switch suite locally instead of navigating */
  onSuiteChange?: (suite: Suite) => void
}) {
  const navigate = useNavigate()

  const handleSuiteSelect = (id: SuiteIdentity) => {
    if (onSuiteChange) {
      onSuiteChange(id.key)
    } else {
      navigate(id.path)
    }
  }

  const allIdentities = useMemo(
    () => availableSuites.map((s) => getSuiteIdentity(s, collectiveName)),
    [availableSuites, collectiveName],
  )

  const active = getSuiteIdentity(suite, collectiveName)
  const inactive = allIdentities.filter((id) => id.key !== suite)

  // Only one suite available — no switcher, just the card
  if (availableSuites.length <= 1) {
    return collapsed ? (
      <div className="flex justify-center py-2.5">
        <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm', active.iconGradient)}>
          {active.icon}
        </div>
      </div>
    ) : (
      <div className={cn(
        'px-3 py-3 mx-2.5 mb-1 rounded-xl bg-gradient-to-br border',
        active.badgeBg, active.badgeBorder,
      )}>
        <div className="flex items-center gap-2.5">
          <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm', active.iconGradient)}>
            {active.icon}
          </div>
          <div className="min-w-0">
            <p className={cn('text-[10px] font-semibold uppercase tracking-[0.08em] leading-none', active.labelColor)}>
              {active.label}
            </p>
            <p className="text-[13px] font-medium text-primary-800 truncate mt-0.5">
              {active.subtitle}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const noInit = reduced || skipInitial

  return (
    <div className="mx-2.5 mb-1">
      {/* ── Inactive suite pills — compact, clickable ── */}
      <motion.div
        layout={!reduced}
        transition={{ layout: { type: 'spring', stiffness: 400, damping: 30 } }}
        className={cn(
          collapsed ? 'flex flex-col items-center gap-1.5 mb-2' : 'flex items-center gap-1.5 mb-2',
        )}
      >
        <AnimatePresence>
          {inactive.map((id) =>
            collapsed ? (
              <motion.button
                key={id.key}
                layout={!reduced}
                layoutId={reduced ? undefined : `suite-pill-${id.key}`}
                type="button"
                onClick={() => handleSuiteSelect(id)}
                initial={noInit ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ layout: { type: 'spring', stiffness: 400, damping: 30 }, opacity: { duration: 0.2 }, scale: { duration: 0.2 } }}
                className={cn(
                  'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center',
                  'opacity-50 hover:opacity-100',
                  'cursor-pointer select-none',
                  'transition-opacity duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                  id.iconGradient,
                )}
                title={id.label}
                aria-label={`Switch to ${id.label}`}
              >
                {id.iconSmall}
              </motion.button>
            ) : (
              <motion.button
                key={id.key}
                layout={!reduced}
                layoutId={reduced ? undefined : `suite-pill-${id.key}`}
                type="button"
                onClick={() => handleSuiteSelect(id)}
                initial={noInit ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ layout: { type: 'spring', stiffness: 400, damping: 30 }, opacity: { duration: 0.2 }, scale: { duration: 0.2 } }}
                className={cn(
                  'flex items-center gap-1.5 px-2 h-7 rounded-lg',
                  'text-[11px] font-medium text-primary-500',
                  'bg-white/60 border border-primary-100/25',
                  id.pillHover,
                  'cursor-pointer select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                )}
                aria-label={`Switch to ${id.label}`}
              >
                <span className={cn('w-4.5 h-4.5 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0', id.iconGradient)}>
                  {id.iconSmall}
                </span>
                <span className="truncate">{id.label}</span>
              </motion.button>
            ),
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Active suite card — persistent structure, content cross-dissolves ── */}
      {collapsed ? (
        <div className="flex justify-center">
          <AnimatePresence>
            <motion.div
              key={`active-pip-${suite}`}
              initial={noInit ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, scale: 0.85, position: 'absolute' as const }}
              transition={{ duration: 0.25, ease: EASE }}
              className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm', active.iconGradient)}
            >
              {active.icon}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <div
          className={cn(
            'px-3 py-3 rounded-xl bg-gradient-to-br border',
            'transition-colors duration-300 ease-in-out',
            active.badgeBg, active.badgeBorder,
          )}
        >
          <div className="flex items-center gap-2.5">
            {/* Icon — cross-dissolves */}
            <div className="relative w-8 h-8 shrink-0">
              <AnimatePresence>
                <motion.div
                  key={`active-icon-${suite}`}
                  initial={noInit ? false : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={cn('absolute inset-0 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-sm', active.iconGradient)}
                >
                  {active.icon}
                </motion.div>
              </AnimatePresence>
            </div>
            {/* Text — cross-dissolves */}
            <div className="relative min-w-0 flex-1 h-[30px]">
              <AnimatePresence>
                <motion.div
                  key={`active-text-${suite}`}
                  initial={noInit ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className="absolute inset-0 flex flex-col justify-center"
                >
                  <p className={cn('text-[10px] font-semibold uppercase tracking-[0.08em] leading-none', active.labelColor)}>
                    {active.label}
                  </p>
                  <p className="text-[13px] font-medium text-primary-800 truncate mt-0.5">
                    {active.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Accent config per suite                                            */
/* ------------------------------------------------------------------ */

function getAccentClasses(suite: Suite) {
  const isMoss = suite === 'leader'
  return {
    borderColor: isMoss ? 'border-moss-100/40' : 'border-primary-100/40',
    dividerColor: isMoss ? 'bg-moss-100/30' : 'bg-primary-100/30',
    activeClasses: isMoss
      ? 'bg-moss-50/70 text-moss-800 font-medium'
      : 'bg-primary-50/80 text-primary-700 font-medium',
    hoverClasses: isMoss
      ? 'text-primary-400 hover:bg-moss-50/40 hover:text-moss-700'
      : 'text-primary-400 hover:bg-primary-50/50 hover:text-primary-700',
    indicatorFrom: isMoss ? 'from-moss-400' : 'from-primary-500',
    indicatorTo: isMoss ? 'to-moss-600' : 'to-primary-700',
    dotColor: isMoss ? 'bg-moss-500' : 'bg-primary-600',
    focusRing: isMoss ? 'focus-visible:ring-moss-400' : 'focus-visible:ring-primary-400',
    collapseHover: isMoss
      ? 'hover:text-primary-600 hover:bg-moss-50/50'
      : 'hover:text-primary-600 hover:bg-primary-50/50',
  }
}

/* ------------------------------------------------------------------ */
/*  Shared nav list renderer                                           */
/* ------------------------------------------------------------------ */

function SidebarNavList({
  suite,
  categories,
  collapsed,
  isCurrent,
  isActive,
  reduced,
  isMobileMode,
  onNavigate,
}: {
  suite: Suite
  categories: NavCategory[]
  collapsed: boolean
  isCurrent: boolean
  isActive: (path: string) => boolean
  reduced: boolean
  isMobileMode: boolean
  onNavigate?: (path: string) => void
}) {
  const sAccent = getAccentClasses(suite)
  const sLayoutId = `unified-sidebar-${suite}`
  let itemIndex = 0

  // Filter categories/items based on mobile vs desktop
  const filteredCategories = categories
    .filter((cat) => isMobileMode || !cat.mobileOnly)
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => isMobileMode || !item.mobileOnly),
    }))
    .filter((cat) => cat.items.length > 0)

  return (
    <div
      className="grid transition-[grid-template-rows,opacity] duration-300 ease-in-out"
      style={{ gridTemplateRows: isCurrent ? '1fr' : '0fr' }}
      aria-hidden={!isCurrent}
    >
      <nav className={cn(
        'overflow-hidden px-2',
        isCurrent ? 'py-2' : 'py-0',
        'transition-[padding] duration-300 ease-in-out',
      )}>
        {filteredCategories.map((cat, catIdx) => {
          const showLabel = catIdx > 0
          return (
            <div key={cat.label}>
              {showLabel && (
                <div>
                  {!collapsed && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-300 px-2.5 mt-4 mb-1.5">
                      {cat.label}
                    </p>
                  )}
                  {collapsed && <div className={cn('my-2.5 mx-2 h-px', sAccent.dividerColor)} />}
                </div>
              )}

              <ul className="space-y-0.5">
                {cat.items.map((item) => {
                  const isItemActive = isCurrent && isActive(item.path)
                  const idx = itemIndex++
                  return (
                    <li
                      key={item.path + item.label}
                      className={cn(
                        'transition-[opacity,transform] duration-250 ease-out',
                        isCurrent
                          ? 'opacity-100 translate-y-0'
                          : 'opacity-0 translate-y-1',
                      )}
                      style={{
                        transitionDelay: isCurrent ? `${idx * 25}ms` : '0ms',
                      }}
                    >
                      {isMobileMode && onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate(item.path)}
                          className={cn(
                            'relative flex items-center gap-2.5 w-full',
                            'rounded-xl text-[13px]',
                            'transition-colors duration-150',
                            'cursor-pointer select-none text-left',
                            'focus-visible:outline-none focus-visible:ring-2',
                            sAccent.focusRing,
                            'px-2.5 h-9',
                            isItemActive ? sAccent.activeClasses : sAccent.hoverClasses,
                          )}
                          aria-current={isItemActive ? 'page' : undefined}
                        >
                          {isItemActive && (
                            <motion.span
                              layoutId={reduced ? undefined : `${sLayoutId}-mobile`}
                              className={cn(
                                'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b',
                                sAccent.indicatorFrom,
                                sAccent.indicatorTo,
                              )}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className={cn(
                            'flex items-center justify-center shrink-0 transition-transform duration-150',
                            isItemActive && 'scale-105',
                          )}>
                            {item.icon}
                          </span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      ) : (
                        <Link
                          to={item.path}
                          onClick={() => window.scrollTo({ top: 0 })}
                          tabIndex={isCurrent ? 0 : -1}
                          className={cn(
                            'relative flex items-center gap-2.5',
                            'rounded-xl text-[13px]',
                            'transition-colors duration-150',
                            'cursor-pointer select-none',
                            'focus-visible:outline-none focus-visible:ring-2',
                            sAccent.focusRing,
                            collapsed ? 'justify-center h-9 w-9 mx-auto' : 'px-2.5 h-9',
                            isItemActive ? sAccent.activeClasses : sAccent.hoverClasses,
                          )}
                          aria-current={isItemActive ? 'page' : undefined}
                          title={collapsed ? item.label : undefined}
                        >
                          {isItemActive && !collapsed && (
                            <motion.span
                              layoutId={reduced ? undefined : sLayoutId}
                              className={cn(
                                'absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-gradient-to-b',
                                sAccent.indicatorFrom,
                                sAccent.indicatorTo,
                              )}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}

                          {isItemActive && collapsed && (
                            <motion.span
                              layoutId={reduced ? undefined : `${sLayoutId}-dot`}
                              className={cn(
                                'absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full',
                                sAccent.dotColor,
                              )}
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}

                          <span
                            className={cn(
                              'flex items-center justify-center shrink-0 transition-transform duration-150',
                              isItemActive && 'scale-105',
                            )}
                          >
                            {item.icon}
                          </span>
                          {!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile profile card                                                */
/* ------------------------------------------------------------------ */

function MobileProfileCard({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { profile } = useAuth()
  const { data: pointsData } = usePointsBalance()

  const points = pointsData?.points ?? profile?.points ?? 0
  const tier = getTierFromPoints(points) as TierName

  return (
    <button
      type="button"
      onClick={() => onNavigate('/profile')}
      className={cn(
        'w-full flex items-center gap-3.5 p-3 group',
        'bg-gradient-to-br from-primary-50/80 to-primary-50/30',
        'rounded-2xl border border-primary-100/40',
        'cursor-pointer select-none text-left',
        'hover:from-primary-50 hover:to-primary-50/50',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
      )}
    >
      <Avatar
        src={profile?.avatar_url}
        name={profile?.display_name ?? ''}
        size="lg"
        tier={tier}
      />
      <div className="flex-1 min-w-0">
        <p className="font-heading text-[17px] font-bold text-primary-900 truncate leading-tight">
          {profile?.display_name}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge variant="tier" tier={tier} size="sm">
            {tierLabels[tier]}
          </Badge>
          <span className="flex items-center gap-0.5 text-[11px] font-medium text-primary-400">
            <Star size={10} fill="currentColor" className="text-primary-300" />
            {points.toLocaleString()}
          </span>
        </div>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={1.5}
        className="text-primary-200 group-hover:text-primary-400 transition-colors shrink-0"
      />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile suite icon switcher — compact 3-icon toggle                 */
/* ------------------------------------------------------------------ */

function MobileSuiteSwitcher({
  suite,
  availableSuites,
  collectiveName,
  reduced,
  onSuiteChange,
}: {
  suite: Suite
  availableSuites: Suite[]
  collectiveName: string
  reduced: boolean
  onSuiteChange: (s: Suite) => void
}) {
  // Only show if user has 2+ suites
  if (availableSuites.length <= 1) return null

  const identities = availableSuites.map((s) => getSuiteIdentity(s, collectiveName))

  return (
    <div className="mx-5 mb-3">
      <div className="relative flex items-center bg-primary-50/60 rounded-2xl p-1">
        {/* Sliding pill background */}
        {identities.map((id, idx) => {
          if (id.key !== suite) return null
          return (
            <motion.div
              key="active-pill"
              layoutId={reduced ? undefined : 'mobile-suite-pill'}
              className={cn(
                'absolute top-1 bottom-1 rounded-xl',
                'bg-white shadow-sm',
              )}
              style={{
                left: `calc(${(idx / identities.length) * 100}% + 4px)`,
                width: `calc(${100 / identities.length}% - 8px)`,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.7 }}
            />
          )
        })}

        {/* Icon buttons */}
        {identities.map((id) => {
          const isActive = id.key === suite
          return (
            <button
              key={id.key}
              type="button"
              onClick={() => onSuiteChange(id.key)}
              className={cn(
                'relative z-10 flex items-center justify-center gap-1.5',
                'flex-1 min-h-[44px] min-w-[44px]',
                'rounded-xl',
                'cursor-pointer select-none',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isActive ? 'text-primary-800' : 'text-primary-400',
              )}
              aria-label={id.label}
              aria-pressed={isActive}
            >
              <span className={cn(
                'w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center',
                'transition-opacity duration-200',
                isActive ? 'opacity-100' : 'opacity-50',
                id.iconGradient,
              )}>
                {id.iconSmall}
              </span>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[12px] font-semibold truncate"
                >
                  {id.label}
                </motion.span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Desktop suite icon switcher — works expanded & collapsed           */
/* ------------------------------------------------------------------ */

function DesktopSuiteSwitcher({
  suite,
  availableSuites,
  collectiveName,
  collapsed,
  reduced,
  onSuiteChange,
}: {
  suite: Suite
  availableSuites: Suite[]
  collectiveName: string
  collapsed: boolean
  reduced: boolean
  onSuiteChange: (s: Suite) => void
}) {
  const identities = availableSuites.map((s) => getSuiteIdentity(s, collectiveName))

  if (collapsed) {
    // Collapsed: vertical stack of icon buttons
    return (
      <div className="mx-2 mb-2 flex flex-col items-center gap-1">
        {identities.map((id) => {
          const isActive = id.key === suite
          return (
            <button
              key={id.key}
              type="button"
              onClick={() => onSuiteChange(id.key)}
              className={cn(
                'relative flex items-center justify-center',
                'w-9 h-9 rounded-xl',
                'cursor-pointer select-none',
                'transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              )}
              aria-label={id.label}
              aria-pressed={isActive}
              title={id.label}
            >
              {isActive && (
                <motion.span
                  layoutId={reduced ? undefined : 'desktop-suite-pill'}
                  className="absolute inset-0 rounded-xl bg-primary-50/70"
                  transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.7 }}
                />
              )}
              <span className={cn(
                'relative z-10 w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center',
                'transition-opacity duration-200',
                isActive ? 'opacity-100' : 'opacity-40',
                id.iconGradient,
              )}>
                {id.iconSmall}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // Expanded: horizontal row with sliding pill
  return (
    <div className="mx-2.5 mb-2">
      <div className="relative flex items-center bg-primary-50/60 rounded-2xl p-1">
        {/* Sliding pill background */}
        {identities.map((id, idx) => {
          if (id.key !== suite) return null
          return (
            <motion.div
              key="active-pill"
              layoutId={reduced ? undefined : 'desktop-suite-pill'}
              className="absolute top-1 bottom-1 rounded-xl bg-white shadow-sm"
              style={{
                left: `calc(${(idx / identities.length) * 100}% + 4px)`,
                width: `calc(${100 / identities.length}% - 8px)`,
              }}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.7 }}
            />
          )
        })}

        {/* Icon buttons */}
        {identities.map((id) => {
          const isActive = id.key === suite
          return (
            <button
              key={id.key}
              type="button"
              onClick={() => onSuiteChange(id.key)}
              className={cn(
                'relative z-10 flex items-center justify-center gap-1.5',
                'flex-1 h-9',
                'rounded-xl',
                'cursor-pointer select-none',
                'transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isActive ? 'text-primary-800' : 'text-primary-400',
              )}
              aria-label={id.label}
              aria-pressed={isActive}
            >
              <span className={cn(
                'w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center',
                'transition-opacity duration-200',
                isActive ? 'opacity-100' : 'opacity-50',
                id.iconGradient,
              )}>
                {id.iconSmall}
              </span>
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[11px] font-semibold truncate"
                >
                  {id.label}
                </motion.span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile overlay sidebar                                             */
/* ------------------------------------------------------------------ */

const instantTransition = { duration: 0 }

function MobileSidebarOverlay({
  open,
  onClose,
  suite: urlSuite,
  collectiveName,
  availableSuites,
  allSuiteCategories,
  isActive,
  reduced,
  profile,
}: {
  open: boolean
  onClose: () => void
  suite: Suite
  collectiveName: string
  availableSuites: Suite[]
  allSuiteCategories: Record<Suite, NavCategory[]>
  isActive: (path: string) => boolean
  reduced: boolean
  profile: any
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Local suite state — lets user switch views without closing the sheet
  const [mobileSuite, setMobileSuite] = useState<Suite>(urlSuite)

  // Sync local suite when the sheet opens (in case user navigated while closed)
  useEffect(() => {
    if (open) setMobileSuite(urlSuite)
  }, [open, urlSuite])

  const handleNavigate = useCallback(
    (to: string) => {
      onClose()
      requestAnimationFrame(() => navigate(to))
    },
    [navigate, onClose],
  )

  // Close on route change
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Lock body scroll + focus management
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => sheetRef.current?.focus())
    } else {
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !sheetRef.current) return
    const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [])

  const accent = getAccentClasses(mobileSuite)

  const slideTransition = shouldReduceMotion
    ? instantTransition
    : { type: 'spring' as const, stiffness: 380, damping: 34, mass: 0.7 }

  const backdropTransition = shouldReduceMotion
    ? instantTransition
    : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as const }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] gpu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: backdropTransition }}
            exit={{ opacity: 0, transition: shouldReduceMotion ? instantTransition : { duration: 0.18, ease: [0.4, 0, 0.2, 1] } }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sidebar panel — slides from right */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            tabIndex={-1}
            className={cn(
              'fixed top-0 right-0 bottom-0',
              'w-[min(84vw,360px)]',
              'bg-white gpu-panel',
              'shadow-[-12px_0_40px_-8px_rgba(51,63,43,0.15)]',
              'flex flex-col',
              'outline-none',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0, transition: slideTransition }}
            exit={{
              x: '100%',
              transition: shouldReduceMotion
                ? instantTransition
                : { type: 'spring', stiffness: 380, damping: 34 },
            }}
            onKeyDown={handleKeyDown}
          >
            {/* ── Header: wordmark + close ── */}
            <div
              className="px-5 pb-4"
              style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1" />
                <img
                  src="/logos/black-wordmark.png"
                  alt={APP_NAME}
                  className="h-5 w-auto"
                />
                <div className="flex-1 flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-xl',
                      'bg-primary-50/60 text-primary-400 hover:text-primary-700 hover:bg-primary-100/60',
                      'transition-all duration-150',
                      'cursor-pointer select-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    )}
                    aria-label="Close menu"
                  >
                    <X size={16} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {/* Profile card */}
              <MobileProfileCard onNavigate={handleNavigate} />
            </div>

            {/* ── Suite switcher — compact icon toggle ── */}
            <MobileSuiteSwitcher
              suite={mobileSuite}
              availableSuites={availableSuites}
              collectiveName={collectiveName}
              reduced={reduced}
              onSuiteChange={setMobileSuite}
            />

            {/* ── Nav items — scrollable ── */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)',
              }}
            >
              {availableSuites.map((s) => (
                <SidebarNavList
                  key={s}
                  suite={s}
                  categories={allSuiteCategories[s]}
                  collapsed={false}
                  isCurrent={s === mobileSuite}
                  isActive={isActive}
                  reduced={reduced}
                  isMobileMode
                  onNavigate={handleNavigate}
                />
              ))}
            </div>

            {/* ── Settings link at bottom (mobile) ── */}
            <div
              className={cn('p-2.5 border-t', accent.borderColor)}
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0.625rem)',
              }}
            >
              <button
                type="button"
                onClick={() => handleNavigate('/settings')}
                className={cn(
                  'flex items-center gap-2.5 w-full px-2.5 h-9',
                  'rounded-xl text-[13px]',
                  'text-primary-400 hover:bg-primary-50/50 hover:text-primary-700',
                  'transition-colors duration-150',
                  'cursor-pointer select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                )}
              >
                <Settings size={17} strokeWidth={1.5} />
                <span>Settings</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ------------------------------------------------------------------ */
/*  UnifiedSidebar                                                     */
/* ------------------------------------------------------------------ */

interface UnifiedSidebarProps {
  /** Mobile overlay mode — controlled open state */
  mobileOpen?: boolean
  /** Callback to close mobile overlay */
  onMobileClose?: () => void
}

export function UnifiedSidebar({ mobileOpen, onMobileClose }: UnifiedSidebarProps) {
  const location = useLocation()
  const { navMode } = useLayout()
  const shouldReduceMotion = useReducedMotion()
  const [collapsed, setCollapsed] = useState(false)
  const { profile, collectiveRoles, isStaff, isSuperAdmin, hasCapability } = useAuth()

  // Skip entry animations on cold mount, animate on suite switches
  const hasMounted = useRef(false)
  const skip = !hasMounted.current
  if (!hasMounted.current) hasMounted.current = true

  // Determine current suite
  const suite: Suite = location.pathname.startsWith('/admin')
    ? 'admin'
    : location.pathname.startsWith('/leader') && !location.pathname.startsWith('/leaderboard')
      ? 'leader'
      : 'main'

  // Leader collective info
  const leaderCollectiveId = useMemo(() => {
    const membership = collectiveRoles.find(
      (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
    )
    return membership?.collective_id
  }, [collectiveRoles])

  const { data: collectiveDetail } = useCollective(suite === 'leader' ? leaderCollectiveId : undefined)
  const collectiveName = (collectiveDetail?.name ?? 'My Collective').replace(/\s+Collective$/i, '')

  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  // Which suites can this user access?
  const availableSuites = useMemo<Suite[]>(() => {
    const suites: Suite[] = ['main']
    if (isAnyLeader) suites.push('leader')
    if (isStaff) suites.push('admin')
    return suites
  }, [isAnyLeader, isStaff])

  // Build categories for ALL suites the user can access
  const allSuiteCategories = useMemo(() => {
    const result: Record<Suite, NavCategory[]> = { main: [], admin: [], leader: [] }

    // Main
    const managementItems: NavItem[] = isStaff
      ? [{ label: 'Settings', path: '/settings', icon: <Settings size={17} strokeWidth={1.5} /> }]
      : []
    result.main = [
      ...mainNavCategories,
      ...(managementItems.length > 0 ? [{ label: 'Management', items: managementItems }] : []),
    ]

    // Admin (if accessible)
    if (isStaff) {
      result.admin = adminNavCategories
        .filter((cat) => !cat.superAdminOnly || isSuperAdmin)
        .map((cat) => ({
          ...cat,
          items: cat.items.filter((item) => !item.capability || hasCapability(item.capability)),
        }))
        .filter((cat) => cat.items.length > 0)
    }

    // Leader (if accessible)
    if (isAnyLeader) {
      result.leader = leaderNavCategories
    }

    return result
  }, [isSuperAdmin, hasCapability, isAnyLeader, isStaff])

  const isActive = (path: string) => {
    if (path === '/' || path === '/admin' || path === '/leader') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  const accent = getAccentClasses(suite)
  const reduced = !!shouldReduceMotion
  const isMobileMode = navMode === 'bottom-tabs'

  // ── Mobile mode: render overlay sidebar ──
  if (isMobileMode) {
    return (
      <MobileSidebarOverlay
        open={!!mobileOpen}
        onClose={onMobileClose ?? (() => {})}
        suite={suite}
        collectiveName={collectiveName}
        availableSuites={availableSuites}
        allSuiteCategories={allSuiteCategories}
        isActive={isActive}
        reduced={reduced}
        profile={profile}
      />
    )
  }

  // ── Desktop mode: permanent left sidebar ──

  // Local suite state — lets user switch views in-place (same as mobile)
  const [desktopSuite, setDesktopSuite] = useState<Suite>(suite)

  // Sync local suite when the URL-derived suite changes
  useEffect(() => {
    setDesktopSuite(suite)
  }, [suite])

  const dAccent = getAccentClasses(desktopSuite)

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col',
        'sticky top-0 self-start max-h-dvh z-50',
        'bg-white',
        'border-r',
        'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.08),8px_0_16px_-8px_rgba(0,0,0,0.04)]',
        'transition-[width,border-color] duration-250 ease-in-out',
        collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        dAccent.borderColor,
      )}
      aria-label={
        desktopSuite === 'admin' ? 'Admin navigation' : desktopSuite === 'leader' ? 'Leader navigation' : 'Sidebar navigation'
      }
    >
      {/* ── Wordmark ── */}
      <div className="flex items-center justify-center px-4 py-4">
        <Link
          to="/"
          className={cn('focus-visible:outline-none focus-visible:ring-2 rounded-md', dAccent.focusRing)}
          aria-label={`${APP_NAME} home`}
        >
          <img
            src="/logos/black-wordmark.png"
            alt={APP_NAME}
            className={cn(
              'h-5 w-auto transition-opacity duration-200',
              collapsed ? 'hidden' : 'block',
            )}
          />
          <img
            src="/logos/black-logo-transparent.png"
            alt={APP_NAME}
            className={cn(
              'h-6 w-6 object-contain transition-opacity duration-200',
              collapsed ? 'block' : 'hidden',
            )}
          />
        </Link>
      </div>

      {/* ── Suite switcher — icon toggle, same as mobile ── */}
      {availableSuites.length > 1 && (
        <DesktopSuiteSwitcher
          suite={desktopSuite}
          availableSuites={availableSuites}
          collectiveName={collectiveName}
          collapsed={collapsed}
          reduced={reduced}
          onSuiteChange={setDesktopSuite}
        />
      )}
      {availableSuites.length <= 1 && !collapsed && (
        <SuiteSwitcher
          suite={desktopSuite}
          collapsed={collapsed}
          collectiveName={collectiveName}
          availableSuites={availableSuites}
          reduced={reduced}
          skipInitial={skip}
        />
      )}

      {/* ── Nav ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {availableSuites.map((s) => (
          <SidebarNavList
            key={s}
            suite={s}
            categories={allSuiteCategories[s]}
            collapsed={collapsed}
            isCurrent={s === desktopSuite}
            isActive={isActive}
            reduced={reduced}
            isMobileMode={false}
          />
        ))}
      </div>

      {/* ── Sticky footer: settings + profile + collapse ── */}
      <div className={cn('border-t transition-colors duration-250', dAccent.borderColor)}>
        {/* Settings link — always visible */}
        <div className="px-2 pt-2">
          <Link
            to="/settings"
            className={cn(
              'relative flex items-center gap-2.5',
              'rounded-xl text-[13px]',
              'transition-colors duration-150',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2',
              dAccent.focusRing,
              collapsed ? 'justify-center h-9 w-full' : 'px-2.5 h-9',
              location.pathname.startsWith('/settings')
                ? dAccent.activeClasses
                : dAccent.hoverClasses,
            )}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={17} strokeWidth={1.5} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>

        {/* Profile link — all suites */}
        <div className="px-2.5 pt-1 pb-1">
          <Link
            to="/profile"
            className={cn(
              'flex items-center gap-3 min-w-0',
              'rounded-xl p-2',
              'transition-all duration-200',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              collapsed && 'justify-center',
              location.pathname.startsWith('/profile')
                ? 'bg-primary-50 text-primary-800'
                : 'text-primary-500 hover:text-primary-800 hover:bg-primary-50/60',
            )}
            aria-label="View profile"
            title={collapsed ? profile?.display_name || 'Profile' : undefined}
          >
            <Avatar
              src={profile?.avatar_url}
              name={profile?.display_name || ''}
              size="sm"
            />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-heading text-[13px] font-semibold text-primary-800 truncate">
                  {profile?.display_name}
                </p>
                {(profile as any)?.collective_name && (
                  <p className="text-[11px] text-primary-400 truncate">
                    {(profile as any).collective_name}
                  </p>
                )}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* ── Collapse toggle ── */}
      <div className={cn('p-2 border-t transition-colors duration-250', dAccent.borderColor)}>
        <button
          type="button"
          onClick={() => setCollapsed((p) => !p)}
          className={cn(
            'flex items-center justify-center gap-2 w-full',
            'h-8 rounded-xl text-[13px]',
            'text-primary-300',
            dAccent.collapseHover,
            'cursor-pointer select-none',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2',
            dAccent.focusRing,
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <motion.span
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center justify-center"
          >
            <PanelLeftClose size={15} strokeWidth={1.5} />
          </motion.span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
