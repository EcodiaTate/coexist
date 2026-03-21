import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Home,
  MessageCircle,
  Users,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { usePlatform } from '@/hooks/use-platform'

interface Tab {
  key: string
  label: string
  path: string
  icon: ReactNode
  activeIcon: ReactNode
}

const baseTabs: Tab[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/',
    icon: <Home size={24} strokeWidth={1.5} />,
    activeIcon: <Home size={24} strokeWidth={2.5} fill="currentColor" />,
  },
  {
    key: 'chat',
    label: 'Chat',
    path: '/chat',
    icon: <MessageCircle size={24} strokeWidth={1.5} />,
    activeIcon: <MessageCircle size={24} strokeWidth={2.5} fill="currentColor" />,
  },
  {
    key: 'community',
    label: 'Community',
    path: '/community',
    icon: <Users size={24} strokeWidth={1.5} />,
    activeIcon: <Users size={24} strokeWidth={2.5} fill="currentColor" />,
  },
]

const leaderDashboardTab: Tab = {
  key: 'leader',
  label: 'Dashboard',
  path: '/leader',
  icon: <BarChart3 size={24} strokeWidth={1.5} />,
  activeIcon: <BarChart3 size={24} strokeWidth={2.5} fill="currentColor" />,
}

interface BottomTabBarProps {
  /** Badge count for the chat tab (unread messages) */
  chatBadge?: number
  className?: string
}

export function BottomTabBar({ chatBadge = 0, className }: BottomTabBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { collectiveRoles } = useAuth()
  const { haptics } = usePlatform()

  // Show leader dashboard tab for any leader role
  const isAnyLeader = collectiveRoles.some(
    (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
  )

  // Insert leader dashboard in the middle (after Chat, before Community)
  const tabs = isAnyLeader
    ? [baseTabs[0], baseTabs[1], leaderDashboardTab, baseTabs[2]]
    : baseTabs

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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-surface-0/95 backdrop-blur-md',
        'border-t border-primary-100',
        className,
      )}
      style={{
        paddingBottom: 'var(--safe-bottom)',
      }}
      aria-label="Main navigation"
      role="tablist"
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const active = isActive(tab.path)

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
                active ? 'text-primary-800' : 'text-primary-400',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400',
              )}
            >
              {/* Icon with bounce animation */}
              <motion.span
                key={active ? 'active' : 'inactive'}
                className="flex items-center justify-center relative"
                initial={shouldReduceMotion ? false : { scale: 0.8, y: 2 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                {active ? tab.activeIcon : tab.icon}

                {/* Chat badge */}
                {tab.key === 'chat' && chatBadge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-2',
                      'flex items-center justify-center',
                      'min-w-[18px] h-[18px] px-1',
                      'rounded-full bg-error text-white',
                      'text-[10px] font-bold leading-none',
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
                  'text-[10px] mt-0.5 leading-tight',
                  active ? 'font-semibold' : 'font-medium',
                )}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
