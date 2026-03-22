import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Home,
  Compass,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Trophy,
  ShoppingBag,
  Heart,
  Crown,
  MessageCircle,
  Bell,
  Megaphone,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { Avatar } from '@/components/avatar'
import { APP_NAME } from '@/lib/constants'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const mainNav: NavItem[] = [
  { label: 'Home', path: '/', icon: <Home size={19} strokeWidth={1.5} /> },
  { label: 'My Events', path: '/events', icon: <CalendarDays size={19} strokeWidth={1.5} /> },
  { label: 'Community', path: '/community', icon: <Users size={19} strokeWidth={1.5} /> },
  { label: 'Chat', path: '/chat', icon: <MessageCircle size={19} strokeWidth={1.5} /> },
  { label: 'Notifications', path: '/notifications', icon: <Bell size={19} strokeWidth={1.5} /> },
]

const activityNav: NavItem[] = [
  { label: 'Impact', path: '/impact', icon: <TrendingUp size={19} strokeWidth={1.5} /> },
  { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={19} strokeWidth={1.5} /> },
]

const secondaryNav: NavItem[] = [
  { label: 'Explore', path: '/explore', icon: <Compass size={19} strokeWidth={1.5} /> },
  { label: 'Announcements', path: '/announcements', icon: <Megaphone size={19} strokeWidth={1.5} /> },
  { label: 'Membership', path: '/membership', icon: <Crown size={19} strokeWidth={1.5} /> },
  { label: 'Shop', path: '/shop', icon: <ShoppingBag size={19} strokeWidth={1.5} /> },
  { label: 'Donate', path: '/donate', icon: <Heart size={19} strokeWidth={1.5} /> },
]

const leaderNav: NavItem[] = [
  { label: 'Leader Dashboard', path: '/leader', icon: <BarChart3 size={19} strokeWidth={1.5} /> },
]

const adminNav: NavItem[] = [
  { label: 'Admin Dashboard', path: '/admin', icon: <Shield size={19} strokeWidth={1.5} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={19} strokeWidth={1.5} /> },
]

interface SidebarNavProps {
  className?: string
}

export function SidebarNav({ className }: SidebarNavProps) {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { profile, collectiveRoles, isStaff } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  // Check if user is a leader in any collective
  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'sticky top-0 self-start max-h-dvh z-50',
        'flex flex-col',
        'bg-surface-0',
        'border-r border-primary-100/50',
        'transition-[width] duration-250 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[260px]',
        className,
      )}
      aria-label="Sidebar navigation"
    >
      {/* Wordmark */}
      <div className={cn(
        'flex items-center px-4 h-14',
        collapsed ? 'justify-center' : 'justify-start',
      )}>
        <Link
          to="/"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-md"
          aria-label={`${APP_NAME} home`}
        >
          <img
            src={collapsed ? '/logos/black-logo-transparent.png' : '/logos/black-wordmark.png'}
            alt={APP_NAME}
            className={cn(collapsed ? 'h-7 w-7 object-contain' : 'h-7 w-auto')}
          />
        </Link>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto py-2 px-2.5">
        <NavSection items={mainNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />

        <SectionDivider label="Activity" collapsed={collapsed} />
        <NavSection items={activityNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />

        <SectionDivider label="Discover" collapsed={collapsed} />
        <NavSection items={secondaryNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />

        {(isAnyLeader || isStaff) && (
          <>
            <SectionDivider label="Management" collapsed={collapsed} />
            {isAnyLeader && (
              <NavSection items={leaderNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />
            )}
            {isStaff && (
              <NavSection items={adminNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />
            )}
          </>
        )}
      </nav>

      {/* User profile + collapse toggle */}
      <div className="p-2.5 border-t border-primary-100/40">
        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className={cn(
              'flex items-center gap-3 flex-1 min-w-0',
              'rounded-xl p-2',
              'transition-all duration-200',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              collapsed && 'justify-center flex-none',
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

          <button
            type="button"
            onClick={() => setCollapsed((p) => !p)}
            className={cn(
              'flex items-center justify-center shrink-0',
              'w-8 h-8 rounded-lg',
              'text-primary-300 hover:text-primary-600 hover:bg-primary-50/60',
              'cursor-pointer select-none',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
    </aside>
  )
}

function SectionDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-3 mx-2 h-px bg-primary-100/30" />
  }
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-300 px-3 mt-5 mb-1.5">
      {label}
    </p>
  )
}

function NavSection({
  items,
  collapsed,
  isActive,
  shouldReduceMotion,
}: {
  items: NavItem[]
  collapsed: boolean
  isActive: (path: string) => boolean
  shouldReduceMotion: boolean | null
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(item.path)
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              onClick={() => window.scrollTo({ top: 0 })}
              className={cn(
                'relative flex items-center gap-3',
                'rounded-xl',
                'transition-all duration-200',
                'cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 h-10',
                active
                  ? 'bg-primary-50/80 text-primary-700 font-medium'
                  : 'text-primary-400 hover:bg-primary-50/50 hover:text-primary-700',
              )}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator bar */}
              {active && !collapsed && (
                <motion.span
                  layoutId={shouldReduceMotion ? undefined : 'sidebar-active'}
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-primary-500 to-primary-700"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* Active dot for collapsed */}
              {active && collapsed && (
                <motion.span
                  layoutId={shouldReduceMotion ? undefined : 'sidebar-active-dot'}
                  className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary-600"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span className={cn(
                'flex items-center justify-center shrink-0 transition-transform duration-200',
                active && 'scale-105',
              )}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-[13px] truncate">{item.label}</span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
