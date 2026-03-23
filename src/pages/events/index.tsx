import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    Calendar,
    Clock,
    MapPin,
    Users,
    X,
    Compass,
    Leaf,
    Search,
    Filter,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
    useMyEvents,
    useDiscoverEvents,
    useCancelRegistration,
    formatEventDate,
    getCountdown,
    ACTIVITY_TYPE_LABELS,
    ACTIVITY_TYPE_OPTIONS,
    isPastEvent,
} from '@/hooks/use-events'
import type { MyEventItem, EventWithCollective } from '@/hooks/use-events'
import type { Database } from '@/types/database.types'
import { useCollectives } from '@/hooks/use-collective'
import {
    Page,
    PullToRefresh,
    Card,
    Badge, EmptyState, ConfirmationSheet, Dropdown
} from '@/components'
import { cn } from '@/lib/cn'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { OfflineIndicator } from '@/components/offline-indicator'
import { PendingSyncBadge } from '@/components/pending-sync-badge'

type ActivityType = Database['public']['Enums']['activity_type']

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 24 } },
}

/* ------------------------------------------------------------------ */
/*  Decorative background - earthy warm tones, distinct from feed      */
/* ------------------------------------------------------------------ */

function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/60 via-primary-100/35 via-30% to-moss-50/25 to-65%" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-moss-50/20 to-sprout-50/20" />

      <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-300/28 via-primary-200/14 to-transparent" />
      <div className="absolute -top-16 -left-16 w-[280px] h-[280px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-200/22 to-transparent" />

      <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-secondary-300/18 opacity-60" />
      <div className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-primary-200/14 opacity-40" />
      <div className="absolute top-[32%] -left-14 w-52 h-52 rounded-full border-[2.5px] border-moss-300/18 opacity-50" />
      <div className="absolute top-[42%] -left-4 w-28 h-28 rounded-full border-[1.5px] border-primary-200/12" />
      <div className="absolute bottom-[16%] right-2 w-36 h-36 rounded-full border-2 border-secondary-200/14" />

      <div className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-100/18 to-transparent opacity-30" />
      <div className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-moss-200/18 to-transparent opacity-35" />

      <div className="absolute top-24 right-14 w-3 h-3 rounded-full bg-primary-400/15" />
      <div className="absolute top-[48%] left-8 w-2.5 h-2.5 rounded-full bg-moss-400/12" />
      <div className="absolute bottom-[28%] right-[18%] w-2 h-2 rounded-full bg-sprout-400/12" />
      <div className="absolute top-[62%] left-[22%] w-2 h-2 rounded-full bg-secondary-400/10" />
      <div className="absolute top-[35%] right-[28%] w-1.5 h-1.5 rounded-full bg-primary-300/12" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2 className="font-heading text-[15px] font-bold text-secondary-800 tracking-tight">
        {title}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500/15 text-[11px] font-bold text-primary-700 tabular-nums">
          {count}
        </span>
      )}
    </div>
  )
}

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

const activityToBadge: Record<string, 'shore-cleanup' | 'tree-planting' | 'land-regeneration' | 'nature-walk' | 'camp-out' | 'retreat' | 'film-screening' | 'marine-restoration' | 'workshop'> = {
  shore_cleanup: 'shore-cleanup',
  tree_planting: 'tree-planting',
  land_regeneration: 'land-regeneration',
  nature_walk: 'nature-walk',
  camp_out: 'camp-out',
  retreat: 'retreat',
  film_screening: 'film-screening',
  marine_restoration: 'marine-restoration',
  workshop: 'workshop',
}

/* ------------------------------------------------------------------ */
/*  Event Card (for My Events - shows registration status)             */
/* ------------------------------------------------------------------ */

function MyEventCard({
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
          'bg-brand',
          'border border-primary-400/30',
          'shadow-[0_6px_28px_-6px_rgba(61,77,51,0.22),0_2px_6px_rgba(61,77,51,0.08)]',
          past && 'opacity-70 saturate-[0.85]',
        )}
      >
        <div className="relative">
          {event.cover_image_url ? (
            <Card.Image src={event.cover_image_url} alt={event.title} aspectRatio="2/1" />
          ) : (
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/1' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-300/60 via-moss-400/50 to-secondary-500/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Leaf size={22} strokeWidth={2} className="text-white/70" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden="true" />
            </div>
          )}
          <Card.Badge position="top-right">
            <Badge
              variant="activity"
              activity={activityToBadge[event.activity_type] ?? 'workshop'}
              size="sm"
            >
              {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
            </Badge>
          </Card.Badge>
        </div>

        <Card.Content>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Card.Title className="!text-white">{event.title}</Card.Title>
              <Card.Meta className="!text-white/70">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="shrink-0 text-white/60" />
                  <span className="font-semibold text-white/85">{formatEventDate(event.date_start)}</span>
                </span>
              </Card.Meta>
              {event.collectives && (
                <Card.Meta className="!text-white/70">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="shrink-0 text-white/60" />
                    <span className="text-white/75">{event.collectives.name}</span>
                  </span>
                </Card.Meta>
              )}
              {event.address && (
                <Card.Meta className="!text-white/70">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="shrink-0 text-white/60" />
                    <span className="truncate text-white/75">{event.address}</span>
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
                <span className="text-[11px] font-bold text-white/90 bg-white/15 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-white/20">
                  {countdown}
                </span>
              )}
            </div>
          </div>

          {!past && event.registration_status === 'registered' && onCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCancel(event.id)
              }}
              className={cn(
                'mt-3 min-h-11 flex items-center justify-center gap-1 text-caption font-medium text-white/50',
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
/*  Discover Event Card (no registration status, shows open event)     */
/* ------------------------------------------------------------------ */

function DiscoverEventCard({ event }: { event: EventWithCollective }) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
      <Card
        variant="event"
        onClick={() => navigate(`/events/${event.id}`)}
        aria-label={event.title}
        className={cn(
          'bg-brand',
          'border border-primary-400/30',
          'shadow-[0_6px_28px_-6px_rgba(61,77,51,0.22),0_2px_6px_rgba(61,77,51,0.08)]',
        )}
      >
        <div className="relative">
          {event.cover_image_url ? (
            <Card.Image src={event.cover_image_url} alt={event.title} aspectRatio="2/1" />
          ) : (
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/1' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-300/60 via-moss-400/50 to-secondary-500/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
                  <Leaf size={22} strokeWidth={2} className="text-white/70" />
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden="true" />
            </div>
          )}
          <Card.Badge position="top-right">
            <Badge
              variant="activity"
              activity={activityToBadge[event.activity_type] ?? 'workshop'}
              size="sm"
            >
              {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
            </Badge>
          </Card.Badge>
        </div>

        <Card.Content>
          <div className="min-w-0">
            <Card.Title className="!text-white">{event.title}</Card.Title>
            <Card.Meta className="!text-white/70">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="shrink-0 text-white/60" />
                <span className="font-semibold text-white/85">{formatEventDate(event.date_start)}</span>
              </span>
            </Card.Meta>
            {event.collectives && (
              <Card.Meta className="!text-white/70">
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="shrink-0 text-white/60" />
                  <span className="text-white/75">{event.collectives.name}</span>
                </span>
              </Card.Meta>
            )}
            {event.address && (
              <Card.Meta className="!text-white/70">
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0 text-white/60" />
                  <span className="truncate text-white/75">{event.address}</span>
                </span>
              </Card.Meta>
            )}
          </div>
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
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-[20px] bg-gradient-to-b from-[#eef2e8] to-[#e6eadf] border border-primary-200/25 shadow-sm overflow-hidden animate-pulse">
          <div className="bg-primary-200/20" style={{ aspectRatio: '2/1' }} />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-primary-200/25 rounded w-3/4" />
            <div className="h-3 bg-primary-200/20 rounded w-1/2" />
            <div className="h-3 bg-primary-200/15 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Unified Events Page – single scroll, no tabs                       */
/* ------------------------------------------------------------------ */

export default function EventsPage() {
  const navigate = useNavigate()
  const [activityFilter, setActivityFilter] = useState<ActivityType | ''>('')
  const [collectiveFilter, setCollectiveFilter] = useState<string>('')
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()

  // My upcoming events (next events section)
  const { data: upcomingEvents, isLoading: upcomingLoading, dataUpdatedAt, isFetching } = useMyEvents('upcoming')
  const upcomingShowLoading = useDelayedLoading(upcomingLoading)
  const cancelMutation = useCancelRegistration()

  // Invited events
  const { data: invitedEvents, isLoading: invitedLoading } = useMyEvents('invited')
  const invitedShowLoading = useDelayedLoading(invitedLoading)

  // Discover events with filters
  const { data: discoverEvents, isLoading: discoverLoading } = useDiscoverEvents({
    activityType: activityFilter,
    collectiveId: collectiveFilter || undefined,
  })
  const discoverShowLoading = useDelayedLoading(discoverLoading)

  // Collectives for filter dropdown
  const { data: collectives } = useCollectives()

  const collectiveOptions = [
    { value: '', label: 'All collectives' },
    ...(collectives ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-events'] }),
      queryClient.invalidateQueries({ queryKey: ['discover-events'] }),
    ])
  }, [queryClient])

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return
    cancelMutation.mutate(cancelTarget)
    setCancelTarget(null)
  }, [cancelTarget, cancelMutation])

  return (
    <Page noBackground className="!px-0 bg-surface-1">
      <div className="relative min-h-full">
        <DecorativeBackground />

        <div className="relative z-10 px-4 lg:px-6">
          {/* Hero title */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="pt-14 pb-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-700 shadow-sm shadow-primary-400/25">
                  <Compass size={15} className="text-white" />
                </div>
                <h1 className="font-heading text-[22px] font-bold text-secondary-900 tracking-tight">
                  Events
                </h1>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <OfflineIndicator dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} className="text-primary-400" />
                <PendingSyncBadge />
              </div>
            </div>
          </motion.div>

          <PullToRefresh onRefresh={handleRefresh}>
            <div className="space-y-6 pb-6">
              {/* ── Next Events (upcoming registered) ── */}
              {(upcomingShowLoading || (upcomingEvents && upcomingEvents.length > 0)) && (
                <motion.section
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.06 }}
                >
                  <SectionHeader title="Your Next Events" count={upcomingEvents?.length} />
                  {upcomingShowLoading ? (
                    <EventListSkeleton />
                  ) : (
                    <motion.div
                      variants={shouldReduceMotion ? undefined : stagger}
                      initial="hidden"
                      animate="visible"
                      className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0"
                    >
                      {upcomingEvents!.map((event) => (
                        <MyEventCard
                          key={event.id}
                          event={event}
                          onCancel={(id) => setCancelTarget(id)}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.section>
              )}

              {/* ── Invited Events ── */}
              {(invitedShowLoading || (invitedEvents && invitedEvents.length > 0)) && (
                <motion.section
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                >
                  <SectionHeader title="Invited" count={invitedEvents?.length} />
                  {invitedShowLoading ? (
                    <EventListSkeleton />
                  ) : (
                    <motion.div
                      variants={shouldReduceMotion ? undefined : stagger}
                      initial="hidden"
                      animate="visible"
                      className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0"
                    >
                      {invitedEvents!.map((event) => (
                        <MyEventCard key={event.id} event={event} />
                      ))}
                    </motion.div>
                  )}
                </motion.section>
              )}

              {/* ── Discover Events ── */}
              <motion.section
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.14 }}
              >
                <SectionHeader title="Discover Events" />

                {/* Filters row */}
                <div className="flex items-center gap-2 mb-4">
                  <Filter size={14} className="text-primary-400 shrink-0" />
                  <Dropdown
                    value={activityFilter}
                    onChange={(v) => setActivityFilter(v as ActivityType | '')}
                    options={[
                      { value: '', label: 'All types' },
                      ...ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                    ]}
                    placeholder="Filter by type"
                    className="flex-1"
                  />
                  <Dropdown
                    value={collectiveFilter}
                    onChange={(v) => setCollectiveFilter(v)}
                    options={collectiveOptions}
                    placeholder="All collectives"
                    className="flex-1"
                  />
                </div>

                {discoverShowLoading ? (
                  <EventListSkeleton />
                ) : !discoverEvents || discoverEvents.length === 0 ? (
                  <EmptyState
                    illustration="empty"
                    title="No events found"
                    description={activityFilter || collectiveFilter ? 'Try different filters or check back soon.' : 'No upcoming events right now. Check back soon!'}
                  />
                ) : (
                  <motion.div
                    variants={shouldReduceMotion ? undefined : stagger}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0"
                  >
                    {discoverEvents.map((event) => (
                      <DiscoverEventCard key={event.id} event={event} />
                    ))}
                  </motion.div>
                )}
              </motion.section>
            </div>
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
