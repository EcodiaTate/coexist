import { useState, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  X,
  MapIcon,
  List,
  SlidersHorizontal,
  Clock,
  Calendar,
  Users,
  TreePine,
  Waves,
  Sprout,
  Flower2,
  GraduationCap,
  Bird,
  Leaf,
  Droplets,
  CircleDot,
  ChevronDown,
  MapPin,
  CalendarRange,
  Compass,
  Check,
} from 'lucide-react'
import {
  useSearch,
  type SearchFilters,
} from '@/hooks/use-search'
import { useNearbyEvents, useNearbyCollectives, useUserLocation, AU_STATES } from '@/hooks/use-nearby'
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-home-feed'
import {
  Page,
  Header,
  Card,
  Avatar,
  Chip,
  Badge,
  MapView,
  Skeleton,
  EmptyState,
  Button,
  BottomSheet,
} from '@/components'
import { SearchBar } from '@/components/search-bar'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import type { MapMarker } from '@/components'

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
  tree_planting: {
    icon: <TreePine size={16} />,
    iconLg: <TreePine size={22} />,
    bg: 'bg-green-50', bgSolid: 'bg-green-500', text: 'text-green-700',
    ring: 'ring-green-300', gradient: 'from-green-400 to-emerald-500',
  },
  beach_cleanup: {
    icon: <Waves size={16} />,
    iconLg: <Waves size={22} />,
    bg: 'bg-blue-50', bgSolid: 'bg-blue-500', text: 'text-blue-700',
    ring: 'ring-blue-300', gradient: 'from-blue-400 to-cyan-500',
  },
  habitat_restoration: {
    icon: <Flower2 size={16} />,
    iconLg: <Flower2 size={22} />,
    bg: 'bg-emerald-50', bgSolid: 'bg-emerald-500', text: 'text-emerald-700',
    ring: 'ring-emerald-300', gradient: 'from-emerald-400 to-teal-500',
  },
  nature_walk: {
    icon: <Compass size={16} />,
    iconLg: <Compass size={22} />,
    bg: 'bg-amber-50', bgSolid: 'bg-amber-500', text: 'text-amber-700',
    ring: 'ring-amber-300', gradient: 'from-amber-400 to-orange-500',
  },
  education: {
    icon: <GraduationCap size={16} />,
    iconLg: <GraduationCap size={22} />,
    bg: 'bg-violet-50', bgSolid: 'bg-violet-500', text: 'text-violet-700',
    ring: 'ring-violet-300', gradient: 'from-violet-400 to-purple-500',
  },
  wildlife_survey: {
    icon: <Bird size={16} />,
    iconLg: <Bird size={22} />,
    bg: 'bg-amber-50', bgSolid: 'bg-amber-500', text: 'text-amber-700',
    ring: 'ring-amber-300', gradient: 'from-amber-400 to-yellow-500',
  },
  seed_collecting: {
    icon: <Sprout size={16} />,
    iconLg: <Sprout size={22} />,
    bg: 'bg-lime-50', bgSolid: 'bg-lime-500', text: 'text-lime-700',
    ring: 'ring-lime-300', gradient: 'from-lime-400 to-green-500',
  },
  weed_removal: {
    icon: <Leaf size={16} />,
    iconLg: <Leaf size={22} />,
    bg: 'bg-orange-50', bgSolid: 'bg-orange-500', text: 'text-orange-700',
    ring: 'ring-orange-300', gradient: 'from-orange-400 to-red-400',
  },
  waterway_cleanup: {
    icon: <Droplets size={16} />,
    iconLg: <Droplets size={22} />,
    bg: 'bg-cyan-50', bgSolid: 'bg-cyan-500', text: 'text-cyan-700',
    ring: 'ring-cyan-300', gradient: 'from-cyan-400 to-blue-500',
  },
  community_garden: {
    icon: <Flower2 size={16} />,
    iconLg: <Flower2 size={22} />,
    bg: 'bg-pink-50', bgSolid: 'bg-pink-500', text: 'text-pink-700',
    ring: 'ring-pink-300', gradient: 'from-pink-400 to-rose-500',
  },
  other: {
    icon: <CircleDot size={16} />,
    iconLg: <CircleDot size={22} />,
    bg: 'bg-neutral-100', bgSolid: 'bg-neutral-500', text: 'text-neutral-600',
    ring: 'ring-neutral-300', gradient: 'from-neutral-400 to-neutral-500',
  },
}

/* ------------------------------------------------------------------ */
/*  Badge activity key mapping                                         */
/* ------------------------------------------------------------------ */

type BadgeActivity =
  | 'tree-planting'
  | 'beach-cleanup'
  | 'habitat'
  | 'wildlife'
  | 'education'
  | 'fundraising'
  | 'monitoring'
  | 'restoration'

const activityTypeToBadge: Record<string, BadgeActivity> = {
  tree_planting: 'tree-planting',
  beach_cleanup: 'beach-cleanup',
  habitat_restoration: 'habitat',
  nature_walk: 'wildlife',
  education: 'education',
  wildlife_survey: 'wildlife',
  seed_collecting: 'tree-planting',
  weed_removal: 'restoration',
  waterway_cleanup: 'beach-cleanup',
  community_garden: 'habitat',
  other: 'restoration',
}

/* ------------------------------------------------------------------ */
/*  Date quick-pick presets                                             */
/* ------------------------------------------------------------------ */

function getDatePresets() {
  const today = new Date()
  const yyyy = (d: Date) => d.toISOString().slice(0, 10)

  // This weekend (Sat-Sun)
  const dayOfWeek = today.getDay()
  const satOffset = dayOfWeek === 0 ? 6 : 6 - dayOfWeek
  const sat = new Date(today)
  sat.setDate(today.getDate() + satOffset)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)

  // Next 7 days
  const week = new Date(today)
  week.setDate(today.getDate() + 7)

  // Next 30 days
  const month = new Date(today)
  month.setDate(today.getDate() + 30)

  // Next 3 months
  const quarter = new Date(today)
  quarter.setMonth(today.getMonth() + 3)

  return [
    { label: 'This weekend', from: yyyy(sat), to: yyyy(sun) },
    { label: 'Next 7 days', from: yyyy(today), to: yyyy(week) },
    { label: 'Next 30 days', from: yyyy(today), to: yyyy(month) },
    { label: 'Next 3 months', from: yyyy(today), to: yyyy(quarter) },
  ]
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

function formatActivityType(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

/* ------------------------------------------------------------------ */
/*  Filter section (collapsible accordion)                             */
/* ------------------------------------------------------------------ */

function FilterSection({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = true,
}: {
  icon: ReactNode
  title: string
  subtitle?: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="border-b border-primary-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-3 w-full py-4',
          'text-left transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:rounded-lg',
        )}
        aria-expanded={open}
      >
        <span className={cn(
          'flex items-center justify-center w-9 h-9 rounded-xl shrink-0',
          'bg-primary-50 text-primary-600',
        )}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-primary-800 block">
            {title}
          </span>
          {subtitle && (
            <span className="text-xs text-primary-400 block mt-0.5 truncate">
              {subtitle}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
          className="text-primary-300 shrink-0"
        >
          <ChevronDown size={18} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity tile card (for filter grid)                               */
/* ------------------------------------------------------------------ */

function ActivityTile({
  activityKey,
  label,
  selected,
  onToggle,
}: {
  activityKey: string
  label: string
  selected: boolean
  onToggle: () => void
}) {
  const shouldReduceMotion = useReducedMotion()
  const meta = ACTIVITY_META[activityKey] ?? ACTIVITY_META.other

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      className={cn(
        'relative flex items-center gap-3 w-full px-3 py-3 rounded-xl',
        'text-left transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        selected
          ? `${meta.bg} ring-1.5 ${meta.ring}`
          : 'bg-white hover:bg-primary-50 ring-1 ring-primary-100',
      )}
      aria-label={label}
      aria-pressed={selected}
    >
      {/* Icon */}
      <span className={cn(
        'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
        'transition-all duration-150',
        selected
          ? `bg-gradient-to-br ${meta.gradient} text-white shadow-sm`
          : `${meta.bg} ${meta.text}`,
      )}>
        {meta.iconLg}
      </span>

      {/* Label */}
      <span className={cn(
        'text-sm font-medium flex-1 min-w-0',
        'transition-colors duration-150',
        selected ? 'text-primary-800' : 'text-primary-600',
      )}>
        {label}
      </span>

      {/* Checkmark */}
      <span className={cn(
        'flex items-center justify-center w-5 h-5 rounded-full shrink-0',
        'transition-all duration-150',
        selected
          ? `${meta.bgSolid} text-white`
          : 'ring-1.5 ring-primary-200',
      )}>
        {selected && <Check size={12} strokeWidth={3} />}
      </span>
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Distance visual selector                                           */
/* ------------------------------------------------------------------ */

function DistanceSelector({
  value,
  onChange,
}: {
  value: number
  onChange: (km: number) => void
}) {
  const shouldReduceMotion = useReducedMotion()
  const ticks = [5, 25, 50, 100, 200]
  // Map value to a 0-1 position for the visual ring
  const fraction = Math.min((value - 5) / (200 - 5), 1)

  return (
    <div className="space-y-4">
      {/* Visual ring display */}
      <div className="flex items-center justify-center py-2">
        <div className="relative w-36 h-36">
          {/* Concentric rings */}
          {[0.3, 0.55, 0.8, 1.0].map((scale, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-primary-100"
              style={{
                transform: `scale(${scale})`,
                opacity: fraction >= scale * 0.8 ? 0.8 : 0.2,
              }}
            />
          ))}
          {/* Active fill circle */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary-100/60"
            animate={shouldReduceMotion ? undefined : { scale: 0.2 + fraction * 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ transformOrigin: 'center' }}
          />
          {/* Center pin */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <MapPin size={20} className="text-primary-600 mb-0.5" />
              <span className="text-lg font-bold text-primary-800 tabular-nums leading-none">
                {value}
              </span>
              <span className="text-[10px] font-medium text-primary-400 uppercase tracking-wider">
                km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div>
        <input
          type="range"
          min={5}
          max={200}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary-600 h-2 rounded-full"
          aria-label="Search distance in kilometres"
        />
        {/* Tick marks */}
        <div className="flex justify-between mt-1.5 px-0.5">
          {ticks.map((tick) => (
            <button
              key={tick}
              type="button"
              onClick={() => onChange(tick)}
              className={cn(
                'text-[11px] font-medium tabular-nums transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded',
                value === tick ? 'text-primary-700 font-semibold' : 'text-primary-300',
              )}
            >
              {tick}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  State selection list                                               */
/* ------------------------------------------------------------------ */

function StateSelector({
  selected,
  onChange,
}: {
  selected: string | null
  onChange: (state: string | null) => void
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="space-y-1">
      {AU_STATES.map((s) => {
        const isSelected = selected === s.value
        return (
          <motion.button
            key={s.value}
            type="button"
            onClick={() => onChange(isSelected ? null : s.value)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl',
              'text-left transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              isSelected
                ? 'bg-primary-50 ring-1.5 ring-primary-300'
                : 'hover:bg-primary-50/50',
            )}
            aria-pressed={isSelected}
          >
            {/* State abbreviation badge */}
            <span className={cn(
              'flex items-center justify-center w-9 h-9 rounded-lg shrink-0',
              'text-xs font-bold transition-all duration-150',
              isSelected
                ? 'bg-primary-600 text-white'
                : 'bg-primary-50 text-primary-500',
            )}>
              {s.value}
            </span>

            {/* Full name */}
            <span className={cn(
              'flex-1 text-sm',
              'transition-colors duration-150',
              isSelected ? 'font-semibold text-primary-800' : 'text-primary-600',
            )}>
              {s.label}
            </span>

            {/* Checkmark */}
            {isSelected && (
              <motion.span
                initial={shouldReduceMotion ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white shrink-0"
              >
                <Check size={12} strokeWidth={3} />
              </motion.span>
            )}
          </motion.button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Date range selector with quick presets                             */
/* ------------------------------------------------------------------ */

function DateRangeSelector({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string | null
  dateTo: string | null
  onChange: (from: string | null, to: string | null) => void
}) {
  const presets = useMemo(() => getDatePresets(), [])
  const activePreset = presets.find(
    (p) => p.from === dateFrom && p.to === dateTo,
  )

  return (
    <div className="space-y-4">
      {/* Quick presets */}
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => {
          const isActive = activePreset === preset
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                if (isActive) {
                  onChange(null, null)
                } else {
                  onChange(preset.from, preset.to)
                }
              }}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl',
                'text-sm font-medium text-left transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-primary-600 ring-1 ring-primary-100 hover:ring-primary-200 hover:bg-primary-50/50',
              )}
              aria-pressed={isActive}
            >
              <Calendar size={14} className={isActive ? 'text-white/70' : 'text-primary-300'} />
              {preset.label}
            </button>
          )
        })}
      </div>

      {/* Custom date inputs - collapsible */}
      <div>
        <p className="text-xs font-medium text-primary-400 mb-2">
          Or pick exact dates
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-medium text-primary-400 uppercase tracking-wider block mb-1">
              From
            </label>
            <input
              type="date"
              value={dateFrom ?? ''}
              onChange={(e) =>
                onChange(e.target.value || null, dateTo)
              }
              className={cn(
                'w-full h-11 px-3 rounded-xl border',
                'text-sm bg-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-all duration-150',
                dateFrom
                  ? 'border-primary-300 text-primary-800'
                  : 'border-primary-100 text-primary-400',
              )}
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-medium text-primary-400 uppercase tracking-wider block mb-1">
              To
            </label>
            <input
              type="date"
              value={dateTo ?? ''}
              onChange={(e) =>
                onChange(dateFrom, e.target.value || null)
              }
              className={cn(
                'w-full h-11 px-3 rounded-xl border',
                'text-sm bg-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-all duration-150',
                dateTo
                  ? 'border-primary-300 text-primary-800'
                  : 'border-primary-100 text-primary-400',
              )}
              style={{ fontSize: '16px' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Browse activity scroller (Instagram Stories style)                  */
/* ------------------------------------------------------------------ */

function ActivityScroller({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (key: string) => void
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-2">
      {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => {
        const meta = ACTIVITY_META[key] ?? ACTIVITY_META.other
        const isSelected = selected.includes(key)
        return (
          <motion.button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            className="flex flex-col items-center gap-1.5 shrink-0 focus-visible:outline-none"
            aria-label={label}
            aria-pressed={isSelected}
          >
            {/* Ring + icon */}
            <span className={cn(
              'flex items-center justify-center w-14 h-14 rounded-full',
              'transition-all duration-200',
              isSelected
                ? `bg-gradient-to-br ${meta.gradient} text-white shadow-md ring-2 ring-offset-2 ring-primary-400`
                : `${meta.bg} ${meta.text} ring-1 ring-primary-100`,
            )}>
              {meta.iconLg}
            </span>
            {/* Label */}
            <span className={cn(
              'text-[10px] font-medium leading-tight text-center max-w-[60px] truncate',
              'transition-colors duration-150',
              isSelected ? 'text-primary-800 font-semibold' : 'text-primary-400',
            )}>
              {label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
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
      ? [searchParams.get('activity')!]
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

  // Filter actions
  const toggleActivityFilter = useCallback(
    (type: string) => {
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
    (type: string) => {
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
    <Page
      header={
        <Header title="Explore" />
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* ============================================================ */}
        {/*  Search bar                                                   */}
        {/* ============================================================ */}
        <div className="px-4 pt-3 pb-2">
          <SearchBar
            ref={searchInputRef}
            value={query}
            onChange={setQuery}
            onSubmit={commitSearch}
            placeholder="Search events, collectives, people..."
            showSparkle
            aria-label="Search"
          />
        </div>

        {/* ============================================================ */}
        {/*  Filter bar: active chips + filter button + view toggle       */}
        {/* ============================================================ */}
        <div className="px-4 flex items-center gap-2 pb-2">
          <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
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
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-medium text-primary-400 hover:text-primary-600 whitespace-nowrap transition-colors ml-1"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter button */}
          <motion.button
            type="button"
            onClick={openFilters}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
            className={cn(
              'relative flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
              'border transition-all duration-150',
              activeFilterCount > 0
                ? 'border-primary-400 bg-primary-50 text-primary-600 shadow-sm'
                : 'border-primary-200 bg-white text-primary-400',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}`}
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-[10px] font-bold text-white shadow-sm">
                {activeFilterCount}
              </span>
            )}
          </motion.button>

          {/* View toggle */}
          <div className="flex rounded-xl border border-primary-200 overflow-hidden shrink-0 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={cn(
                'flex items-center justify-center w-10 h-10',
                'transition-all duration-150',
                viewMode === 'map'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-primary-400 hover:bg-primary-50',
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
                'flex items-center justify-center w-10 h-10',
                'transition-all duration-150',
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-primary-400 hover:bg-primary-50',
              )}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Content area                                                 */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* ---- Suggestions (no query) ---- */}
            {!hasQuery && !query && (
              <motion.div
                key="suggestions"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="pb-4"
              >
                {recentSearches.length > 0 && (
                  <div className="px-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                        Recent
                      </h3>
                      <button
                        type="button"
                        onClick={clearRecentSearches}
                        className="text-xs text-primary-400 font-medium hover:text-primary-600 transition-colors"
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
                            'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl',
                            'text-sm text-primary-800 hover:bg-white',
                            'transition-colors duration-150 group',
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
                            className="text-primary-200 hover:text-primary-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Remove ${term}`}
                          >
                            <X size={14} />
                          </button>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}

            {/* ---- Search results ---- */}
            {showSearchResults && (
              <motion.div
                key="results"
                initial={shouldReduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Result type tabs */}
                <div className="px-4 flex gap-1.5 mb-3 overflow-x-auto scrollbar-none">
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

                {results.isLoading ? (
                  <div className="px-4 space-y-3">
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
                  <div className="px-4 space-y-6 pb-6">
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
                                  navigate(`/community/${c.slug}`)
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
                                  'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl',
                                  'hover:bg-white transition-colors duration-150',
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
                className="px-4 pt-8 text-center text-sm text-primary-400"
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
                {/* Activity scroller - Stories-style icon row */}
                <div className="mb-4">
                  <ActivityScroller
                    selected={filters.activityTypes}
                    onToggle={toggleActivityFilter}
                  />
                </div>

                {viewMode === 'map' ? (
                  <div className="px-4">
                    <MapView
                      center={
                        userLocation ?? { lat: -33.8688, lng: 151.2093 }
                      }
                      zoom={10}
                      markers={[
                        ...(nearbyEvents.data ?? [])
                          .map((e): MapMarker | null => {
                            const pos = parseLocationPoint(e.location_point)
                            if (!pos) return null
                            return { id: e.id, position: pos, variant: 'event', label: e.title }
                          })
                          .filter((m): m is MapMarker => m !== null),
                        ...(nearbyCollectives.data ?? [])
                          .map((c): MapMarker | null => {
                            const pos = parseLocationPoint(c.location_point)
                            if (!pos) return null
                            return { id: c.id, position: pos, variant: 'collective', label: c.name }
                          })
                          .filter((m): m is MapMarker => m !== null),
                      ]}
                      onMarkerClick={(id) => {
                        const isEvent = nearbyEvents.data?.some((e) => e.id === id)
                        if (isEvent) navigate(`/events/${id}`)
                        else navigate(`/community/${id}`)
                      }}
                      className="h-[60vh] rounded-2xl"
                      aria-label="Map showing nearby events and collectives"
                    />
                  </div>
                ) : (
                  <div className="px-4 space-y-6 pb-6">
                    {/* Nearby events */}
                    <div>
                      <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
                        Nearby Events
                      </h3>
                      {nearbyEvents.isLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map((i) => (
                            <Card.Skeleton key={i} />
                          ))}
                        </div>
                      ) : nearbyEvents.data &&
                        nearbyEvents.data.length > 0 ? (
                        <div className="space-y-3">
                          {nearbyEvents.data.map((event) => (
                            <Card.Root
                              key={event.id}
                              variant="event"
                              onClick={() =>
                                navigate(`/events/${event.id}`)
                              }
                              aria-label={event.title}
                            >
                              {event.cover_image_url && (
                                <Card.Image
                                  src={event.cover_image_url}
                                  alt={event.title}
                                  aspectRatio="21/9"
                                />
                              )}
                              <Card.Content>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <Card.Title className="text-sm">
                                      {event.title}
                                    </Card.Title>
                                    <Card.Meta className="text-xs flex items-center gap-1 mt-0.5">
                                      <Calendar
                                        size={12}
                                        aria-hidden="true"
                                      />
                                      {formatEventDate(event.date_start)}
                                      {event.collectives && (
                                        <span className="ml-1">
                                          &middot; {event.collectives.name}
                                        </span>
                                      )}
                                    </Card.Meta>
                                  </div>
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
                                </div>
                              </Card.Content>
                            </Card.Root>
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          illustration="empty"
                          title="No nearby events"
                          description="Try expanding your search radius or check back later"
                          action={{ label: 'View All Events', to: '/events' }}
                          className="min-h-[160px] py-4"
                        />
                      )}
                    </div>

                    {/* Nearby collectives */}
                    <div>
                      <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider mb-2">
                        Collectives
                      </h3>
                      {nearbyCollectives.isLoading ? (
                        <Skeleton variant="list-item" count={3} />
                      ) : nearbyCollectives.data &&
                        nearbyCollectives.data.length > 0 ? (
                        <div className="space-y-3">
                          {nearbyCollectives.data.map((c) => (
                            <Card.Root
                              key={c.id}
                              variant="collective"
                              onClick={() =>
                                navigate(`/community/${c.slug}`)
                              }
                              aria-label={c.name}
                            >
                              <Card.Content className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary-400 shrink-0">
                                  <TreePine size={18} />
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
                      ) : (
                        <EmptyState
                          illustration="wildlife"
                          title="No collectives nearby"
                          description="Expand your search or browse all collectives nationally"
                          action={{ label: 'Browse All Collectives', to: '/collectives' }}
                          className="min-h-[160px] py-4"
                        />
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ============================================================== */}
      {/*  Filter bottom sheet                                            */}
      {/* ============================================================== */}
      <BottomSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        snapPoints={[0.85]}
      >
        <div className="flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-1">
            <h2 className="font-heading text-lg font-bold text-primary-800">
              Filters
            </h2>
            <button
              type="button"
              onClick={() => {
                const cleared: SearchFilters = {
                  activityTypes: [],
                  dateFrom: null,
                  dateTo: null,
                  distanceKm: 50,
                  state: null,
                }
                setDraftFilters(cleared)
              }}
              className={cn(
                'text-sm font-medium transition-colors',
                draftFilterCount > 0
                  ? 'text-primary-600 hover:text-primary-800'
                  : 'text-primary-300',
              )}
              disabled={draftFilterCount === 0}
            >
              Reset all
            </button>
          </div>

          {/* Scrollable filter sections */}
          <div className="flex-1 overflow-y-auto -mx-5 px-5">
            {/* ---- Activity type ---- */}
            <FilterSection
              icon={<Leaf size={18} />}
              title="Activity Type"
              subtitle={draftActivitySummary}
            >
              <div className="space-y-2">
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                  <ActivityTile
                    key={key}
                    activityKey={key}
                    label={label}
                    selected={draftFilters.activityTypes.includes(key)}
                    onToggle={() => toggleDraftActivityFilter(key)}
                  />
                ))}
              </div>
            </FilterSection>

            {/* ---- Distance ---- */}
            <FilterSection
              icon={<Compass size={18} />}
              title="Distance"
              subtitle={draftDistanceSummary}
            >
              <DistanceSelector
                value={draftFilters.distanceKm}
                onChange={(km) =>
                  setDraftFilters((f) => ({ ...f, distanceKm: km }))
                }
              />
            </FilterSection>

            {/* ---- State / Region ---- */}
            <FilterSection
              icon={<MapPin size={18} />}
              title="State / Region"
              subtitle={draftStateSummary}
              defaultOpen={!!draftFilters.state}
            >
              <StateSelector
                selected={draftFilters.state}
                onChange={(state) =>
                  setDraftFilters((f) => ({ ...f, state }))
                }
              />
            </FilterSection>

            {/* ---- Date Range ---- */}
            <FilterSection
              icon={<CalendarRange size={18} />}
              title="When"
              subtitle={draftDateSummary}
              defaultOpen={!!(draftFilters.dateFrom || draftFilters.dateTo)}
            >
              <DateRangeSelector
                dateFrom={draftFilters.dateFrom}
                dateTo={draftFilters.dateTo}
                onChange={(from, to) =>
                  setDraftFilters((f) => ({ ...f, dateFrom: from, dateTo: to }))
                }
              />
            </FilterSection>
          </div>

          {/* Sticky apply button */}
          <div className="pt-4 border-t border-primary-100 -mx-5 px-5">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={applyDraftFilters}
            >
              {draftFilterCount > 0
                ? `Show Results (${draftFilterCount} filter${draftFilterCount > 1 ? 's' : ''})`
                : 'Show Results'
              }
            </Button>
          </div>
        </div>
      </BottomSheet>
    </Page>
  )
}
