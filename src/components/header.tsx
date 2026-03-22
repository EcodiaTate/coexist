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

  // No back button and no right actions → nothing to render
  if (!back && !rightActions) return null

  return (
    <div
      className={cn(
        'sticky top-0 z-40',
        'px-4',
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
                'w-11 h-11 -ml-1 rounded-full',
                'text-primary-800 hover:bg-primary-50/80',
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

        {/* Center zone: spacer */}
        <div className="flex-1 min-w-0" />

        {/* Right zone: actions */}
        <div className="flex items-center shrink-0 gap-1 justify-end">
          {rightActions}
        </div>
      </div>
    </div>
  )
}
