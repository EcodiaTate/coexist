import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Users,
  MapPin,
  CalendarDays,
  TreePine,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { Dropdown } from '@/components/dropdown'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

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
      const dateFilter = rangeStart
        ? (query: any) => query.gte('created_at', rangeStart)
        : (query: any) => query

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
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('event_impact').select('trees_planted, hours_total, rubbish_kg').limit(10000),
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
          : Promise.resolve({ count: 0 }),
      ])

      const impact = totalImpactRes.data ?? []
      const totalTrees = impact.reduce((s, r) => s + (r.trees_planted ?? 0), 0)
      const totalHours = impact.reduce((s, r) => s + (r.hours_total ?? 0), 0)
      const totalRubbish = impact.reduce((s, r) => s + (r.rubbish_kg ?? 0), 0)

      return {
        totalMembers: totalMembersRes.count ?? 0,
        totalCollectives: totalCollectivesRes.count ?? 0,
        totalEvents: totalEventsRes.count ?? 0,
        totalTrees,
        totalHours: Math.round(totalHours),
        totalRubbish: Math.round(totalRubbish),
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
            .lte('date_start', end.toISOString()),
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
  const max = Math.max(...data.map((d) => d[dataKey] as number), 1)

  return (
    <div className="bg-white rounded-xl border border-primary-100 p-4">
      <h3 className="font-heading text-sm font-semibold text-primary-800 mb-4">
        {label}
      </h3>
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const height = ((d[dataKey] as number) / max) * 100
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-primary-400 tabular-nums">
                {d[dataKey]}
              </span>
              <motion.div
                className={cn('w-full rounded-t-md min-h-[4px]', color)}
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
/*  Admin Dashboard Page                                               */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const { data, isLoading } = useAdminOverview(dateRange)
  const { data: trends } = useTrendData()

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
          </div>
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title="Dashboard"
      actions={
        <Dropdown
          options={dateRangeOptions}
          value={dateRange}
          onChange={(v) => setDateRange(v as DateRange)}
          className="w-40"
        />
      }
    >
      <div className="space-y-6">
        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            value={data?.totalMembers ?? 0}
            label="Total Members"
            icon={<Users size={20} />}
            trend={
              data?.periodMembers
                ? { value: data.periodMembers, direction: 'up' }
                : undefined
            }
          />
          <StatCard
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            icon={<MapPin size={20} />}
          />
          <StatCard
            value={data?.totalEvents ?? 0}
            label="Total Events"
            icon={<CalendarDays size={20} />}
            trend={
              data?.periodEvents
                ? { value: data.periodEvents, direction: 'up' }
                : undefined
            }
          />
          <StatCard
            value={data?.totalHours ?? 0}
            label="Volunteer Hours"
            icon={<Clock size={20} />}
          />
        </div>

        {/* Impact stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            value={data?.totalTrees ?? 0}
            label="Trees Planted"
            icon={<TreePine size={20} />}
            className="from-green-50 to-green-100/50 border-green-100"
          />
          <StatCard
            value={data?.totalRubbish ?? 0}
            label="Rubbish Collected (kg)"
            icon={
              <span className="text-lg" aria-hidden="true">
                &#9851;
              </span>
            }
            className="from-blue-50 to-blue-100/50 border-blue-100"
          />
          <StatCard
            value={data?.periodEvents ?? 0}
            label={`Events (${dateRangeOptions.find((o) => o.value === dateRange)?.label})`}
            icon={<TrendingUp size={20} />}
            className="from-white to-accent-100/50 border-accent-100"
          />
        </div>

        {/* Trend charts */}
        {trends && trends.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
          </div>
        )}

        {/* Geographic placeholder */}
        <div className="bg-white rounded-xl border border-primary-100 p-6">
          <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">
            Geographic Activity
          </h3>
          <div className="h-64 bg-white rounded-lg flex items-center justify-center">
            <p className="text-sm text-primary-400">
              Heat map - connect to Mapbox for live geographic data
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
