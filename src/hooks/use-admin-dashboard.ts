import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { sumMetric } from '@/lib/impact-metrics'
import { fetchImpactRows, fetchBaselineSettings } from '@/lib/impact-query'

/* ------------------------------------------------------------------ */
/*  Admin dashboard data hooks                                         */
/* ------------------------------------------------------------------ */

/* ── Date range helpers ── */

export type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

export function getDateRangeStart(range: DateRange): string | null {
  const now = new Date()
  switch (range) {
    case 'week':    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'month':   return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    case 'quarter': return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
    case 'year':    return new Date(now.getFullYear(), 0, 1).toISOString()
    case 'all':     return null
  }
}

export const dateRangeOptions = [
  { value: 'week',    label: 'This Week' },
  { value: 'month',   label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year',    label: 'This Year' },
  { value: 'all',     label: 'All Time' },
]

/* ── Admin overview ── */

export interface AdminOverviewData {
  totalMembers: number
  totalCollectives: number
  totalEvents: number
  totalAttendees: number
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
  const isAllTime = dateRange === 'all'
  const now = new Date().toISOString()

  const [{ rows, eventCount }, baseline, membersRes, collectivesRes, periodMembersRes, periodEventsRes] =
    await Promise.all([
      fetchImpactRows({
        timeRange: isAllTime ? 'all-time' : 'custom',
        rangeStart: rangeStart ?? undefined,
      }),
      isAllTime ? fetchBaselineSettings() : Promise.resolve(null),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('collectives').select('id', { count: 'exact', head: true }),
      rangeStart
        ? supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', rangeStart)
        : Promise.resolve({ count: 0, error: null }),
      rangeStart
        ? supabase.from('events').select('id', { count: 'exact', head: true })
            .gte('date_start', rangeStart).lt('date_start', now)
        : Promise.resolve({ count: 0, error: null }),
    ])

  if (membersRes.error) throw membersRes.error
  if (collectivesRes.error) throw collectivesRes.error

  const b = baseline ?? { attendees: 0, events: 0, trees: 0, rubbishKg: 0, hours: 0 }

  return {
    totalMembers:      membersRes.count ?? 0,
    totalCollectives:  collectivesRes.count ?? 0,
    totalEvents:       eventCount                                        + (isAllTime ? b.events    : 0),
    totalAttendees:    Math.round(sumMetric(rows, 'attendees'))          + (isAllTime ? b.attendees : 0),
    totalTrees:        sumMetric(rows, 'trees_planted')                  + (isAllTime ? b.trees     : 0),
    totalHours:        Math.round(sumMetric(rows, 'hours_total'))        + (isAllTime ? b.hours     : 0),
    totalRubbish:      Math.round(sumMetric(rows, 'rubbish_kg')          + (isAllTime ? b.rubbishKg : 0)),
    totalArea:         Math.round(sumMetric(rows, 'area_restored_sqm')),
    totalNativePlants: sumMetric(rows, 'native_plants'),
    totalWildlife:     sumMetric(rows, 'wildlife_sightings'),
    periodMembers:     periodMembersRes.count ?? 0,
    periodEvents:      periodEventsRes.count ?? 0,
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

  const ranges = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthLabel = start.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' })
    return { start, end, monthLabel }
  })

  const results = await Promise.all(
    ranges.map(async ({ start, end, monthLabel }) => {
      const [membersRes, eventsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true })
          .gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('events').select('id', { count: 'exact', head: true })
          .gte('date_start', start.toISOString())
          .lte('date_start', new Date(Math.min(end.getTime(), now.getTime())).toISOString()),
      ])
      return { month: monthLabel, members: membersRes.count ?? 0, events: eventsRes.count ?? 0 }
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
