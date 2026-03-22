import { motion, useReducedMotion } from 'framer-motion'
import { Megaphone, CalendarPlus, ClipboardCheck, ListChecks } from 'lucide-react'
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
  /** Skip entrance animation (already in view, e.g. confirmed optimistic) */
  skipAnimation?: boolean
  onAvatarTap?: (userId: string) => void
  onSenderTap?: (userId: string) => void
  onLongPress?: () => void
  'aria-label'?: string
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Leader: { bg: 'bg-primary-700', text: 'text-white' },
  'Co-Leader': { bg: 'bg-primary-300', text: 'text-primary-900' },
  'Assist Leader': { bg: 'bg-primary-200', text: 'text-primary-800' },
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
  skipAnimation = false,
  onAvatarTap,
  onSenderTap,
  onLongPress,
  'aria-label': ariaLabel,
}: ChatBubbleProps) {
  const shouldReduceMotion = useReducedMotion()

  const label =
    ariaLabel ??
    `${sent ? 'Sent' : 'Received'} message${senderName ? ` from ${senderName}` : ''}: ${message}`

  const roleStyle = roleBadge ? ROLE_COLORS[roleBadge] ?? { bg: 'bg-primary-100', text: 'text-primary-600' } : null

  // Long press handling for mobile
  let longPressTimer: ReturnType<typeof setTimeout> | null = null

  const handleTouchStart = () => {
    if (!onLongPress) return
    longPressTimer = setTimeout(() => {
      onLongPress()
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(15)
      }
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  return (
    <motion.div
      role="listitem"
      aria-label={label}
      initial={shouldReduceMotion || skipAnimation ? false : { opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={cn(
        'flex gap-2.5',
        sent ? 'flex-row-reverse' : 'flex-row',
        'w-full',
        className,
      )}
    >
      {/* Avatar (received only) */}
      {!sent && (
        <button
          type="button"
          className="flex-shrink-0 self-end flex items-center justify-center min-h-11 min-w-11 rounded-full cursor-pointer select-none active:scale-[0.93] transition-all duration-150"
          onClick={() => senderId && onAvatarTap?.(senderId)}
          aria-label={senderName ? `View ${senderName}'s profile` : 'View profile'}
        >
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt=""
              loading="lazy"
              className="h-10 w-10 rounded-full object-cover ring-[2.5px] ring-white shadow-md"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-extrabold text-white ring-[2.5px] ring-white shadow-md"
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
          'flex max-w-[78%] flex-col gap-0.5',
          sent ? 'items-end' : 'items-start',
        )}
      >
        {/* Sender name + role badge (received only) */}
        {!sent && senderName && (
          <div className="flex items-center gap-2 px-1 mb-1">
            <button
              type="button"
              className="text-[13px] font-bold text-primary-700 hover:text-primary-800 min-h-11 flex items-center justify-center cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
              onClick={() => senderId && onSenderTap?.(senderId)}
            >
              {senderName}
            </button>
            {roleBadge && roleStyle && (
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-extrabold leading-tight shadow-sm',
                roleStyle.bg,
                roleStyle.text,
              )}>
                {roleBadge}
              </span>
            )}
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-3 transition-all duration-150',
            sent
              ? 'rounded-br-md bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-lg shadow-primary-300/30'
              : 'rounded-bl-md bg-white text-primary-900 ring-1 ring-primary-200/70 shadow-md',
          )}
        >
          {/* Reply quote */}
          {replyTo && (
            <div
              className={cn(
                'mb-2.5 rounded-xl border-l-[3px] px-3 py-2',
                sent
                  ? 'border-white/60 bg-white/20'
                  : 'border-primary-400 bg-primary-50',
              )}
            >
              <p
                className={cn(
                  'text-[11px] font-extrabold',
                  sent ? 'text-white/90' : 'text-primary-700',
                )}
              >
                {replyTo.senderName}
              </p>
              <p
                className={cn(
                  'line-clamp-2 text-xs mt-0.5',
                  sent ? 'text-white/70' : 'text-primary-500',
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
              className="mb-2.5 max-w-full rounded-xl shadow-sm"
            />
          )}

          {/* Message text */}
          {message && (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
              {message}
            </p>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              'mt-1.5 text-[11px] font-medium tabular-nums',
              sent ? 'text-white/50 text-right' : 'text-primary-400',
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

/* ------------------------------------------------------------------ */
/*  Poll Card (rendered inline in chat)                                */
/* ------------------------------------------------------------------ */

interface PollOption {
  id: string
  text: string
}

interface PollCardProps {
  question: string
  options: PollOption[]
  voteCounts: Record<string, number>
  totalVotes: number
  userVotes: string[]
  isClosed: boolean
  allowMultiple: boolean
  anonymous: boolean
  creatorName?: string
  closesAt?: string | null
  onVote: (optionId: string) => void
  onRemoveVote: (optionId: string) => void
  sent: boolean
}

export function PollCard({
  question,
  options,
  voteCounts,
  totalVotes,
  userVotes,
  isClosed,
  allowMultiple,
  anonymous,
  creatorName,
  closesAt,
  onVote,
  onRemoveVote,
  sent,
}: PollCardProps) {
  const hasVoted = userVotes.length > 0
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'w-full max-w-[85%] rounded-2xl p-5 shadow-lg',
        'bg-gradient-to-br from-primary-200 via-primary-100 to-primary-200/60',
        'ring-1 ring-primary-300/40',
        sent ? 'ml-auto' : 'mr-auto',
      )}
    >
      {/* Poll icon + question */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md">
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="8" width="3" height="6" rx="1" fill="currentColor" opacity="0.6" />
            <rect x="6" y="4" width="3" height="10" rx="1" fill="currentColor" opacity="0.8" />
            <rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-extrabold text-primary-950 leading-snug">{question}</p>
          {creatorName && (
            <p className="text-[11px] font-medium text-primary-500 mt-0.5">by {creatorName}</p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt) => {
          const count = voteCounts[opt.id] ?? 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isSelected = userVotes.includes(opt.id)

          return (
            <button
              key={opt.id}
              type="button"
              disabled={isClosed}
              onClick={() => {
                if (isSelected) {
                  onRemoveVote(opt.id)
                } else {
                  onVote(opt.id)
                }
              }}
              className={cn(
                'relative w-full overflow-hidden rounded-xl px-3.5 py-3 text-left transition-all duration-200',
                'min-h-11 cursor-pointer select-none',
                isSelected
                  ? 'bg-primary-600/20 shadow-md ring-2 ring-primary-400/40'
                  : 'bg-white/80 hover:bg-white shadow-sm',
                isClosed && 'cursor-default opacity-80',
                'active:scale-[0.97]',
              )}
            >
              {/* Progress bar background */}
              {hasVoted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-xl',
                    isSelected ? 'bg-primary-200/60' : 'bg-primary-100/40',
                  )}
                />
              )}

              <div className="relative flex items-center justify-between gap-2">
                <span className={cn(
                  'text-sm',
                  isSelected ? 'font-semibold text-primary-800' : 'text-primary-700',
                )}>
                  {opt.text}
                </span>
                {hasVoted && (
                  <span className="text-xs font-semibold text-primary-500 tabular-nums shrink-0">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-primary-400">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
          {anonymous ? ' (anonymous)' : ''}
        </p>
        {isClosed ? (
          <span className="text-[11px] font-semibold text-primary-400">Poll closed</span>
        ) : closesAt ? (
          <span className="text-[11px] text-primary-400">
            Closes {new Date(closesAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </span>
        ) : null}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Announcement Card (rendered inline in chat)                        */
/* ------------------------------------------------------------------ */

interface AnnouncementCardProps {
  type: 'announcement' | 'event_invite' | 'rsvp' | 'checklist'
  title: string
  body?: string | null
  creatorName?: string
  metadata?: Record<string, unknown>
  responses?: { response: string; user_id: string }[]
  userResponse?: string | null
  isActive: boolean
  sent: boolean
  onRespond?: (response: string) => void
  onViewEvent?: (eventId: string) => void
}

const TYPE_META: Record<string, { icon: typeof Megaphone; label: string; gradient: string; iconBg: string; iconColor: string; labelColor: string }> = {
  announcement: { icon: Megaphone, label: 'Announcement', gradient: 'from-accent-200 via-accent-100 to-accent-200/60', iconBg: 'bg-accent-600', iconColor: 'text-white', labelColor: 'text-accent-700' },
  event_invite: { icon: CalendarPlus, label: 'Event Invite', gradient: 'from-info-200 via-info-100 to-info-200/60', iconBg: 'bg-info-600', iconColor: 'text-white', labelColor: 'text-info-700' },
  rsvp: { icon: ClipboardCheck, label: 'RSVP', gradient: 'from-success-200 via-success-100 to-success-200/60', iconBg: 'bg-success-600', iconColor: 'text-white', labelColor: 'text-success-700' },
  checklist: { icon: ListChecks, label: 'Checklist', gradient: 'from-warning-200 via-warning-100 to-warning-200/60', iconBg: 'bg-warning-600', iconColor: 'text-white', labelColor: 'text-warning-700' },
}

export function AnnouncementCard({
  type,
  title,
  body,
  creatorName,
  metadata,
  responses = [],
  userResponse,
  isActive,
  sent,
  onRespond,
  onViewEvent,
}: AnnouncementCardProps) {
  const shouldReduceMotion = useReducedMotion()
  const typeInfo = TYPE_META[type] ?? TYPE_META.announcement
  const IconComponent = typeInfo.icon

  const rsvpOptions = type === 'rsvp' || type === 'event_invite'
    ? ['going', 'maybe', 'not_going']
    : []

  const responseCounts: Record<string, number> = {}
  for (const r of responses) {
    responseCounts[r.response] = (responseCounts[r.response] ?? 0) + 1
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        'w-full max-w-[85%] rounded-2xl p-5 shadow-lg',
        `bg-gradient-to-br ${typeInfo.gradient}`,
        'ring-1 ring-black/5',
        sent ? 'ml-auto' : 'mr-auto',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-md', typeInfo.iconBg, typeInfo.iconColor)}>
          <IconComponent size={20} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-[11px] font-extrabold uppercase tracking-wider', typeInfo.labelColor)}>{typeInfo.label}</p>
          {creatorName && (
            <p className="text-[11px] font-medium text-primary-500">from {creatorName}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <h4 className="text-[15px] font-extrabold text-primary-950 mb-1.5">{title}</h4>
      {body && (
        <p className="text-sm text-primary-700 leading-relaxed mb-3">{body}</p>
      )}

      {/* Event invite CTA */}
      {type === 'event_invite' && !!metadata?.event_id && onViewEvent && (
        <button
          type="button"
          onClick={() => onViewEvent(metadata.event_id as string)}
          className="w-full rounded-xl bg-primary-600 py-2.5 text-center text-sm font-semibold text-white mb-2 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none min-h-11"
        >
          View Event Details
        </button>
      )}

      {/* RSVP buttons */}
      {rsvpOptions.length > 0 && isActive && onRespond && (
        <div className="flex gap-2 mb-2">
          {rsvpOptions.map((opt) => {
            const isSelected = userResponse === opt
            const label = opt === 'going' ? 'Going' : opt === 'maybe' ? 'Maybe' : 'Can\'t Make It'
            const count = responseCounts[opt] ?? 0

            return (
              <button
                key={opt}
                type="button"
                onClick={() => onRespond(opt)}
                className={cn(
                  'flex-1 rounded-xl py-2 text-center text-xs font-semibold transition-all duration-150 min-h-11',
                  'active:scale-[0.95] cursor-pointer select-none',
                  isSelected
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white/60 text-primary-700 hover:bg-white/90',
                )}
              >
                {label}
                {count > 0 && (
                  <span className={cn(
                    'ml-1 text-[11px]',
                    isSelected ? 'text-white/70' : 'text-primary-400',
                  )}>
                    ({count})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Response summary */}
      {responses.length > 0 && (
        <p className="text-[11px] text-primary-400">
          {responses.length} response{responses.length !== 1 ? 's' : ''}
        </p>
      )}
    </motion.div>
  )
}
