import { useState, useMemo, useRef, type ReactNode } from 'react'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
  TreePine,
  Trash2,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Database,
  AlertTriangle,
  Leaf,
  Users,
  Sprout,
  Waves,
  Eye,
  Ruler,
  Sparkles,
  Droplets,
  Mountain,
  Flower2,
  Bug,
  Flame,
  Fish,
  Wind,
  Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow, type HeroStatColor } from '@/components/admin-hero-stat'
import { Dropdown } from '@/components/dropdown'
import { SearchBar } from '@/components/search-bar'
import { Badge } from '@/components/badge'
import { adminVariants } from '@/lib/admin-motion'
import { cn } from '@/lib/cn'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import {
  useImpactObservations,
  useYearOverYear,
  useImpactDataQuality,
  type ObservationFilters,
  type CollectiveBreakdown,
  type EventImpactRow,
  type YearSummary,
} from '@/hooks/use-admin-impact-observations'
import { useImpactMetricDefs } from '@/hooks/use-impact-metric-defs'
import type { ImpactMetricDef } from '@/lib/impact-metrics'
import { dateRangeOptions, type DateRange } from '@/hooks/use-admin-dashboard'
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_LABELS } from '@/hooks/use-events'
import { useCollectives } from '@/hooks/use-collective'

/* ------------------------------------------------------------------ */
/*  Icon registry (matches admin/impact-metrics.tsx)                   */
/* ------------------------------------------------------------------ */

const METRIC_ICONS: Record<string, (size: number) => ReactNode> = {
  tree:     (s) => <TreePine size={s} />,
  leaf:     (s) => <Leaf size={s} />,
  weed:     (s) => <Sprout size={s} />,
  trash:    (s) => <Trash2 size={s} />,
  wave:     (s) => <Waves size={s} />,
  eye:      (s) => <Eye size={s} />,
  area:     (s) => <Ruler size={s} />,
  clock:    (s) => <Clock size={s} />,
  sparkle:  (s) => <Sparkles size={s} />,
  droplet:  (s) => <Droplets size={s} />,
  mountain: (s) => <Mountain size={s} />,
  flower:   (s) => <Flower2 size={s} />,
  bug:      (s) => <Bug size={s} />,
  flame:    (s) => <Flame size={s} />,
  fish:     (s) => <Fish size={s} />,
  wind:     (s) => <Wind size={s} />,
}

function metricIcon(def: ImpactMetricDef, size = 18): ReactNode {
  return (METRIC_ICONS[def.icon] ?? METRIC_ICONS.leaf)(size)
}

/** Map metric icon keys to hero stat color presets */
const ICON_TO_COLOR: Record<string, HeroStatColor> = {
  tree: 'moss', leaf: 'sprout', weed: 'sprout', trash: 'sky',
  wave: 'info', eye: 'warning', area: 'plum', clock: 'bark',
  sparkle: 'warning', droplet: 'info', mountain: 'bark',
  flower: 'primary', bug: 'moss', flame: 'coral', fish: 'info', wind: 'primary',
}

/** Map metric icon keys to bar chart gradient classes */
const ICON_TO_BAR: Record<string, string> = {
  tree: 'from-moss-400 to-moss-500', leaf: 'from-sprout-400 to-sprout-500',
  weed: 'from-sprout-400 to-sprout-500', trash: 'from-sky-400 to-sky-500',
  wave: 'from-info-400 to-info-500', eye: 'from-warning-400 to-warning-500',
  area: 'from-plum-400 to-plum-500', clock: 'from-bark-400 to-bark-500',
  sparkle: 'from-warning-400 to-warning-500', droplet: 'from-info-400 to-info-500',
  mountain: 'from-bark-400 to-bark-500', flower: 'from-primary-400 to-primary-500',
  bug: 'from-moss-400 to-moss-500', flame: 'from-coral-400 to-coral-500',
  fish: 'from-info-400 to-info-500', wind: 'from-primary-400 to-primary-500',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMetric(val: number | null, def: ImpactMetricDef): string {
  if (val == null || val === 0) return '-'
  const s = def.decimal
    ? val.toLocaleString('en-AU', { maximumFractionDigits: 1 })
    : val.toLocaleString('en-AU')
  return def.unit ? `${s} ${def.unit}` : s
}

function fmtNum(n: number | null) {
  if (n == null || n === 0) return '-'
  return n.toLocaleString('en-AU')
}

function activityToBadge(type: string) {
  return type.replace(/_/g, '-') as Parameters<typeof Badge>[0] extends { activity: infer A } ? A : never
}

/* ------------------------------------------------------------------ */
/*  Sort                                                               */
/* ------------------------------------------------------------------ */

type SortDir = 'asc' | 'desc'

function sortRows(rows: EventImpactRow[], field: string, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'date': return m * (new Date(a.date).getTime() - new Date(b.date).getTime())
      case 'title': return m * a.title.localeCompare(b.title)
      case 'collective': return m * a.collectiveName.localeCompare(b.collectiveName)
      case 'hours': return m * ((a.estimatedVolHours ?? 0) - (b.estimatedVolHours ?? 0))
      default: return m * ((a.metrics[field] ?? 0) - (b.metrics[field] ?? 0))
    }
  })
}

function sortCollectives(rows: CollectiveBreakdown[], field: string, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'name': return m * a.name.localeCompare(b.name)
      case 'events': return m * (a.eventCount - b.eventCount)
      case 'attendees': return m * (a.attendees - b.attendees)
      case 'hours': return m * (a.estimatedHours - b.estimatedHours)
      default: return m * ((a.metrics[field] ?? 0) - (b.metrics[field] ?? 0))
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Sortable header cell                                               */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className,
}: {
  label: string
  field: string
  currentField: string
  currentDir: SortDir
  onSort: (f: string) => void
  className?: string
}) {
  const active = currentField === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none',
        active ? 'text-primary-700' : 'text-primary-400 hover:text-primary-600',
        className,
      )}
    >
      {label}
      {active && (currentDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Year-over-year chart (metric-def-driven)                           */
/* ------------------------------------------------------------------ */

function YoYChart({ data, defs, rm }: { data: YearSummary[]; defs: ImpactMetricDef[]; rm: boolean }) {
  // Show attendees + est hours + top 3 metrics by total value
  const metricTotals = defs.map((d) => ({
    def: d,
    total: data.reduce((s, y) => s + (y.metrics[d.key] ?? 0), 0),
  })).filter((m) => m.total > 0).sort((a, b) => b.total - a.total)

  const topMetrics = metricTotals.slice(0, 3)

  const bars: { key: string; label: string; color: string; unit: string; getValue: (y: YearSummary) => number }[] = [
    { key: '_attendees', label: 'Attendees', color: 'from-warning-400 to-warning-500', unit: '', getValue: (y) => y.attendees },
    ...topMetrics.map((m) => ({
      key: m.def.key,
      label: m.def.label,
      color: ICON_TO_BAR[m.def.icon] ?? 'from-primary-400 to-primary-500',
      unit: m.def.unit,
      getValue: (y: YearSummary) => y.metrics[m.def.key] ?? 0,
    })),
    { key: '_hours', label: 'Est. Vol Hours', color: 'from-bark-400 to-bark-500', unit: '', getValue: (y) => y.estimatedHours },
  ]

  return (
    <div className="rounded-2xl bg-white shadow-md border border-primary-100/50 p-5">
      <h3 className="font-heading text-sm font-semibold text-primary-800 mb-5">
        Year-over-Year Impact
      </h3>
      <div className="space-y-4">
        {data.map((d) => (
          <div key={d.year}>
            <span className="text-xs font-bold text-primary-600 tabular-nums">{d.year}</span>
            <span className="text-[10px] text-primary-400 ml-2">{d.events} events</span>
            <div className="mt-1.5 space-y-1">
              {bars.map((bar) => {
                const val = bar.getValue(d)
                const max = Math.max(...data.map((x) => bar.getValue(x)), 1)
                return (
                  <div key={bar.key} className="flex items-center gap-2">
                    <div className="w-20 text-[10px] text-primary-400 text-right truncate">{bar.label}</div>
                    <div className="flex-1 h-3.5 bg-primary-50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r', bar.color)}
                        initial={rm ? { width: `${(val / max) * 100}%` } : { width: 0 }}
                        animate={{ width: `${Math.max((val / max) * 100, val > 0 ? 2 : 0)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="w-16 text-[11px] font-semibold text-primary-700 tabular-nums text-right">
                      {val > 0 ? `${val.toLocaleString()}${bar.unit ? ` ${bar.unit}` : ''}` : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Data quality panel                                                 */
/* ------------------------------------------------------------------ */

function DataQualityPanel() {
  const { data } = useImpactDataQuality()
  if (!data) return null

  const total = data.legacyCount + data.appCount
  const legacyPct = total > 0 ? Math.round((data.legacyCount / total) * 100) : 0

  return (
    <div className="rounded-2xl bg-white shadow-md border border-primary-100/50 p-5">
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-primary-800 mb-4">
        <Database size={16} className="text-primary-400" />
        Data Quality
      </h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-primary-500 font-medium">Data Source</span>
            <span className="text-primary-400">{total} impact logs</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-primary-50">
            <div
              className="bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-500"
              style={{ width: `${legacyPct}%` }}
            />
            <div
              className="bg-gradient-to-r from-sprout-400 to-sprout-500 transition-all duration-500"
              style={{ width: `${100 - legacyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-400" />
              <span className="text-primary-500">Legacy ({data.legacyCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sprout-400" />
              <span className="text-primary-500">App ({data.appCount})</span>
            </span>
          </div>
        </div>

        {data.eventsWithoutImpact > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-50 border border-warning-200/50">
            <AlertTriangle size={14} className="text-warning-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-warning-700">
                {data.eventsWithoutImpact} completed event{data.eventsWithoutImpact !== 1 ? 's' : ''} without impact logs
              </p>
              <p className="text-[11px] text-warning-500 mt-0.5">Leaders haven't submitted impact data yet</p>
            </div>
          </div>
        )}

        {data.zeroMetricEvents > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-primary-50 border border-primary-100">
            <Leaf size={14} className="text-primary-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary-600">
                {data.zeroMetricEvents} log{data.zeroMetricEvents !== 1 ? 's' : ''} with all metrics at zero
              </p>
              <p className="text-[11px] text-primary-400 mt-0.5">Recreational events or missing data entry</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminImpactObservationsPage() {
  const rm = !!useReducedMotion()
  const v = adminVariants(rm)

  useAdminHeader('Impact Observations')

  /* ── Metric definitions (drives everything) ── */
  const { activeDefs } = useImpactMetricDefs()

  /* ── Filters ── */
  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [collectiveId, setCollectiveId] = useState<string>('')
  const [activityType, setActivityType] = useState<string>('')
  const [search, setSearch] = useState('')

  const filters: ObservationFilters = useMemo(
    () => ({
      dateRange,
      collectiveId: collectiveId || undefined,
      activityType: (activityType || undefined) as ObservationFilters['activityType'],
      search: search || undefined,
    }),
    [dateRange, collectiveId, activityType, search],
  )

  /* ── Data (driven by activeDefs) ── */
  const { data, isLoading } = useImpactObservations(filters, activeDefs)
  const { data: yoyData } = useYearOverYear(activeDefs)
  const { data: collectives } = useCollectives()
  const showLoading = useDelayedLoading(isLoading)

  /* ── Pick which metrics have data to show in tables ── */
  const visibleDefs = useMemo(() => {
    if (!data) return activeDefs
    // Show metrics that have at least one non-zero value across all rows
    return activeDefs.filter((d) =>
      data.rows.some((r) => (r.metrics[d.key] ?? 0) > 0),
    )
  }, [activeDefs, data])

  /* ── Sort state ── */
  const [eventSort, setEventSort] = useState('date')
  const [eventDir, setEventDir] = useState<SortDir>('desc')
  const [collSort, setCollSort] = useState('events')
  const [collDir, setCollDir] = useState<SortDir>('desc')
  const [showAllEvents, setShowAllEvents] = useState(false)

  const toggleSort = (field: string, current: string, setField: (f: string) => void, dir: SortDir, setDir: (d: SortDir) => void) => {
    if (current === field) setDir(dir === 'asc' ? 'desc' : 'asc')
    else { setField(field); setDir('desc') }
  }

  const sortedEvents = useMemo(
    () => (data ? sortRows(data.rows, eventSort, eventDir) : []),
    [data, eventSort, eventDir],
  )
  const displayEvents = showAllEvents ? sortedEvents : sortedEvents.slice(0, 50)

  const sortedCollectives = useMemo(
    () => (data ? sortCollectives(data.collectiveBreakdown, collSort, collDir) : []),
    [data, collSort, collDir],
  )

  /* ── Dropdown options ── */
  const collectiveOptions = useMemo(
    () => [{ value: '', label: 'All Collectives' }, ...(collectives ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [collectives],
  )
  const activityOptions = useMemo(
    () => [{ value: '', label: 'All Types' }, ...ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))],
    [],
  )

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-60px' })

  if (showLoading) {
    return (
      <div className="px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-primary-50 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-primary-50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="px-6 sm:px-8 py-6 space-y-8 pb-24"
      variants={v.stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Filter bar ── */}
      <motion.div variants={v.fadeUp} className="flex flex-wrap items-center gap-3">
        <Dropdown options={dateRangeOptions} value={dateRange} onChange={(v) => setDateRange(v as DateRange)} className="w-36" />
        <Dropdown options={collectiveOptions} value={collectiveId} onChange={setCollectiveId} className="w-44" />
        <Dropdown options={activityOptions} value={activityType} onChange={setActivityType} className="w-40" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search events..." compact className="flex-1 min-w-[160px]" />
      </motion.div>

      {/* ── Summary cards — dynamic from metric defs ── */}
      <motion.div variants={v.fadeUp}>
        <AdminHeroStatRow>
          <AdminHeroStat value={data?.summary.totalEvents ?? 0} label="Events" icon={<BarChart3 size={18} />} color="primary" reducedMotion={rm} delay={0} />
          <AdminHeroStat value={data?.summary.totalAttendees ?? 0} label="Attendees" icon={<Users size={18} />} color="warning" reducedMotion={rm} delay={0.04} />
          {activeDefs.map((def, i) => {
            const val = data?.summary.metrics[def.key] ?? 0
            if (val === 0 && !data) return null
            return (
              <AdminHeroStat
                key={def.key}
                value={Math.round(val * (def.decimal ? 10 : 1)) / (def.decimal ? 10 : 1)}
                label={`${def.label}${def.unit ? ` (${def.unit})` : ''}`}
                icon={metricIcon(def)}
                color={ICON_TO_COLOR[def.icon] ?? 'glass'}
                reducedMotion={rm}
                delay={0.08 + i * 0.04}
              />
            )
          })}
          <AdminHeroStat value={data?.summary.totalEstimatedHours ?? 0} label="Est. Vol Hours" icon={<Clock size={18} />} color="bark" reducedMotion={rm} delay={0.08 + activeDefs.length * 0.04} />
        </AdminHeroStatRow>
      </motion.div>

      {/* ── Link to metric config ── */}
      <motion.div variants={v.fadeUp} className="flex justify-end -mt-4">
        <Link
          to="/admin/impact-metrics"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-400 hover:text-primary-600 transition-colors"
        >
          <Settings size={12} />
          Configure metrics
        </Link>
      </motion.div>

      {/* ── Per-collective breakdown ── */}
      {sortedCollectives.length > 0 && (
        <motion.div variants={v.fadeUp}>
          <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">By Collective</h2>
          <div className="rounded-2xl bg-white shadow-md border border-primary-100/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="px-4 py-3 text-left">
                      <SortHeader label="Collective" field="name" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Events" field="events" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Attendees" field="attendees" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} className="justify-center" />
                    </th>
                    {visibleDefs.map((def) => (
                      <th key={def.key} className="px-3 py-3 text-center">
                        <SortHeader
                          label={`${def.label}${def.unit ? ` (${def.unit})` : ''}`}
                          field={def.key}
                          currentField={collSort}
                          currentDir={collDir}
                          onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)}
                          className="justify-center"
                        />
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Est. Hours" field="hours" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} className="justify-center" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCollectives.map((c) => (
                    <tr
                      key={c.collectiveId}
                      className="border-b border-primary-50 last:border-b-0 hover:bg-primary-25 transition-colors cursor-pointer"
                      onClick={() => setCollectiveId(c.collectiveId)}
                    >
                      <td className="px-4 py-3 text-left font-semibold text-primary-800 text-sm">{c.name}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{c.eventCount}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(c.attendees)}</td>
                      {visibleDefs.map((def) => (
                        <td key={def.key} className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">
                          {fmtMetric(c.metrics[def.key] ?? 0, def)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(c.estimatedHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Event impact log ── */}
      <motion.div variants={v.fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">Event Impact Log</h2>
          {sortedEvents.length > 0 && (
            <span className="text-xs text-primary-400 font-medium">{sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="rounded-2xl bg-white shadow-md border border-primary-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Date" field="date" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} />
                  </th>
                  <th className="px-3 py-3 text-left min-w-[180px]">
                    <SortHeader label="Event" field="title" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortHeader label="Collective" field="collective" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider">Type</span>
                  </th>
                  {visibleDefs.map((def) => (
                    <th key={def.key} className="px-3 py-3 text-center">
                      <SortHeader
                        label={`${def.label}${def.unit ? ` (${def.unit})` : ''}`}
                        field={def.key}
                        currentField={eventSort}
                        currentDir={eventDir}
                        onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)}
                        className="justify-center"
                      />
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">
                    <SortHeader label="Est. Hours" field="hours" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} className="justify-center" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4 + visibleDefs.length + 1} className="px-4 py-12 text-center text-sm text-primary-400">
                      No impact data matches your filters
                    </td>
                  </tr>
                ) : (
                  displayEvents.map((row) => (
                    <tr key={row.eventId} className="border-b border-primary-50 last:border-b-0 hover:bg-primary-25 transition-colors group">
                      <td className="px-4 py-3 text-xs text-primary-500 tabular-nums whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/events/${row.eventId}`} className="text-sm font-medium text-primary-800 hover:text-primary-600 transition-colors line-clamp-1">
                            {row.title}
                          </Link>
                          <ExternalLink size={12} className="text-primary-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          {row.isLegacy && <Badge variant="default" size="sm">Legacy</Badge>}
                        </div>
                        {row.attendance != null && <span className="text-[11px] text-primary-400">{row.attendance} attendees</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-primary-500 whitespace-nowrap">{row.collectiveName}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="activity" activity={activityToBadge(row.activityType)} size="sm">
                          {ACTIVITY_TYPE_LABELS[row.activityType] ?? row.activityType}
                        </Badge>
                      </td>
                      {visibleDefs.map((def) => (
                        <td key={def.key} className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">
                          {fmtMetric(row.metrics[def.key] ?? null, def)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">
                        {row.estimatedVolHours != null ? `${row.estimatedVolHours.toLocaleString()} hrs` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!showAllEvents && sortedEvents.length > 50 && (
            <div className="border-t border-primary-100 px-4 py-3 text-center">
              <button type="button" onClick={() => setShowAllEvents(true)} className="text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors cursor-pointer">
                Show all {sortedEvents.length} events
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Year-over-year + Data quality ── */}
      <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {yoyData && yoyData.length > 0 && (
          <motion.div variants={v.fadeUp}>
            <YoYChart data={yoyData} defs={activeDefs} rm={rm || !chartInView} />
          </motion.div>
        )}
        <motion.div variants={v.fadeUp}>
          <DataQualityPanel />
        </motion.div>
      </div>
    </motion.div>
  )
}
