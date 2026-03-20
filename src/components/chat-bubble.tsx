import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ReplyTo {
  message: string
  senderName: string
}

interface ChatBubbleProps {
  message: string
  sent: boolean
  timestamp: Date
  senderName?: string
  senderAvatar?: string
  senderId?: string
  photo?: string
  replyTo?: ReplyTo
  roleBadge?: string
  className?: string
  onAvatarTap?: (userId: string) => void
  onSenderTap?: (userId: string) => void
  'aria-label'?: string
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function ChatBubble({
  message,
  sent,
  timestamp,
  senderName,
  senderAvatar,
  senderId,
  photo,
  replyTo,
  roleBadge,
  className,
  onAvatarTap,
  onSenderTap,
  'aria-label': ariaLabel,
}: ChatBubbleProps) {
  const shouldReduceMotion = useReducedMotion()

  const label =
    ariaLabel ??
    `${sent ? 'Sent' : 'Received'} message${senderName ? ` from ${senderName}` : ''}: ${message}`

  return (
    <motion.div
      role="listitem"
      aria-label={label}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn(
        'flex gap-2',
        sent ? 'flex-row-reverse' : 'flex-row',
        'w-full',
        className,
      )}
    >
      {/* Avatar (received only) - tappable to view profile */}
      {!sent && (
        <button
          type="button"
          className="flex-shrink-0 self-end"
          onClick={() => senderId && onAvatarTap?.(senderId)}
          aria-label={senderName ? `View ${senderName}'s profile` : 'View profile'}
        >
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderName ? `${senderName}'s avatar` : 'User avatar'}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-primary-400"
              aria-hidden="true"
            >
              {senderName?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
          )}
        </button>
      )}

      {/* Bubble content */}
      <div
        className={cn(
          'flex max-w-[75%] flex-col gap-0.5',
          sent ? 'items-end' : 'items-start',
        )}
      >
        {/* Sender name + role badge (received only) - tappable */}
        {!sent && senderName && (
          <div className="flex items-center gap-1.5 px-1">
            <button
              type="button"
              className="text-xs font-semibold text-primary-400 hover:text-primary-400 transition-colors"
              onClick={() => senderId && onSenderTap?.(senderId)}
            >
              {senderName}
            </button>
            {roleBadge && (
              <span className="inline-flex items-center rounded-full bg-primary-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary-400">
                {roleBadge}
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5',
            sent
              ? 'rounded-br-sm bg-primary-800 text-white'
              : 'rounded-bl-sm bg-white text-primary-800',
          )}
        >
          {/* Reply quote */}
          {replyTo && (
            <div
              className={cn(
                'mb-2 rounded-lg border-l-2 px-2.5 py-1.5',
                sent
                  ? 'border-white/40 bg-white/15'
                  : 'border-primary-200 bg-white/60',
              )}
            >
              <p
                className={cn(
                  'text-[11px] font-semibold',
                  sent ? 'text-white/80' : 'text-primary-400',
                )}
              >
                {replyTo.senderName}
              </p>
              <p
                className={cn(
                  'line-clamp-2 text-xs',
                  sent ? 'text-white/70' : 'text-primary-400',
                )}
              >
                {replyTo.message}
              </p>
            </div>
          )}

          {/* Photo */}
          {photo && (
            <img
              src={photo}
              alt="Shared image"
              loading="lazy"
              className="mb-2 max-w-full rounded-lg"
            />
          )}

          {/* Message text */}
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message}
          </p>

          {/* Timestamp */}
          <p
            className={cn(
              'mt-1 text-[10px]',
              sent ? 'text-white/60' : 'text-primary-400',
            )}
          >
            <time dateTime={timestamp.toISOString()}>
              {formatTime(timestamp)}
            </time>
          </p>
        </div>
      </div>
    </motion.div>
  )
}
