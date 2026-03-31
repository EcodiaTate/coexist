import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Calendar, MapPin, Users, X, Leaf, Filter, ChevronRight,
  TreePine, Waves, Sprout, Compass, Bird, Flower2,
  GraduationCap, Droplets, CircleDot,
  ArrowRight, Heart, TrendingUp,
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
import { useNationalImpact } from '@/hooks/use-impact'
import {
  Page,
  Card,
  Badge, EmptyState, ConfirmationSheet, Dropdown, CountUp, Skeleton,
} from '@/components'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { activityToBadge, ACTIVITY_META } from '@/lib/activity-types'
import { adminStagger as stagger, fadeUp } from '@/lib/admin-motion'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { OfflineIndicator } from '@/components/offline-indicator'
import { PendingSyncBadge } from '@/components/pending-sync-badge'
import { CollectiveMap } from '@/components/collective-map'

type ActivityType = Database['public']['Enums']['activity_type']

/* ------------------------------------------------------------------ */
/*  Simple hero stats (lightweight fallback)                           */
/* ------------------------------------------------------------------ */

function useHeroStats() {
  return useQuery({
    queryKey: ['hero-stats'],
    queryFn: async () => {
      const [profilesRes, collectivesRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }).eq('is_active', true),
      ])
      // Sum trees_planted from event_impact (simple aggregate)
      const { data: impactData } = await supabase
        .from('event_impact')
        .select('trees_planted')
        .range(0, 9999)
      const treesPlanted = (impactData ?? []).reduce((sum, r) => sum + (Number(r.trees_planted) || 0), 0)

      return {
        totalMembers: profilesRes.count ?? 0,
        collectivesCount: collectivesRes.count ?? 0,
        treesPlanted,
      }
    },
    staleTime: 10 * 60 * 1000,
  })
}


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
/*  Bento category cards                                               */
/* ------------------------------------------------------------------ */

const BENTO_CATEGORIES: {
  key: ActivityType
  label: string
  tagline: string
  icon: React.ReactNode
  gradient: string
  span?: 'wide'
}[] = [
  { key: 'shore_cleanup',       label: 'Shore Cleanup',       tagline: 'Protect our coastlines',  icon: <Waves size={20} />,    gradient: 'from-sky-500 via-sky-400 to-moss-500',           span: 'wide' },
  { key: 'tree_planting',       label: 'Tree Planting',       tagline: 'Plant native species',    icon: <TreePine size={20} />, gradient: 'from-success-600 via-success-500 to-primary-500' },
  { key: 'marine_restoration',  label: 'Marine Restoration',  tagline: 'Restore ocean habitats',  icon: <Droplets size={20} />, gradient: 'from-primary-600 via-primary-500 to-moss-500' },
  { key: 'nature_walk',         label: 'Nature Walks',        tagline: 'Explore & connect',       icon: <Compass size={20} />,  gradient: 'from-bark-600 via-bark-500 to-warning-500',      span: 'wide' },
  { key: 'land_regeneration',   label: 'Land Regen',          tagline: 'Restore native habitat',  icon: <Sprout size={20} />,   gradient: 'from-sprout-600 via-sprout-500 to-success-500' },
  { key: 'camp_out',            label: 'Camp Outs',           tagline: 'Under the stars',         icon: <Bird size={20} />,     gradient: 'from-moss-600 via-moss-500 to-primary-500' },
]

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

function ExploreHero({ rm, nationalImpact }: { rm: boolean; nationalImpact?: { totalMembers: number; treesPlanted: number; collectivesCount: number; rubbishCollectedTonnes: number } }) {
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

        {/* Impact bento grid */}
        <motion.div
          className="grid grid-cols-3 gap-2.5 mt-7"
          initial={rm ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {[
            { value: nationalImpact?.totalMembers ?? 0, suffix: '+', label: 'Volunteers', icon: <Users size={15} />, color: 'from-white/[0.12] to-white/[0.04]' },
            { value: nationalImpact?.treesPlanted ?? 0, suffix: '+', label: 'Trees Planted', icon: <TreePine size={15} />, color: 'from-sprout-400/20 to-sprout-400/5' },
            { value: nationalImpact?.collectivesCount ?? 0, suffix: '', label: 'Collectives', icon: <Heart size={15} />, color: 'from-white/[0.12] to-white/[0.04]' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className={cn(
                'rounded-2xl bg-gradient-to-br border border-white/10 p-3',
                stat.color,
              )}
              initial={rm ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.35 }}
            >
              <span className="text-sprout-300 block mb-1.5">{stat.icon}</span>
              <span className="text-xl font-bold text-white tabular-nums block leading-none">
                <CountUp end={stat.value} duration={1200} />{stat.suffix}
              </span>
              <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-1 block">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Wave transition into content bg */}
      <div className="relative z-20 mt-2">
        <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-8 sm:h-10 block" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z"
            className="fill-neutral-50"
          />
        </svg>
      </div>
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

  const { data: nationalImpact } = useNationalImpact()
  const { data: heroStats } = useHeroStats()

  // Use nationalImpact if available, fall back to simple hero stats
  const heroData = nationalImpact ?? heroStats

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
        <ExploreHero rm={!!shouldReduceMotion} nationalImpact={heroData} />

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
            <div className="flex rounded-2xl bg-white/80 border border-neutral-200/50 p-1 shadow-sm">
              {(['events', 'collectives'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 min-h-11 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer select-none',
                    activeTab === tab
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-neutral-500 hover:text-neutral-700',
                  )}
                >
                  {tab === 'events' ? <Calendar size={15} /> : <Users size={15} />}
                  {tab === 'events' ? 'Events' : 'Collectives'}
                </button>
              ))}
            </div>
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

                  {/* ── Bento Category Grid ── */}
                  <motion.section
                    className="px-4 lg:px-6"
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.12 }}
                  >
                    <SectionHeader title="Browse by Activity" />
                    <div className="grid grid-cols-2 gap-3">
                      {BENTO_CATEGORIES.map((cat, i) => (
                        <motion.button
                          key={cat.key}
                          type="button"
                          onClick={() => setActivityFilter(activityFilter === cat.key ? '' : cat.key)}
                          whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                          className={cn(
                            'relative overflow-hidden rounded-2xl text-left cursor-pointer select-none',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2',
                            'transition-all duration-200',
                            cat.span === 'wide' ? 'col-span-2' : '',
                            activityFilter === cat.key
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-50 shadow-xl scale-[1.01]'
                              : 'shadow-md',
                          )}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.08 + i * 0.04, duration: 0.3 }}
                          aria-pressed={activityFilter === cat.key}
                        >
                          <div className={cn(
                            'bg-gradient-to-br p-4',
                            cat.gradient,
                            cat.span === 'wide' ? 'min-h-[80px]' : 'min-h-[100px]',
                          )}>
                            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm text-white mb-2">
                              {cat.icon}
                            </span>
                            <span className="text-sm font-bold text-white block leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
                              {cat.label}
                            </span>
                            <span className="text-[11px] font-medium text-white/70 mt-0.5 block">
                              {cat.tagline}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.section>

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
                                      {m.role.replace(/_/g, ' ')}
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
                      <CollectiveMap className="h-[50vh] min-h-[320px]" />
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

                  {/* ── Impact Stats ── */}
                  <section className="mx-4 lg:mx-6 rounded-2xl overflow-hidden shadow-sm border border-neutral-100">
                    <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 px-5 py-6 lg:px-8">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={14} className="text-sprout-300" />
                        <h3 className="text-xs font-bold text-sprout-300/80 uppercase tracking-wider">Our Collective Impact</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: heroData?.treesPlanted ?? 0, suffix: '+', label: 'Trees Planted', icon: <TreePine size={16} />, bg: 'from-success-400/20 to-success-400/5', iconColor: 'text-success-300' },
                          { value: nationalImpact?.rubbishCollectedTonnes ?? 0, suffix: 't', label: 'Rubbish Collected', icon: <Waves size={16} />, bg: 'from-sky-400/20 to-sky-400/5', iconColor: 'text-sky-300' },
                          { value: heroData?.totalMembers ?? 0, suffix: '+', label: 'Volunteers', icon: <Users size={16} />, bg: 'from-white/[0.12] to-white/[0.04]', iconColor: 'text-white/70' },
                          { value: heroData?.collectivesCount ?? 0, suffix: '', label: 'Collectives', icon: <Heart size={16} />, bg: 'from-sprout-400/20 to-sprout-400/5', iconColor: 'text-sprout-300' },
                        ].map((stat, i) => (
                          <motion.div
                            key={stat.label}
                            className={cn('rounded-xl bg-gradient-to-br border border-white/10 p-3.5', stat.bg)}
                            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
                          >
                            <span className={cn('block mb-1.5', stat.iconColor)}>{stat.icon}</span>
                            <span className="text-xl font-bold text-white tabular-nums block leading-none">
                              <CountUp end={stat.value} duration={1400} />{stat.suffix}
                            </span>
                            <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-1 block">{stat.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
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
