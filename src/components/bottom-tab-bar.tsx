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
    icon: <Home size={22} strokeWidth={1.5} />,
    activeIcon: <Home size={22} strokeWidth={2} fill="currentColor" />,
  },
  {
    key: 'chat',
    label: 'Chat',
    path: '/chat',
    icon: <MessageCircle size={22} strokeWidth={1.5} />,
    activeIcon: <MessageCircle size={22} strokeWidth={2} fill="currentColor" />,
  },
  {
    key: 'community',
    label: 'Community',
    path: '/community',
    icon: <Users size={22} strokeWidth={1.5} />,
    activeIcon: <Users size={22} strokeWidth={2} fill="currentColor" />,
  },
]

const leaderDashboardTab: Tab = {
  key: 'leader',
  label: 'Leader',
  path: '/leader',
  icon: <BarChart3 size={22} strokeWidth={1.5} />,
  activeIcon: <BarChart3 size={22} strokeWidth={2} fill="currentColor" />,
}

const adminDashboardTab: Tab = {
  key: 'admin',
  label: 'Admin',
  path: '/admin',
  icon: <Shield size={22} strokeWidth={1.5} />,
  activeIcon: <Shield size={22} strokeWidth={2} fill="currentColor" />,
}

interface BottomTabBarProps {
  /** Badge count for the chat tab (unread messages) */
  chatBadge?: number
  /** Override tab set (for leader/admin layouts) */
  tabs?: Tab[]
  /** layoutId prefix for animations — use unique value per tab bar instance */
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

  const activeBg = accent === 'moss' ? 'bg-moss-50/70' : 'bg-primary-50/70'
  const activeText = accent === 'moss' ? 'text-moss-700' : 'text-primary-700'
  const activeDot = accent === 'moss' ? 'bg-moss-500' : 'bg-primary-600'

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'pointer-events-none',
        className,
      )}
    >
      {/* Floating pill container */}
      <nav
        className={cn(
          'pointer-events-auto',
          'mx-3 mb-[max(0.375rem,var(--safe-bottom))] rounded-2xl',
          'bg-white/80 backdrop-blur-xl backdrop-saturate-150',
          'border border-white/60',
          'shadow-[0_4px_24px_-4px_rgba(51,63,43,0.12),0_1px_3px_rgba(51,63,43,0.06)]',
        )}
        aria-label="Navigation"
        role="tablist"
      >
        <div className="flex items-center justify-around h-[60px] px-1">
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
                  'transition-colors duration-200',
                  active ? activeText : 'text-primary-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
                )}
              >
                {/* Active background glow */}
                {active && (
                  <motion.span
                    layoutId={shouldReduceMotion ? undefined : `${layoutPrefix}-active-bg`}
                    className={cn('absolute inset-x-2 inset-y-1.5 rounded-xl', activeBg)}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* Icon */}
                <motion.span
                  key={active ? 'active' : 'inactive'}
                  className="relative flex items-center justify-center z-10"
                  initial={shouldReduceMotion ? false : { scale: 0.85, y: 2 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  {active ? tab.activeIcon : tab.icon}

                  {/* Chat badge */}
                  {tab.key === 'chat' && chatBadge > 0 && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -right-2.5',
                        'flex items-center justify-center',
                        'min-w-[18px] h-[18px] px-1',
                        'rounded-full bg-error text-white',
                        'text-[10px] font-bold leading-none',
                        'ring-2 ring-white/80',
                      )}
                      aria-label={`${chatBadge} unread`}
                    >
                      {chatBadge > 99 ? '99+' : chatBadge}
                    </span>
                  )}
                </motion.span>

                {/* Label */}
                <span
                  className={cn(
                    'relative z-10 text-[10px] mt-0.5 leading-tight transition-all duration-200',
                    active ? 'font-semibold' : 'font-medium opacity-70',
                  )}
                >
                  {tab.label}
                </span>

                {/* Active dot indicator */}
                {active && (
                  <motion.span
                    layoutId={shouldReduceMotion ? undefined : `${layoutPrefix}-active-dot`}
                    className={cn('absolute -bottom-0.5 w-1 h-1 rounded-full', activeDot)}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
