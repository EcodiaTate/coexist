import {
  useState,
  useRef,
  useCallback,
  useEffect,
} from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { SendHorizontal, Paperclip } from 'lucide-react'
import { cn } from '@/lib/cn'

interface MessageInputProps {
  onSend: (message: string) => void
  onAttach?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
  'aria-label'?: string
  /** Pre-populate the input (e.g. from a saved draft) */
  initialValue?: string
  /** Called on every text change (for draft persistence) */
  onValueChange?: (value: string) => void
  /** Max character length */
  maxLength?: number
}

export function MessageInput({
  onSend,
  onAttach,
  placeholder = 'Type a message...',
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Message input',
  initialValue = '',
  onValueChange,
  maxLength = 4000,
}: MessageInputProps) {
  const shouldReduceMotion = useReducedMotion()
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const hasText = value.trim().length > 0

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const lineHeight = 24 // ~text-base leading
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
    // Reset height after clearing
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

  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 bg-white/90 px-3 py-2 backdrop-blur-sm',
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label={ariaLabel}
        className={cn(
          'flex items-end gap-2 rounded-2xl border border-primary-200 bg-white px-3 py-2',
          disabled && 'opacity-50',
        )}
      >
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
              'hover:bg-primary-50 hover:text-primary-400',
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
          onChange={(e) => {
            const newVal = maxLength ? e.target.value.slice(0, maxLength) : e.target.value
            setValue(newVal)
            onValueChange?.(newVal)
          }}
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
                'flex-shrink-0 rounded-full bg-primary-800 p-1.5 text-white',
                'transition-colors duration-150',
                'hover:bg-primary-950',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1',
                'disabled:pointer-events-none disabled:opacity-50',
              )}
            >
              <SendHorizontal size={18} aria-hidden="true" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
