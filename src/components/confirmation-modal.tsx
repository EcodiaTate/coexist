import { AlertTriangle, Trash2 } from 'lucide-react'
import { Modal } from './modal'
import { Button } from './button'
import { cn } from '@/lib/cn'

type ModalVariant = 'danger' | 'warning'

interface ConfirmationModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
  variant?: ModalVariant
  className?: string
}

const variantConfig: Record<
  ModalVariant,
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

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
  variant = 'danger',
  className,
}: ConfirmationModalProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" className={className}>
      <div className="flex flex-col items-center text-center">
        <div
          className={cn(
            'mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            config.iconBg,
          )}
          aria-hidden="true"
        >
          <Icon size={24} className={config.iconColor} />
        </div>

        <p className="text-sm leading-relaxed text-primary-400">
          {description}
        </p>

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
    </Modal>
  )
}
