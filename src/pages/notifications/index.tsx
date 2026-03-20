import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, type PanInfo } from 'framer-motion'
import { CheckCheck, Bell } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton'
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
import type { Notification } from '@/types/database.types'

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
}: {
  notification: Notification
  onTap: () => void
  onSwipeRead: () => void
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
      className="relative overflow-hidden"
      initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Swipe background */}
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 bg-primary-500"
        aria-hidden="true"
        style={{ width: '120px' }}
      >
        <span className="text-xs font-medium text-white">Mark read</span>
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
          'relative flex items-start gap-3 w-full px-4 py-3.5 text-left',
          'bg-white',
          'cursor-pointer select-none',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-inset',
          isUnread && 'bg-white/40',
        )}
        aria-label={`${notification.title}. ${notification.body ?? ''}`}
      >
        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center shrink-0 w-10 h-10 rounded-full text-lg',
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
                ? 'font-semibold text-primary-800'
                : 'font-medium text-primary-800',
            )}
          >
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-sm text-primary-400 mt-0.5 line-clamp-2">
              {notification.body}
            </p>
          )}
          <span className="text-xs text-primary-400 mt-1 block">
            {timeAgo(notification.created_at)}
          </span>
        </div>

        {/* Unread dot */}
        {isUnread && (
          <span
            className="shrink-0 w-2.5 h-2.5 rounded-full bg-primary-500 mt-1.5"
            aria-label="Unread"
          />
        )}
      </motion.button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Celebration state                                                  */
/* ------------------------------------------------------------------ */

function AllCaughtUp() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex flex-col items-center justify-center px-6 py-16 text-center"
    >
      {/* Nature illustration */}
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className="mb-6"
      >
        <circle cx="60" cy="60" r="48" className="fill-primary-50" />
        <path
          d="M60 28 C50 40 40 52 40 64 C40 76 48 86 60 86 C72 86 80 76 80 64 C80 52 70 40 60 28Z"
          className="fill-primary-200"
        />
        <path
          d="M60 50 V76"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="text-primary-400"
        />
        <path
          d="M60 58 L50 50"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary-300"
        />
        <path
          d="M60 64 L72 56"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-primary-300"
        />
        <motion.circle
          cx="40"
          cy="40"
          r="3"
          className="fill-accent-300"
          animate={shouldReduceMotion ? {} : { y: [-2, 2, -2] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="82"
          cy="44"
          r="2.5"
          className="fill-secondary-300"
          animate={shouldReduceMotion ? {} : { y: [2, -2, 2] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.5 }}
        />
      </svg>

      <h3 className="font-heading text-lg font-semibold text-primary-800">
        All caught up!
      </h3>
      <p className="mt-2 text-sm text-primary-400 max-w-xs">
        No new notifications. Enjoy the peace - or go plant a tree.
      </p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Notifications page                                                 */
/* ------------------------------------------------------------------ */

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: notifications, isLoading, refetch, grouped } = useNotifications()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const allRead = (notifications ?? []).every((n) => n.read_at)
  const hasNotifications = (notifications ?? []).length > 0

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
    <Page
      header={
        <Header
          title="Notifications"
          back
          rightActions={
            hasNotifications && !allRead ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full',
                  'text-primary-400 hover:bg-primary-50',
                  'transition-colors duration-150 cursor-pointer select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                )}
                aria-label="Mark all as read"
              >
                <CheckCheck size={20} />
              </button>
            ) : undefined
          }
        />
      }
    >
      {isLoading ? (
        <div className="p-4">
          <Skeleton variant="list-item" count={6} />
        </div>
      ) : !hasNotifications ? (
        <AllCaughtUp />
      ) : allRead && hasNotifications ? (
        <PullToRefresh onRefresh={handleRefresh}>
          <div>
            {grouped.map((group) => (
              <div key={group.date}>
                <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm px-4 py-2">
                  <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <div className="divide-y divide-primary-100">
                  {group.notifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      onTap={() => handleTap(n)}
                      onSwipeRead={() => handleSwipeRead(n.id)}
                    />
                  ))}
                </div>
              </div>
            ))}

            <AllCaughtUp />
          </div>
        </PullToRefresh>
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <div>
            {grouped.map((group) => (
              <div key={group.date}>
                <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm px-4 py-2">
                  <span className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <div className="divide-y divide-primary-100">
                  <AnimatePresence>
                    {group.notifications.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onTap={() => handleTap(n)}
                        onSwipeRead={() => handleSwipeRead(n.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </PullToRefresh>
      )}
    </Page>
  )
}
