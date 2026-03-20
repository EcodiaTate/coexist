import {
  createContext,
  useContext,
  useCallback,
  useState,
  useRef,
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
    bgClass: 'bg-white border-primary-200',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-error',
    barClass: 'bg-error',
    bgClass: 'bg-red-50 border-red-200',
  },
  info: {
    icon: Info,
    iconClass: 'text-info',
    barClass: 'bg-info',
    bgClass: 'bg-blue-50 border-blue-200',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-warning',
    barClass: 'bg-warning',
    bgClass: 'bg-amber-50 border-amber-200',
  },
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>')
  }
  return ctx
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
              <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
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

const springTransition = { type: 'spring' as const, damping: 25, stiffness: 300 }
const instantTransition = { duration: 0 }

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: () => void
}) {
  const { type, message } = item
  const config = typeConfig[type]
  const Icon = config.icon
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? instantTransition : springTransition

  return (
    <motion.div
      layout
      role="alert"
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition }}
      exit={{
        opacity: 0,
        y: -20,
        scale: 0.95,
        transition: shouldReduceMotion ? instantTransition : { duration: 0.15 },
      }}
      className={cn(
        'pointer-events-auto w-full max-w-sm',
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-md',
        config.bgClass,
      )}
    >
      <Icon size={20} className={cn('shrink-0 mt-0.5', config.iconClass)} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-primary-800">{message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 rounded-full p-0.5 text-primary-400 transition-colors hover:bg-black/5 hover:text-primary-400"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </motion.div>
  )
}
