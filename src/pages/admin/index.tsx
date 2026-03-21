import { useState, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Users,
  MapPin,
  CalendarDays,
  TreePine,
  TrendingUp,
  Clock,
  Waves,
  Leaf,
  Eye,
  UserCheck,
  ClipboardCheck,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Skeleton } from '@/components/skeleton'
import { Dropdown } from '@/components/dropdown'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useCountUp } from '@/components/stat-card'

/* ------------------------------------------------------------------ */
/*  Date range helpers                                                 */
/* ------------------------------------------------------------------ */

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

function getDateRangeStart(range: DateRange): string | null {
  const now = new Date()
  switch (range) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    case 'quarter':
      return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
    case 'year':
      return new Date(now.getFullYear(), 0, 1).toISOString()
    case 'all':
      return null
  }
}

const dateRangeOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */

function useAdminOverview(dateRange: DateRange) {
  const rangeStart = getDateRangeStart(dateRange)

  return useQuery({
    queryKey: ['admin-overview', dateRange],
    queryFn: async () => {
      // All-time counts
      const [
        totalMembersRes,
        totalCollectivesRes,
        totalEventsRes,
        totalImpactRes,
        periodMembersRes,
        periodEventsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).lt('date_start', new Date().toISOString()),
        (() => {
          let q = supabase.from('event_impact').select('trees_planted, hours_total, rubbish_kg, coastline_cleaned_m, area_restored_sqm, native_plants, wildlife_sightings')
          if (rangeStart) q = q.gte('logged_at', rangeStart)
          return q
        })(),
        rangeStart
          ? supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', rangeStart)
          : Promise.resolve({ count: 0 }),
        rangeStart
          ? supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', rangeStart)
              .lt('date_start', new Date().toISOString())
          : Promise.resolve({ count: 0 }),
      ])

      const impact = (totalImpactRes.data ?? []) as any[]
      const totalTrees = impact.reduce((s: number, r: any) => s + (r.trees_planted ?? 0), 0)
      const totalHours = impact.reduce((s: number, r: any) => s + (r.hours_total ?? 0), 0)
      const totalRubbish = impact.reduce((s: number, r: any) => s + (r.rubbish_kg ?? 0), 0)
      const totalCoastline = impact.reduce((s: number, r: any) => s + (r.coastline_cleaned_m ?? 0), 0)
      const totalArea = impact.reduce((s: number, r: any) => s + (r.area_restored_sqm ?? 0), 0)
      const totalNativePlants = impact.reduce((s: number, r: any) => s + (r.native_plants ?? 0), 0)
      const totalWildlife = impact.reduce((s: number, r: any) => s + (r.wildlife_sightings ?? 0), 0)

      // Attendance rate (national)
      const { count: totalRegistered } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .in('status', ['registered', 'attended'])
      const { count: totalAttended } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'attended')
      const attendanceRate = totalRegistered && totalRegistered > 0
        ? Math.round(((totalAttended ?? 0) / totalRegistered) * 100)
        : 0

      // Survey responses count
      const { count: surveyResponses } = await (supabase as any)
        .from('post_event_survey_responses')
        .select('id', { count: 'exact', head: true })

      return {
        totalMembers: totalMembersRes.count ?? 0,
        totalCollectives: totalCollectivesRes.count ?? 0,
        totalEvents: totalEventsRes.count ?? 0,
        totalTrees,
        totalHours: Math.round(totalHours),
        totalRubbish: Math.round(totalRubbish),
        totalCoastline: Math.round(totalCoastline),
        totalArea: Math.round(totalArea),
        totalNativePlants,
        totalWildlife,
        attendanceRate,
        surveyResponses: surveyResponses ?? 0,
        periodMembers: periodMembersRes.count ?? 0,
        periodEvents: periodEventsRes.count ?? 0,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useTrendData() {
  return useQuery({
    queryKey: ['admin-trends'],
    queryFn: async () => {
      // Get monthly member growth for last 6 months
      const months: { month: string; members: number; events: number }[] = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthLabel = start.toLocaleDateString('en-AU', {
          month: 'short',
          year: '2-digit',
        })

        const [membersRes, eventsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .gte('date_start', start.toISOString())
            .lte('date_start', new Date(Math.min(end.getTime(), now.getTime())).toISOString()),
        ])

        months.push({
          month: monthLabel,
          members: membersRes.count ?? 0,
          events: eventsRes.count ?? 0,
        })
      }

      return months
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Simple bar chart                                                   */
/* ------------------------------------------------------------------ */

function SimpleBarChart({
  data,
  dataKey,
  label,
  color,
}: {
  data: { month: string; [key: string]: any }[]
  dataKey: string
  label: string
  color: string
}) {
  const shouldReduceMotion = useReducedMotion()
  const values = data.map((d) => d[dataKey] as number)
  const max = Math.max(...values, 1)
  const mean = values.reduce((a, b) => a + b, 0) / values.length || 1
  // Scale so the mean sits at ~60% height, but cap at 100%
  const scale = max > 0 ? Math.max(max, mean * 1.65) : 1

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-heading text-sm font-semibold text-primary-800 mb-4">
        {label}
      </h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const val = d[dataKey] as number
          const height = val > 0 ? Math.max((val / scale) * 100, 8) : 0
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-primary-400 tabular-nums">
                {d[dataKey]}
              </span>
              <motion.div
                className={cn('w-full rounded-t-md', color, height > 0 && 'min-h-[4px]')}
                initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
              />
              <span className="text-[10px] text-primary-400">{d.month}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero stat — big number, no card                                    */
/* ------------------------------------------------------------------ */

function HeroStat({
  value,
  label,
  icon,
  sub,
  accent,
  reducedMotion,
}: {
  value: number
  label: string
  icon: React.ReactNode
  sub?: string
  accent?: string
  reducedMotion: boolean
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  return (
    <div className="py-2 text-center" aria-label={`${label}: ${value}`}>
      <p
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        className={cn(
          'text-4xl lg:text-5xl font-bold tracking-tight tabular-nums',
          accent ?? 'text-primary-800',
        )}
      >
        {display.toLocaleString()}
      </p>
      <div className="mt-1.5 inline-flex items-center gap-1.5 text-primary-400">
        <span className="shrink-0" aria-hidden="true">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {sub && (
        <p className="mt-0.5 text-xs text-accent-600 font-medium">{sub}</p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Admin Dashboard Page                                               */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const { data, isLoading } = useAdminOverview(dateRange)
  const { data: trends } = useTrendData()

  const actions = useMemo(
    () => (
      <Dropdown
        options={dateRangeOptions}
        value={dateRange}
        onChange={(v) => setDateRange(v as DateRange)}
        className="w-40"
      />
    ),
    [dateRange, setDateRange],
  )

  const shouldReduceMotion = useReducedMotion()

  useAdminHeader('Dashboard', actions)

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-2 space-y-2">
              <Skeleton className="h-12 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <Skeleton variant="card" />
      </div>
    )
  }

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div className="space-y-8" variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
        {/* Primary stats — big & bold */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <HeroStat
            value={data?.totalMembers ?? 0}
            label="Members"
            icon={<Users size={18} />}
            sub={data?.periodMembers ? `+${data.periodMembers} this period` : undefined}
            reducedMotion={!!shouldReduceMotion}
          />
          <HeroStat
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            icon={<MapPin size={18} />}
            reducedMotion={!!shouldReduceMotion}
          />
          <HeroStat
            value={data?.totalEvents ?? 0}
            label="Events"
            icon={<CalendarDays size={18} />}
            sub={data?.periodEvents ? `+${data.periodEvents} this period` : undefined}
            reducedMotion={!!shouldReduceMotion}
          />
          <HeroStat
            value={data?.totalHours ?? 0}
            label="Volunteer Hours"
            icon={<Clock size={18} />}
            reducedMotion={!!shouldReduceMotion}
          />
        </motion.div>

        {/* Impact row */}
        <motion.div variants={fadeUp} className="border-t border-primary-100 pt-6 grid grid-cols-3 gap-6">
          <HeroStat
            value={data?.totalTrees ?? 0}
            label="Trees Planted"
            icon={<TreePine size={18} />}
            accent="text-accent-700"
            reducedMotion={!!shouldReduceMotion}
          />
          <HeroStat
            value={data?.totalRubbish ?? 0}
            label="Rubbish (kg)"
            icon={<span className="text-base" aria-hidden="true">&#9851;</span>}
            accent="text-primary-600"
            reducedMotion={!!shouldReduceMotion}
          />
          {(data?.totalCoastline ?? 0) > 0 && (
            <HeroStat
              value={data?.totalCoastline ?? 0}
              label="Coastline (m)"
              icon={<Waves size={18} />}
              accent="text-info-600"
              reducedMotion={!!shouldReduceMotion}
            />
          )}
          {(data?.totalArea ?? 0) > 0 && (
            <HeroStat
              value={data?.totalArea ?? 0}
              label="Area (sqm)"
              icon={<MapPin size={18} />}
              accent="text-primary-500"
              reducedMotion={!!shouldReduceMotion}
            />
          )}
          {(data?.totalNativePlants ?? 0) > 0 && (
            <HeroStat
              value={data?.totalNativePlants ?? 0}
              label="Native Plants"
              icon={<Leaf size={18} />}
              accent="text-success-600"
              reducedMotion={!!shouldReduceMotion}
            />
          )}
          {(data?.totalWildlife ?? 0) > 0 && (
            <HeroStat
              value={data?.totalWildlife ?? 0}
              label="Wildlife Sightings"
              icon={<Eye size={18} />}
              accent="text-warning-600"
              reducedMotion={!!shouldReduceMotion}
            />
          )}
          <HeroStat
            value={data?.attendanceRate ?? 0}
            label="Attendance Rate (%)"
            icon={<UserCheck size={18} />}
            accent="text-success-600"
            reducedMotion={!!shouldReduceMotion}
          />
          <HeroStat
            value={data?.surveyResponses ?? 0}
            label="Survey Responses"
            icon={<ClipboardCheck size={18} />}
            accent="text-info-600"
            reducedMotion={!!shouldReduceMotion}
          />
          <HeroStat
            value={data?.periodEvents ?? 0}
            label={`Events \u00b7 ${dateRangeOptions.find((o) => o.value === dateRange)?.label}`}
            icon={<TrendingUp size={18} />}
            accent="text-primary-500"
            reducedMotion={!!shouldReduceMotion}
          />
        </motion.div>

        {/* Trend charts */}
        {trends && trends.length > 0 && (
          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SimpleBarChart
              data={trends}
              dataKey="members"
              label="Member Growth"
              color="bg-primary-400"
            />
            <SimpleBarChart
              data={trends}
              dataKey="events"
              label="Event Frequency"
              color="bg-accent-400"
            />
          </motion.div>
        )}

        {/* Geographic placeholder */}
        <motion.div variants={fadeUp} className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">
            Geographic Activity
          </h3>
          <div className="h-64 bg-white rounded-lg flex items-center justify-center">
            <p className="text-sm text-primary-400">
              Heat map - connect to Mapbox for live geographic data
            </p>
          </div>
        </motion.div>
      </motion.div>
  )
}
