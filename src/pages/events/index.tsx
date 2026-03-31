import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  Calendar, MapPin, Users, X, Leaf, Filter, ChevronRight,
  Flower2,
  GraduationCap, CircleDot,
  ArrowRight,
} from 'lucide-react'
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
import { useCollectives, useMyCollectives, type CollectiveWithLeader } from '@/hooks/use-collective'
import {
  Page,
  Card,
  Badge, EmptyState, ConfirmationSheet, Dropdown, Skeleton,
  WaveTransition, SegmentedControl,
} from '@/components'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { activityToBadge, ACTIVITY_META } from '@/lib/activity-types'
import { adminStagger as stagger, fadeUp } from '@/lib/admin-motion'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { OfflineIndicator } from '@/components/offline-indicator'
import { PendingSyncBadge } from '@/components/pending-sync-badge'
import { CollectiveMap } from '@/components/collective-map'

type ActivityType = Database['public']['Enums']['activity_type']



/* ------------------------------------------------------------------ */
/*  Status badge styles                                                */
/* ------------------------------------------------------------------ */

const statusBadge: Record<string, { label: string; className: string }> = {
  registered: { label: 'Registered', className: 'bg-primary-50 text-primary-700 border border-primary-200' },
  waitlisted: { label: 'Waitlisted', className: 'bg-warning-50 text-warning-700 border border-warning-200' },
  attended: { label: 'Attended', className: 'bg-success-50 text-success-700 border border-success-200' },
  invited: { label: 'Invited', className: 'bg-info-50 text-info-700 border border-info-200' },
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({ title, count, action }: { title: string; count?: number; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <h2 className="font-heading text-[15px] font-bold text-secondary-800 tracking-tight">
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary-500/15 text-[11px] font-bold text-primary-700 tabular-nums">
            {count}
          </span>
        )}
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-1 text-xs font-semibold text-primary-500 min-h-11 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
        >
          {action.label} <ArrowRight size={12} />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function ExploreHero({ rm }: { rm: boolean }) {
  return (
    <div className="relative overflow-hidden">
      {/* Deep gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-800" />

      {/* Decorative organic shapes */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sprout-500/10 blur-3xl" aria-hidden="true" />
      <div className="absolute top-1/2 -left-16 w-48 h-48 rounded-full bg-primary-400/15 blur-2xl" aria-hidden="true" />
      <div className="absolute bottom-8 right-1/4 w-32 h-32 rounded-full bg-secondary-400/10 blur-2xl" aria-hidden="true" />

      <div className="relative px-5 lg:px-10 pt-10 pb-3">
        <motion.div
          initial={rm ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-sprout-300/80 mb-1.5 block">
            Co-Exist Australia
          </span>
          <h1 className="font-heading text-[2rem] sm:text-[2.5rem] font-bold text-white leading-[0.95] mb-3">
            Explore. Connect.<br />Protect.
          </h1>
          <p className="text-[0.875rem] text-white/50 max-w-[300px] leading-relaxed">
            Find events, join collectives, and make a real difference for Australia's nature.
          </p>
        </motion.div>
      </div>

      {/* Wave transition into content bg */}
      <WaveTransition position="inline" fill="fill-neutral-50" className="mt-2" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  My Event Card                                                      */
/* ------------------------------------------------------------------ */

function MyEventCard({ event, onCancel }: { event: MyEventItem; onCancel?: (eventId: string) => void }) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const past = isPastEvent(event)
  const status = statusBadge[event.registration_status]
  const countdown = !past && event.registration_status === 'registered' ? getCountdown(event.date_start) : null

  return (
    <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
      <Card
        variant="event"
        watermark={event.activity_type}
        onClick={() => navigate(`/events/${event.id}`)}
        aria-label={`${event.title} - ${status?.label}`}
        className={cn(
          'bg-white shadow-sm border border-neutral-100 rounded-2xl',
          past && 'opacity-70 saturate-[0.85]',
        )}
      >
        <div className="relative">
          {event.cover_image_url ? (
            <Card.Image src={event.cover_image_url} alt={event.title} aspectRatio="2/1" />
          ) : (
            <div className="relative w-full overflow-hidden bg-gradient-to-br from-neutral-50 to-neutral-100" style={{ aspectRatio: '2/1' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
                  <Leaf size={22} strokeWidth={2} className="text-neutral-300" />
                </div>
              </div>
            </div>
          )}
          <Card.Badge position="top-left">
            <Badge variant="activity" activity={activityToBadge[event.activity_type] ?? 'workshop'} size="sm">
              {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
            </Badge>
          </Card.Badge>
        </div>
        <Card.Content>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Card.Title className="text-neutral-900">{event.title}</Card.Title>
              <Card.Meta className="text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="shrink-0 text-neutral-400" />
                  <span className="font-semibold text-neutral-600">{formatEventDate(event.date_start)}</span>
                </span>
              </Card.Meta>
              {event.collectives && (
                <Card.Meta className="text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="shrink-0 text-neutral-400" />
                    <span className="text-neutral-500">{event.collectives.name}</span>
                  </span>
                </Card.Meta>
              )}
              {event.address && (
                <Card.Meta className="text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="shrink-0 text-neutral-400" />
                    <span className="line-clamp-1 text-neutral-500">{event.address}</span>
                  </span>
                </Card.Meta>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {status && (
                <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold leading-none', status.className)}>
                  {status.label}
                </span>
              )}
              {countdown && (
                <span className="text-[11px] font-bold text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                  {countdown}
                </span>
              )}
            </div>
          </div>
          {!past && event.registration_status === 'registered' && onCancel && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCancel(event.id) }}
              className="mt-3 min-h-11 flex items-center justify-center gap-1 text-caption font-medium text-neutral-400 hover:text-error-500 cursor-pointer select-none active:scale-[0.97] transition-transform duration-150"
              aria-label="Cancel registration"
            >
              <X size={14} /> Cancel Registration
            </button>
          )}
        </Card.Content>
      </Card>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Collective Card                                                    */
/* ------------------------------------------------------------------ */

function CollectiveCard({ collective, onClick }: { collective: CollectiveWithLeader; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex gap-3.5 rounded-2xl bg-white p-3.5 w-full text-left',
        'shadow-sm',
        'border border-neutral-100',
        'active:scale-[0.98] transition-all duration-150 cursor-pointer select-none',
        'hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
      )}
    >
      <div className="h-[4.5rem] w-[4.5rem] flex-shrink-0 overflow-hidden rounded-xl">
        {collective.cover_image_url ? (
          <img src={collective.cover_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-50">
            <Users size={24} className="text-primary-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className="font-heading text-sm font-semibold text-neutral-900 truncate">{collective.name}</h3>
        {collective.region && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-500">
            <MapPin size={11} />
            <span className="truncate">{collective.region}{collective.state ? `, ${collective.state}` : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 mt-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-xs font-semibold text-primary-600">
            <Users size={11} /> {collective.member_count ?? 0}
          </span>
          {collective.profiles?.display_name && (
            <span className="text-[11px] text-neutral-500 truncate">Led by {collective.profiles.display_name}</span>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="self-center text-neutral-400 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function EventListSkeleton() {
  return (
    <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="rounded-2xl bg-white border border-neutral-100 shadow-sm overflow-hidden animate-pulse">
          <div className="bg-neutral-100" style={{ aspectRatio: '2/1' }} />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-neutral-100 rounded-lg w-3/4" />
            <div className="h-3 bg-neutral-100 rounded-lg w-1/2" />
            <div className="h-3 bg-neutral-50 rounded-lg w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tab type                                                           */
/* ------------------------------------------------------------------ */

type ExploreTab = 'events' | 'collectives'

/* ------------------------------------------------------------------ */
/*  Main Explore Page                                                  */
/* ------------------------------------------------------------------ */

export default function ExplorePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const initialTab = searchParams.get('tab') === 'collectives' ? 'collectives' : 'events'
  const [activeTab, setActiveTab] = useState<ExploreTab>(initialTab)

  const [activityFilter, setActivityFilter] = useState<ActivityType | ''>('')
  const [collectiveFilter, setCollectiveFilter] = useState<string>('')
  const [cancelTarget, setCancelTarget] = useState<string | null>(null)

  const { data: upcomingEvents, isLoading: upcomingLoading, isError: upcomingError, dataUpdatedAt, isFetching } = useMyEvents('upcoming')
  const upcomingShowLoading = useDelayedLoading(upcomingLoading)
  const cancelMutation = useCancelRegistration()

  const { data: invitedEvents, isLoading: invitedLoading } = useMyEvents('invited')
  const invitedShowLoading = useDelayedLoading(invitedLoading)

  const { data: discoverEvents, isLoading: discoverLoading, isError: discoverError } = useDiscoverEvents({
    activityType: activityFilter,
    collectiveId: collectiveFilter || undefined,
  })
  const discoverShowLoading = useDelayedLoading(discoverLoading)

  const { data: allCollectives = [], isLoading: collectivesLoading } = useCollectives()
  const collectivesShowLoading = useDelayedLoading(collectivesLoading)
  const { data: myCollectives } = useMyCollectives()


  const collectiveOptions = [
    { value: '', label: 'All collectives' },
    ...(allCollectives).map((c) => ({ value: c.id, label: c.name })),
  ]

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-events'] }),
      queryClient.invalidateQueries({ queryKey: ['discover-events'] }),
      queryClient.invalidateQueries({ queryKey: ['collectives'] }),
      queryClient.invalidateQueries({ queryKey: ['my-collectives'] }),
    ])
  }, [queryClient])

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return
    cancelMutation.mutate(cancelTarget, {
      onSuccess: () => toast.success('Registration cancelled'),
      onError: () => toast.error('Failed to cancel registration'),
    })
    setCancelTarget(null)
  }, [cancelTarget, cancelMutation, toast])

  return (
    <Page noBackground className="!px-0 bg-neutral-50">
      <div className="relative min-h-full">

        {/* ============================================================ */}
        {/*  Hero                                                         */}
        {/* ============================================================ */}
        <ExploreHero rm={!!shouldReduceMotion} />

        {/* ============================================================ */}
        {/*  Content on tinted bg                                         */}
        {/* ============================================================ */}
        <div className="relative z-10 -mt-1 bg-neutral-50">

          {/* Status bar */}
          <div className="flex items-center justify-end gap-1.5 px-4 lg:px-6 pt-1 pb-1">
            <OfflineIndicator dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} className="text-neutral-500" />
            <PendingSyncBadge />
          </div>

          {/* ── Tab toggle ── */}
          <div className="px-4 lg:px-6 mb-5">
            <SegmentedControl
              segments={[
                { id: 'events' as const, label: 'Events', icon: <Calendar size={15} /> },
                { id: 'collectives' as const, label: 'Collectives', icon: <Users size={15} /> },
              ]}
              value={activeTab}
              onChange={setActiveTab}
              variant="pill"
              aria-label="Browse events or collectives"
            />
          </div>

            <AnimatePresence mode="wait">

              {/* ======================================================== */}
              {/*  EVENTS TAB                                               */}
              {/* ======================================================== */}
              {activeTab === 'events' && (
                <motion.div
                  key="events-tab"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-7 pb-8"
                >
                  {/* ── Your Next Events ── */}
                  {upcomingError && !discoverError && (
                    <section className="px-4 lg:px-6">
                      <SectionHeader title="Your Next Events" />
                      <EmptyState illustration="error" title="Couldn't load your events" description="Pull down to try again." />
                    </section>
                  )}

                  {upcomingError && discoverError && (
                    <div className="px-4 lg:px-6">
                      <EmptyState illustration="error" title="Something went wrong" description="We couldn't load events." action={{ label: 'Try again', onClick: handleRefresh }} />
                    </div>
                  )}

                  {(upcomingShowLoading || (upcomingEvents && upcomingEvents.length > 0)) && (
                    <motion.section
                      className="px-4 lg:px-6"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.06 }}
                    >
                      <SectionHeader title="Your Next Events" count={upcomingEvents?.length} />
                      {upcomingShowLoading ? (
                        <EventListSkeleton />
                      ) : (
                        <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                          {upcomingEvents!.map((event) => (
                            <MyEventCard key={event.id} event={event} onCancel={(id) => setCancelTarget(id)} />
                          ))}
                        </motion.div>
                      )}
                    </motion.section>
                  )}

                  {/* ── Invited Events ── */}
                  {(invitedShowLoading || (invitedEvents && invitedEvents.length > 0)) && (
                    <motion.section
                      className="px-4 lg:px-6"
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 }}
                    >
                      <SectionHeader title="Invited" count={invitedEvents?.length} />
                      {invitedShowLoading ? <EventListSkeleton /> : (
                        <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                          {invitedEvents!.map((event) => <MyEventCard key={event.id} event={event} />)}
                        </motion.div>
                      )}
                    </motion.section>
                  )}

                  {/* ── Discover Events ── */}
                  <motion.section
                    className="px-4 lg:px-6"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.14 }}
                  >
                    <SectionHeader title="Discover Events" />

                    {/* Filters */}
                    <div className="flex items-center gap-2 mb-4">
                      <Filter size={14} className="text-neutral-400 shrink-0" />
                      <Dropdown
                        value={activityFilter}
                        onChange={(v) => setActivityFilter(v as ActivityType | '')}
                        options={[{ value: '', label: 'All types' }, ...ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
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
                    ) : discoverError ? (
                      <EmptyState illustration="error" title="Couldn't load events" description="Pull down to try again." />
                    ) : !discoverEvents || discoverEvents.length === 0 ? (
                      <EmptyState
                        illustration="empty"
                        title="No events found"
                        description={activityFilter || collectiveFilter ? 'Try different filters or check back soon.' : 'No upcoming events right now. Check back soon!'}
                        action={activityFilter || collectiveFilter
                          ? { label: 'Clear filters', onClick: () => { setActivityFilter(''); setCollectiveFilter('') } }
                          : { label: 'Browse collectives', onClick: () => setActiveTab('collectives') }
                        }
                      />
                    ) : (
                      <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                        {discoverEvents.map((event) => {
                          const meta = ACTIVITY_META[event.activity_type]
                          return (
                            <motion.div key={event.id} variants={shouldReduceMotion ? undefined : fadeUp}>
                              <Card
                                variant="event"
                                watermark={event.activity_type}
                                onClick={() => navigate(`/events/${event.id}`)}
                                aria-label={event.title}
                                className="bg-white shadow-sm border border-neutral-100 rounded-2xl"
                              >
                                <div className="relative">
                                  {event.cover_image_url ? (
                                    <Card.Image src={event.cover_image_url} alt={event.title} aspectRatio="2/1" />
                                  ) : (
                                    <div className="relative w-full overflow-hidden" style={{ aspectRatio: '2/1' }}>
                                      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-10', meta?.gradient ?? 'from-primary-400 to-moss-500')} />
                                      <div className="absolute inset-0 bg-neutral-50 flex items-center justify-center">
                                        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                                          <Leaf size={22} strokeWidth={2} className="text-neutral-300" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <Card.Badge position="top-left">
                                    <Badge variant="activity" activity={activityToBadge[event.activity_type] ?? 'workshop'} size="sm">
                                      {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
                                    </Badge>
                                  </Card.Badge>
                                </div>
                                <Card.Content>
                                  <Card.Title className="text-neutral-900">{event.title}</Card.Title>
                                  <Card.Meta className="text-neutral-500">
                                    <span className="flex items-center gap-1.5">
                                      <Calendar size={13} className="shrink-0 text-neutral-400" />
                                      <span className="font-semibold text-neutral-600">{formatEventDate(event.date_start)}</span>
                                    </span>
                                  </Card.Meta>
                                  {event.collectives && (
                                    <Card.Meta className="text-neutral-500">
                                      <span className="flex items-center gap-1.5">
                                        <Users size={13} className="shrink-0 text-neutral-400" />
                                        <span>{event.collectives.name}</span>
                                      </span>
                                    </Card.Meta>
                                  )}
                                  {event.address && (
                                    <Card.Meta className="text-neutral-500">
                                      <span className="flex items-center gap-1.5">
                                        <MapPin size={13} className="shrink-0 text-neutral-400" />
                                        <span className="line-clamp-1">{event.address}</span>
                                      </span>
                                    </Card.Meta>
                                  )}
                                </Card.Content>
                              </Card>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    )}
                  </motion.section>
                </motion.div>
              )}

              {/* ======================================================== */}
              {/*  COLLECTIVES TAB                                          */}
              {/* ======================================================== */}
              {activeTab === 'collectives' && (
                <motion.div
                  key="collectives-tab"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-7 pb-8"
                >
                  {/* ── Your Collectives ── */}
                  {myCollectives && myCollectives.length > 0 && (
                    <section className="px-4 lg:px-6">
                      <SectionHeader title="Your Collectives" count={myCollectives.length} />
                      <div className="flex gap-3.5 overflow-x-auto scrollbar-none -mx-4 px-4 lg:-mx-6 lg:px-6 pb-2">
                        {myCollectives.map((m, idx) => {
                          const c = m.collectives
                          if (!c) return null
                          return (
                            <motion.div
                              key={m.collective_id}
                              className="w-[220px] shrink-0"
                              initial={shouldReduceMotion ? false : { opacity: 0, x: 16 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.06, duration: 0.25 }}
                            >
                              <button
                                type="button"
                                onClick={() => navigate(`/collectives/${c.slug}`)}
                                className={cn(
                                  'w-full rounded-2xl bg-white overflow-hidden text-left',
                                  'shadow-sm',
                                  'border border-neutral-100',
                                  'active:scale-[0.98] transition-all duration-150 cursor-pointer select-none',
                                  'hover:shadow-md',
                                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                                )}
                              >
                                <div className="h-24 w-full relative overflow-hidden">
                                  {c.cover_image_url ? (
                                    <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                  ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
                                      <Users size={28} className="text-primary-200" />
                                    </div>
                                  )}
                                  {/* Scrim for role badge */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                                  <div className="absolute bottom-2 left-2.5">
                                    <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm text-[10px] font-bold text-primary-700 uppercase tracking-wide shadow-sm">
                                      {m.role?.replace(/_/g, ' ') ?? 'member'}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-3.5">
                                  <p className="text-sm font-semibold text-neutral-900 truncate">{c.name}</p>
                                  <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                                    <MapPin size={10} />
                                    {[c.region, c.state].filter(Boolean).join(', ')}
                                  </p>
                                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 text-xs font-semibold text-primary-600">
                                    <Users size={11} /> {c.member_count ?? 0} members
                                  </div>
                                </div>
                              </button>
                            </motion.div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {/* ── Find a Collective Map ── */}
                  <section className="px-4 lg:px-6">
                    <SectionHeader title="Find a Collective" />
                    <div className="rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
                      <CollectiveMap className="h-[75vh] min-h-[500px]" />
                    </div>
                  </section>

                  {/* ── All Collectives ── */}
                  <section className="px-4 lg:px-6">
                    <SectionHeader title="All Collectives" count={allCollectives.length} />
                    {collectivesShowLoading ? (
                      <div className="space-y-3">
                        {Array.from({ length: 6 }, (_, i) => (
                          <div key={i} className="rounded-2xl bg-white border border-neutral-100 shadow-sm overflow-hidden animate-pulse h-[5.5rem]" />
                        ))}
                      </div>
                    ) : allCollectives.length === 0 ? (
                      <EmptyState illustration="wildlife" title="No collectives yet" description="Collectives are being set up across Australia. Check back soon!" />
                    ) : (
                      <div className="space-y-3">
                        {allCollectives.map((collective, i) => (
                          <motion.div
                            key={collective.id}
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                          >
                            <CollectiveCard collective={collective} onClick={() => navigate(`/collectives/${collective.slug}`)} />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>

                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>

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
