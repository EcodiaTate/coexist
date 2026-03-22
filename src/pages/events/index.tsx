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
  Header,
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
  visible: { transition: { staggerChildren: 0.03 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background shapes                                       */
/* ------------------------------------------------------------------ */

function DecorativeShapes() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Large ring — top-right */}
      <motion.div
        className="absolute -top-20 -right-16 h-64 w-64 rounded-full border-[3px] border-moss-200/30"
        animate={shouldReduceMotion ? {} : { rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />

      {/* Small ring — bottom-left */}
      <motion.div
        className="absolute bottom-32 -left-10 h-36 w-36 rounded-full border-[2px] border-moss-200/30"
        animate={shouldReduceMotion ? {} : { rotate: -360 }}
        transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
      />

      {/* Soft glow — top-left */}
      <motion.div
        className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-moss-100/30 blur-3xl"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Soft glow — center-right */}
      <motion.div
        className="absolute top-1/3 -right-8 h-40 w-40 rounded-full bg-moss-100/30 blur-3xl"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Dot cluster — top area */}
      <motion.div
        className="absolute top-16 left-8 h-2.5 w-2.5 rounded-full bg-moss-300/25"
        animate={shouldReduceMotion ? {} : { y: [0, -6, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-24 left-16 h-1.5 w-1.5 rounded-full bg-primary-300/20"
        animate={shouldReduceMotion ? {} : { y: [0, -4, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        className="absolute top-20 right-20 h-2 w-2 rounded-full bg-moss-300/25"
        animate={shouldReduceMotion ? {} : { y: [0, -5, 0], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Dot cluster — mid area */}
      <motion.div
        className="absolute top-1/2 left-6 h-2 w-2 rounded-full bg-primary-300/20"
        animate={shouldReduceMotion ? {} : { y: [0, -5, 0], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute top-2/3 right-10 h-1.5 w-1.5 rounded-full bg-moss-300/25"
        animate={shouldReduceMotion ? {} : { y: [0, -4, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Medium ring — bottom-right */}
      <motion.div
        className="absolute -bottom-8 -right-12 h-44 w-44 rounded-full border-[2px] border-moss-200/30"
        animate={shouldReduceMotion ? {} : { rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
      />
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
  registered: { label: 'Registered', className: 'bg-primary-100 text-primary-400' },
  waitlisted: { label: 'Waitlisted', className: 'bg-warning-100 text-warning-700' },
  attended: { label: 'Attended', className: 'bg-success-100 text-success-700' },
  invited: { label: 'Invited', className: 'bg-info-100 text-info-700' },
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
        className="bg-white/90 backdrop-blur-sm border border-white/60 shadow-sm"
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
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="shrink-0" />
                  {formatEventDate(event.date_start)}
                </span>
              </Card.Meta>
              {event.collectives && (
                <Card.Meta>
                  <span className="flex items-center gap-1">
                    <Users size={13} className="shrink-0" />
                    {event.collectives.name}
                  </span>
                </Card.Meta>
              )}
              {event.address && (
                <Card.Meta>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="shrink-0" />
                    <span className="truncate">{event.address}</span>
                  </span>
                </Card.Meta>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {status && (
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold leading-none',
                    status.className,
                  )}
                >
                  {status.label}
                </span>
              )}
              {countdown && (
                <span className="text-[11px] font-medium text-primary-400">
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
        <Card.Skeleton key={i} hasImage lines={3} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  My Events Page                                                     */
/* ------------------------------------------------------------------ */

export default function MyEventsPage() {
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
    <Page
      header={
        <Header
          title="My Events"
          rightActions={
            <button
              type="button"
              onClick={() => {}}
              className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
              aria-label="Calendar view"
            >
              <Calendar size={20} />
            </button>
          }
        />
      }
      className="!px-0 !bg-transparent"
    >
      {/* Full-bleed background container */}
      <div className="relative min-h-full px-4 lg:px-6">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-moss-50/40 via-white to-primary-50/20" />

        {/* Animated decorative shapes */}
        <DecorativeShapes />

        {/* Content layer */}
        <div className="relative z-10">
          <div className="pt-3 pb-2">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-xl p-1 border border-white/60 shadow-sm">
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
          </div>

          <PullToRefresh onRefresh={handleRefresh}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={shouldReduceMotion ? undefined : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
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
