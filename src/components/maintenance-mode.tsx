import { motion, useReducedMotion } from 'framer-motion'
import { APP_NAME, TAGLINE } from '@/lib/constants'
import { cn } from '@/lib/cn'

interface MaintenanceModeProps {
  message?: string
  className?: string
}

/**
 * Branded maintenance mode page.
 * §42 item 67.
 */
export function MaintenanceMode({
  message = "We're making things even better. Back shortly!",
  className,
}: MaintenanceModeProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex flex-col items-center justify-center',
        'bg-gradient-to-b from-white to-white',
        'px-6 text-center',
        className,
      )}
      role="alert"
      aria-label="App is under maintenance"
    >
      <motion.div
        className="flex flex-col items-center gap-4 max-w-sm"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <h1 className="font-heading text-3xl font-bold text-black tracking-tight">
          {APP_NAME}
        </h1>

        {/* Nature illustration */}
        <svg
          width="120"
          height="80"
          viewBox="0 0 120 80"
          fill="none"
          aria-hidden="true"
          className="my-4"
        >
          {/* Ground */}
          <ellipse cx="60" cy="72" rx="50" ry="6" fill="var(--color-primary-100)" />
          {/* Tree trunk */}
          <rect x="56" y="40" width="8" height="32" rx="3" fill="var(--color-secondary-400)" />
          {/* Tree canopy */}
          <circle cx="60" cy="32" r="24" fill="var(--color-primary-300)" />
          <circle cx="48" cy="38" r="16" fill="var(--color-primary-400)" />
          <circle cx="72" cy="38" r="16" fill="var(--color-primary-400)" />
          {/* Tools */}
          <rect x="80" y="55" width="3" height="20" rx="1" fill="var(--color-secondary-300)" transform="rotate(-15 80 55)" />
          <rect x="78" y="52" width="10" height="6" rx="2" fill="var(--color-primary-400)" transform="rotate(-15 80 55)" />
        </svg>

        <h2 className="font-heading text-xl font-semibold text-neutral-900">
          Under Maintenance
        </h2>

        <p className="text-sm text-neutral-500 leading-relaxed">
          {message}
        </p>

        <p className="mt-4 text-xs text-neutral-400 font-medium">
          {TAGLINE}
        </p>
      </motion.div>
    </div>
  )
}
