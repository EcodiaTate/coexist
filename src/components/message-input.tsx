import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  SendHorizontal,
  Paperclip,
  Plus,
  BarChart3,
  Megaphone,
  CalendarPlus,
  Bell,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'

interface MessageInputProps {
  onSend: (message: string) => void
  onAttach?: () => void
  onTyping?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
  initialValue?: string
  onValueChange?: (value: string) => void
  maxLength?: number
  padForTabBar?: boolean
  /** Show leader action buttons (poll, announce, invite, broadcast) */
  isLeader?: boolean
  onCreatePoll?: () => void
  onCreateAnnouncement?: () => void
  onCreateEventInvite?: () => void
  onBroadcastNotification?: () => void
}

export function MessageInput({
  onSend,
  onAttach,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Message input',
  initialValue = '',
  onValueChange,
  maxLength = 4000,
  padForTabBar = false,
  isLeader = false,
  onCreatePoll,
  onCreateAnnouncement,
  onCreateEventInvite,
  onBroadcastNotification,
}: MessageInputProps) {
  const shouldReduceMotion = useReducedMotion()
  const [value, setValue] = useState(initialValue)
  const [showLeaderActions, setShowLeaderActions] = useState(false)

  // Sync when initialValue changes (e.g. entering edit mode)
  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = 24
    const maxHeight = lineHeight * 4
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    })
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newVal = maxLength ? e.target.value.slice(0, maxLength) : e.target.value
      setValue(newVal)
      onValueChange?.(newVal)
      onTyping?.()
    },
    [maxLength, onValueChange, onTyping],
  )

  const leaderActions = [
    { icon: BarChart3, label: 'Create Poll', onClick: onCreatePoll, color: 'text-primary-600 bg-primary-50' },
    { icon: Megaphone, label: 'Announcement', onClick: onCreateAnnouncement, color: 'text-accent-600 bg-accent-50' },
    { icon: CalendarPlus, label: 'Event Invite', onClick: onCreateEventInvite, color: 'text-info-600 bg-info-50' },
    { icon: Bell, label: 'Push Notification', onClick: onBroadcastNotification, color: 'text-warning-600 bg-warning-50' },
  ]

  return (
    <div
      className={cn(
        'z-10 bg-white/95 backdrop-blur-md shadow-[0_-1px_3px_0_rgb(0_0_0/0.05)]',
        className,
      )}
      style={{
        paddingBottom: padForTabBar
          ? 'calc(3.5rem + var(--safe-bottom, 0px) + 0.75rem)'
          : 'calc(var(--safe-bottom, 0px) + 0.75rem)',
      }}
    >
      {/* Leader actions panel */}
      <AnimatePresence>
        {showLeaderActions && isLeader && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-primary-50/30 px-3 py-2"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400 flex-1">
                Leader Actions
              </p>
              <button
                type="button"
                onClick={() => setShowLeaderActions(false)}
                className="flex items-center justify-center min-h-8 min-w-8 rounded-full text-primary-400 hover:bg-primary-100 active:scale-[0.95] transition-all duration-150 cursor-pointer select-none"
                aria-label="Close actions"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2">
              {leaderActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => {
                    action.onClick?.()
                    setShowLeaderActions(false)
                  }}
                  disabled={!action.onClick}
                  className={cn(
                    'flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 px-1',
                    'transition-all duration-150 active:scale-[0.95] cursor-pointer select-none min-h-11',
                    action.color,
                    'hover:shadow-sm',
                    !action.onClick && 'opacity-40 cursor-default',
                  )}
                >
                  <action.icon size={18} />
                  <span className="text-[10px] font-semibold leading-tight text-center">
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="px-3 pt-2">
        <div
          role="toolbar"
          aria-label={ariaLabel}
          className={cn(
            'flex items-end gap-2 rounded-2xl bg-primary-50/40 px-3 py-2',
            'transition-all duration-150',
            'focus-within:bg-white focus-within:shadow-sm focus-within:ring-1 focus-within:ring-primary-300',
            disabled && 'opacity-50',
          )}
        >
          {/* Leader plus button */}
          {isLeader && (
            <button
              type="button"
              onClick={() => setShowLeaderActions(!showLeaderActions)}
              disabled={disabled}
              aria-label="Leader actions"
              className={cn(
                'flex-shrink-0 rounded-full p-1.5',
                'transition-all duration-200',
                showLeaderActions
                  ? 'bg-primary-600 text-white rotate-45'
                  : 'text-primary-400 hover:bg-primary-100 hover:text-primary-600',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                'disabled:pointer-events-none',
              )}
            >
              <Plus size={20} aria-hidden="true" />
            </button>
          )}

          {/* Attachment button */}
          {onAttach && (
            <button
              type="button"
              onClick={onAttach}
              disabled={disabled}
              aria-label="Attach file"
              className={cn(
                'flex-shrink-0 rounded-full p-1.5 text-primary-400',
                'transition-colors duration-150',
                'hover:bg-primary-100 hover:text-primary-600',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                'disabled:pointer-events-none',
              )}
            >
              <Paperclip size={20} aria-hidden="true" />
            </button>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            maxLength={maxLength}
            aria-label="Message text"
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-primary-800',
              'placeholder:text-primary-400',
              'outline-none',
              'disabled:cursor-not-allowed',
              'leading-6',
            )}
            style={{ maxHeight: 24 * 4 }}
          />

          {/* Send button */}
          <AnimatePresence>
            {hasText && (
              <motion.button
                type="button"
                onClick={handleSend}
                disabled={disabled}
                aria-label="Send message"
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.5 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className={cn(
                  'flex-shrink-0 rounded-full bg-primary-600 p-2 text-white',
                  'transition-colors duration-150',
                  'hover:bg-primary-700',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
                  'disabled:pointer-events-none disabled:opacity-50',
                )}
              >
                <SendHorizontal size={18} aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Safety note */}
        <p className="text-center text-[10px] text-primary-400 mt-1.5 select-none leading-relaxed">
          Messages are visible to all collective members.
          {' '}Need private support? <a href="mailto:hello@coexistaus.org" className="underline hover:text-primary-600">hello@coexistaus.org</a>
        </p>
      </div>
    </div>
  )
}
