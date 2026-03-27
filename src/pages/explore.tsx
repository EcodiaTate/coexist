import { useState, useCallback, useRef, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  X,
  MapPin,
  CalendarRange,
  Compass,
  Clock,
  Calendar,
  Users,
  Waves,
  TreePine,
  Sprout,
  Flower2,
  GraduationCap,
  Bird,
  Droplets,
  CircleDot,
  SlidersHorizontal,
} from 'lucide-react'
import {
  useSearch,
  type SearchFilters,
} from '@/hooks/use-search'
import type { Database } from '@/types/database.types'

type ActivityType = Database['public']['Enums']['activity_type']
import { useNearbyEvents, useNearbyCollectives, useUserLocation, AU_STATES } from '@/hooks/use-nearby'
import { useNationalImpact } from '@/hooks/use-impact'
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-home-feed'
import {
  Page,
  Card,
  Avatar,
  Chip,
  Badge,
  Skeleton,
  EmptyState,
} from '@/components'
import { SearchBar } from '@/components/search-bar'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { FilterSheet } from './explore/filter-sheet'
import { ExploreMapView } from './explore/explore-map-view'
import { ExploreListView } from './explore/explore-list-view'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type ViewMode = 'map' | 'list'
type ResultTab = 'all' | 'events' | 'collectives' | 'people'

const RESULT_TABS: { key: ResultTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'events', label: 'Events' },
  { key: 'collectives', label: 'Collectives' },
  { key: 'people', label: 'People' },
]

/* ------------------------------------------------------------------ */
/*  Activity icon + color mapping                                      */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Badge activity key mapping                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
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
/*  Explore page                                                       */
/* ------------------------------------------------------------------ */

export default function ExplorePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [resultTab, setResultTab] = useState<ResultTab>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  // Filters
  const [filters, setFilters] = useState<SearchFilters>({
    activityTypes: searchParams.get('activity')
      ? [searchParams.get('activity')! as ActivityType]
      : [],
    dateFrom: null,
    dateTo: null,
    distanceKm: 50,
    state: null,
  })

  // Draft filters (edited in sheet, applied on confirm)
  const [draftFilters, setDraftFilters] = useState<SearchFilters>(filters)

  const activeFilterCount = [
    filters.activityTypes.length > 0,
    filters.dateFrom || filters.dateTo,
    filters.state,
    filters.distanceKm !== 50,
  ].filter(Boolean).length

  // Search hook
  const {
    query,
    setQuery,
    results,
    totalResults,
    recentSearches,
    commitSearch,
    clearRecentSearches,
    removeRecentSearch,
    hasQuery,
  } = useSearch(filters)

  // Location & nearby data (for default view)
  const { data: userLocation } = useUserLocation()
  const nearbyEvents = useNearbyEvents(
    userLocation ?? null,
    filters.distanceKm,
    filters.activityTypes.length ? filters.activityTypes : undefined,
  )
  const nearbyCollectives = useNearbyCollectives(
    userLocation ?? null,
    filters.distanceKm,
  )

  const initialLoading = results.isLoading || nearbyEvents.isLoading || nearbyCollectives.isLoading
  const showLoading = useDelayedLoading(initialLoading)

  // National impact stats (for hero)
  const { data: nationalImpact } = useNationalImpact()

  // Filter actions
  const toggleActivityFilter = useCallback(
    (type: ActivityType) => {
      setFilters((f) => ({
        ...f,
        activityTypes: f.activityTypes.includes(type)
          ? f.activityTypes.filter((t) => t !== type)
          : [...f.activityTypes, type],
      }))
    },
    [],
  )

  const toggleDraftActivityFilter = useCallback(
    (type: ActivityType) => {
      setDraftFilters((f) => ({
        ...f,
        activityTypes: f.activityTypes.includes(type)
          ? f.activityTypes.filter((t) => t !== type)
          : [...f.activityTypes, type],
      }))
    },
    [],
  )

  const clearAllFilters = useCallback(() => {
    const cleared: SearchFilters = {
      activityTypes: [],
      dateFrom: null,
      dateTo: null,
      distanceKm: 50,
      state: null,
    }
    setFilters(cleared)
    setDraftFilters(cleared)
  }, [])

  const applyDraftFilters = useCallback(() => {
    setFilters(draftFilters)
    setFilterOpen(false)
  }, [draftFilters])

  const openFilters = useCallback(() => {
    setDraftFilters(filters)
    setFilterOpen(true)
  }, [filters])

  const handleSearchSubmit = useCallback(
    (term: string) => {
      setQuery(term)
      commitSearch(term)
    },
    [setQuery, commitSearch],
  )

  // Draft filter summaries for accordion subtitles
  const draftActivitySummary = draftFilters.activityTypes.length > 0
    ? draftFilters.activityTypes.map((t) => formatActivityType(t)).join(', ')
    : undefined
  const draftStateSummary = draftFilters.state
    ? AU_STATES.find((s) => s.value === draftFilters.state)?.label
    : undefined
  const draftDateSummary = draftFilters.dateFrom || draftFilters.dateTo
    ? [draftFilters.dateFrom, draftFilters.dateTo].filter(Boolean).join(' – ')
    : undefined
  const draftDistanceSummary = draftFilters.distanceKm !== 50
    ? `${draftFilters.distanceKm} km`
    : undefined

  const draftFilterCount = [
    draftFilters.activityTypes.length > 0,
    draftFilters.dateFrom || draftFilters.dateTo,
    draftFilters.state,
    draftFilters.distanceKm !== 50,
  ].filter(Boolean).length

  // Determine what to show
  const showSearchResults = hasQuery
  const showDefaultBrowse = !hasQuery

  return (
    <Page className="!px-0 !pb-0 bg-white">
      <div className="flex flex-col flex-1 min-h-0">

        {/* ============================================================ */}
        {/*  Active filter chips                                          */}
        {/* ============================================================ */}
        {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5 pb-2 px-4 lg:px-6 overflow-x-auto scrollbar-none">
            {/* Active filter chips */}
            {filters.activityTypes.map((type) => {
              const meta = ACTIVITY_META[type] ?? ACTIVITY_META.other
              return (
                <Chip
                  key={type}
                  label={formatActivityType(type)}
                  icon={meta.icon}
                  selected
                  variant="activity"
                  onDismiss={() => toggleActivityFilter(type)}
                />
              )
            })}
            {filters.state && (
              <Chip
                label={
                  AU_STATES.find((s) => s.value === filters.state)?.label ??
                  filters.state
                }
                icon={<MapPin size={14} />}
                selected
                onDismiss={() =>
                  setFilters((f) => ({ ...f, state: null }))
                }
              />
            )}
            {filters.distanceKm !== 50 && (
              <Chip
                label={`${filters.distanceKm} km`}
                icon={<Compass size={14} />}
                selected
                onDismiss={() =>
                  setFilters((f) => ({ ...f, distanceKm: 50 }))
                }
              />
            )}
            {(filters.dateFrom || filters.dateTo) && (
              <Chip
                label={
                  filters.dateFrom && filters.dateTo
                    ? `${filters.dateFrom} – ${filters.dateTo}`
                    : filters.dateFrom
                      ? `From ${filters.dateFrom}`
                      : `Until ${filters.dateTo}`
                }
                icon={<CalendarRange size={14} />}
                selected
                onDismiss={() =>
                  setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))
                }
              />
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-medium text-primary-400 hover:text-primary-600 whitespace-nowrap min-h-11 flex items-center justify-center active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none ml-1"
            >
              Clear all
            </button>
        </div>
        )}

        {/* ============================================================ */}
        {/*  Content area                                                 */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ---- Recent searches (no query, has history) ---- */}
            {!hasQuery && !query && recentSearches.length > 0 && (
              <motion.div
                key="suggestions"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pb-4 px-4 lg:px-6"
              >
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                      Recent
                    </h3>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-xs text-primary-400 font-medium hover:text-primary-600 min-h-11 flex items-center justify-center active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => handleSearchSubmit(term)}
                        className={cn(
                          'flex items-center gap-3 w-full px-3 py-2.5 min-h-11 rounded-xl',
                          'text-sm text-primary-800 hover:bg-surface-3',
                          'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none group',
                        )}
                      >
                        <Clock size={14} className="text-primary-300 shrink-0" />
                        <span className="flex-1 text-left truncate">
                          {term}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeRecentSearch(term)
                          }}
                          className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-200 hover:text-primary-400 shrink-0 opacity-0 group-hover:opacity-100 active:scale-[0.97] transition-[transform,opacity] duration-150 cursor-pointer select-none"
                          aria-label={`Remove ${term}`}
                        >
                          <X size={14} />
                        </button>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ---- Search results ---- */}
            {showSearchResults && (
              <motion.div
                key="results"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="px-4 lg:px-6"
              >
                {/* Result type tabs - edge-to-edge scroll */}
                <div className="-mx-4 lg:-mx-6">
                <div className="flex gap-1.5 mb-3 overflow-x-auto px-4 lg:px-6 scrollbar-none">
                  {RESULT_TABS.map((tab) => {
                    const count =
                      tab.key === 'all'
                        ? totalResults
                        : tab.key === 'events'
                          ? results.data?.events.length ?? 0
                          : tab.key === 'collectives'
                            ? results.data?.collectives.length ?? 0
                            : results.data?.people.length ?? 0
                    return (
                      <Chip
                        key={tab.key}
                        label={`${tab.label}${count > 0 ? ` (${count})` : ''}`}
                        selected={resultTab === tab.key}
                        onSelect={() => setResultTab(tab.key)}
                      />
                    )
                  })}
                </div>
                </div>

                {results.isLoading && showLoading ? (
                  <div className="space-y-3">
                    <Skeleton variant="list-item" count={5} />
                  </div>
                ) : totalResults === 0 ? (
                  <EmptyState
                    illustration="search"
                    title="No results found"
                    description={`Nothing matched "${query}". Try different keywords or adjust your filters.`}
                    action={{
                      label: 'Clear filters',
                      onClick: clearAllFilters,
                    }}
                  />
                ) : (
                  <div className="space-y-6 pb-6">
                    {/* Events results */}
                    {(resultTab === 'all' || resultTab === 'events') &&
                      results.data &&
                      results.data.events.length > 0 && (
                        <div>
                          {resultTab === 'all' && (
                            <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
                              Events
                            </h3>
                          )}
                          <div className="space-y-3">
                            {results.data.events.map((event) => (
                              <Card.Root
                                key={event.id}
                                variant="event"
                                onClick={() =>
                                  navigate(`/events/${event.id}`)
                                }
                                className="flex flex-row overflow-hidden"
                                aria-label={event.title}
                              >
                                {event.cover_image_url && (
                                  <div className="w-24 h-24 shrink-0">
                                    <img
                                      src={event.cover_image_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                                <Card.Content className="flex-1 min-w-0 p-3">
                                  <Badge
                                    variant="activity"
                                    activity={
                                      activityTypeToBadge[
                                        event.activity_type
                                      ] ?? 'restoration'
                                    }
                                    size="sm"
                                  >
                                    {formatActivityType(event.activity_type)}
                                  </Badge>
                                  <Card.Title className="text-sm mt-1">
                                    {event.title}
                                  </Card.Title>
                                  <Card.Meta className="text-xs flex items-center gap-1 mt-0.5">
                                    <Calendar size={12} aria-hidden="true" />
                                    {formatEventDate(event.date_start)}
                                  </Card.Meta>
                                </Card.Content>
                              </Card.Root>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* Collectives results */}
                    {(resultTab === 'all' || resultTab === 'collectives') &&
                      results.data &&
                      results.data.collectives.length > 0 && (
                        <div>
                          {resultTab === 'all' && (
                            <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
                              Collectives
                            </h3>
                          )}
                          <div className="space-y-3">
                            {results.data.collectives.map((c) => (
                              <Card.Root
                                key={c.id}
                                variant="collective"
                                onClick={() =>
                                  navigate(`/collectives/${c.slug}`)
                                }
                                aria-label={c.name}
                              >
                                <Card.Content className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary-400 shrink-0">
                                    <Users size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-primary-800 truncate">
                                      {c.name}
                                    </p>
                                    <p className="text-xs text-primary-400">
                                      {[c.region, c.state]
                                        .filter(Boolean)
                                        .join(', ')}{' '}
                                      &middot; {c.member_count} members
                                    </p>
                                  </div>
                                </Card.Content>
                              </Card.Root>
                            ))}
                          </div>
                        </div>
                      )}

                    {/* People results */}
                    {(resultTab === 'all' || resultTab === 'people') &&
                      results.data &&
                      results.data.people.length > 0 && (
                        <div>
                          {resultTab === 'all' && (
                            <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
                              People
                            </h3>
                          )}
                          <div className="space-y-2">
                            {results.data.people.map((person) => (
                              <button
                                key={person.id}
                                type="button"
                                onClick={() =>
                                  navigate(`/profile/${person.id}`)
                                }
                                className={cn(
                                  'flex items-center gap-3 w-full px-3 py-2.5 min-h-11 rounded-xl',
                                  'hover:bg-surface-3 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                                )}
                              >
                                <Avatar
                                  src={person.avatar_url}
                                  name={person.display_name ?? '?'}
                                  size="md"
                                />
                                <span className="text-sm font-medium text-primary-800">
                                  {person.display_name}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ---- Typing indicator ---- */}
            {showDefaultBrowse && query.length > 0 && query.length < 2 && (
              <motion.div
                key="typing"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="pt-8 text-center text-sm text-primary-400"
              >
                Keep typing to search...
              </motion.div>
            )}

            {/* ---- Default browse ---- */}
            {showDefaultBrowse && !query && (
              <motion.div
                key="browse"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {(viewMode as ViewMode) === 'map' ? (
                  <ExploreMapView
                    searchInputRef={searchInputRef}
                    query={query}
                    setQuery={setQuery}
                    commitSearch={commitSearch}
                    openFilters={openFilters}
                    activeFilterCount={activeFilterCount}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    userLocation={userLocation ?? undefined}
                    nearbyEventsData={nearbyEvents.data}
                    nearbyCollectivesData={nearbyCollectives.data}
                    onNavigate={navigate}
                  />
                ) : (
                  <ExploreListView
                    searchInputRef={searchInputRef}
                    query={query}
                    setQuery={setQuery}
                    commitSearch={commitSearch}
                    openFilters={openFilters}
                    activeFilterCount={activeFilterCount}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    filters={filters}
                    toggleActivityFilter={toggleActivityFilter}
                    nearbyEventsData={nearbyEvents.data}
                    nearbyEventsLoading={nearbyEvents.isLoading}
                    nearbyCollectivesData={nearbyCollectives.data}
                    nearbyCollectivesLoading={nearbyCollectives.isLoading}
                    showLoading={showLoading}
                    nationalImpact={nationalImpact}
                    onNavigate={navigate}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ============================================================== */}
      {/*  Filter bottom sheet                                            */}
      {/* ============================================================== */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        draftFilters={draftFilters}
        setDraftFilters={setDraftFilters}
        toggleDraftActivityFilter={toggleDraftActivityFilter}
        applyDraftFilters={applyDraftFilters}
        draftFilterCount={draftFilterCount}
        draftActivitySummary={draftActivitySummary}
        draftStateSummary={draftStateSummary}
        draftDateSummary={draftDateSummary}
        draftDistanceSummary={draftDistanceSummary}
      />
    </Page>
  )
}
