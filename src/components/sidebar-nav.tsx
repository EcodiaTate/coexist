import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  BarChart3,
  Shield,
  ShoppingBag,
  Heart,
  Bell,
  Megaphone,
  Mail,
  Handshake,
  Users,
  Home,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { Avatar } from '@/components/avatar'
import { SidebarShell, type SidebarNavCategory } from '@/components/sidebar-shell'

const mainCategories: SidebarNavCategory[] = [
  {
    label: 'Main',
    items: [
      { label: 'Home', path: '/', icon: <Home size={17} strokeWidth={1.5} />, desktopOnly: true },
      { label: 'Updates', path: '/updates', icon: <Megaphone size={17} strokeWidth={1.5} /> },
      { label: 'Events', path: '/events', icon: <CalendarDays size={17} strokeWidth={1.5} /> },
      { label: 'Chat', path: '/chat', icon: <MessageCircle size={17} strokeWidth={1.5} />, desktopOnly: true },
      { label: 'Notifications', path: '/notifications', icon: <Bell size={17} strokeWidth={1.5} /> },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Shop', path: '/shop', icon: <ShoppingBag size={17} strokeWidth={1.5} /> },
      { label: 'Donate', path: '/donate', icon: <Heart size={17} strokeWidth={1.5} /> },
      { label: 'Leadership Opportunities', path: '/leadership', icon: <Users size={17} strokeWidth={1.5} /> },
      { label: 'Our Partners', path: '/partners', icon: <Handshake size={17} strokeWidth={1.5} /> },
      { label: 'Contact Us', path: '/contact', icon: <Mail size={17} strokeWidth={1.5} /> },
    ],
  },
]

interface SidebarNavProps {
  className?: string
}

export function SidebarNav({ className }: SidebarNavProps) {
  const { profile, collectiveRoles, isStaff } = useAuth()
  const location = useLocation()

  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  // Build management category dynamically
  const managementItems = [
    ...(isAnyLeader
      ? [{ label: 'Leader Dashboard', path: '/leader', icon: <BarChart3 size={17} strokeWidth={1.5} /> }]
      : []),
    ...(isStaff
      ? [{ label: 'Admin Dashboard', path: '/admin', icon: <Shield size={17} strokeWidth={1.5} /> }]
      : []),
  ]

  const categories: SidebarNavCategory[] = [
    ...mainCategories,
    ...(managementItems.length > 0 ? [{ label: 'Management', items: managementItems }] : []),
  ]

  return (
    <SidebarShell
      ariaLabel="Sidebar navigation"
      categories={categories}
      accent="primary"
      layoutId="sidebar-active"
      className={className}
      footer={(collapsed) => (
        <div className="p-2.5 border-t border-primary-100/40">
          <Link
            to="/profile"
            className={cn(
              'flex items-center gap-3 min-w-0',
              'rounded-xl p-2',
              'transition-transform duration-200 active:scale-[0.97]',
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
                {Boolean((profile as Record<string, unknown>)?.collective_name) && (
                  <p className="text-[11px] text-primary-400 truncate">
                    {String((profile as Record<string, unknown>)?.collective_name ?? '')}
                  </p>
                )}
              </div>
            )}
          </Link>
        </div>
      )}
    />
  )
}
