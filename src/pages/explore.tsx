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
    ArrowRight,
    Heart,
    TrendingUp,
} from 'lucide-react'
import {
    useSearch,
    type SearchFilters,
} from '@/hooks/use-search'
import { useNearbyEvents, useNearbyCollectives, useUserLocation, AU_STATES } from '@/hooks/use-nearby'
import { useNationalImpact } from '@/hooks/use-impact'
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-home-feed'
import {
    Page,
    Card,
    Avatar,
    Chip,
    Badge,
    MapView,
    Skeleton,
    EmptyState,
    Button,
    BottomSheet,
    CountUp,
} from '@/components'
import { SearchBar } from '@/components/search-bar'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { CollectiveMap } from '@/components/collective-map'
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
/*  Animation variants                                                 */
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
/*  Category cards data                                                */
/* ------------------------------------------------------------------ */

const CATEGORY_CARDS = [
  {
    key: 'shore_cleanup',
    label: 'Shore Cleanup',
    description: 'Protect our coastlines',
    icon: <Waves size={18} />,
    decorIcon: <Waves size={56} strokeWidth={1} />,
    gradient: 'from-sky-500 to-moss-600',
  },
  {
    key: 'tree_planting',
    label: 'Tree Planting',
    description: 'Plant native species',
    icon: <TreePine size={18} />,
    decorIcon: <TreePine size={56} strokeWidth={1} />,
    gradient: 'from-success-500 to-primary-600',
  },
  {
    key: 'marine_restoration',
    label: 'Marine Restoration',
    description: 'Restore ocean habitats',
    icon: <Droplets size={18} />,
    decorIcon: <Droplets size={56} strokeWidth={1} />,
    gradient: 'from-primary-500 to-moss-600',
  },
  {
    key: 'nature_walk',
    label: 'Nature Walks',
    description: 'Explore & connect',
    icon: <Compass size={18} />,
    decorIcon: <Compass size={56} strokeWidth={1} />,
    gradient: 'from-bark-500 to-warning-600',
  },
]

/* ------------------------------------------------------------------ */
/*  Impact stats data                                                  */
/* ------------------------------------------------------------------ */

 
const _IMPACT_STATS = [
  {
    value: 35500,
    suffix: '+',
    label: 'Native Plants',
    icon: <TreePine size={16} />,
    iconBg: 'bg-success-100',
    iconColor: 'text-success-600',
  },
  {
    value: 4900,
    suffix: 'kg',
    label: 'Litter Removed',
    icon: <Waves size={16} />,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    value: 5500,
    suffix: '+',
    label: 'Volunteers',
    icon: <Users size={16} />,
    iconBg: 'bg-plum-100',
    iconColor: 'text-plum-600',
  },
  {
    value: 13,
    suffix: '',
    label: 'Collectives',
    icon: <Heart size={16} />,
    iconBg: 'bg-coral-100',
    iconColor: 'text-coral-600',
  },
]

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
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-3 w-full py-4 min-h-11',
          'text-left active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
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
        'relative flex items-center gap-3 w-full px-3 py-3 min-h-11 rounded-xl',
        'text-left active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
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
        'transition-colors duration-150',
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
        'transition-colors duration-150',
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
              className="absolute inset-0 rounded-full ring-1 ring-primary-100"
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
              <span className="text-[11px] font-medium text-primary-400 uppercase tracking-wider">
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
                'text-[11px] font-medium tabular-nums min-h-11 min-w-11 flex items-center justify-center active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
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
              'flex items-center gap-3 w-full px-3 py-2.5 min-h-11 rounded-xl',
              'text-left active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
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
              'text-xs font-bold transition-colors duration-150',
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
                'flex items-center gap-2 px-3 py-2.5 min-h-11 rounded-xl',
                'text-sm font-medium text-left active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
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
                'w-full h-11 px-3 rounded-xl',
                'text-sm bg-surface-3',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-colors duration-150',
                dateFrom
                  ? 'text-primary-800'
                  : 'text-primary-400',
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
                'w-full h-11 px-3 rounded-xl',
                'text-sm bg-surface-3',
                'focus:outline-none focus:ring-2 focus:ring-primary-400',
                'transition-colors duration-150',
                dateTo
                  ? 'text-primary-800'
                  : 'text-primary-400',
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

 
function _ActivityScroller({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (key: string) => void
}) {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
      {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => {
        const meta = ACTIVITY_META[key] ?? ACTIVITY_META.other
        const isSelected = selected.includes(key)
        return (
          <motion.button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
            className="flex flex-col items-center gap-1.5 shrink-0 min-w-11 min-h-11 cursor-pointer select-none focus-visible:outline-none"
            aria-label={label}
            aria-pressed={isSelected}
          >
            {/* Ring + icon */}
            <span className={cn(
              'flex items-center justify-center w-14 h-14 rounded-full',
              'transition-colors duration-200',
              isSelected
                ? `bg-gradient-to-br ${meta.gradient} text-white shadow-md ring-2 ring-offset-2 ring-primary-400`
                : `${meta.bg} ${meta.text} ring-1 ring-primary-100`,
            )}>
              {meta.iconLg}
            </span>
            {/* Label */}
            <span className={cn(
              'text-[11px] font-medium leading-tight text-center max-w-[60px] truncate',
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

  const initialLoading = results.isLoading || nearbyEvents.isLoading || nearbyCollectives.isLoading
  const showLoading = useDelayedLoading(initialLoading)

  // National impact stats (for hero)
  const { data: nationalImpact } = useNationalImpact()

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
                  <div className="px-4 lg:px-6 pt-10">
                    {/* Search + filter bar for map mode */}
                    <div className="flex items-center gap-2 mb-3">
                      <SearchBar
                        ref={searchInputRef}
                        value={query}
                        onChange={setQuery}
                        onSubmit={commitSearch}
                        placeholder="Search events, collectives, people..."
                        aria-label="Search"
                        className="flex-1 min-w-0"
                      />
                      <motion.button
                        type="button"
                        onClick={openFilters}
                        whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
                        className={cn(
                          'relative flex items-center justify-center min-h-11 min-w-11 rounded-xl shrink-0',
                          'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                          activeFilterCount > 0
                            ? 'bg-primary-50 text-primary-600 shadow-sm'
                            : 'bg-primary-50/60 text-primary-400',
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
                      <div className="flex rounded-xl overflow-hidden shrink-0 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setViewMode('map')}
                          className={cn(
                            'flex items-center justify-center min-h-11 min-w-11',
                            'active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
                            viewMode === 'map'
                              ? 'bg-primary-600 text-white'
                              : 'bg-surface-0 text-primary-400 hover:bg-surface-3',
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
                              ? 'bg-primary-600 text-white'
                              : 'bg-surface-0 text-primary-400 hover:bg-surface-3',
                          )}
                          aria-label="List view"
                          aria-pressed={viewMode === 'list'}
                        >
                          <List size={16} />
                        </button>
                      </div>
                    </div>
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
                        else navigate(`/collectives/${id}`)
                      }}
                      className="h-[60vh] rounded-2xl"
                      aria-label="Map showing nearby events and collectives"
                    />
                  </div>
                ) : (
                  <motion.div
                    className="space-y-0"
                    variants={stagger}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* ======== Hero Banner ======== */}
                    <motion.div variants={fadeUp} className="mb-6">
                      <div className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-secondary-700">
                        {/* Decorative shapes - "explorer's horizon" formation */}
                        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full border border-white/[0.07]" aria-hidden="true" />
                        <div className="absolute -top-4 -left-2 w-40 h-40 rounded-full bg-white/[0.04]" aria-hidden="true" />
                        <div className="absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-white/[0.05]" aria-hidden="true" />
                        <div className="absolute top-[20%] right-[15%] w-14 h-14 rounded-full border border-white/[0.10]" aria-hidden="true" />
                        <div className="absolute bottom-[25%] left-[35%] w-10 h-10 rounded-full bg-sprout-400/12" aria-hidden="true" />

                        {/* Leaf decorations */}
                        <div className="absolute top-4 right-8 text-white/10" aria-hidden="true">
                          <Leaf size={64} strokeWidth={1} />
                        </div>
                        <div className="absolute bottom-6 left-6 text-white/8 rotate-45" aria-hidden="true">
                          <TreePine size={48} strokeWidth={1} />
                        </div>

                        <div className="relative px-6 lg:px-10" style={{ paddingTop: 'calc(var(--safe-top) + 2rem)' }}>
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
                      <CollectiveMap className="h-[72vh] min-h-[480px]" />
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
                              'relative overflow-hidden rounded-2xl p-4 text-left min-h-[100px]',
                              'cursor-pointer select-none transition-shadow duration-200',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                              filters.activityTypes.includes(cat.key)
                                ? 'ring-2 ring-primary-400 shadow-lg'
                                : 'shadow-md',
                            )}
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                            aria-label={cat.label}
                            aria-pressed={filters.activityTypes.includes(cat.key)}
                          >
                            {/* Gradient background */}
                            <div className={cn('absolute inset-0 bg-gradient-to-br', cat.gradient)} aria-hidden="true" />
                            {/* Decorative icon */}
                            <div className="absolute -bottom-2 -right-2 text-white/15" aria-hidden="true">
                              {cat.decorIcon}
                            </div>
                            {/* Content */}
                            <div className="relative">
                              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 text-white mb-2">
                                {cat.icon}
                              </span>
                              <span className="text-sm font-semibold text-white block leading-tight">
                                {cat.label}
                              </span>
                              <span className="text-[11px] font-medium text-white/60 mt-0.5 block">
                                {cat.description}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>

                    {/* ======== Featured / Nearby Events ======== */}
                    <motion.div variants={fadeUp} className="mb-6">
                      <div className="flex items-center justify-between mb-3 px-4 lg:px-6">
                        <h3 className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
                          Nearby Events
                        </h3>
                        <button
                          type="button"
                          onClick={() => navigate('/events')}
                          className="flex items-center gap-1 text-xs font-semibold text-primary-500 min-h-11 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
                        >
                          View all <ArrowRight size={12} />
                        </button>
                      </div>

                      {nearbyEvents.isLoading && showLoading ? (
                        <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="w-[75vw] max-w-[260px] shrink-0">
                              <Card.Skeleton />
                            </div>
                          ))}
                        </div>
                      ) : nearbyEvents.data && nearbyEvents.data.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
                          {nearbyEvents.data.map((event, idx) => {
                              const meta = ACTIVITY_META[event.activity_type] ?? ACTIVITY_META.other
                              return (
                                <motion.div
                                  key={event.id}
                                  className="w-[75vw] max-w-[260px] shrink-0"
                                  initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                                >
                                  <Card.Root
                                    variant="event"
                                    onClick={() => navigate(`/events/${event.id}`)}
                                    aria-label={event.title}
                                    className="h-full"
                                  >
                                    {/* Image or gradient placeholder */}
                                    {event.cover_image_url ? (
                                      <div className="relative">
                                        <Card.Image
                                          src={event.cover_image_url}
                                          alt={event.title}
                                          aspectRatio="16/10"
                                        />
                                        {/* Activity badge overlapping image */}
                                        <div className="absolute bottom-2 left-3">
                                          <Badge
                                            variant="activity"
                                            activity={activityTypeToBadge[event.activity_type] ?? 'restoration'}
                                            size="sm"
                                          >
                                            {formatActivityType(event.activity_type)}
                                          </Badge>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className={cn(
                                        'relative w-full flex items-center justify-center bg-gradient-to-br',
                                        meta.gradient,
                                      )} style={{ aspectRatio: '16/10' }}>
                                        <span className="text-white/30">{meta.iconLg}</span>
                                        <div className="absolute bottom-2 left-3">
                                          <Badge
                                            variant="activity"
                                            activity={activityTypeToBadge[event.activity_type] ?? 'restoration'}
                                            size="sm"
                                          >
                                            {formatActivityType(event.activity_type)}
                                          </Badge>
                                        </div>
                                      </div>
                                    )}

                                    <Card.Content className="p-3">
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

                                    {/* Bottom accent bar */}
                                    <div className={cn(
                                      'h-1 w-full bg-gradient-to-r',
                                      meta.gradient,
                                    )} aria-hidden="true" />
                                  </Card.Root>
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
                              className="rounded-xl bg-white/90 p-3 shadow-sm"
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
                          onClick={() => navigate('/collectives')}
                          className="flex items-center gap-1 text-xs font-semibold text-primary-500 min-h-11 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
                        >
                          View all <ArrowRight size={12} />
                        </button>
                      </div>

                      {nearbyCollectives.isLoading && showLoading ? (
                        <Skeleton variant="list-item" count={3} />
                      ) : nearbyCollectives.data && nearbyCollectives.data.length > 0 ? (
                        <div className="space-y-3">
                          {nearbyCollectives.data.map((c, idx) => (
                            <motion.div
                              key={c.id}
                              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.06, duration: 0.25 }}
                            >
                              <Card.Root
                                variant="collective"
                                onClick={() => navigate(`/collectives/${c.slug}`)}
                                aria-label={c.name}
                                className="overflow-hidden"
                              >
                                <div className="flex items-stretch">
                                  {/* Gradient accent side bar */}
                                  <div className="w-1.5 bg-gradient-to-b from-primary-400 via-sprout-400 to-moss-400 shrink-0" aria-hidden="true" />
                                  <Card.Content className="flex items-center gap-3 flex-1 min-w-0 p-3">
                                    {/* Icon with gradient bg */}
                                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary-100 to-sprout-100 text-primary-500 shrink-0 shadow-sm">
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
                                  </Card.Content>
                                </div>
                              </Card.Root>
                            </motion.div>
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
                    </motion.div>

                    {/* ======== Join the Movement CTA ======== */}
                    <motion.div variants={fadeUp}>
                      <div className="relative overflow-hidden bg-gradient-to-br from-secondary-700 via-primary-700 to-primary-600 px-6 pt-10 lg:px-10"
                        style={{ paddingBottom: 'calc(var(--safe-bottom) + 3.5rem)' }}
                      >
                        {/* Decorative shapes - "gathering circle" */}
                        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-white/[0.08]" aria-hidden="true" />
                        <div className="absolute -top-2 right-4 w-24 h-24 rounded-full bg-white/[0.05]" aria-hidden="true" />
                        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/[0.04]" aria-hidden="true" />
                        <div className="absolute top-[50%] left-[30%] w-10 h-10 rounded-full border border-white/[0.10]" aria-hidden="true" />
                        <div className="absolute bottom-8 right-[20%] text-white/8" aria-hidden="true">
                          <Leaf size={48} strokeWidth={1} />
                        </div>

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
                            onClick={() => navigate('/collectives')}
                            className="bg-white text-primary-700 hover:bg-white/90 shadow-lg"
                          >
                            Find a Collective
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
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
                'text-sm font-medium min-h-11 flex items-center justify-center active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none',
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
          </div>

          {/* Sticky apply button */}
          <div className="pt-4 -mx-5 px-5">
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
