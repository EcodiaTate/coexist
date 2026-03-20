import { AlertTriangle, Trash2 } from 'lucide-react'
import { BottomSheet } from './bottom-sheet'
import { Button } from './button'
import { cn } from '@/lib/cn'

type SheetVariant = 'danger' | 'warning'

interface ConfirmationSheetProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: SheetVariant
  className?: string
  'aria-label'?: string
}

const variantConfig: Record<
  SheetVariant,
  { iconBg: string; iconColor: string; icon: typeof Trash2 }
> = {
  danger: {
    iconBg: 'bg-error-100',
    iconColor: 'text-error-600',
    icon: Trash2,
  },
  warning: {
    iconBg: 'bg-warning-100',
    iconColor: 'text-warning-600',
    icon: AlertTriangle,
  },
}

export function ConfirmationSheet({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  variant = 'danger',
  className,
  'aria-label': ariaLabel,
}: ConfirmationSheetProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      className={className}
    >
      <div
        aria-label={ariaLabel ?? `Confirm: ${title}`}
        className="flex flex-col items-center px-5 pb-4 pt-2 text-center"
      >
        {/* Icon */}
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            config.iconBg,
          )}
          aria-hidden="true"
        >
          <Icon size={24} className={config.iconColor} />
        </div>

        {/* Title */}
        <h3 className="font-heading text-lg font-semibold text-primary-800">
          {title}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-primary-400">
          {description}
        </p>

        {/* Actions */}
        <div className="mt-6 flex w-full flex-col gap-2">
          <Button
            variant="danger"
            fullWidth
            onClick={() => {
              onConfirm()
              onClose()
            }}
            aria-label={confirmLabel}
          >
            {confirmLabel}
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={onClose}
            aria-label="Cancel"
          >
            Cancel
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}
