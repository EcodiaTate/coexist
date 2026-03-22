import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Calendar,
  Mail,
  Clock,
  MapPin,
  Users,
  ChevronRight,
  X,
  Compass,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import {
  useMyEvents,
  useCancelRegistration,
  formatEventDate,
  getCountdown,
  ACTIVITY_TYPE_LABELS,
  isPastEvent,
} from '@/hooks/use-events'
import type { MyEventItem } from '@/hooks/use-events'
import {
  Page,
  TabBar,
  PullToRefresh,
  Card,
  Badge,
  Avatar,
  Skeleton,
  EmptyState,
  Button,
  ConfirmationSheet,
} from '@/components'
import { cn } from '@/lib/cn'
import { OfflineIndicator } from '@/components/offline-indicator'
import { PendingSyncBadge } from '@/components/pending-sync-badge'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background — earthy warm tones, distinct from feed      */
/* ------------------------------------------------------------------ */

function DecorativeBackground() {
  const r = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Rich warm gradient — amber-moss-earth palette */}
      <div className="absolute inset-0 bg-gradient-to-b from-bark-200/50 via-bark-100/30 via-35% to-moss-50/25 to-70%" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-moss-50/15 to-bark-100/25" />

      {/* Top hero glow — warm amber wash */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[550px] h-[320px] rounded-full bg-gradient-to-b from-bark-200/40 via-bark-100/25 to-transparent blur-[60px]" />

      {/* Warm accent — top right */}
      <div className="absolute -top-12 -right-12 w-[280px] h-[280px] rounded-full bg-gradient-to-bl from-warning-100/30 to-transparent blur-[50px]" />

      {/* Large ring — top right with warm border */}
      <motion.div
        className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-bark-200/25"
        animate={r ? {} : { scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut' }}
      />
      {/* Inner concentric ring */}
      <motion.div
        className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-[2px] border-moss-200/20"
        animate={r ? {} : { scale: [1, 1.04, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* Left ring cluster */}
      <motion.div
        className="absolute top-[35%] -left-14 w-48 h-48 rounded-full border-[2.5px] border-bark-200/20"
        animate={r ? {} : { scale: [1, 1.07, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut', delay: 2.5 }}
      />
      <motion.div
        className="absolute top-[45%] -left-6 w-28 h-28 rounded-full border-[1.5px] border-moss-300/15"
        animate={r ? {} : { rotate: -360 }}
        transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
      />

      {/* Bottom right ring */}
      <motion.div
        className="absolute bottom-[15%] right-0 w-36 h-36 rounded-full border-2 border-bark-200/18"
        animate={r ? {} : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 55, ease: 'linear' }}
      />

      {/* Deep glow — center left */}
      <motion.div
        className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-bark-100/18 blur-[50px]"
        animate={r ? {} : { scale: [1, 1.12, 1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 1 }}
      />

      {/* Bottom glow pool */}
      <motion.div
        className="absolute -bottom-16 left-1/4 w-64 h-64 rounded-full bg-moss-200/18 blur-[55px]"
        animate={r ? {} : { scale: [1, 1.08, 1], opacity: [0.25, 0.42, 0.25] }}
        transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut', delay: 3 }}
      />

      {/* Floating particles — warm toned */}
      <motion.div className="absolute top-20 right-16 w-3 h-3 rounded-full bg-bark-300/22"
        animate={r ? {} : { y: [-5, 5, -5], x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} />
      <motion.div className="absolute top-32 left-10 w-2.5 h-2.5 rounded-full bg-moss-400/18"
        animate={r ? {} : { y: [3, -5, 3] }} transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 1 }} />
      <motion.div className="absolute top-[52%] right-[22%] w-2 h-2 rounded-full bg-bark-400/15"
        animate={r ? {} : { y: [-3, 4, -3], x: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 2 }} />
      <motion.div className="absolute bottom-[32%] left-[18%] w-2.5 h-2.5 rounded-full bg-warning-400/12"
        animate={r ? {} : { y: [2, -4, 2] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 3 }} />
      <motion.div className="absolute top-[68%] right-8 w-2 h-2 rounded-full bg-moss-400/15"
        animate={r ? {} : { y: [-2, 3, -2], x: [1, -1, 1] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1.5 }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab config                                                         */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'upcoming', label: 'Upcoming', icon: <Calendar size={16} /> },
  { id: 'invited', label: 'Invited', icon: <Mail size={16} /> },
  { id: 'past', label: 'Past', icon: <Clock size={16} /> },
] as const

type TabId = (typeof TABS)[number]['id']

/* ------------------------------------------------------------------ */
/*  Status badge styles                                                */
/* ------------------------------------------------------------------ */

const statusBadge: Record<string, { label: string; className: string }> = {
  registered: { label: 'Registered', className: 'bg-gradient-to-r from-primary-100 to-primary-50 text-primary-600 border border-primary-200/40 shadow-sm shadow-primary-200/15' },
  waitlisted: { label: 'Waitlisted', className: 'bg-gradient-to-r from-warning-100 to-warning-50 text-warning-700 border border-warning-200/40 shadow-sm shadow-warning-200/15' },
  attended: { label: 'Attended', className: 'bg-gradient-to-r from-success-100 to-success-50 text-success-700 border border-success-200/40 shadow-sm shadow-success-200/15' },
  invited: { label: 'Invited', className: 'bg-gradient-to-r from-info-100 to-info-50 text-info-700 border border-info-200/40 shadow-sm shadow-info-200/15' },
}

/* ------------------------------------------------------------------ */
/*  Activity badge mapping                                             */
/* ------------------------------------------------------------------ */

const activityToBadge: Record<string, 'tree-planting' | 'beach-cleanup' | 'habitat' | 'wildlife' | 'education' | 'monitoring' | 'restoration'> = {
  tree_planting: 'tree-planting',
  beach_cleanup: 'beach-cleanup',
  habitat_restoration: 'habitat',
  nature_walk: 'wildlife',
  education: 'education',
  wildlife_survey: 'wildlife',
  seed_collecting: 'tree-planting',
  weed_removal: 'restoration',
  waterway_cleanup: 'beach-cleanup',
  community_garden: 'restoration',
  other: 'education',
}

/* ------------------------------------------------------------------ */
/*  Event Card                                                         */
/* ------------------------------------------------------------------ */

function EventCard({
  event,
  onCancel,
}: {
  event: MyEventItem
  onCancel?: (eventId: string) => void
}) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const past = isPastEvent(event)
  const status = statusBadge[event.registration_status]
  const countdown = !past && event.registration_status === 'registered' ? getCountdown(event.date_start) : null

  return (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
      <Card
        variant="event"
        onClick={() => navigate(`/events/${event.id}`)}
        aria-label={`${event.title} - ${status?.label}`}
        className={cn(
          'bg-gradient-to-b from-[#f7f3ee] via-[#f4f0ea] to-[#efe9e0]',
          'border border-bark-200/30',
          'shadow-[0_6px_28px_-6px_rgba(93,77,51,0.16),0_2px_6px_rgba(93,77,51,0.06)]',
          past && 'opacity-70 saturate-[0.85]',
        )}
      >
        {event.cover_image_url && (
          <div className="relative">
            <Card.Image src={event.cover_image_url} alt={event.title} />
            <Card.Badge position="top-right">
              <Badge
                variant="activity"
                activity={activityToBadge[event.activity_type] ?? 'education'}
                size="sm"
              >
                {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
              </Badge>
            </Card.Badge>
          </div>
        )}

        <Card.Content>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Card.Title>{event.title}</Card.Title>
              <Card.Meta>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="shrink-0 text-bark-500" />
                  <span className="font-semibold text-bark-700">{formatEventDate(event.date_start)}</span>
                </span>
              </Card.Meta>
              {event.collectives && (
                <Card.Meta>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="shrink-0 text-moss-500" />
                    <span className="text-moss-600">{event.collectives.name}</span>
                  </span>
                </Card.Meta>
              )}
              {event.address && (
                <Card.Meta>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="shrink-0 text-primary-400" />
                    <span className="truncate">{event.address}</span>
                  </span>
                </Card.Meta>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {status && (
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold leading-none',
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              )}
              {countdown && (
                <span className="text-[11px] font-bold text-bark-600 bg-gradient-to-r from-bark-100/80 to-bark-50/60 px-2.5 py-0.5 rounded-full border border-bark-200/30">
                  {countdown}
                </span>
              )}
            </div>
          </div>

          {/* Cancel action for upcoming registered events */}
          {!past && event.registration_status === 'registered' && onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCancel(event.id)
              }}
              className={cn(
                'mt-3 min-h-11 flex items-center justify-center gap-1 text-caption font-medium text-primary-400',
                'hover:text-error',
                'cursor-pointer select-none',
                'active:scale-[0.97] transition-all duration-150',
              )}
              aria-label="Cancel registration"
            >
              <X size={14} />
              Cancel Registration
            </button>
          )}
        </Card.Content>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function EventListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="rounded-[20px] bg-gradient-to-b from-[#f7f3ee] to-[#efe9e0] border border-bark-200/25 shadow-sm overflow-hidden animate-pulse">
          <div className="h-40 bg-bark-200/20" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-bark-200/25 rounded w-3/4" />
            <div className="h-3 bg-bark-200/20 rounded w-1/2" />
            <div className="h-3 bg-bark-200/15 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  My Events Page                                                     */
/* ------------------------------------------------------------------ */

export default function MyEventsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('upcoming')
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()

  const { data: events, isLoading, dataUpdatedAt, isFetching } = useMyEvents(activeTab)
  const cancelMutation = useCancelRegistration()

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['my-events'] })
  }, [queryClient])

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return
    cancelMutation.mutate(cancelTarget)
    setCancelTarget(null)
  }, [cancelTarget, cancelMutation])

  const emptyConfig = {
    upcoming: {
      illustration: 'empty' as const,
      title: 'No upcoming events',
      description: 'Browse events near you and register for your first one!',
      action: { label: 'Explore Events', to: '/explore' },
    },
    invited: {
      illustration: 'empty' as const,
      title: 'No invites yet',
      description: 'When your collective organises an event, invites will show up here.',
      action: { label: 'Explore Collectives', to: '/explore?tab=collectives' },
    },
    past: {
      illustration: 'wildlife' as const,
      title: 'No past events',
      description: 'Your event history will appear here once you attend your first one.',
      action: { label: 'Find Events', to: '/explore' },
    },
  }

  return (
    <Page noBackground className="!px-0 !bg-transparent">
      <div className="relative min-h-full">
        <DecorativeBackground />

        {/* Content layer */}
        <div className="relative z-10 px-4 lg:px-6">
          {/* Hero title */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="pt-6 pb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-bark-500 to-moss-700 shadow-sm">
                  <Compass size={15} className="text-white" />
                </div>
                <h1 className="font-heading text-[22px] font-bold text-secondary-900 tracking-tight">
                  My Events
                </h1>
              </div>

              <button
                type="button"
                onClick={() => navigate('/explore')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl min-h-11',
                  'text-sm font-semibold text-bark-700',
                  'bg-gradient-to-r from-[#f0ece4] to-[#ebe5da] border border-bark-200/35',
                  'shadow-sm shadow-bark-300/15',
                  'hover:from-[#ede8df] hover:to-[#e8e1d5] active:scale-[0.97]',
                  'transition-all duration-150 cursor-pointer select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                )}
              >
                Explore
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>

          {/* Tab bar — glass morphism */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="pb-4"
          >
            <div className="flex items-center gap-2 bg-gradient-to-r from-[#f5f1eb] to-[#f0ece4] backdrop-blur-md rounded-2xl p-1.5 border border-bark-200/30 shadow-[0_4px_20px_-4px_rgba(93,77,51,0.14)]">
              <TabBar
                tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon }))}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as TabId)}
                aria-label="Event tabs"
                className="bg-transparent rounded-none p-0 flex-1"
              />
              <div className="flex items-center gap-1.5 shrink-0 pr-2">
                <OfflineIndicator dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} className="text-primary-400" />
                <PendingSyncBadge />
              </div>
            </div>
          </motion.div>

          {/* Event list */}
          <PullToRefresh onRefresh={handleRefresh}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={shouldReduceMotion ? undefined : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="pb-6"
              >
                {isLoading ? (
                  <EventListSkeleton />
                ) : !events || events.length === 0 ? (
                  <EmptyState {...emptyConfig[activeTab]} />
                ) : (
                  <motion.div
                    variants={shouldReduceMotion ? undefined : stagger}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {events.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        onCancel={
                          activeTab === 'upcoming'
                            ? (id) => setCancelTarget(id)
                            : undefined
                        }
                      />
                    ))}

                    {/* End of list marker */}
                    <motion.div variants={fadeUp} className="flex flex-col items-center py-10 gap-3">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8dfd3] via-[#e0d5c6] to-[#d6c9b7] flex items-center justify-center shadow-md shadow-bark-300/20 border border-bark-200/25">
                          <Calendar size={20} className="text-bark-600" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-bark-400 to-moss-500 border-2 border-[#f4f0ea]" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-bark-600">
                          {activeTab === 'past' ? 'End of history' : 'All events loaded'}
                        </p>
                        <p className="text-xs text-bark-400 mt-0.5">
                          Pull down to refresh
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </PullToRefresh>
        </div>
      </div>

      {/* Cancel confirmation sheet */}
      <ConfirmationSheet
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Registration?"
        description="You'll lose your spot. If the event is full, you'll need to join the waitlist to re-register."
        confirmLabel="Yes, Cancel"
        variant="warning"
      />
    </Page>
  )
}
