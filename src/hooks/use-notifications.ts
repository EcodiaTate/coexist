import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Notification } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type NotificationType =
  | 'event_reminder'
  | 'registration_confirmed'
  | 'waitlist_promotion'
  | 'event_cancelled'
  | 'event_updated'
  | 'points_earned'
  | 'badge_unlocked'
  | 'new_event_in_collective'
  | 'event_invite'
  | 'global_announcement'
  | 'challenge_update'
  | 'chat_mention'
  | 'chat_messages'

export interface NotificationPreferences {
  event_reminder: boolean
  registration_confirmed: boolean
  waitlist_promotion: boolean
  event_cancelled: boolean
  event_updated: boolean
  points_earned: boolean
  badge_unlocked: boolean
  new_event_in_collective: boolean
  event_invite: boolean
  global_announcement: boolean
  challenge_update: boolean
  chat_mention: boolean
  chat_messages: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string // "22:00"
  quiet_hours_end: string   // "07:00"
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  event_reminder: true,
  registration_confirmed: true,
  waitlist_promotion: true,
  event_cancelled: true,
  event_updated: true,
  points_earned: true,
  badge_unlocked: true,
  new_event_in_collective: true,
  event_invite: true,
  global_announcement: true,
  challenge_update: true,
  chat_mention: true,
  chat_messages: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
}

export interface GroupedNotifications {
  label: string
  date: string
  notifications: Notification[]
}

/* ------------------------------------------------------------------ */
/*  Deep link map                                                      */
/* ------------------------------------------------------------------ */

/**
 * Resolve deep link route from notification type + data.
 * Single source of truth - also used by use-push.ts for tap routing.
 */
export function resolveNotificationRoute(
  type: string,
  data?: Record<string, string> | null,
): string {
  switch (type as NotificationType) {
    case 'event_reminder':
    case 'event_cancelled':
    case 'event_updated':
    case 'registration_confirmed':
    case 'waitlist_promotion':
    case 'new_event_in_collective':
    case 'event_invite':
      return data?.event_id ? `/events/${data.event_id}` : '/events'
    case 'points_earned':
      return '/points'
    case 'badge_unlocked':
      return data?.badge_id ? `/badges?badge=${data.badge_id}` : '/badges'
    case 'global_announcement':
      return '/announcements'
    case 'challenge_update':
      return '/'
    case 'chat_mention':
    case 'chat_messages':
      return data?.collective_id ? `/chat/${data.collective_id}` : '/chat'
    default:
      return '/'
  }
}

export function getNotificationDeepLink(notification: Notification): string {
  const data = notification.data as Record<string, string> | null
  return resolveNotificationRoute(notification.type, data)
}

/* ------------------------------------------------------------------ */
/*  Icon + color per type                                              */
/* ------------------------------------------------------------------ */

export function getNotificationMeta(type: string): { emoji: string; color: string } {
  switch (type as NotificationType) {
    case 'event_reminder':
      return { emoji: '\u{1F4C5}', color: 'bg-info-100' }
    case 'registration_confirmed':
      return { emoji: '\u{2705}', color: 'bg-success-100' }
    case 'waitlist_promotion':
      return { emoji: '\u{1F389}', color: 'bg-accent-100' }
    case 'event_cancelled':
      return { emoji: '\u{274C}', color: 'bg-error-100' }
    case 'event_updated':
      return { emoji: '\u{1F504}', color: 'bg-warning-100' }
    case 'points_earned':
      return { emoji: '\u{2B50}', color: 'bg-warning-100' }
    case 'badge_unlocked':
      return { emoji: '\u{1F3C6}', color: 'bg-accent-100' }
    case 'new_event_in_collective':
      return { emoji: '\u{1F331}', color: 'bg-primary-100' }
    case 'event_invite':
      return { emoji: '\u{1F4E9}', color: 'bg-primary-100' }
    case 'global_announcement':
      return { emoji: '\u{1F4E2}', color: 'bg-accent-100' }
    case 'challenge_update':
      return { emoji: '\u{1F525}', color: 'bg-secondary-100' }
    case 'chat_mention':
      return { emoji: '\u{1F4AC}', color: 'bg-info-100' }
    case 'chat_messages':
      return { emoji: '\u{1F4AC}', color: 'bg-neutral-100' }
    default:
      return { emoji: '\u{1F514}', color: 'bg-neutral-100' }
  }
}

/* ------------------------------------------------------------------ */
/*  Grouping helper                                                    */
/* ------------------------------------------------------------------ */

function groupByDay(notifications: Notification[]): GroupedNotifications[] {
  const groups: Record<string, Notification[]> = {}

  for (const n of notifications) {
    const date = new Date(n.created_at)
    const key = date.toISOString().slice(0, 10) // YYYY-MM-DD

    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  }

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({
      date,
      label:
        date === today
          ? 'Today'
          : date === yesterday
            ? 'Yesterday'
            : new Date(date).toLocaleDateString('en-AU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }),
      notifications: items,
    }))
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Fetch all notifications for the user */
export function useNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  })

  // Realtime subscription
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData<Notification[]>(
            ['notifications', user.id],
            (old) => {
              if (!old) return [payload.new as Notification]
              return [payload.new as Notification, ...old].slice(0, 100)
            },
          )
          // Also update unread count
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])

  const grouped = query.data ? groupByDay(query.data) : []

  return { ...query, grouped }
}

/** Unread count */
export function useUnreadCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: async () => {
      if (!user) return 0

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
      return count ?? 0
    },
    enabled: !!user,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  })
}

/** Mark single notification as read */
export function useMarkRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
      if (error) throw error
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] })
      const previous = queryClient.getQueryData<Notification[]>(['notifications', user?.id])
      const previousUnread = queryClient.getQueryData<number>(['notifications-unread', user?.id])
      queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old) => {
        if (!old) return old
        return old.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      })
      queryClient.setQueryData<number>(['notifications-unread', user?.id], (old) => Math.max(0, (old ?? 0) - 1))
      return { previous, previousUnread }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications', user?.id], context.previous)
      if (context?.previousUnread !== undefined) queryClient.setQueryData(['notifications-unread', user?.id], context.previousUnread)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] })
    },
  })
}

/** Mark all as read */
export function useMarkAllRead() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!user) return

      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) throw error
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] })
      const previous = queryClient.getQueryData<Notification[]>(['notifications', user?.id])
      const previousUnread = queryClient.getQueryData<number>(['notifications-unread', user?.id])
      const now = new Date().toISOString()
      queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old) => {
        if (!old) return old
        return old.map(n => n.read_at ? n : { ...n, read_at: now })
      })
      queryClient.setQueryData<number>(['notifications-unread', user?.id], 0)
      return { previous, previousUnread }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['notifications', user?.id], context.previous)
      if (context?.previousUnread !== undefined) queryClient.setQueryData(['notifications-unread', user?.id], context.previousUnread)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] })
    },
  })
}
