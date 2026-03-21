import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Home,
  Compass,
  CalendarDays,
  Users,
  Plus,
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

const tabs: Tab[] = [
  {
    key: 'home',
    label: 'Home',
    path: '/',
    icon: <Home size={24} strokeWidth={1.5} />,
    activeIcon: <Home size={24} strokeWidth={2.5} fill="currentColor" />,
  },
  {
    key: 'explore',
    label: 'Explore',
    path: '/explore',
    icon: <Compass size={24} strokeWidth={1.5} />,
    activeIcon: <Compass size={24} strokeWidth={2.5} fill="currentColor" />,
  },
  {
    key: 'events',
    label: 'My Events',
    path: '/events',
    icon: <CalendarDays size={24} strokeWidth={1.5} />,
    activeIcon: <CalendarDays size={24} strokeWidth={2.5} fill="currentColor" />,
  },
  {
    key: 'community',
    label: 'Community',
    path: '/community',
    icon: <Users size={24} strokeWidth={1.5} />,
    activeIcon: <Users size={24} strokeWidth={2.5} fill="currentColor" />,
  },
]

interface BottomTabBarProps {
  /** Badge count for the community tab (unread chat + notifications) */
  communityBadge?: number
  className?: string
}

export function BottomTabBar({ communityBadge = 0, className }: BottomTabBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { collectiveRoles } = useAuth()
  const { haptics } = usePlatform()

  // Check if user is a leader in any collective (leader or co_leader can create events)
  const showFab = collectiveRoles.some(
    (m) => ['leader', 'co_leader'].includes(m.role),
  )

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
        'bg-white/95 backdrop-blur-md',
        'border-t border-primary-100',
        className,
      )}
      style={{
        paddingBottom: 'var(--safe-bottom)',
      }}
      aria-label="Main navigation"
      role="tablist"
    >
      {/* Leader FAB */}
      {showFab && (
        <motion.button
          type="button"
          onClick={() => navigate('/events/create')}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
          className={cn(
            'absolute -top-7 left-1/2 -translate-x-1/2',
            'flex items-center justify-center',
            'w-14 h-14 rounded-full',
            'bg-primary-800 text-white',
            'shadow-lg',
            'cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
          )}
          aria-label="Create event"
        >
          <Plus size={28} strokeWidth={2.5} />
        </motion.button>
      )}

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

                {/* Community badge */}
                {tab.key === 'community' && communityBadge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-2',
                      'flex items-center justify-center',
                      'min-w-[18px] h-[18px] px-1',
                      'rounded-full bg-error text-white',
                      'text-[10px] font-bold leading-none',
                    )}
                    aria-label={`${communityBadge} unread`}
                  >
                    {communityBadge > 99 ? '99+' : communityBadge}
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
