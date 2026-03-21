import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Menu } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useLayout } from '@/hooks/use-layout'
import { useMenuSheet } from '@/hooks/use-menu-sheet'

interface HeaderProps {
  title: string
  back?: boolean
  onBack?: () => void
  rightActions?: ReactNode
  /** Hide the hamburger menu button (e.g. on pages that don't need it) */
  hideMenu?: boolean
  transparent?: boolean
  className?: string
}

export function Header({
  title,
  back = false,
  onBack,
  rightActions,
  hideMenu = false,
  transparent = false,
  className,
}: HeaderProps) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { navMode } = useLayout()
  const { openMenu } = useMenuSheet()

  const showMenuButton = navMode === 'bottom-tabs' && !hideMenu

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      navigate(-1)
    }
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'px-4',
        transparent
          ? 'bg-transparent'
          : 'bg-white/90 backdrop-blur-sm',
        className,
      )}
      style={{
        paddingTop: 'var(--safe-top)',
      }}
      aria-label={`${title} page header`}
    >
      <div className="flex items-center h-14">
      {/* Left zone: back button */}
      <div className="flex items-center shrink-0 w-10">
        {back && (
          <motion.button
            type="button"
            onClick={handleBack}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 -ml-1 rounded-full',
              'text-primary-800 hover:bg-primary-50',
              'cursor-pointer select-none',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </motion.button>
        )}
      </div>

      {/* Center zone: title */}
      <div className="flex-1 min-w-0 px-2">
        <h1
          className={cn(
            'font-heading text-base font-semibold text-center truncate',
            transparent ? 'text-white' : 'text-primary-800',
          )}
        >
          {title}
        </h1>
      </div>

      {/* Right zone: actions + menu */}
      <div className="flex items-center shrink-0 gap-1 justify-end">
        {rightActions}
        {showMenuButton && (
          <motion.button
            type="button"
            onClick={openMenu}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 rounded-full',
              'cursor-pointer select-none',
              'transition-colors duration-150',
              transparent
                ? 'text-white/90 hover:bg-white/10'
                : 'text-primary-600 hover:bg-primary-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </motion.button>
        )}
      </div>
      </div>
    </header>
  )
}
