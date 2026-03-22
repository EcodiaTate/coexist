import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

interface HeaderProps {
  title: string
  back?: boolean
  onBack?: () => void
  rightActions?: ReactNode
  transparent?: boolean
  className?: string
}

export function Header({
  title,
  back = false,
  onBack,
  rightActions,
  transparent = false,
  className,
}: HeaderProps) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

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
          : 'bg-surface-1/90 backdrop-blur-sm',
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

      {/* Center zone: spacer (title hidden for native app feel) */}
      <div className="flex-1 min-w-0 px-2">
        {/* Title kept as accessible label on the header element */}
      </div>

      {/* Right zone: actions */}
      <div className="flex items-center shrink-0 gap-1 justify-end w-10">
        {rightActions}
      </div>
      </div>
    </header>
  )
}
