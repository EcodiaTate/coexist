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
  /** Render with no background  back button gets a glass pill for contrast on images */
  transparent?: boolean
  /** Back button gets a dark filled circle background */
  backDark?: boolean
  /** Display the title text in the header center zone */
  showTitle?: boolean
  className?: string
}

export function Header({
  title,
  back = false,
  onBack,
  rightActions,
  transparent = false,
  backDark = false,
  showTitle = false,
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
        'sticky z-40',
        'px-4',
        className,
      )}
      style={{
        top: 'var(--safe-top)',
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
                'cursor-pointer select-none',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                transparent
                  ? 'bg-black/40 text-white hover:bg-black/50'
                  : backDark
                    ? 'bg-primary-800 text-white hover:bg-primary-700 shadow-sm'
                    : 'text-primary-800 hover:bg-primary-50/80',
              )}
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </motion.button>
          )}
        </div>

        {/* Center zone: title or spacer */}
        <div className="flex-1 min-w-0">
          {showTitle && (
            <p className={cn(
              'text-sm font-bold truncate pl-2',
              transparent ? 'text-white' : 'text-primary-900',
            )}>
              {title}
            </p>
          )}
        </div>

        {/* Right zone: actions */}
        <div className="flex items-center shrink-0 gap-1 justify-end">
          {rightActions}
        </div>
      </div>
    </div>
  )
}
