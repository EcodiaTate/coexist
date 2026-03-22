import { type ReactNode, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion'
import { cn } from '@/lib/cn'

interface SwipeActionProps {
  children: ReactNode
  /** Right-side action (revealed on swipe left) */
  rightAction?: {
    label: string
    icon?: ReactNode
    color?: string
    onAction: () => void
  }
  /** Left-side action (revealed on swipe right) */
  leftAction?: {
    label: string
    icon?: ReactNode
    color?: string
    onAction: () => void
  }
  className?: string
}

const SWIPE_THRESHOLD = 80
const ACTION_WIDTH = 80

/**
 * Consistent swipe-to-action pattern.
 * §52 item 37: swipe left/right on cards.
 */
export function SwipeAction({
  children,
  rightAction,
  leftAction,
  className,
}: SwipeActionProps) {
  const shouldReduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const triggeredRef = useRef(false)

  const rightBg = useTransform(x, [-ACTION_WIDTH, 0], [1, 0])
  const leftBg = useTransform(x, [0, ACTION_WIDTH], [0, 1])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const offset = info.offset.x

    if (offset < -SWIPE_THRESHOLD && rightAction) {
      triggeredRef.current = true
      rightAction.onAction()
    } else if (offset > SWIPE_THRESHOLD && leftAction) {
      triggeredRef.current = true
      leftAction.onAction()
    }

    triggeredRef.current = false
  }

  if (shouldReduceMotion || (!rightAction && !leftAction)) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Right action background */}
      {rightAction && (
        <motion.div
          className={cn(
            'absolute inset-y-0 right-0 flex items-center justify-center',
            'text-white text-xs font-semibold',
          )}
          style={{
            width: ACTION_WIDTH,
            backgroundColor: rightAction.color ?? 'var(--color-error)',
            opacity: rightBg,
          }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-1">
            {rightAction.icon}
            <span>{rightAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Left action background */}
      {leftAction && (
        <motion.div
          className={cn(
            'absolute inset-y-0 left-0 flex items-center justify-center',
            'text-white text-xs font-semibold',
          )}
          style={{
            width: ACTION_WIDTH,
            backgroundColor: leftAction.color ?? 'var(--color-primary-600)',
            opacity: leftBg,
          }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-1">
            {leftAction.icon}
            <span>{leftAction.label}</span>
          </div>
        </motion.div>
      )}

      {/* Draggable content */}
      <motion.div
        className="relative bg-white gpu-panel"
        drag="x"
        dragConstraints={{
          left: rightAction ? -ACTION_WIDTH : 0,
          right: leftAction ? ACTION_WIDTH : 0,
        }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        style={{ x }}
        whileDrag={{ cursor: 'grabbing' }}
      >
        {children}
      </motion.div>
    </div>
  )
}
