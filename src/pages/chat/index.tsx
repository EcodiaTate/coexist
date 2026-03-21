import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, Users, ChevronRight, Lock, Globe, MapPin } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { useMyCollectives } from '@/hooks/use-collective'
import { useUnreadCounts } from '@/hooks/use-chat'
import { useMyStaffChannels, useChannelUnreadCounts, type StaffChannel } from '@/hooks/use-staff-channels'

/* ------------------------------------------------------------------ */
/*  Staff channel type config                                          */
/* ------------------------------------------------------------------ */

const CHANNEL_TYPE_CONFIG: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  staff_national: { icon: Globe, color: 'bg-plum-100 text-plum-600', label: 'National' },
  staff_state: { icon: MapPin, color: 'bg-info-100 text-info-600', label: 'State' },
  staff_collective: { icon: Users, color: 'bg-primary-100 text-primary-600', label: 'Collective' },
}

/* ------------------------------------------------------------------ */
/*  Staff channel row                                                  */
/* ------------------------------------------------------------------ */

function StaffChannelRow({ channel, unread, index }: { channel: StaffChannel; unread: number; index: number }) {
  const shouldReduceMotion = useReducedMotion()
  const hasUnread = unread > 0
  const config = CHANNEL_TYPE_CONFIG[channel.type] ?? CHANNEL_TYPE_CONFIG.staff_collective
  const Icon = config.icon

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.25, ease: 'easeOut' }}
    >
      <Link
        to={`/chat/channel/${channel.id}`}
        className={cn(
          'group relative flex items-center gap-3.5 rounded-2xl p-3.5',
          'transition-all duration-150 active:scale-[0.98]',
          hasUnread
            ? 'bg-primary-50 ring-1 ring-primary-200/60 shadow-sm'
            : 'bg-white ring-1 ring-primary-100/50 shadow-sm hover:shadow-md hover:ring-primary-200/60',
        )}
      >
        {/* Channel type icon */}
        <div className="relative flex-shrink-0">
          <div className={cn('h-13 w-13 rounded-2xl flex items-center justify-center', config.color)}>
            <Icon size={22} />
          </div>
          {/* Lock badge */}
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white flex items-center justify-center shadow-sm">
            <Lock size={10} className="text-primary-400" />
          </div>
          {hasUnread && (
            <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary-600 ring-2 ring-primary-50" />
          )}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm truncate leading-snug', hasUnread ? 'font-bold text-primary-900' : 'font-semibold text-primary-800')}>
            {channel.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-primary-400">Staff only</span>
          </div>
        </div>

        {/* Unread / chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {hasUnread ? (
            <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary-600 px-2 text-xs font-bold text-white shadow-sm">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <ChevronRight size={18} className="text-primary-300 transition-transform duration-150 group-hover:translate-x-0.5" />
          )}
        </div>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chat list page - staff channels + collective chats                 */
/* ------------------------------------------------------------------ */

export default function ChatListPage() {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const { data: myCollectives, isLoading } = useMyCollectives()
  const { data: unreadCounts = {} } = useUnreadCounts()
  const { data: staffChannels, isLoading: channelsLoading } = useMyStaffChannels()
  const { data: channelUnreads = {} } = useChannelUnreadCounts()

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-collectives'] }),
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] }),
      queryClient.invalidateQueries({ queryKey: ['my-staff-channels'] }),
      queryClient.invalidateQueries({ queryKey: ['channel-unread'] }),
    ])
  }, [queryClient])

  const hasStaffChannels = (staffChannels?.length ?? 0) > 0

  if (isLoading && channelsLoading) {
    return (
      <Page header={<Header title="Chat" />}>
        <div className="py-4">
          <Skeleton variant="list-item" count={5} />
        </div>
      </Page>
    )
  }

  if (!myCollectives?.length && !hasStaffChannels) {
    return (
      <Page header={<Header title="Chat" />}>
        <EmptyState
          illustration="empty"
          title="No group chats yet"
          description="Join a collective to access group chat with other members"
          action={{ label: 'Explore Collectives', to: '/collectives' }}
        />
      </Page>
    )
  }

  return (
    <Page header={<Header title="Chat" />}>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="py-4 space-y-4">
        {/* Staff Channels section */}
        {hasStaffChannels && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary-400 font-medium px-1 mb-2">
              Staff Chats
            </p>
            <div className="space-y-2">
              {staffChannels!.map((channel, i) => (
                <StaffChannelRow
                  key={channel.id}
                  channel={channel}
                  unread={channelUnreads[channel.id] ?? 0}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}

        {/* Collective Chats section */}
        {(myCollectives?.length ?? 0) > 0 && (
          <div>
            {hasStaffChannels && (
              <p className="text-[10px] uppercase tracking-wider text-primary-400 font-medium px-1 mb-2">
                Collective Chats
              </p>
            )}
            <div className="space-y-2">
              {myCollectives!.map((membership, i) => {
                const collective = membership.collectives as {
                  id: string
                  name: string
                  slug: string
                  cover_image_url: string | null
                  region: string | null
                  state: string | null
                  member_count: number
                } | null

                if (!collective) return null

                const unread = unreadCounts[membership.collective_id] ?? 0
                const hasUnread = unread > 0

                return (
                  <motion.div
                    key={membership.collective_id}
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.25), duration: 0.25, ease: 'easeOut' }}
                  >
                    <Link
                      to={`/chat/${membership.collective_id}`}
                      className={cn(
                        'group relative flex items-center gap-3.5 rounded-2xl p-3.5',
                        'transition-all duration-150 active:scale-[0.98]',
                        hasUnread
                          ? 'bg-primary-50 ring-1 ring-primary-200/60 shadow-sm'
                          : 'bg-white ring-1 ring-primary-100/50 shadow-sm hover:shadow-md hover:ring-primary-200/60',
                      )}
                    >
                      {/* Collective avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={cn(
                            'h-13 w-13 overflow-hidden rounded-2xl',
                            hasUnread
                              ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-primary-50'
                              : 'ring-1 ring-primary-100',
                          )}
                        >
                          {collective.cover_image_url ? (
                            <img
                              src={collective.cover_image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                              <Users size={22} className="text-primary-500" />
                            </div>
                          )}
                        </div>
                        {hasUnread && (
                          <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary-600 ring-2 ring-primary-50" />
                        )}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm truncate leading-snug',
                            hasUnread ? 'font-bold text-primary-900' : 'font-semibold text-primary-800',
                          )}
                        >
                          {collective.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Users size={12} className="text-primary-400 shrink-0" />
                          <span className="text-xs text-primary-400">
                            {collective.member_count} members
                          </span>
                          {(collective.region || collective.state) && (
                            <>
                              <span className="text-primary-300">&middot;</span>
                              <span className="text-xs text-primary-400 truncate">
                                {collective.region ?? collective.state}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unread / chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        {hasUnread ? (
                          <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary-600 px-2 text-xs font-bold text-white shadow-sm">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        ) : (
                          <ChevronRight size={18} className="text-primary-300 transition-transform duration-150 group-hover:translate-x-0.5" />
                        )}
                      </div>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      </PullToRefresh>
    </Page>
  )
}
