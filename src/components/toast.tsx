import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
  memo,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastApi {
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

interface ToastContextValue {
  toast: ToastApi
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

const DEFAULT_DURATION = 4000
const MAX_VISIBLE = 5

const typeConfig: Record<
  ToastType,
  { icon: typeof CheckCircle; iconClass: string; barClass: string; bgClass: string }
> = {
  success: {
    icon: CheckCircle,
    iconClass: 'text-primary-400',
    barClass: 'bg-primary-500',
    bgClass: 'bg-surface-0',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-error',
    barClass: 'bg-error',
    bgClass: 'bg-error-50',
  },
  info: {
    icon: Info,
    iconClass: 'text-info',
    barClass: 'bg-info',
    bgClass: 'bg-info-50',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning',
    barClass: 'bg-warning',
    bgClass: 'bg-warning-50',
  },
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext<ToastContextValue | null>(null)

const noop = () => {}
const noopToast: ToastContextValue = {
  toast: { success: noop, error: noop, info: noop, warning: noop },
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  // Return no-op during HMR transitions when context may be temporarily null
  return ctx ?? noopToast
}

/* -------------------------------------------------------------------------- */
/*  Provider                                                                  */
/* -------------------------------------------------------------------------- */

interface ToastProviderProps {
  children: ReactNode
  className?: string
}

export function ToastProvider({ children, className }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idCounter = useRef(0)

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const add = useCallback(
    (type: ToastType, message: string, duration = DEFAULT_DURATION) => {
      const id = `toast-${++idCounter.current}`
      setToasts((prev) => [{ id, type, message, duration }, ...prev].slice(0, MAX_VISIBLE))

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss],
  )

  const toast: ToastApi = {
    success: (msg, dur) => add('success', msg, dur),
    error: (msg, dur) => add('error', msg, dur),
    info: (msg, dur) => add('info', msg, dur),
    warning: (msg, dur) => add('warning', msg, dur),
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {createPortal(
        <div
          className={cn(
            'fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-2',
            'pointer-events-none px-4',
            className,
          )}
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 1rem)' }}
          aria-live="polite"
          aria-label="Notifications"
        >
          <AnimatePresence initial={false}>
            {toasts.map((t) => (
              <ToastCard key={t.id} item={t} dismiss={dismiss} />
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

/* -------------------------------------------------------------------------- */
/*  Toast card                                                                */
/* -------------------------------------------------------------------------- */

const springTransition = { type: 'spring' as const, damping: 28, stiffness: 340, mass: 0.8 }
const instantTransition = { duration: 0 }

const ToastCard = memo(function ToastCard({
  item,
  dismiss,
}: {
  item: ToastItem
  dismiss: (id: string) => void
}) {
  const { type, message } = item
  const config = typeConfig[type]
  const Icon = config.icon
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? instantTransition : springTransition
  const handleDismiss = useCallback(() => dismiss(item.id), [dismiss, item.id])

  return (
    <motion.div
      layout
      role="alert"
      initial={{ opacity: 0, y: -32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition }}
      exit={{
        opacity: 0,
        y: -16,
        scale: 0.97,
        transition: shouldReduceMotion ? instantTransition : { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
      }}
      className={cn(
        'pointer-events-auto w-full max-w-sm gpu-panel',
        'flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg',
        config.bgClass,
      )}
    >
      <Icon size={20} className={cn('shrink-0 mt-0.5', config.iconClass)} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-primary-800">{message}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-full p-0.5 text-primary-400 transition-[colors,transform] duration-150 hover:bg-black/5 hover:text-primary-400 active:scale-[0.90] cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
})
