import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, Users, ChevronRight, Lock, Globe, MapPin, Leaf, MessagesSquare } from 'lucide-react'
import { Page } from '@/components/page'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { useMyCollectives } from '@/hooks/use-collective'
import { useUnreadCounts } from '@/hooks/use-chat'
import { useMyStaffChannels, useChannelUnreadCounts, type StaffChannel } from '@/hooks/use-staff-channels'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/* ------------------------------------------------------------------ */
/*  Staff channel type config                                          */
/* ------------------------------------------------------------------ */

const ROLE_RANK: Record<string, number> = {
  member: 0,
  assist_leader: 1,
  co_leader: 2,
  leader: 3,
}

/** Session-level flag — redirect to primary chat only once per session */
let hasRedirectedThisSession = false

const CHANNEL_TYPE_CONFIG: Record<string, {
  icon: typeof Globe
  cardBg: string
  iconBg: string
  badge: string
  label: string
  border: string
}> = {
  staff_national: {
    icon: Globe,
    cardBg: 'bg-gradient-to-br from-[#ede6f2] via-[#e8dfef] to-[#e0d6e8]',
    iconBg: 'bg-gradient-to-br from-plum-500 to-plum-700 text-white shadow-md shadow-plum-400/30',
    badge: 'bg-gradient-to-r from-plum-200/80 to-plum-100/60 text-plum-800 border border-plum-300/30',
    label: 'National',
    border: 'border-plum-200/40',
  },
  staff_state: {
    icon: MapPin,
    cardBg: 'bg-gradient-to-br from-[#e4edf5] via-[#dee8f1] to-[#d6e1ed]',
    iconBg: 'bg-gradient-to-br from-info-500 to-info-700 text-white shadow-md shadow-info-400/30',
    badge: 'bg-gradient-to-r from-info-200/80 to-info-100/60 text-info-800 border border-info-300/30',
    label: 'State',
    border: 'border-info-200/40',
  },
  staff_collective: {
    icon: Users,
    cardBg: 'bg-gradient-to-br from-[#eaf0e4] via-[#e5ebde] to-[#dde5d5]',
    iconBg: 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-400/30',
    badge: 'bg-gradient-to-r from-primary-200/80 to-primary-100/60 text-primary-800 border border-primary-300/30',
    label: 'Staff',
    border: 'border-primary-200/40',
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
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background - deep teal-plum palette                     */
/* ------------------------------------------------------------------ */

function DecorativeBackground() {
  return (
    <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden" aria-hidden="true">
      {/* Multi-stop gradient - deep teal-plum forest feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/65 via-plum-100/30 via-30% to-primary-100/25 to-65%" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-secondary-100/20 to-plum-50/20" />

      {/* Top hero glow — radial gradient instead of blur filter */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-300/30 via-secondary-200/15 to-transparent" />

      {/* Warm plum accent - top right */}
      <div className="absolute -top-16 -right-16 w-[300px] h-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-plum-200/25 to-transparent" />

      {/* Deep moss glow - bottom left */}
      <div className="absolute -bottom-20 -left-10 w-[280px] h-[260px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-moss-200/18 to-transparent" />

      {/* Static decorative rings — no animation, no blur */}
      <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-secondary-300/18 opacity-60" />
      <div className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-plum-200/14 opacity-40" />
      <div className="absolute top-[32%] -left-14 w-52 h-52 rounded-full border-[2.5px] border-secondary-200/18 opacity-50" />
      <div className="absolute top-[42%] -left-4 w-28 h-28 rounded-full border-[1.5px] border-plum-200/12" />
      <div className="absolute bottom-[16%] right-2 w-36 h-36 rounded-full border-2 border-secondary-200/14" />

      {/* Soft glows — radial gradient instead of blur filter */}
      <div className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-100/22 to-transparent opacity-35" />
      <div className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-plum-100/20 to-transparent opacity-35" />

      {/* Static particles */}
      <div className="absolute top-24 right-14 w-3 h-3 rounded-full bg-secondary-400/15" />
      <div className="absolute top-[48%] left-8 w-2.5 h-2.5 rounded-full bg-plum-400/12" />
      <div className="absolute bottom-[28%] right-[18%] w-2 h-2 rounded-full bg-secondary-400/12" />
      <div className="absolute top-[62%] left-[22%] w-2 h-2 rounded-full bg-primary-400/10" />
      <div className="absolute top-[35%] right-[28%] w-1.5 h-1.5 rounded-full bg-plum-300/12" />
    </div>
  )
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
      variants={shouldReduceMotion ? undefined : fadeUp}
    >
      <Link
        to={`/chat/channel/${channel.id}`}
        className={cn(
          'group relative flex items-center gap-4 rounded-[20px] p-4',
          'transition-all duration-200 active:scale-[0.97]',
          'shadow-[0_4px_20px_-4px_rgba(61,77,51,0.12),0_1px_4px_rgba(61,77,51,0.05)]',
          'border',
          config.cardBg,
          config.border,
          hasUnread
            ? 'ring-2 ring-primary-400/70 shadow-[0_6px_28px_-4px_rgba(61,77,51,0.18)]'
            : 'hover:shadow-[0_8px_32px_-6px_rgba(61,77,51,0.16)] hover:ring-1 hover:ring-primary-300/40',
        )}
      >
        {/* Channel type icon */}
        <div className="relative flex-shrink-0">
          <div className={cn(
            'h-13 w-13 rounded-2xl flex items-center justify-center',
            config.iconBg,
          )}>
            <Icon size={24} strokeWidth={2.5} />
          </div>
          {/* Lock badge */}
          <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-gradient-to-br from-white to-surface-2 flex items-center justify-center shadow-md ring-2 ring-white/80">
            <Lock size={11} strokeWidth={2.5} className="text-primary-600" />
          </div>
          {hasUnread && (
            <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 ring-2 ring-white animate-pulse shadow-sm" />
          )}
        </div>

        {/* Name + label */}
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-[15px] truncate leading-snug tracking-tight',
            hasUnread ? 'font-extrabold text-secondary-900' : 'font-bold text-secondary-800',
          )}>
            {cleanChannelName(channel.name)}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full', config.badge)}>
              {config.label}
            </span>
            <span className="text-[11px] font-semibold text-primary-500/80">Staff only</span>
          </div>
        </div>

        {/* Unread / chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {hasUnread ? (
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 px-2.5 text-xs font-extrabold text-white shadow-md shadow-primary-500/30">
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
      variants={shouldReduceMotion ? undefined : fadeUp}
    >
      <Link
        to={`/chat/${collectiveId}`}
        className={cn(
          'group relative flex items-center gap-4 rounded-[20px] p-4',
          'bg-gradient-to-br from-[#eef2e8] via-[#ebefe5] to-[#e6eadf]',
          'border border-primary-200/35',
          'shadow-[0_4px_20px_-4px_rgba(61,77,51,0.12),0_1px_4px_rgba(61,77,51,0.05)]',
          'transition-all duration-200 active:scale-[0.97]',
          hasUnread
            ? 'ring-2 ring-primary-400/70 shadow-[0_6px_28px_-4px_rgba(61,77,51,0.18)]'
            : 'hover:shadow-[0_8px_32px_-6px_rgba(61,77,51,0.16)] hover:ring-1 hover:ring-primary-300/40',
        )}
      >
        {/* Collective avatar */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'h-13 w-13 overflow-hidden rounded-2xl',
              hasUnread
                ? 'ring-[3px] ring-primary-500 ring-offset-2 ring-offset-[#eef2e8] shadow-lg shadow-primary-400/20'
                : 'ring-2 ring-primary-300/60 shadow-md shadow-primary-300/15',
            )}
          >
            {collective.cover_image_url ? (
              <img
                src={collective.cover_image_url}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-400 to-secondary-600">
                <Leaf size={22} strokeWidth={2.5} className="text-white" />
              </div>
            )}
          </div>
          {hasUnread && (
            <div className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 ring-2 ring-[#eef2e8] animate-pulse shadow-sm" />
          )}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-[15px] truncate leading-snug tracking-tight',
              hasUnread ? 'font-extrabold text-secondary-900' : 'font-bold text-secondary-800',
            )}
          >
            {collective.name}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] font-bold text-primary-600 flex items-center gap-1 bg-primary-100/60 px-2 py-0.5 rounded-full border border-primary-200/30">
              <Users size={11} strokeWidth={2.5} className="shrink-0" />
              {collective.member_count}
            </span>
            {(collective.region || collective.state) && (
              <>
                <span className="w-1 h-1 rounded-full bg-primary-400" />
                <span className="text-[11px] font-semibold text-moss-600 truncate flex items-center gap-1">
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
            <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-primary-800 px-2.5 text-xs font-extrabold text-white shadow-md shadow-primary-500/30">
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
/*  Section divider                                                    */
/* ------------------------------------------------------------------ */

function SectionDivider({ icon: Icon, label }: { icon: typeof Lock; label: string }) {
  return (
    <div className="flex items-center gap-3 px-1 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-secondary-300/40 to-transparent" />
      <div className="flex items-center gap-2 bg-gradient-to-r from-secondary-100/60 to-secondary-50/40 px-3.5 py-1.5 rounded-full border border-secondary-200/30">
        <Icon size={12} strokeWidth={2.5} className="text-secondary-600" />
        <p className="text-[11px] uppercase tracking-[0.15em] text-secondary-700 font-extrabold">
          {label}
        </p>
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-secondary-300/40 to-transparent" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Chat list page                                                     */
/* ------------------------------------------------------------------ */

export default function ChatListPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { data: myCollectives, isLoading } = useMyCollectives()
  const { data: unreadCounts = {} } = useUnreadCounts()
  const { data: staffChannels, isLoading: channelsLoading } = useMyStaffChannels()
  const { data: channelUnreads = {} } = useChannelUnreadCounts()
  const showLoading = useDelayedLoading(isLoading && channelsLoading)

  // Auto-redirect to primary collective chat (once per session)
  useEffect(() => {
    if (hasRedirectedThisSession) return
    if (isLoading || !myCollectives?.length) return

    // Pick primary collective: highest role, then earliest join
    const sorted = [...myCollectives].sort((a, b) => {
      const rankA = ROLE_RANK[a.role] ?? 0
      const rankB = ROLE_RANK[b.role] ?? 0
      if (rankB !== rankA) return rankB - rankA
      return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    })

    const primaryId = sorted[0]?.collective_id
    if (primaryId) {
      hasRedirectedThisSession = true
      navigate(`/chat/${primaryId}`, { replace: true })
    }
  }, [isLoading, myCollectives, navigate])

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-collectives'] }),
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] }),
      queryClient.invalidateQueries({ queryKey: ['my-staff-channels'] }),
      queryClient.invalidateQueries({ queryKey: ['channel-unread'] }),
    ])
  }, [queryClient])

  const hasStaffChannels = (staffChannels?.length ?? 0) > 0

  if (showLoading) {
    return (
      <Page noBackground className="!px-0 bg-surface-1">
        <div className="relative min-h-full">
          <DecorativeBackground />
          <div className="relative z-10 px-4 lg:px-6 pt-14 pb-4 space-y-4">
            {/* Title skeleton */}
            <div className="flex items-center gap-2.5 mb-2 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-secondary-200/40" />
              <div className="h-5 w-20 bg-secondary-200/30 rounded" />
            </div>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-[20px] bg-gradient-to-br from-[#eef2e8] to-[#e6eadf] border border-primary-200/25 p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-primary-200/35" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-primary-200/30 rounded w-2/3" />
                    <div className="h-3 bg-primary-200/20 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Page>
    )
  }
  if (isLoading && channelsLoading) return null

  if (!myCollectives?.length && !hasStaffChannels) {
    return (
      <Page noBackground className="!px-0 bg-surface-1">
        <div className="relative min-h-full">
          <DecorativeBackground />
          <div className="relative z-10 px-4 lg:px-6 pt-14">
            {/* Title */}
            <div className="flex items-center gap-2.5 mb-6">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-plum-600 shadow-sm">
                <MessagesSquare size={15} className="text-white" />
              </div>
              <h1 className="font-heading text-[22px] font-bold text-secondary-900 tracking-tight">
                Chat
              </h1>
            </div>
            <EmptyState
              illustration="empty"
              title="No group chats yet"
              description="Join a collective to access group chat with other members"
              action={{ label: 'Explore Collectives', to: '/collectives' }}
            />
          </div>
        </div>
      </Page>
    )
  }

  return (
    <Page noBackground className="!px-0 bg-surface-1">
      <div className="relative min-h-full">
        <DecorativeBackground />

        {/* Content layer */}
        <div className="relative z-10 px-4 lg:px-6">
          <PullToRefresh onRefresh={handleRefresh}>
            <motion.div
              className="pt-14 pb-6 space-y-6"
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="visible"
            >
              {/* Hero title */}
              <motion.div variants={fadeUp} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-plum-600 shadow-sm shadow-secondary-400/25">
                  <MessagesSquare size={15} className="text-white" />
                </div>
                <h1 className="font-heading text-[22px] font-bold text-secondary-900 tracking-tight">
                  Chat
                </h1>
              </motion.div>

              {/* Staff Channels section */}
              {hasStaffChannels && (
                <motion.div variants={fadeUp}>
                  <SectionDivider icon={Lock} label="Staff Channels" />
                  <motion.div
                    className="space-y-3"
                    variants={shouldReduceMotion ? undefined : stagger}
                    initial="hidden"
                    animate="visible"
                  >
                    {staffChannels!.map((channel) => (
                      <StaffChannelRow
                        key={channel.id}
                        channel={channel}
                        unread={channelUnreads[channel.id] ?? 0}
                        index={0}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}

              {/* Collective Chats section */}
              {(myCollectives?.length ?? 0) > 0 && (
                <motion.div variants={fadeUp}>
                  <SectionDivider icon={MessageCircle} label="Collectives" />
                  <motion.div
                    className="space-y-3"
                    variants={shouldReduceMotion ? undefined : stagger}
                    initial="hidden"
                    animate="visible"
                  >
                    {myCollectives!.map((membership) => {
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
                          index={0}
                        />
                      )
                    })}
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          </PullToRefresh>
        </div>
      </div>
    </Page>
  )
}
