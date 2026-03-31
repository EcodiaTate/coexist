import { cn } from '@/lib/cn'

interface DividerProps {
  label?: string
  className?: string
}

export function Divider({ label, className }: DividerProps) {
  if (label) {
    return (
      <div
        role="separator"
        className={cn('flex items-center gap-3 py-2', className)}
      >
        <span className="flex-1 h-px bg-white" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 select-none">
          {label}
        </span>
        <span className="flex-1 h-px bg-white" aria-hidden="true" />
      </div>
    )
  }

  return (
    <hr
      role="separator"
      className={cn('border-0 h-px bg-white', className)}
    />
  )
}
