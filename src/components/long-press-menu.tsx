import { type ReactNode, useRef, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface LongPressAction {
  label: string
  icon?: ReactNode
  destructive?: boolean
  onAction: () => void
}

interface LongPressMenuProps {
  children: ReactNode
  actions: LongPressAction[]
  /** Long-press threshold in ms */
  threshold?: number
  className?: string
}

/**
 * Universal long-press action sheet on cards.
 * §52 item 34.
 */
export function LongPressMenu({
  children,
  actions,
  threshold = 500,
  className,
}: LongPressMenuProps) {
  const shouldReduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchRef = useRef({ x: 0, y: 0 })

  const handleStart = useCallback(
    (clientX: number, clientY: number) => {
      touchRef.current = { x: clientX, y: clientY }
      timerRef.current = setTimeout(() => {
        setPosition({ x: clientX, y: clientY })
        setOpen(true)
      }, threshold)
    },
    [threshold],
  )

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const dx = Math.abs(clientX - touchRef.current.x)
    const dy = Math.abs(clientY - touchRef.current.y)
    if (dx > 10 || dy > 10) {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleActionClick = useCallback(
    (action: LongPressAction) => {
      setOpen(false)
      action.onAction()
    },
    [],
  )

  return (
    <>
      <div
        className={className}
        onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (e.buttons > 0) handleMove(e.clientX, e.clientY)
        }}
        onMouseUp={handleEnd}
        onContextMenu={(e) => {
          e.preventDefault()
          setPosition({ x: e.clientX, y: e.clientY })
          setOpen(true)
        }}
      >
        {children}
      </div>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[90]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            >
              {/* Backdrop */}
              <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

              {/* Menu */}
              <motion.div
                className={cn(
                  'absolute z-10 min-w-[180px] rounded-xl',
                  'bg-white shadow-lg border border-primary-100',
                  'overflow-hidden',
                )}
                style={{
                  left: Math.min(position.x, window.innerWidth - 200),
                  top: Math.min(position.y, window.innerHeight - actions.length * 48 - 20),
                }}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                role="menu"
                aria-label="Context menu"
              >
                {actions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    role="menuitem"
                    onClick={() => handleActionClick(action)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 text-left',
                      'text-sm font-medium transition-colors duration-100',
                      'focus-visible:outline-none focus-visible:bg-white',
                      action.destructive
                        ? 'text-error hover:bg-red-50'
                        : 'text-primary-800 hover:bg-primary-50',
                      i > 0 && 'border-t border-primary-100',
                    )}
                  >
                    {action.icon && (
                      <span className="flex items-center justify-center w-5 h-5 shrink-0">
                        {action.icon}
                      </span>
                    )}
                    {action.label}
                  </button>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
