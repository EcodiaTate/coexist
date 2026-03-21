import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, Users, ChevronRight, Lock, Globe, MapPin, Leaf } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
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

const CHANNEL_TYPE_CONFIG: Record<string, {
  icon: typeof Globe
  gradient: string
  iconBg: string
  badge: string
  label: string
}> = {
  staff_national: {
    icon: Globe,
    gradient: 'from-plum-200/80 via-plum-100/40 to-surface-0',
    iconBg: 'bg-plum-600 text-white',
    badge: 'bg-plum-200 text-plum-800',
    label: 'National',
  },
  staff_state: {
    icon: MapPin,
    gradient: 'from-info-200/80 via-info-100/40 to-surface-0',
    iconBg: 'bg-info-600 text-white',
    badge: 'bg-info-200 text-info-800',
    label: 'State',
  },
  staff_collective: {
    icon: Users,
    gradient: 'from-primary-200/80 via-primary-100/40 to-surface-0',
    iconBg: 'bg-primary-600 text-white',
    badge: 'bg-primary-200 text-primary-800',
    label: 'Staff',
  },
}

/** Strip redundant words from channel name for cleaner display */
function cleanChannelName(name: string): string {
  return name
    .replace(/\bCollective\b\s*/i, '')
    .replace(/\bStaff\b\s*/i, '')
    .trim()
    || name
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
          'group relative flex items-center gap-4 rounded-2xl p-4',
          'transition-all duration-200 active:scale-[0.97]',
          'bg-gradient-to-r',
          config.gradient,
          hasUnread
            ? 'ring-2 ring-primary-400/70 shadow-lg shadow-primary-200/40'
            : 'ring-1 ring-primary-200/60 shadow-md hover:shadow-lg hover:ring-primary-300/60',
        )}
      >
        {/* Channel type icon */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'h-13 w-13 rounded-2xl flex items-center justify-center',
            'shadow-md',
            config.iconBg,
          )}>
            <Icon size={24} strokeWidth={2.5} />
          </div>
          {/* Lock badge */}
          <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-surface-0 flex items-center justify-center shadow-md ring-2 ring-white">
            <Lock size={11} strokeWidth={2.5} className="text-primary-500" />
          </div>
          {hasUnread && (
            <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary-600 ring-2 ring-white animate-pulse shadow-sm" />
          )}
        </div>

        {/* Name + label */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[15px] truncate leading-snug tracking-tight',
            hasUnread ? 'font-extrabold text-primary-950' : 'font-bold text-primary-800',
          )}>
            {cleanChannelName(channel.name)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full', config.badge)}>
              {config.label}
            </span>
            <span className="text-[11px] font-medium text-primary-500">Staff only</span>
          </div>
        </div>

        {/* Unread / chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {hasUnread ? (
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-primary-700 px-2.5 text-xs font-extrabold text-white shadow-md">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <ChevronRight size={20} strokeWidth={2.5} className="text-primary-400 transition-transform duration-150 group-hover:translate-x-1" />
          )}
        </div>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Collective chat row                                                */
/* ------------------------------------------------------------------ */

function CollectiveChatRow({
  collective,
  collectiveId,
  unread,
  index,
}: {
  collective: {
    id: string
    name: string
    slug: string
    cover_image_url: string | null
    region: string | null
    state: string | null
    member_count: number
  }
  collectiveId: string
  unread: number
  index: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const hasUnread = unread > 0

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.25), duration: 0.25, ease: 'easeOut' }}
    >
      <Link
        to={`/chat/${collectiveId}`}
        className={cn(
          'group relative flex items-center gap-4 rounded-2xl p-4',
          'transition-all duration-200 active:scale-[0.97]',
          hasUnread
            ? 'bg-gradient-to-r from-primary-100/80 via-primary-50/60 to-surface-0 ring-2 ring-primary-400/70 shadow-lg shadow-primary-200/40'
            : 'bg-surface-0 ring-1 ring-primary-200/60 shadow-md hover:shadow-lg hover:ring-primary-300/60',
        )}
      >
        {/* Collective avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'h-13 w-13 overflow-hidden rounded-2xl',
              hasUnread
                ? 'ring-[3px] ring-primary-500 ring-offset-2 ring-offset-surface-0 shadow-lg'
                : 'ring-2 ring-primary-200/80 shadow-md',
            )}
          >
            {collective.cover_image_url ? (
              <img
                src={collective.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-300 to-primary-500">
                <Leaf size={22} strokeWidth={2.5} className="text-white" />
              </div>
            )}
          </div>
          {hasUnread && (
            <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary-600 ring-2 ring-white animate-pulse shadow-sm" />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-[15px] truncate leading-snug tracking-tight',
              hasUnread ? 'font-extrabold text-primary-950' : 'font-bold text-primary-800',
            )}
          >
            {collective.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] font-semibold text-primary-500 flex items-center gap-1">
              <Users size={12} strokeWidth={2.5} className="shrink-0" />
              {collective.member_count}
            </span>
            {(collective.region || collective.state) && (
              <>
                <span className="w-1 h-1 rounded-full bg-primary-400" />
                <span className="text-[11px] font-medium text-primary-500 truncate flex items-center gap-1">
                  <MapPin size={11} strokeWidth={2.5} className="shrink-0" />
                  {collective.region ?? collective.state}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Unread / chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {hasUnread ? (
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-primary-700 px-2.5 text-xs font-extrabold text-white shadow-md">
              {unread > 99 ? '99+' : unread}
            </span>
          ) : (
            <ChevronRight size={20} strokeWidth={2.5} className="text-primary-400 transition-transform duration-150 group-hover:translate-x-1" />
          )}
        </div>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chat list page                                                     */
/* ------------------------------------------------------------------ */

export default function ChatListPage() {
  const queryClient = useQueryClient()
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
        <div className="py-4 space-y-3">
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
      <div className="py-5 space-y-7">
        {/* Staff Channels section */}
        {hasStaffChannels && (
          <div>
            <div className="flex items-center gap-3 px-1 mb-4">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary-300/50 to-transparent rounded-full" />
              <p className="text-[11px] uppercase tracking-[0.15em] text-primary-600 font-extrabold flex items-center gap-2">
                <Lock size={12} strokeWidth={2.5} />
                Staff Channels
              </p>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary-300/50 to-transparent rounded-full" />
            </div>
            <div className="space-y-3">
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
            <div className="flex items-center gap-3 px-1 mb-4">
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary-300/50 to-transparent rounded-full" />
              <p className="text-[11px] uppercase tracking-[0.15em] text-primary-600 font-extrabold flex items-center gap-2">
                <MessageCircle size={12} strokeWidth={2.5} />
                Collectives
              </p>
              <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent via-primary-300/50 to-transparent rounded-full" />
            </div>
            <div className="space-y-3">
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

                return (
                  <CollectiveChatRow
                    key={membership.collective_id}
                    collective={collective}
                    collectiveId={membership.collective_id}
                    unread={unreadCounts[membership.collective_id] ?? 0}
                    index={i}
                  />
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
