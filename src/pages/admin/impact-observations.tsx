import { useState, useMemo, useRef } from 'react'
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
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow } from '@/components/admin-hero-stat'
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
import { dateRangeOptions, type DateRange } from '@/hooks/use-admin-dashboard'
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_LABELS } from '@/hooks/use-events'
import { useCollectives } from '@/hooks/use-collective'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function fmtNum(n: number | null, unit?: string) {
  if (n == null || n === 0) return '-'
  const s = n.toLocaleString('en-AU')
  return unit ? `${s} ${unit}` : s
}

function fmtDec(n: number | null, unit?: string) {
  if (n == null || n === 0) return '-'
  const s = n.toLocaleString('en-AU', { maximumFractionDigits: 1 })
  return unit ? `${s} ${unit}` : s
}

/** Convert DB activity_type (underscore) to Badge activity variant (hyphen) */
function activityToBadge(type: string) {
  return type.replace(/_/g, '-') as Parameters<typeof Badge>[0] extends { activity: infer A } ? A : never
}

/* ------------------------------------------------------------------ */
/*  Sort state                                                         */
/* ------------------------------------------------------------------ */

type SortField = 'date' | 'title' | 'collective' | 'trees' | 'rubbish' | 'weeds' | 'hours'
type SortDir = 'asc' | 'desc'

function sortRows(rows: EventImpactRow[], field: SortField, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'date': return m * (new Date(a.date).getTime() - new Date(b.date).getTime())
      case 'title': return m * a.title.localeCompare(b.title)
      case 'collective': return m * a.collectiveName.localeCompare(b.collectiveName)
      case 'trees': return m * ((a.treesPlanted ?? 0) - (b.treesPlanted ?? 0))
      case 'rubbish': return m * ((a.rubbishKg ?? 0) - (b.rubbishKg ?? 0))
      case 'weeds': return m * ((a.invasiveWeedsPulled ?? 0) - (b.invasiveWeedsPulled ?? 0))
      case 'hours': return m * ((a.hoursTotal ?? a.estimatedVolHours ?? 0) - (b.hoursTotal ?? b.estimatedVolHours ?? 0))
      default: return 0
    }
  })
}

type CollectiveSortField = 'name' | 'events' | 'trees' | 'rubbish' | 'weeds' | 'hours' | 'attendees'

function sortCollectives(rows: CollectiveBreakdown[], field: CollectiveSortField, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'name': return m * a.name.localeCompare(b.name)
      case 'events': return m * (a.eventCount - b.eventCount)
      case 'trees': return m * (a.trees - b.trees)
      case 'rubbish': return m * (a.rubbish - b.rubbish)
      case 'weeds': return m * (a.weeds - b.weeds)
      case 'hours': return m * (a.hours - b.hours)
      case 'attendees': return m * (a.attendees - b.attendees)
      default: return 0
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Sortable header cell                                               */
/* ------------------------------------------------------------------ */

function SortHeader<T extends string>({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className,
}: {
  label: string
  field: T
  currentField: T
  currentDir: SortDir
  onSort: (f: T) => void
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
/*  Year-over-year chart                                               */
/* ------------------------------------------------------------------ */

function YoYChart({ data, rm }: { data: YearSummary[]; rm: boolean }) {
  const metrics = [
    { key: 'attendees' as const, label: 'Attendees', color: 'from-warning-400 to-warning-500', unit: '' },
    { key: 'trees' as const, label: 'Trees', color: 'from-moss-400 to-moss-500', unit: '' },
    { key: 'rubbish' as const, label: 'Rubbish', color: 'from-sky-400 to-sky-500', unit: 'kg' },
    { key: 'hours' as const, label: 'Est. Vol Hours', color: 'from-bark-400 to-bark-500', unit: '' },
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
              {metrics.map((m) => {
                const val = d[m.key]
                const max = Math.max(...data.map((x) => x[m.key]), 1)
                return (
                  <div key={m.key} className="flex items-center gap-2">
                    <div className="w-20 text-[10px] text-primary-400 text-right truncate">{m.label}</div>
                    <div className="flex-1 h-3.5 bg-primary-50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r', m.color)}
                        initial={rm ? { width: `${(val / max) * 100}%` } : { width: 0 }}
                        animate={{ width: `${Math.max((val / max) * 100, val > 0 ? 2 : 0)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="w-16 text-[11px] font-semibold text-primary-700 tabular-nums text-right">
                      {val > 0 ? `${val.toLocaleString()}${m.unit ? ` ${m.unit}` : ''}` : '-'}
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
        {/* Source breakdown */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-primary-500 font-medium">Data Source</span>
            <span className="text-primary-400">{total} impact logs</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-primary-50">
            <div
              className="bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-500"
              style={{ width: `${legacyPct}%` }}
              title={`Legacy: ${data.legacyCount}`}
            />
            <div
              className="bg-gradient-to-r from-sprout-400 to-sprout-500 transition-all duration-500"
              style={{ width: `${100 - legacyPct}%` }}
              title={`App: ${data.appCount}`}
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

        {/* Issue indicators */}
        {data.eventsWithoutImpact > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-50 border border-warning-200/50">
            <AlertTriangle size={14} className="text-warning-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-warning-700">
                {data.eventsWithoutImpact} completed event{data.eventsWithoutImpact !== 1 ? 's' : ''} without impact logs
              </p>
              <p className="text-[11px] text-warning-500 mt-0.5">
                Leaders haven't submitted impact data yet
              </p>
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
              <p className="text-[11px] text-primary-400 mt-0.5">
                Recreational events or missing data entry
              </p>
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

  /* ── Data ── */
  const { data, isLoading } = useImpactObservations(filters)
  const { data: yoyData } = useYearOverYear()
  const { data: collectives } = useCollectives()
  const showLoading = useDelayedLoading(isLoading)

  /* ── Sort state ── */
  const [eventSort, setEventSort] = useState<SortField>('date')
  const [eventDir, setEventDir] = useState<SortDir>('desc')
  const [collSort, setCollSort] = useState<CollectiveSortField>('events')
  const [collDir, setCollDir] = useState<SortDir>('desc')
  const [showAllEvents, setShowAllEvents] = useState(false)

  const toggleEventSort = (f: SortField) => {
    if (eventSort === f) setEventDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setEventSort(f); setEventDir('desc') }
  }

  const toggleCollSort = (f: CollectiveSortField) => {
    if (collSort === f) setCollDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setCollSort(f); setCollDir('desc') }
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
    () => [
      { value: '', label: 'All Collectives' },
      ...(collectives ?? []).map((c) => ({ value: c.id, label: c.name })),
    ],
    [collectives],
  )

  const activityOptions = useMemo(
    () => [
      { value: '', label: 'All Types' },
      ...ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    ],
    [],
  )

  /* ── InView for chart ── */
  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-60px' })

  /* ── Loading ── */
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
        <Dropdown
          options={dateRangeOptions}
          value={dateRange}
          onChange={(v) => setDateRange(v as DateRange)}
          className="w-36"
        />
        <Dropdown
          options={collectiveOptions}
          value={collectiveId}
          onChange={setCollectiveId}
          className="w-44"
        />
        <Dropdown
          options={activityOptions}
          value={activityType}
          onChange={setActivityType}
          className="w-40"
        />
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search events..."
          compact
          className="flex-1 min-w-[160px]"
        />
      </motion.div>

      {/* ── Summary cards ── */}
      <motion.div variants={v.fadeUp}>
        <AdminHeroStatRow>
          <AdminHeroStat
            value={data?.summary.totalEvents ?? 0}
            label="Events"
            icon={<BarChart3 size={18} />}
            color="primary"
            reducedMotion={rm}
            delay={0}
          />
          <AdminHeroStat
            value={data?.summary.totalAttendees ?? 0}
            label="Attendees"
            icon={<Users size={18} />}
            color="warning"
            reducedMotion={rm}
            delay={0.05}
          />
          <AdminHeroStat
            value={data?.summary.totalTrees ?? 0}
            label="Trees Planted"
            icon={<TreePine size={18} />}
            color="moss"
            reducedMotion={rm}
            delay={0.1}
          />
          <AdminHeroStat
            value={data?.summary.totalRubbish ?? 0}
            label="Rubbish (kg)"
            icon={<Trash2 size={18} />}
            color="sky"
            reducedMotion={rm}
            delay={0.15}
          />
          <AdminHeroStat
            value={data?.summary.totalWeeds ?? 0}
            label="Weeds Pulled"
            icon={<Sprout size={18} />}
            color="sprout"
            reducedMotion={rm}
            delay={0.2}
          />
          <AdminHeroStat
            value={data?.summary.totalHours ?? 0}
            label="Est. Vol Hours"
            icon={<Clock size={18} />}
            color="bark"
            reducedMotion={rm}
            delay={0.25}
          />
        </AdminHeroStatRow>
      </motion.div>

      {/* ── Per-collective breakdown ── */}
      {sortedCollectives.length > 0 && (
        <motion.div variants={v.fadeUp}>
          <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
            By Collective
          </h2>
          <div className="rounded-2xl bg-white shadow-md border border-primary-100/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="px-4 py-3 text-left">
                      <SortHeader label="Collective" field="name" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Events" field="events" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Attendees" field="attendees" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Trees" field="trees" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Rubbish (kg)" field="rubbish" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Weeds" field="weeds" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Est. Hours" field="hours" currentField={collSort} currentDir={collDir} onSort={toggleCollSort} className="justify-center" />
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
                      <td className="px-4 py-3 text-left">
                        <span className="font-semibold text-primary-800 text-sm">{c.name}</span>
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{c.eventCount}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(c.attendees)}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(c.trees)}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtDec(c.rubbish)}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(c.weeds)}</td>
                      <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtDec(c.hours)}</td>
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
          <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">
            Event Impact Log
          </h2>
          {sortedEvents.length > 0 && (
            <span className="text-xs text-primary-400 font-medium">
              {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="rounded-2xl bg-white shadow-md border border-primary-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Date" field="date" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} />
                  </th>
                  <th className="px-3 py-3 text-left min-w-[180px]">
                    <SortHeader label="Event" field="title" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortHeader label="Collective" field="collective" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider">Type</span>
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHeader label="Trees" field="trees" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} className="justify-center" />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHeader label="Rubbish (kg)" field="rubbish" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} className="justify-center" />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHeader label="Weeds" field="weeds" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} className="justify-center" />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHeader label="Est. Hours" field="hours" currentField={eventSort} currentDir={eventDir} onSort={toggleEventSort} className="justify-center" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-primary-400">
                      No impact data matches your filters
                    </td>
                  </tr>
                ) : (
                  displayEvents.map((row) => {
                    const hours = row.hoursTotal ?? row.estimatedVolHours
                    return (
                      <tr
                        key={row.eventId}
                        className="border-b border-primary-50 last:border-b-0 hover:bg-primary-25 transition-colors group"
                      >
                        <td className="px-4 py-3 text-xs text-primary-500 tabular-nums whitespace-nowrap">
                          {fmtDate(row.date)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/events/${row.eventId}`}
                              className="text-sm font-medium text-primary-800 hover:text-primary-600 transition-colors line-clamp-1"
                            >
                              {row.title}
                            </Link>
                            <ExternalLink size={12} className="text-primary-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            {row.isLegacy && (
                              <Badge variant="default" size="sm">Legacy</Badge>
                            )}
                          </div>
                          {row.attendance != null && (
                            <span className="text-[11px] text-primary-400">{row.attendance} attendees</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-primary-500 whitespace-nowrap">
                          {row.collectiveName}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant="activity" activity={activityToBadge(row.activityType)} size="sm">
                            {ACTIVITY_TYPE_LABELS[row.activityType] ?? row.activityType}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(row.treesPlanted)}</td>
                        <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtDec(row.rubbishKg, 'kg')}</td>
                        <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtNum(row.invasiveWeedsPulled)}</td>
                        <td className="px-3 py-3 text-center font-medium text-primary-700 tabular-nums">{fmtDec(hours, 'hrs')}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Show more */}
          {!showAllEvents && sortedEvents.length > 50 && (
            <div className="border-t border-primary-100 px-4 py-3 text-center">
              <button
                type="button"
                onClick={() => setShowAllEvents(true)}
                className="text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors cursor-pointer"
              >
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
            <YoYChart data={yoyData} rm={rm || !chartInView} />
          </motion.div>
        )}
        <motion.div variants={v.fadeUp}>
          <DataQualityPanel />
        </motion.div>
      </div>
    </motion.div>
  )
}
