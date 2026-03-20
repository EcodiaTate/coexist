import { type ReactNode, useRef, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
  'aria-label'?: string
}

export function TabBar({
  tabs,
  activeTab,
  onChange,
  className,
  'aria-label': ariaLabel = 'View tabs',
}: TabBarProps) {
  const shouldReduceMotion = useReducedMotion()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const button = activeRef.current
      const scrollLeft =
        button.offsetLeft -
        container.offsetWidth / 2 +
        button.offsetWidth / 2

      container.scrollTo({
        left: scrollLeft,
        behavior: shouldReduceMotion ? 'instant' : 'smooth',
      })
    }
  }, [activeTab, shouldReduceMotion])

  return (
    <div
      ref={scrollRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex overflow-x-auto scrollbar-none',
        'border-b border-primary-100/40',
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab

        return (
          <button
            key={tab.id}
            ref={isActive ? activeRef : undefined}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center justify-center gap-1.5',
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium',
              'cursor-pointer select-none shrink-0',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
              isActive
                ? 'text-primary-800'
                : 'text-primary-400/70 hover:text-primary-600',
            )}
          >
            {/* Animated underline indicator */}
            {isActive && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary-700"
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 400, damping: 35 }
                }
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {tab.icon && (
                <span className="flex items-center shrink-0" aria-hidden="true">
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
