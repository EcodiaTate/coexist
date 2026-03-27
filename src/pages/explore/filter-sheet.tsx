import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ChevronDown,
  MapPin,
  CalendarRange,
  Compass,
  Leaf,
  Check,
} from 'lucide-react'
import type { SearchFilters } from '@/hooks/use-search'
import type { Database } from '@/types/database.types'

type ActivityType = Database['public']['Enums']['activity_type']
import { AU_STATES } from '@/hooks/use-nearby'
import { ACTIVITY_TYPE_LABELS } from '@/hooks/use-home-feed'
import {
  Button,
  BottomSheet,
} from '@/components'
import { cn } from '@/lib/cn'
import { DateRangeSelector } from './date-range-selector'

/* ------------------------------------------------------------------ */
/*  Activity icon + color mapping                                      */
/* ------------------------------------------------------------------ */

import {
  Waves,
  TreePine,
  Sprout,
  Flower2,
  GraduationCap,
  Bird,
  Droplets,
  CircleDot,
} from 'lucide-react'

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
/*  Helper: format activity type for display                           */
/* ------------------------------------------------------------------ */

function formatActivityType(type: ActivityType): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

/* ------------------------------------------------------------------ */
/*  FilterSheet props                                                   */
/* ------------------------------------------------------------------ */

export interface FilterSheetProps {
  open: boolean
  onClose: () => void
  draftFilters: SearchFilters
  setDraftFilters: React.Dispatch<React.SetStateAction<SearchFilters>>
  toggleDraftActivityFilter: (type: ActivityType) => void
  applyDraftFilters: () => void
  draftFilterCount: number
  draftActivitySummary: string | undefined
  draftStateSummary: string | undefined
  draftDateSummary: string | undefined
  draftDistanceSummary: string | undefined
}

/* ------------------------------------------------------------------ */
/*  FilterSheet component                                               */
/* ------------------------------------------------------------------ */

export function FilterSheet({
  open,
  onClose,
  draftFilters,
  setDraftFilters,
  toggleDraftActivityFilter,
  applyDraftFilters,
  draftFilterCount,
  draftActivitySummary,
  draftStateSummary,
  draftDateSummary,
  draftDistanceSummary,
}: FilterSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
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
              {(Object.entries(ACTIVITY_TYPE_LABELS) as [ActivityType, string][]).map(([key, label]) => (
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
  )
}
