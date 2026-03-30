import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IMPACT_SELECT_COLUMNS, sumMetric, computeEstimatedHours } from '@/lib/impact-metrics'

/* ------------------------------------------------------------------ */
/*  Admin dashboard data hooks                                         */
/*                                                                     */
/*  Extracted from pages/admin/index.tsx for reuse + prefetch.         */
/* ------------------------------------------------------------------ */

/* ── Date range helpers ── */

export type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

export function getDateRangeStart(range: DateRange): string | null {
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

export const dateRangeOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

/* ── Admin overview ── */

export interface AdminOverviewData {
  totalMembers: number
  totalCollectives: number
  totalEvents: number
  totalTrees: number
  totalHours: number
  totalRubbish: number
  totalArea: number
  totalNativePlants: number
  totalWildlife: number
  periodMembers: number
  periodEvents: number
}

async function fetchAdminOverview(dateRange: DateRange): Promise<AdminOverviewData> {
  const rangeStart = getDateRangeStart(dateRange)

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
      let q = supabase.from('event_impact').select(`${IMPACT_SELECT_COLUMNS}, events(date_start, date_end)`).range(0, 9999)
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

  const impact = (totalImpactRes.data ?? []) as unknown as Record<string, unknown>[]
  // Flatten nested events for computeEstimatedHours
  const impactWithEvents = impact.map((r) => ({
    ...r,
    events: r.events as { date_start: string; date_end: string | null } | null,
  }))
  return {
    totalMembers: totalMembersRes.count ?? 0,
    totalCollectives: totalCollectivesRes.count ?? 0,
    totalEvents: totalEventsRes.count ?? 0,
    totalTrees: sumMetric(impact, 'trees_planted'),
    totalHours: computeEstimatedHours(impactWithEvents),
    totalRubbish: Math.round(sumMetric(impact, 'rubbish_kg')),
    totalArea: Math.round(sumMetric(impact, 'area_restored_sqm')),
    totalNativePlants: sumMetric(impact, 'native_plants'),
    totalWildlife: sumMetric(impact, 'wildlife_sightings'),
    periodMembers: periodMembersRes.count ?? 0,
    periodEvents: periodEventsRes.count ?? 0,
  }
}

export function useAdminOverview(dateRange: DateRange) {
  return useQuery({
    queryKey: ['admin-overview', dateRange],
    queryFn: () => fetchAdminOverview(dateRange),
    staleTime: 2 * 60 * 1000,
  })
}

export function prefetchAdminOverview(queryClient: QueryClient, dateRange: DateRange = 'all') {
  return queryClient.prefetchQuery({
    queryKey: ['admin-overview', dateRange],
    queryFn: () => fetchAdminOverview(dateRange),
    staleTime: 2 * 60 * 1000,
  })
}

/* ── Trend data ── */

export interface TrendMonth {
  month: string
  members: number
  events: number
}

async function fetchTrendData(): Promise<TrendMonth[]> {
  const now = new Date()

  // Build all 6 month ranges up-front, then fetch in parallel
  const ranges = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthLabel = start.toLocaleDateString('en-AU', {
      month: 'short',
      year: '2-digit',
    })
    return { start, end, monthLabel }
  })

  const results = await Promise.all(
    ranges.map(async ({ start, end, monthLabel }) => {
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

      return {
        month: monthLabel,
        members: membersRes.count ?? 0,
        events: eventsRes.count ?? 0,
      }
    }),
  )

  return results
}

export function useTrendData() {
  return useQuery({
    queryKey: ['admin-trends'],
    queryFn: fetchTrendData,
    staleTime: 10 * 60 * 1000,
  })
}

export function prefetchTrendData(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ['admin-trends'],
    queryFn: fetchTrendData,
    staleTime: 10 * 60 * 1000,
  })
}
