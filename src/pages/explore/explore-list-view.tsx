import { type RefObject, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MapIcon,
  List,
  SlidersHorizontal,
  Calendar,
  Users,
  TreePine,
  Waves,
  Sprout,
  Flower2,
  GraduationCap,
  Bird,
  Droplets,
  CircleDot,
  MapPin,
  Compass,
  ArrowRight,
  Heart,
  TrendingUp,
} from 'lucide-react'
import type { Database } from '@/types/database.types'

type ActivityType = Database['public']['Enums']['activity_type']
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-home-feed'
import {
  Card,
  Badge,
  Skeleton,
  EmptyState,
  Button,
  CountUp,
} from '@/components'
import { SearchBar } from '@/components/search-bar'
import { CollectiveMap } from '@/components/collective-map'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */

type ViewMode = 'map' | 'list'

type BadgeActivity =
  | 'shore-cleanup'
  | 'tree-planting'
  | 'land-regeneration'
  | 'nature-walk'
  | 'camp-out'
  | 'retreat'
  | 'film-screening'
  | 'marine-restoration'
  | 'workshop'

const activityTypeToBadge: Record<string, BadgeActivity> = {
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

const ACTIVITY_META: Record<string, {
  icon: ReactNode
  iconLg: ReactNode
  bg: string
  bgSolid: string
  text: string
  ring: string
  gradient: string
}> = {
  shore_cleanup: {
    icon: <Waves size={16} />,
    iconLg: <Waves size={22} />,
    bg: 'bg-sky-50', bgSolid: 'bg-sky-500', text: 'text-sky-700',
    ring: 'ring-sky-300', gradient: 'from-sky-400 to-moss-500',
  },
  tree_planting: {
    icon: <TreePine size={16} />,
    iconLg: <TreePine size={22} />,
    bg: 'bg-success-50', bgSolid: 'bg-success-500', text: 'text-success-700',
    ring: 'ring-success-300', gradient: 'from-success-400 to-primary-500',
  },
  land_regeneration: {
    icon: <Sprout size={16} />,
    iconLg: <Sprout size={22} />,
    bg: 'bg-sprout-50', bgSolid: 'bg-sprout-500', text: 'text-sprout-700',
    ring: 'ring-sprout-300', gradient: 'from-sprout-400 to-success-500',
  },
  nature_walk: {
    icon: <Compass size={16} />,
    iconLg: <Compass size={22} />,
    bg: 'bg-bark-50', bgSolid: 'bg-bark-500', text: 'text-bark-700',
    ring: 'ring-bark-300', gradient: 'from-bark-400 to-bark-500',
  },
  camp_out: {
    icon: <Bird size={16} />,
    iconLg: <Bird size={22} />,
    bg: 'bg-moss-50', bgSolid: 'bg-moss-500', text: 'text-moss-700',
    ring: 'ring-moss-300', gradient: 'from-moss-400 to-primary-500',
  },
  retreat: {
    icon: <Flower2 size={16} />,
    iconLg: <Flower2 size={22} />,
    bg: 'bg-plum-50', bgSolid: 'bg-plum-500', text: 'text-plum-700',
    ring: 'ring-plum-300', gradient: 'from-plum-400 to-plum-500',
  },
  film_screening: {
    icon: <GraduationCap size={16} />,
    iconLg: <GraduationCap size={22} />,
    bg: 'bg-coral-50', bgSolid: 'bg-coral-500', text: 'text-coral-700',
    ring: 'ring-coral-300', gradient: 'from-coral-400 to-coral-500',
  },
  marine_restoration: {
    icon: <Droplets size={16} />,
    iconLg: <Droplets size={22} />,
    bg: 'bg-primary-50', bgSolid: 'bg-primary-500', text: 'text-primary-700',
    ring: 'ring-primary-300', gradient: 'from-primary-400 to-moss-500',
  },
  workshop: {
    icon: <CircleDot size={16} />,
    iconLg: <CircleDot size={22} />,
    bg: 'bg-bark-50', bgSolid: 'bg-bark-500', text: 'text-bark-700',
    ring: 'ring-bark-300', gradient: 'from-bark-400 to-warning-500',
  },
}

const CATEGORY_CARDS: { key: ActivityType; label: string; description: string; icon: ReactNode; gradient: string; iconBg: string; iconText: string }[] = [
  {
    key: 'shore_cleanup',
    label: 'Shore Cleanup',
    description: 'Protect our coastlines',
    icon: <Waves size={18} />,
    gradient: 'from-sky-500 to-moss-600',
    iconBg: 'bg-sky-100',
    iconText: 'text-sky-600',
  },
  {
    key: 'tree_planting',
    label: 'Tree Planting',
    description: 'Plant native species',
    icon: <TreePine size={18} />,
    gradient: 'from-success-500 to-primary-600',
    iconBg: 'bg-success-100',
    iconText: 'text-success-600',
  },
  {
    key: 'marine_restoration',
    label: 'Marine Restoration',
    description: 'Restore ocean habitats',
    icon: <Droplets size={18} />,
    gradient: 'from-primary-500 to-moss-600',
    iconBg: 'bg-primary-100',
    iconText: 'text-primary-600',
  },
  {
    key: 'nature_walk',
    label: 'Nature Walks',
    description: 'Explore & connect',
    icon: <Compass size={18} />,
    gradient: 'from-bark-500 to-warning-600',
    iconBg: 'bg-bark-100',
    iconText: 'text-bark-600',
  },
]

/* ------------------------------------------------------------------ */
/*  Animation variants                                                  */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                      */
/* ------------------------------------------------------------------ */

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatActivityType(type: ActivityType): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface NearbyEvent {
  id: string
  title: string
  date_start: string
  activity_type: ActivityType
  cover_image_url: string | null
  location_point: unknown
  collectives: { id: string; name: string } | null
}

interface NearbyCollective {
  id: string
  name: string
  slug: string
  region: string | null
  state: string | null
  member_count: number | null
  location_point: unknown
}

interface NationalImpactData {
  totalMembers: number
  treesPlanted: number
  collectivesCount: number
  rubbishCollectedTonnes: number
}

export interface ExploreListViewProps {
  searchInputRef: RefObject<HTMLInputElement | null>
  query: string
  setQuery: (q: string) => void
  commitSearch: (term: string) => void
  openFilters: () => void
  activeFilterCount: number
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  filters: { activityTypes: ActivityType[] }
  toggleActivityFilter: (type: ActivityType) => void
  nearbyEventsData: NearbyEvent[] | undefined
  nearbyEventsLoading: boolean
  nationalEventsData?: NearbyEvent[] | undefined
  nearbyCollectivesData: NearbyCollective[] | undefined
  nearbyCollectivesLoading: boolean
  showLoading: boolean
  nationalImpact: NationalImpactData | undefined
  onNavigate: (path: string) => void
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function ExploreListView({
  searchInputRef,
  query,
  setQuery,
  commitSearch,
  openFilters,
  activeFilterCount,
  viewMode,
  setViewMode,
  filters,
  toggleActivityFilter,
  nearbyEventsData,
  nearbyEventsLoading,
  nationalEventsData,
  nearbyCollectivesData,
  nearbyCollectivesLoading,
  showLoading,
  nationalImpact,
  onNavigate,
}: ExploreListViewProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className="space-y-0"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ======== Hero Banner ======== */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-700">
          <div className="relative px-6 lg:px-10" style={{ paddingTop: '2rem' }}>
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <h2 className="text-[1.75rem] font-bold text-white leading-tight mb-2">
                Explore. Connect.<br />Protect.
              </h2>
              <p className="text-[0.9375rem] text-white/70 max-w-[300px] leading-relaxed">
                Find conservation events, join local collectives, and make a real difference.
              </p>
            </motion.div>

            {/* Impact mini-stats */}
            <motion.div
              className="flex gap-5 mt-6"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {[
                { value: nationalImpact?.totalMembers ?? 0, label: 'Volunteers', icon: <Users size={14} /> },
                { value: nationalImpact?.treesPlanted ?? 0, label: 'Trees Planted', icon: <TreePine size={14} /> },
                { value: nationalImpact?.collectivesCount ?? 0, label: 'Collectives', icon: <Heart size={14} /> },
              ].map((stat) => (
                <div key={stat.label} className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-sprout-300">{stat.icon}</span>
                    <span className="text-lg font-bold text-white tabular-nums">
                      <CountUp end={stat.value} duration={1200} />
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
                    {stat.label}
                  </span>
                </div>
              ))}
            </motion.div>

            {/* Search bar + filter + view toggle inside hero */}
            <motion.div
              className="flex items-center gap-2.5 mt-7 pb-7"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <SearchBar
                ref={searchInputRef}
                value={query}
                onChange={setQuery}
                onSubmit={commitSearch}
                placeholder="Search events, collectives, people..."
                aria-label="Search"
                className="flex-1 min-w-0 [&_input]:bg-white/15 [&_input]:text-white [&_input]:placeholder-white/50 [&_input]:border-white/20 "
              />

              {/* Filter button */}
              <motion.button
                type="button"
                onClick={openFilters}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                className={cn(
                  'relative flex items-center justify-center min-h-11 min-w-11 rounded-xl shrink-0',
                  'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                  'bg-white/15 text-white/80 border border-white/20',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                )}
                aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
              >
                <SlidersHorizontal size={18} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-white text-primary-700 text-[10px] font-bold shadow-sm">
                    {activeFilterCount}
                  </span>
                )}
              </motion.button>

              {/* View toggle */}
              <div className="flex rounded-xl overflow-hidden shrink-0 border border-white/20">
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={cn(
                    'flex items-center justify-center min-h-11 min-w-11',
                    'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                    viewMode === 'map'
                      ? 'bg-white text-primary-700'
                      : 'bg-white/10 text-white/60',
                  )}
                  aria-label="Map view"
                  aria-pressed={viewMode === 'map'}
                >
                  <MapIcon size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center justify-center min-h-11 min-w-11',
                    'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                    viewMode === 'list'
                      ? 'bg-white text-primary-700'
                      : 'bg-white/10 text-white/60',
                  )}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List size={16} />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ======== Collective Map ======== */}
      <motion.div variants={fadeUp} className="mb-6 px-4 lg:px-6">
        <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-3">
          Find a Collective
        </h3>
        <CollectiveMap className="h-[calc(100vh-6rem)] min-h-[560px]" />
      </motion.div>


      {/* ======== Popular Categories Grid ======== */}
      <motion.div variants={fadeUp} className="mb-6 px-4 lg:px-6">
        <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-3">
          Popular Categories
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORY_CARDS.map((cat, i) => (
            <motion.button
              key={cat.key}
              type="button"
              onClick={() => toggleActivityFilter(cat.key)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
              className={cn(
                'relative overflow-hidden rounded-2xl bg-white border border-neutral-100 p-4 text-left min-h-[100px]',
                'cursor-pointer select-none transition-shadow duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                filters.activityTypes.includes(cat.key)
                  ? 'ring-2 ring-primary-400 shadow-lg'
                  : 'shadow-sm',
              )}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
              aria-label={cat.label}
              aria-pressed={filters.activityTypes.includes(cat.key)}
            >
              {/* Top gradient stripe */}
              <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', cat.gradient)} aria-hidden="true" />
              {/* Content */}
              <div className="relative">
                <span className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl mb-2',
                  cat.iconBg,
                  cat.iconText,
                )}>
                  {cat.icon}
                </span>
                <span className="text-sm font-semibold text-primary-800 block leading-tight">
                  {cat.label}
                </span>
                <span className="text-[11px] font-medium text-primary-400 mt-0.5 block">
                  {cat.description}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ======== National Events (retreats, campouts) ======== */}
      {nationalEventsData && nationalEventsData.length > 0 && (
        <motion.div variants={fadeUp} className="mb-6">
          <div className="flex items-center justify-between mb-3 px-4 lg:px-6">
            <h3 className="text-xs font-semibold text-moss-600 uppercase tracking-wider">
              Retreats & National Events
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
            {nationalEventsData.map((event, idx) => {
              const meta = ACTIVITY_META[event.activity_type] ?? ACTIVITY_META.other
              return (
                <motion.div
                  key={event.id}
                  className="w-[80vw] max-w-[300px] shrink-0"
                  initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                >
                  <Card.Root
                    variant="event"
                    onClick={() => onNavigate(`/events/${event.id}`)}
                    aria-label={event.title}
                    watermark={event.activity_type}
                    className="h-full"
                  >
                    {event.cover_image_url ? (
                      <Card.Overlay
                        src={event.cover_image_url}
                        alt={event.title}
                        aspectRatio="16/9"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-moss-500/80 text-white">
                            National
                          </span>
                        </div>
                        <p className="font-heading text-sm font-semibold text-white truncate">{event.title}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-white/70">
                          <span className="flex items-center gap-1"><Calendar size={11} />{new Date(event.date_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                          {event.address && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{event.address}</span>}
                        </div>
                      </Card.Overlay>
                    ) : (
                      <div className={`bg-gradient-to-br ${meta.gradient} p-4`} style={{ aspectRatio: '16/9' }}>
                        <div className="flex flex-col justify-end h-full">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white/20 text-white">
                              National
                            </span>
                          </div>
                          <p className="font-heading text-sm font-semibold text-white truncate">{event.title}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-white/50">
                            <span className="flex items-center gap-1"><Calendar size={11} />{new Date(event.date_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</span>
                            {event.address && <span className="flex items-center gap-1 truncate"><MapPin size={11} />{event.address}</span>}
                          </div>
                        </div>
                      </div>
                    )}
                  </Card.Root>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* ======== Featured / Nearby Events ======== */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="flex items-center justify-between mb-3 px-4 lg:px-6">
          <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
            Nearby Events
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('/events')}
            className="flex items-center gap-1 text-xs font-semibold text-primary-500 min-h-11 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {nearbyEventsLoading && showLoading ? (
          <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[75vw] max-w-[260px] shrink-0">
                <Card.Skeleton />
              </div>
            ))}
          </div>
        ) : nearbyEventsData && nearbyEventsData.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
            {nearbyEventsData.map((event, idx) => {
                const meta = ACTIVITY_META[event.activity_type] ?? ACTIVITY_META.other
                return (
                  <motion.div
                    key={event.id}
                    className="w-[75vw] max-w-[260px] shrink-0"
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06, duration: 0.3 }}
                  >
                    {event.cover_image_url ? (
                      <Card.Root
                        variant="event"
                        onClick={() => onNavigate(`/events/${event.id}`)}
                        aria-label={event.title}
                        watermark={event.activity_type}
                        className="h-full"
                      >
                        <Card.Overlay
                          src={event.cover_image_url}
                          alt={event.title}
                          aspectRatio="16/10"
                        >
                          <Card.Badge position="top-left">
                            <Badge
                              variant="activity"
                              activity={activityTypeToBadge[event.activity_type] ?? 'restoration'}
                              size="sm"
                            >
                              {formatActivityType(event.activity_type)}
                            </Badge>
                          </Card.Badge>
                          <div>
                            <Card.Title className="text-sm text-white line-clamp-2">
                              {event.title}
                            </Card.Title>
                            <Card.Meta className="text-xs text-white/70 flex items-center gap-1.5 mt-1">
                              <Calendar size={12} aria-hidden="true" />
                              {formatEventDate(event.date_start)}
                            </Card.Meta>
                            {event.collectives && (
                              <Card.Meta className="text-xs text-white/70 flex items-center gap-1.5 mt-0.5">
                                <Users size={12} aria-hidden="true" />
                                {event.collectives.name}
                              </Card.Meta>
                            )}
                          </div>
                        </Card.Overlay>
                      </Card.Root>
                    ) : (
                      <Card.Root
                        variant="event"
                        onClick={() => onNavigate(`/events/${event.id}`)}
                        aria-label={event.title}
                        watermark={event.activity_type}
                        className="h-full bg-white border border-neutral-100"
                      >
                        {/* Gradient accent bar */}
                        <div className={cn(
                          'h-1 w-full bg-gradient-to-r',
                          meta.gradient,
                        )} aria-hidden="true" />

                        <Card.Content className="p-3">
                          <div className="mb-2">
                            <Badge
                              variant="activity"
                              activity={activityTypeToBadge[event.activity_type] ?? 'restoration'}
                              size="sm"
                            >
                              {formatActivityType(event.activity_type)}
                            </Badge>
                          </div>
                          <Card.Title className="text-sm line-clamp-2">
                            {event.title}
                          </Card.Title>
                          <Card.Meta className="text-xs flex items-center gap-1.5 mt-1">
                            <Calendar size={12} aria-hidden="true" />
                            {formatEventDate(event.date_start)}
                          </Card.Meta>
                          {event.collectives && (
                            <Card.Meta className="text-xs flex items-center gap-1.5 mt-0.5">
                              <Users size={12} aria-hidden="true" />
                              {event.collectives.name}
                            </Card.Meta>
                          )}
                        </Card.Content>
                      </Card.Root>
                    )}
                  </motion.div>
                )
              })}
          </div>
        ) : (
          <EmptyState
            illustration="empty"
            title="No nearby events"
            description="Try expanding your search radius or check back later"
            action={{ label: 'View All Events', to: '/events' }}
            className="min-h-[160px] py-4 px-4 lg:px-6"
          />
        )}
      </motion.div>

      {/* ======== Impact Stats Strip ======== */}
      <motion.div variants={fadeUp} className="mb-6">
        <div className="bg-gradient-to-r from-primary-50 via-sprout-50 to-sky-50 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-primary-500" />
            <h3 className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
              Our Collective Impact
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: nationalImpact?.treesPlanted ?? 0, suffix: '+', label: 'Trees Planted', icon: <TreePine size={16} />, iconBg: 'bg-success-100', iconColor: 'text-success-600' },
              { value: nationalImpact?.rubbishCollectedTonnes ?? 0, suffix: 't', label: 'Rubbish Collected', icon: <Waves size={16} />, iconBg: 'bg-sky-100', iconColor: 'text-sky-600' },
              { value: nationalImpact?.totalMembers ?? 0, suffix: '+', label: 'Volunteers', icon: <Users size={16} />, iconBg: 'bg-plum-100', iconColor: 'text-plum-600' },
              { value: nationalImpact?.collectivesCount ?? 0, suffix: '', label: 'Collectives', icon: <Heart size={16} />, iconBg: 'bg-coral-100', iconColor: 'text-coral-600' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="rounded-xl bg-white p-3 shadow-sm border border-neutral-100"
                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
              >
                <div className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-lg mb-1.5',
                  stat.iconBg,
                )}>
                  <span className={stat.iconColor}>{stat.icon}</span>
                </div>
                <span className="text-lg font-bold text-primary-800 tabular-nums block">
                  <CountUp end={stat.value} duration={1400} />{stat.suffix}
                </span>
                <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wider">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ======== Collectives ======== */}
      <motion.div variants={fadeUp} className="mb-6 px-4 lg:px-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
            Collectives Near You
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('/explore?tab=collectives')}
            className="flex items-center gap-1 text-xs font-semibold text-primary-500 min-h-11 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
          >
            View all <ArrowRight size={12} />
          </button>
        </div>

        {nearbyCollectivesLoading && showLoading ? (
          <Skeleton variant="list-item" count={3} />
        ) : nearbyCollectivesData && nearbyCollectivesData.length > 0 ? (
          <div className="space-y-3">
            {nearbyCollectivesData.map((c, idx) => (
              <motion.div
                key={c.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06, duration: 0.25 }}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onNavigate(`/collectives/${c.slug}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onNavigate(`/collectives/${c.slug}`)
                    }
                  }}
                  aria-label={c.name}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl bg-white',
                    'border border-neutral-100 shadow-sm',
                    'cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
                    'active:scale-[0.98] transition-transform duration-150',
                  )}
                >
                  {/* Icon */}
                  <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-50 text-primary-500 shrink-0">
                    <TreePine size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-primary-400 flex items-center gap-1">
                      <MapPin size={10} aria-hidden="true" />
                      {[c.region, c.state]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                  {/* Member count pill */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary-50 shrink-0">
                    <Users size={12} className="text-primary-400" />
                    <span className="text-xs font-semibold text-primary-600 tabular-nums">
                      {c.member_count}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            illustration="wildlife"
            title="No collectives nearby"
            description="Expand your search or browse all collectives nationally"
            action={{ label: 'Browse All Collectives', to: '/explore?tab=collectives' }}
            className="min-h-[160px] py-4"
          />
        )}
      </motion.div>

      {/* ======== Join the Movement CTA ======== */}
      <motion.div variants={fadeUp}>
        <div className="relative overflow-hidden bg-gradient-to-br from-secondary-700 via-primary-700 to-primary-600 px-6 pt-10 lg:px-10"
          style={{ paddingBottom: 'calc(var(--safe-bottom) + 3.5rem)' }}
        >
          <div className="relative">
            <h3 className="text-xl font-bold text-white mb-2">
              Join the Movement
            </h3>
            <p className="text-[0.9375rem] text-white/60 mb-6 max-w-[300px] leading-relaxed">
              5,500+ young Australians are already making a difference. Find your local collective and start today.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => onNavigate('/explore?tab=collectives')}
              className="bg-white text-primary-700 hover:bg-white/90 shadow-lg"
            >
              Find a Collective
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
