import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Home,
    MessageCircle,
    Users,
    BarChart3,
    Shield,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { usePlatform } from '@/hooks/use-platform'

export interface Tab {
  key: string
  label: string
  path: string
  icon: ReactNode
  activeIcon: ReactNode
  /** If true, match only exact path (no prefix matching) */
  exact?: boolean
}

const baseTabs: Tab[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/',
    exact: true,
    icon: <Home size={21} strokeWidth={1.5} />,
    activeIcon: <Home size={21} strokeWidth={2.2} />,
  },
  {
    key: 'chat',
    label: 'Chat',
    path: '/chat',
    icon: <MessageCircle size={21} strokeWidth={1.5} />,
    activeIcon: <MessageCircle size={21} strokeWidth={2.2} />,
  },
  {
    key: 'community',
    label: 'Community',
    path: '/community',
    icon: <Users size={21} strokeWidth={1.5} />,
    activeIcon: <Users size={21} strokeWidth={2.2} />,
  },
]

const leaderDashboardTab: Tab = {
  key: 'leader',
  label: 'Leader',
  path: '/leader',
  icon: <BarChart3 size={21} strokeWidth={1.5} />,
  activeIcon: <BarChart3 size={21} strokeWidth={2.2} />,
}

const adminDashboardTab: Tab = {
  key: 'admin',
  label: 'Admin',
  path: '/admin',
  icon: <Shield size={21} strokeWidth={1.5} />,
  activeIcon: <Shield size={21} strokeWidth={2.2} />,
}

interface BottomTabBarProps {
  /** Badge count for the chat tab (unread messages) */
  chatBadge?: number
  /** Override tab set (for leader/admin layouts) */
  tabs?: Tab[]
  /** layoutId prefix for animations - use unique value per tab bar instance */
  layoutPrefix?: string
  /** Accent color for active states */
  accent?: 'primary' | 'moss'
  className?: string
}

export function BottomTabBar({
  chatBadge = 0,
  tabs: customTabs,
  layoutPrefix = 'tab',
  accent = 'primary',
  className,
}: BottomTabBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { collectiveRoles, isStaff } = useAuth()
  const { haptics } = usePlatform()

  // Show leader dashboard tab for any leader role
  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  // Build tabs: use custom if provided, otherwise default set
  const tabs = customTabs ?? [
    ...baseTabs,
    ...(isAnyLeader ? [leaderDashboardTab] : []),
    ...(isStaff ? [adminDashboardTab] : []),
  ]

  const handleTabPress = async (path: string) => {
    if (haptics) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch {
        // Haptics not available
      }
    }
    navigate(path)
  }

  const isActive = (tab: Tab) => {
    if (tab.exact || tab.path === '/') return location.pathname === tab.path
    return location.pathname.startsWith(tab.path)
  }

  const activeText = accent === 'moss' ? 'text-moss-700' : 'text-primary-800'
  const inactiveText = accent === 'moss' ? 'text-moss-400/70' : 'text-primary-400/70'
  const activePill = accent === 'moss' ? 'bg-moss-100/80' : 'bg-primary-100/80'

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'pointer-events-none',
        className,
      )}
    >
      <nav
        className={cn(
          'pointer-events-auto',
          'mx-4 mb-[max(0.5rem,var(--safe-bottom))] rounded-[20px]',
          'bg-white/90 backdrop-blur-2xl backdrop-saturate-[1.8]',
          'shadow-[0_2px_20px_-4px_rgba(30,40,25,0.10),0_0_0_1px_rgba(30,40,25,0.04)]',
        )}
        aria-label="Navigation"
        role="tablist"
      >
        <div className="flex items-center justify-around h-[56px] px-1">
          {tabs.map((tab) => {
            const active = isActive(tab)

            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={tab.label}
                onClick={() => handleTabPress(tab.path)}
                className={cn(
                  'relative flex flex-col items-center justify-center',
                  'flex-1 h-full',
                  'cursor-pointer select-none',
                  'transition-colors duration-150',
                  active ? activeText : inactiveText,
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
                )}
              >
                {/* Active pill background */}
                {active && (
                  <motion.span
                    layoutId={shouldReduceMotion ? undefined : `${layoutPrefix}-pill`}
                    className={cn('absolute inset-x-1.5 inset-y-1 rounded-2xl', activePill)}
                    transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.7 }}
                  />
                )}

                {/* Icon */}
                <span className="relative flex items-center justify-center z-10">
                  {active ? tab.activeIcon : tab.icon}

                  {/* Chat badge */}
                  {tab.key === 'chat' && chatBadge > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2.5',
                        'flex items-center justify-center',
                        'min-w-[17px] h-[17px] px-1',
                        'rounded-full bg-error text-white',
                        'text-[9px] font-bold leading-none',
                        'ring-2 ring-white/90',
                      )}
                      aria-label={`${chatBadge} unread`}
                    >
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </span>
                  )}
                </span>

                {/* Label */}
                <span
                  className={cn(
                    'relative z-10 text-[10px] mt-0.5 leading-none',
                    active ? 'font-bold' : 'font-medium',
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
