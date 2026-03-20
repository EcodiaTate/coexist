import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Home,
  Compass,
  CalendarDays,
  Users,
  User,
  BarChart3,
  Settings,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  TrendingUp,
  Award,
  Trophy,
  ShoppingBag,
  Heart,
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
  { label: 'Home', path: '/', icon: <Home size={20} /> },
  { label: 'My Events', path: '/events', icon: <CalendarDays size={20} /> },
  { label: 'Community', path: '/community', icon: <Users size={20} /> },
  { label: 'Chat', path: '/chat', icon: <MessageCircle size={20} /> },
  { label: 'Notifications', path: '/notifications', icon: <Bell size={20} /> },
]

const activityNav: NavItem[] = [
  { label: 'Impact', path: '/impact', icon: <TrendingUp size={20} /> },
  { label: 'Leaderboard', path: '/leaderboard', icon: <Trophy size={20} /> },
  { label: 'Badges', path: '/badges', icon: <Award size={20} /> },
]

const secondaryNav: NavItem[] = [
  { label: 'Explore', path: '/explore', icon: <Compass size={20} /> },
  { label: 'Announcements', path: '/announcements', icon: <Megaphone size={20} /> },
  { label: 'Shop', path: '/shop', icon: <ShoppingBag size={20} /> },
  { label: 'Donate', path: '/donate', icon: <Heart size={20} /> },
  { label: 'Profile', path: '/profile', icon: <User size={20} /> },
]

const leaderNav: NavItem[] = [
  { label: 'Leader Dashboard', path: '/leader', icon: <BarChart3 size={20} /> },
  { label: 'Create Event', path: '/events/create', icon: <Plus size={20} /> },
]

const adminNav: NavItem[] = [
  { label: 'Admin Dashboard', path: '/admin', icon: <Shield size={20} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
]

interface SidebarNavProps {
  className?: string
}

export function SidebarNav({ className }: SidebarNavProps) {
  const location = useLocation()
  const shouldReduceMotion = useReducedMotion()
  const { profile, isStaff } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  // Check if user is a leader in any collective
  const isAnyLeader = (profile as any)?.collective_memberships?.some(
    (m: { role: string }) =>
      ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <aside
      className={cn(
        'sticky top-0 self-start max-h-dvh',
        'flex flex-col',
        'bg-white border-r border-primary-100',
        'transition-[width] duration-250 ease-in-out',
        collapsed ? 'w-16' : 'w-64',
        className,
      )}
      aria-label="Sidebar navigation"
    >
      {/* Wordmark */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-primary-100">
          <Link
            to="/"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-md"
            aria-label={`${APP_NAME} home`}
          >
            <img
              src="/logos/black-wordmark.png"
              alt={APP_NAME}
              className="h-7 w-auto"
            />
          </Link>
        </div>
      )}

      {collapsed && (
        <div className="flex items-center justify-center py-4 border-b border-primary-100">
          <Link
            to="/"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-md"
            aria-label={`${APP_NAME} home`}
          >
            <img
              src="/logos/black-logo-transparent.png"
              alt={APP_NAME}
              className="h-7 w-7 object-contain"
            />
          </Link>
        </div>
      )}

      {/* User info */}
      {!collapsed && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-primary-100">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || ''}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm font-semibold text-primary-800 truncate">
              {profile?.display_name}
            </p>
            {(profile as any)?.collective_name && (
              <p className="text-caption text-primary-400 truncate">
                {(profile as any).collective_name}
              </p>
            )}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="flex items-center justify-center py-3 border-b border-primary-100">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name || ''}
            size="sm"
          />
        </div>
      )}

      {/* Navigation sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <NavSection items={mainNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />

        {!collapsed && (
          <p className="text-overline text-primary-400 px-3 mt-5 mb-2">
            Activity
          </p>
        )}
        {collapsed && <div className="my-3 border-t border-primary-100" />}
        <NavSection items={activityNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />

        {!collapsed && (
          <p className="text-overline text-primary-400 px-3 mt-5 mb-2">
            Discover
          </p>
        )}
        {collapsed && <div className="my-3 border-t border-primary-100" />}
        <NavSection items={secondaryNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />

        {isAnyLeader && (
          <>
            {!collapsed && (
              <p className="text-overline text-primary-400 px-3 mt-5 mb-2">
                Leader Tools
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-primary-100" />}
            <NavSection items={leaderNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />
          </>
        )}

        {isStaff && (
          <>
            {!collapsed && (
              <p className="text-overline text-primary-400 px-3 mt-5 mb-2">
                Admin
              </p>
            )}
            {collapsed && <div className="my-3 border-t border-primary-100" />}
            <NavSection items={adminNav} collapsed={collapsed} isActive={isActive} shouldReduceMotion={shouldReduceMotion} />
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-primary-100 p-2">
        <button
          type="button"
          onClick={() => setCollapsed((p) => !p)}
          className={cn(
            'flex items-center justify-center gap-2 w-full',
            'h-9 rounded-lg',
            'text-primary-400 hover:text-primary-800 hover:bg-primary-50',
            'cursor-pointer select-none',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
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
              className={cn(
                'relative flex items-center gap-3',
                'rounded-lg',
                'transition-colors duration-150',
                'cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                collapsed ? 'justify-center h-10 w-10 mx-auto' : 'px-3 h-10',
                active
                  ? 'bg-white text-primary-400 font-medium'
                  : 'text-primary-400 hover:bg-primary-50 hover:text-primary-800',
              )}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
            >
              {/* Active indicator */}
              {active && (
                <motion.span
                  layoutId={shouldReduceMotion ? undefined : 'sidebar-active'}
                  className={cn(
                    'absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-primary-800',
                    collapsed && 'hidden',
                  )}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span className="flex items-center justify-center shrink-0">
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
