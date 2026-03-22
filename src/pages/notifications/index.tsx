import { useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, type PanInfo, type Variants } from 'framer-motion'
import { ArrowLeft, CheckCheck, Bell } from 'lucide-react'
import { Page } from '@/components/page'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import {
    useNotifications,
    useMarkRead,
    useMarkAllRead,
    getNotificationDeepLink,
    getNotificationMeta,
} from '@/hooks/use-notifications'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import type { Notification } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background                                              */
/* ------------------------------------------------------------------ */

function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/55 via-primary-100/35 via-25% to-moss-50/20 to-60%" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-sprout-50/15 to-moss-50/20" />

      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-300/25 via-primary-200/12 to-transparent" />
      <div className="absolute -top-16 -left-16 w-[280px] h-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-200/22 to-transparent" />

      <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-secondary-300/18 opacity-60" />
      <div className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-primary-200/14 opacity-40" />
      <div className="absolute top-[32%] -left-14 w-52 h-52 rounded-full border-[2.5px] border-moss-300/18 opacity-50" />
      <div className="absolute bottom-[18%] right-2 w-32 h-32 rounded-full border-2 border-primary-300/14" />

      <div className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-100/16 to-transparent opacity-30" />
      <div className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-moss-200/16 to-transparent opacity-28" />

      <div className="absolute top-24 right-14 w-3 h-3 rounded-full bg-primary-400/15" />
      <div className="absolute top-[48%] left-8 w-2.5 h-2.5 rounded-full bg-moss-400/12" />
      <div className="absolute bottom-[28%] right-[18%] w-2 h-2 rounded-full bg-sprout-400/12" />
      <div className="absolute top-[62%] left-[22%] w-2 h-2 rounded-full bg-secondary-400/10" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Time helpers                                                       */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/* ------------------------------------------------------------------ */
/*  Swipeable notification row                                         */
/* ------------------------------------------------------------------ */

function NotificationRow({
  notification,
  onTap,
  onSwipeRead,
  index,
}: {
  notification: Notification
  onTap: () => void
  onSwipeRead: () => void
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const meta = getNotificationMeta(notification.type)
  const isUnread = !notification.read_at
  const dragRef = useRef(false)

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80 && isUnread) {
      onSwipeRead()
    }
  }

  const handleTap = () => {
    if (!dragRef.current) onTap()
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl"
      initial={shouldReduceMotion ? false : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.25, ease: 'easeOut' }}
    >
      {/* Swipe background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 rounded-r-2xl bg-gradient-to-l from-primary-500 to-primary-600"
        aria-hidden="true"
        style={{ width: '120px' }}
      >
        <span className="text-xs font-semibold text-white">Mark read</span>
      </div>

      {/* Notification card */}
      <motion.button
        type="button"
        onClick={handleTap}
        drag="x"
        dragConstraints={{ left: -100, right: 0 }}
        dragElastic={0.1}
        onDragStart={() => { dragRef.current = true }}
        onDragEnd={(e, info) => {
          handleDragEnd(e, info)
          setTimeout(() => { dragRef.current = false }, 50)
        }}
        className={cn(
          'relative flex items-start gap-3.5 w-full px-4 py-4 text-left rounded-2xl',
          'cursor-pointer select-none',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-inset',
          isUnread
            ? 'bg-white shadow-sm border border-primary-100/50'
            : 'bg-white/60 shadow-sm border border-primary-50/50 hover:bg-white/80',
        )}
        aria-label={`${notification.title}. ${notification.body ?? ''}`}
      >
        {/* Icon with tinted circle */}
        <div
          className={cn(
            'flex items-center justify-center shrink-0 w-11 h-11 rounded-xl text-lg shadow-sm',
            isUnread ? 'bg-primary-200/70' : 'bg-surface-3',
            meta.color,
          )}
          aria-hidden="true"
        >
          {meta.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm leading-snug',
              isUnread
                ? 'font-bold text-primary-900'
                : 'font-medium text-primary-700',
            )}
          >
            {notification.title}
          </p>
          {notification.body && (
            <p className={cn(
              'text-[13px] mt-0.5 line-clamp-2',
              isUnread ? 'text-primary-600' : 'text-primary-400',
            )}>
              {notification.body}
            </p>
          )}
          <span className={cn(
            'text-xs mt-1.5 block font-medium',
            isUnread ? 'text-primary-500' : 'text-primary-300',
          )}>
            {timeAgo(notification.created_at)}
          </span>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <span
            className="shrink-0 w-2.5 h-2.5 rounded-full bg-primary-500 mt-2 shadow-sm shadow-primary-300/40"
            aria-label="Unread"
          />
        )}
      </motion.button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  All caught up celebration                                          */
/* ------------------------------------------------------------------ */

function AllCaughtUp() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1, type: 'spring', stiffness: 200, damping: 22 }}
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      {/* Illustrated circle */}
      <div className="relative mb-6">
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-100 to-moss-200/60 flex items-center justify-center shadow-sm shadow-primary-200/30">
          <svg
            width="64"
            height="64"
            viewBox="0 0 120 120"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M60 28 C50 40 40 52 40 64 C40 76 48 86 60 86 C72 86 80 76 80 64 C80 52 70 40 60 28Z"
              className="fill-primary-300/80"
            />
            <path
              d="M60 50 V76"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="text-primary-500"
            />
            <path
              d="M60 58 L50 50"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-primary-400"
            />
            <path
              d="M60 64 L72 56"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="text-primary-400"
            />
          </svg>
        </div>
        {/* Floating particles */}
        <motion.div
          className="absolute top-2 -right-1 w-3 h-3 rounded-full bg-primary-300/50"
          animate={shouldReduceMotion ? {} : { y: [-3, 3, -3] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-3 -left-2 w-2.5 h-2.5 rounded-full bg-moss-200/50"
          animate={shouldReduceMotion ? {} : { y: [2, -3, 2] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
        />
      </div>

      <h3 className="font-heading text-lg font-bold text-primary-800">
        All caught up!
      </h3>
      <p className="mt-2 text-sm text-primary-500 max-w-xs leading-relaxed">
        No new notifications. Enjoy the peace - or go plant a tree.
      </p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Notification group                                                 */
/* ------------------------------------------------------------------ */

function NotificationGroup({
  group,
  onTap,
  onSwipeRead,
  startIndex,
}: {
  group: { date: string; label: string; notifications: Notification[] }
  onTap: (n: Notification) => void
  onSwipeRead: (id: string) => void
  startIndex: number
}) {
  return (
    <motion.section variants={fadeUp}>
      {/* Date label */}
      <div className="flex items-center gap-2 px-1 mb-2.5">
        <span className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">
          {group.label}
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-primary-200/50 to-transparent" />
        <span className="text-[11px] font-semibold text-primary-300 tabular-nums">
          {group.notifications.length}
        </span>
      </div>

      {/* Notification cards */}
      <div className="space-y-2">
        <AnimatePresence>
          {group.notifications.map((n, i) => (
            <NotificationRow
              key={n.id}
              notification={n}
              onTap={() => onTap(n)}
              onSwipeRead={() => onSwipeRead(n.id)}
              index={startIndex + i}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

/* ------------------------------------------------------------------ */
/*  Notifications page                                                 */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: notifications, isLoading, refetch, grouped } = useNotifications()
  const showLoading = useDelayedLoading(isLoading)
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const shouldReduceMotion = useReducedMotion()

  const allRead = (notifications ?? []).every((n) => n.read_at)
  const hasNotifications = (notifications ?? []).length > 0
  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const handleTap = (notification: Notification) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id)
    }
    const link = getNotificationDeepLink(notification)
    navigate(link)
  }

  const handleSwipeRead = (notificationId: string) => {
    markRead.mutate(notificationId)
  }

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('All notifications marked as read'),
    })
  }

  return (
    <Page noBackground className="!px-0 bg-surface-1">
      {/* Full-bleed background container */}
      <div className="relative min-h-full">
        <DecorativeBackground />

        {/* Floating nav row */}
        <div className="relative z-20 flex items-center justify-between pt-[var(--safe-top)] px-4">
          <motion.button
            type="button"
            onClick={() => navigate(-1)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 rounded-full',
              'text-primary-800 hover:bg-primary-50/80',
              'cursor-pointer select-none',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </motion.button>

          {hasNotifications && !allRead && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full',
                'text-primary-500 hover:bg-primary-50',
                'transition-colors duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              )}
              aria-label="Mark all as read"
            >
              <CheckCheck size={20} />
            </button>
          )}
        </div>

        {/* Content layer */}
        <div className="relative z-10 px-4 lg:px-6">
          {showLoading ? (
            <div className="space-y-4 py-6">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-start gap-3.5 px-4 py-4 rounded-2xl bg-white/60 shadow-sm border border-primary-50/50 animate-pulse">
                  <div className="w-11 h-11 rounded-xl bg-primary-100/40 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-primary-100/30 rounded w-3/4" />
                    <div className="h-3 bg-primary-100/25 rounded w-full" />
                    <div className="h-2.5 bg-primary-100/20 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : !hasNotifications ? (
            <AllCaughtUp />
          ) : (
            <PullToRefresh onRefresh={handleRefresh}>
              <motion.div
                className="py-4 space-y-6"
                variants={shouldReduceMotion ? undefined : stagger}
                initial="hidden"
                animate="visible"
              >
                {/* Unread count banner */}
                {unreadCount > 0 && (
                  <motion.div variants={fadeUp}>
                    <div className="flex items-center gap-3 rounded-2xl bg-white/80 backdrop-blur-sm p-3.5 shadow-sm border border-primary-100/40">
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-500 shadow-sm">
                        <Bell size={16} className="text-white" />
                      </div>
                      <p className="text-sm font-semibold text-primary-800">
                        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Grouped notifications */}
                {(() => {
                  let runningIndex = 0
                  return grouped.map((group) => {
                    const startIndex = runningIndex
                    runningIndex += group.notifications.length
                    return (
                      <NotificationGroup
                        key={group.date}
                        group={group}
                        onTap={handleTap}
                        onSwipeRead={handleSwipeRead}
                        startIndex={startIndex}
                      />
                    )
                  })
                })()}

                {/* All caught up footer when everything is read */}
                {allRead && <AllCaughtUp />}
              </motion.div>
            </PullToRefresh>
          )}
        </div>
      </div>
    </Page>
  )
}
