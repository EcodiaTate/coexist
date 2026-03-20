import { cn } from '@/lib/cn'

/**
 * Skip navigation link for keyboard/screen reader users.
 * §41 item 58.
 */
export function SkipNav({ className }: { className?: string }) {
  return (
    <a
      href="#main-content"
      className={cn(
        'sr-only focus:not-sr-only',
        'fixed top-2 left-2 z-[200]',
        'px-4 py-2 rounded-lg',
        'bg-primary-800 text-white font-heading font-semibold text-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        className,
      )}
    >
      Skip to main content
    </a>
  )
}
