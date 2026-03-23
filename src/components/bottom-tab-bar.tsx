import { type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Home,
    MessageCircle,
    User,
    MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { usePlatform } from '@/hooks/use-platform'

export interface Tab {
  key: string
  label: string
  path: string
  icon: ReactNode
  activeIcon: ReactNode
  /** If true, match only exact path (no prefix matching) */
  exact?: boolean
  /** If true, this tab triggers onMorePress instead of navigating */
  isMore?: boolean
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
    key: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: <User size={21} strokeWidth={1.5} />,
    activeIcon: <User size={21} strokeWidth={2.2} />,
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

export const MORE_TAB: Tab = {
  key: 'more',
  label: 'More',
  path: '/more',
  exact: true,
  isMore: true,
  icon: <MoreHorizontal size={21} strokeWidth={1.5} />,
  activeIcon: <MoreHorizontal size={21} strokeWidth={2.2} />,
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
  /** Called when the "More" tab is pressed instead of navigating */
  onMorePress?: () => void
  className?: string
}

export function BottomTabBar({
  chatBadge = 0,
  tabs: customTabs,
  layoutPrefix = 'tab',
  accent = 'primary',
  onMorePress,
  className,
}: BottomTabBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { haptics } = usePlatform()

  const tabs = customTabs ?? baseTabs

  const handleTabPress = async (tab: Tab) => {
    if (haptics) {
      try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch {
        // Haptics not available
      }
    }

    if (tab.isMore && onMorePress) {
      onMorePress()
      return
    }

    navigate(tab.path)
  }

  const isActive = (tab: Tab) => {
    if (tab.isMore) return false // More tab never shows "active" state
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
          'mx-4 mb-[max(0.25rem,var(--safe-bottom))] rounded-[20px]',
          'bg-white shadow-[0_-1px_3px_rgb(0_0_0/0.08)]',
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
                onClick={() => handleTabPress(tab)}
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
