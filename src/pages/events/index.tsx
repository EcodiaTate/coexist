import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useParallaxLayers } from '@/hooks/use-parallax-scroll'
import {
    Calendar, MapPin,
    Users,
    X, Leaf, Filter
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
/*  Parallax Hero                                                      */
/* ------------------------------------------------------------------ */

function EventsHero({ rm }: { rm: boolean }) {
  const { bgRef, fgRef, textRef } = useParallaxLayers({ withScale: !rm, withOpacity: !rm })

  /* Both images are 904×1080 (portrait). On mobile they fill the width
     and we crop the bottom via a fixed viewport height. On laptop the
     container caps at a max-height so the portrait image doesn't
     dominate the page. The fg cutout is absolutely positioned over
     the bg at the exact same size so they marry up pixel-perfect. */

  return (
    <div className="relative">
      {/* Container: portrait aspect on mobile, capped on desktop */}
      <div className="relative w-full h-[100vw] max-h-[480px] sm:max-h-[420px] overflow-hidden">
        {/* Background - fills container, pulled up on laptop to show upper portion */}
        <div
          ref={rm ? undefined : bgRef}
          className="absolute inset-x-0 top-0 lg:-top-[60%] will-change-transform"
        >
          <img
            src="/img/events-hero-bg.png"
            alt="Conservation events"
            className="w-full h-auto block"
          />
        </div>

        {/* Foreground cutout - matches bg position exactly */}
        <div
          ref={rm ? undefined : fgRef}
          className="absolute inset-x-0 top-0 lg:-top-[60%] z-[3] will-change-transform"
        >
          <img
            src="/img/events-hero-fg.png"
            alt=""
            className="w-full h-auto block"
          />
        </div>

        {/* Hero text */}
        <div
          ref={rm ? undefined : textRef}
          className="absolute inset-x-0 top-[25%] sm:top-[18%] z-[2] flex flex-col items-center px-6 will-change-transform"
        >
          <span className="text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-[0.3em] text-white/80 mb-1 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            Discover
          </span>
          <span role="heading" aria-level={1} className="font-heading text-[2.5rem] sm:text-[3.5rem] lg:text-[5rem] font-bold uppercase text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)] leading-[0.85] block">
            Events
          </span>
        </div>

        {/* Safe area spacer */}
        <div
          className="absolute top-0 left-0 right-0 z-40"
          style={{ paddingTop: 'var(--safe-top, 0px)' }}
        />
      </div>

      {/* Wave transition */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="w-full h-7 sm:h-10 block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,25
               C60,22 100,18 140,20
               C180,22 200,15 220,18
               L228,8 L234,5 L240,10
               C280,18 340,24 400,20
               C440,16 470,22 510,25
               C560,28 600,20 640,22
               C670,24 690,18 710,20
               L718,10 L722,6 L728,12
               C760,20 820,26 880,22
               C920,18 950,24 990,26
               C1020,28 1050,20 1080,18
               C1100,16 1120,22 1140,24
               L1148,12 L1153,7 L1158,9 L1165,16
               C1200,22 1260,26 1320,22
               C1360,18 1400,24 1440,22
               L1440,70 L0,70 Z"
            className="fill-white"
          />
        </svg>
      </div>
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
/*  Activity colour accents for card tinting                           */
/* ------------------------------------------------------------------ */

const activityCardTint: Record<string, { from: string; via: string; to: string }> = {
  shore_cleanup:      { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-sky-600'      },
  tree_planting:      { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-emerald-600'  },
  land_regeneration:  { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-lime-600'     },
  nature_walk:        { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-teal-600'     },
  camp_out:           { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-amber-600'    },
  retreat:            { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-violet-600'   },
  film_screening:     { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-rose-600'     },
  marine_restoration: { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-blue-600'     },
  workshop:           { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-fuchsia-600'  },
}

const defaultCardTint = { from: 'from-[#869d61]', via: 'via-[#869d61]', to: 'to-moss-600' }

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
  const tint = activityCardTint[event.activity_type] ?? defaultCardTint

  return (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
      <Card
        variant="event"
        onClick={() => navigate(`/events/${event.id}`)}
        aria-label={`${event.title} - ${status?.label}`}
        className={cn(
          `bg-gradient-to-br ${tint.from} ${tint.via} via-[80%] ${tint.to}`,
          `shadow-[0_6px_28px_-6px_rgba(61,77,51,0.22),0_2px_6px_rgba(61,77,51,0.08)]`,
          past && 'opacity-70 saturate-[0.85]',
        )}
      >
        <div className="relative">
          {event.cover_image_url ? (
            <Card.Image src={event.cover_image_url} alt={event.title} aspectRatio="2/1" />
          ) : (
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/1' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-300/60 via-moss-400/50 to-secondary-500/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
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
                <span className="text-[11px] font-bold text-white/90 bg-white/15 px-2.5 py-0.5 rounded-full border border-white/20">
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
                'active:scale-[0.97] transition-transform duration-150',
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
  const tint = activityCardTint[event.activity_type] ?? defaultCardTint

  return (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
      <Card
        variant="event"
        onClick={() => navigate(`/events/${event.id}`)}
        aria-label={event.title}
        className={cn(
          `bg-gradient-to-br ${tint.from} ${tint.via} via-[80%] ${tint.to}`,
          `shadow-[0_6px_28px_-6px_rgba(61,77,51,0.22),0_2px_6px_rgba(61,77,51,0.08)]`,
        )}
      >
        <div className="relative">
          {event.cover_image_url ? (
            <Card.Image src={event.cover_image_url} alt={event.title} aspectRatio="2/1" />
          ) : (
            <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/1' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary-300/60 via-moss-400/50 to-secondary-500/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
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
    <Page noBackground className="!px-0 bg-white">
      <div className="relative min-h-full">
        <EventsHero rm={!!shouldReduceMotion} />

        <div className="relative z-10 px-4 lg:px-6 pt-6">
          {/* Status indicators */}
          <div className="flex items-center justify-end gap-1.5 mb-4">
            <OfflineIndicator dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} className="text-primary-400" />
            <PendingSyncBadge />
          </div>

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
