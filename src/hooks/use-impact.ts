import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { IMPACT_SELECT_COLUMNS, sumMetric } from '@/lib/impact-metrics'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Split an array into chunks to avoid Supabase URL length limits */
function chunks<T>(arr: T[], size = 50): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}


/* ------------------------------------------------------------------ */
/*  Canonical impact metrics                                           */
/* ------------------------------------------------------------------ */

/**
 * Canonical Co-Exist dashboard impact shape.
 * "leadersEmpowered" is a cumulative counter stored in app_settings
 * (seeded from collective_members, incremented by DB trigger on new
 * leadership role assignments — never decremented).
 */
export interface CanonicalImpact {
  /* Community Events */
  eventsAttended: number
  volunteerHours: number
  eventsHeld: number
  /* Land Restoration Projects */
  treesPlanted: number
  invasiveWeedsPulled: number
  /* Cleanup Sites */
  rubbishCollectedTonnes: number
  cleanupSites: number
  coastlineCleanedM: number
  /* Organisational */
  collectivesCount: number
  leadersEmpowered: number
}

/* ------------------------------------------------------------------ */
/*  National (aggregate) impact                                        */
/* ------------------------------------------------------------------ */

export interface NationalImpact extends CanonicalImpact {
  totalMembers: number
}

type TimeRange = 'all-time' | 'current-year'

// Baseline checkpoint date — impact rows before this date are replaced by
// the seeded baseline numbers in app_settings.
const IMPACT_BASELINE_DATE = '2025-12-31'

export function useNationalImpact(timeRange: TimeRange = 'all-time') {
  return useQuery({
    queryKey: ['national-impact', timeRange],
    queryFn: async (): Promise<NationalImpact> => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const baselineDate = new Date(IMPACT_BASELINE_DATE).toISOString()

      // Fetch baseline numbers from app_settings (seeded from historical spreadsheet)
      const baselineRes = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'impact_baseline_attendees',
          'impact_baseline_trees',
          'impact_baseline_rubbish_kg',
        ])
      const baselineMap: Record<string, number> = {}
      for (const row of (baselineRes.data ?? [])) {
        baselineMap[row.key] = (row.value as { count?: number })?.count ?? 0
      }
      const baselineAttendees = baselineMap['impact_baseline_attendees'] ?? 0
      const baselineTrees     = baselineMap['impact_baseline_trees'] ?? 0
      const baselineRubbishKg = baselineMap['impact_baseline_rubbish_kg'] ?? 0

      // Only sum event_impact rows logged on/after the baseline date, excluding legacy imports
      // (legacy rows have recent logged_at timestamps from when they were bulk-imported)
      let impactQuery = supabase
        .from('event_impact')
        .select(`${IMPACT_SELECT_COLUMNS}, event_id`)
        .gte('logged_at', baselineDate)
        .not('notes', 'like', 'Legacy import:%')
        .range(0, 9999)
      if (timeRange === 'current-year') {
        impactQuery = impactQuery.gte('logged_at', yearStart > baselineDate ? yearStart : baselineDate)
      }

      // Only count events on/after the baseline date
      let eventsQuery = supabase
        .from('events')
        .select('id, activity_type', { count: 'exact' })
        .lt('date_start', new Date().toISOString())
        .gte('date_start', baselineDate)
      if (timeRange === 'current-year') {
        eventsQuery = eventsQuery.gte('date_start', yearStart > baselineDate ? yearStart : baselineDate)
      }

      // Cleanup events — fetch addresses so we can count unique sites (post-baseline only)
      let cleanupQuery = supabase
        .from('events')
        .select('id, address')
        .in('activity_type', ['shore_cleanup', 'marine_restoration'])
        .lt('date_start', new Date().toISOString())
        .gte('date_start', baselineDate)
      if (timeRange === 'current-year') {
        cleanupQuery = cleanupQuery.gte('date_start', yearStart > baselineDate ? yearStart : baselineDate)
      }

      // Leaders empowered — cumulative counter from app_settings
      const leadersCountQuery = supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'leaders_empowered_total')
        .single()

      const [impactRes, eventsRes, membersRes, collectivesRes, cleanupRes, leadersCountRes] = await Promise.all([
        impactQuery,
        eventsQuery,
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        cleanupQuery,
        leadersCountQuery,
      ])

      if (impactRes.error) throw impactRes.error
      if (eventsRes.error) throw eventsRes.error
      if (membersRes.error) throw membersRes.error
      if (collectivesRes.error) throw collectivesRes.error
      if (cleanupRes.error) throw cleanupRes.error
      // leadersCountRes may not exist yet — don't throw

      const logs = (impactRes.data ?? []) as unknown as Record<string, unknown>[]

      // Count attendance from registrations on/after baseline date
      let attendanceQuery = supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'attended')
        .gte('registered_at', baselineDate)
      if (timeRange === 'current-year') {
        attendanceQuery = attendanceQuery.gte('registered_at', yearStart > baselineDate ? yearStart : baselineDate)
      }
      const { count: attendanceCount } = await attendanceQuery

      // Count unique cleanup sites by address (post-baseline)
      const cleanupAddresses = new Set(
        (cleanupRes.data ?? []).map((e: { address: string | null }) => (e.address ?? '').trim().toLowerCase()).filter(Boolean)
      )

      // For all-time view: add baseline numbers on top of post-baseline sums
      const isAllTime = timeRange === 'all-time'

      return {
        eventsAttended: (attendanceCount ?? 0) + (isAllTime ? baselineAttendees : 0),
        volunteerHours: Math.round(sumMetric(logs, 'hours_total')),
        eventsHeld: eventsRes.count ?? 0,
        treesPlanted: sumMetric(logs, 'trees_planted') + (isAllTime ? baselineTrees : 0),
        invasiveWeedsPulled: sumMetric(logs, 'invasive_weeds_pulled'),
        rubbishCollectedTonnes: Math.round(((sumMetric(logs, 'rubbish_kg') + (isAllTime ? baselineRubbishKg : 0)) / 1000) * 100) / 100,
        cleanupSites: cleanupAddresses.size,
        coastlineCleanedM: Math.round(sumMetric(logs, 'coastline_cleaned_m')),
        collectivesCount: collectivesRes.count ?? 0,
        leadersEmpowered: (leadersCountRes.data?.value as { count?: number })?.count ?? 0,
        totalMembers: membersRes.count ?? 0,
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective impact (for home page toggle)                           */
/* ------------------------------------------------------------------ */

export function useCollectiveImpact(collectiveId: string | undefined, timeRange: TimeRange = 'all-time') {
  return useQuery({
    queryKey: ['collective-impact', collectiveId, timeRange],
    queryFn: async (): Promise<CanonicalImpact | null> => {
      if (!collectiveId) return null
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
      const baselineDate = new Date(IMPACT_BASELINE_DATE).toISOString()

      // Only sum event_impact rows logged on/after the baseline date, excluding legacy imports
      let impactQuery = supabase
        .from('event_impact')
        .select(`${IMPACT_SELECT_COLUMNS}, event_id, events!inner(collective_id)`)
        .eq('events.collective_id', collectiveId)
        .gte('logged_at', baselineDate)
        .not('notes', 'like', 'Legacy import:%')
      if (timeRange === 'current-year') {
        impactQuery = impactQuery.gte('logged_at', yearStart > baselineDate ? yearStart : baselineDate)
      }

      let cleanupQuery = supabase
        .from('events')
        .select('id, address')
        .eq('collective_id', collectiveId)
        .in('activity_type', ['shore_cleanup', 'marine_restoration'])
        .lt('date_start', new Date().toISOString())
        .gte('date_start', baselineDate)
      if (timeRange === 'current-year') {
        cleanupQuery = cleanupQuery.gte('date_start', yearStart > baselineDate ? yearStart : baselineDate)
      }

      let eventsQuery = supabase
        .from('events')
        .select('id', { count: 'exact' })
        .eq('collective_id', collectiveId)
        .lt('date_start', new Date().toISOString())
        .gte('date_start', baselineDate)
      if (timeRange === 'current-year') {
        eventsQuery = eventsQuery.gte('date_start', yearStart > baselineDate ? yearStart : baselineDate)
      }

      const leadersCountQuery = supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'leaders_empowered:' + collectiveId)
        .single()

      const [impactRes, cleanupRes, eventsRes, leadersCountRes] = await Promise.all([impactQuery, cleanupQuery, eventsQuery, leadersCountQuery])

      const rows = (impactRes.data ?? []) as unknown as Record<string, unknown>[]

      // Count attendances for this collective's post-baseline events
      const allEventIds = (eventsRes.data ?? []).map((e) => e.id)

      let attendanceCount = 0
      const chunkResults = await Promise.all(
        chunks(allEventIds).map((chunk) =>
          supabase
            .from('event_registrations')
            .select('id', { count: 'exact', head: true })
            .in('event_id', chunk)
            .eq('status', 'attended'),
        ),
      )
      for (const { count } of chunkResults) attendanceCount += count ?? 0

      const cleanupAddresses = new Set(
        (cleanupRes.data ?? []).map((e: { address: string | null }) => (e.address ?? '').trim().toLowerCase()).filter(Boolean)
      )
      return {
        eventsAttended: attendanceCount,
        volunteerHours: Math.round(sumMetric(rows, 'hours_total')),
        eventsHeld: eventsRes.count ?? 0,
        treesPlanted: sumMetric(rows, 'trees_planted'),
        invasiveWeedsPulled: sumMetric(rows, 'invasive_weeds_pulled'),
        rubbishCollectedTonnes: Math.round((sumMetric(rows, 'rubbish_kg') / 1000) * 100) / 100,
        cleanupSites: cleanupAddresses.size,
        coastlineCleanedM: Math.round(sumMetric(rows, 'coastline_cleaned_m')),
        collectivesCount: 1,
        leadersEmpowered: (leadersCountRes.data?.value as { count?: number })?.count ?? 0,
      }
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Custom metrics aggregation (for surfaces that need them)           */
/* ------------------------------------------------------------------ */

export interface AggregatedCustomMetric {
  key: string
  total: number
}

/**
 * Aggregate custom_metrics JSONB across event_impact rows.
 * Returns top custom metrics by total value, excluding builtins.
 */
function aggregateCustomMetrics(
  rows: Record<string, unknown>[],
  limit?: number,
): AggregatedCustomMetric[] {
  const totals = new Map<string, number>()
  for (const row of rows) {
    const cm = row.custom_metrics as Record<string, unknown> | null
    if (!cm || typeof cm !== 'object') continue
    for (const [key, val] of Object.entries(cm)) {
      const n = Number(val) || 0
      if (n > 0) totals.set(key, (totals.get(key) ?? 0) + n)
    }
  }
  const sorted = Array.from(totals.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total)
  return limit ? sorted.slice(0, limit) : sorted
}

/** Custom metrics for a single collective */
export function useCollectiveCustomMetrics(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['collective-custom-metrics', collectiveId],
    queryFn: async (): Promise<AggregatedCustomMetric[]> => {
      if (!collectiveId) return []
      const { data, error } = await supabase
        .from('event_impact')
        .select('custom_metrics, events!inner(collective_id)')
        .eq('events.collective_id', collectiveId)
      if (error) throw error
      return aggregateCustomMetrics((data ?? []) as unknown as Record<string, unknown>[])
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/** Top custom metrics nationally (for national dashboard) */
export function useNationalCustomMetrics(limit = 5) {
  return useQuery({
    queryKey: ['national-custom-metrics', limit],
    queryFn: async (): Promise<AggregatedCustomMetric[]> => {
      const { data, error } = await supabase
        .from('event_impact')
        .select('custom_metrics')
        .not('custom_metrics', 'is', null)
      if (error) throw error
      return aggregateCustomMetrics((data ?? []) as unknown as Record<string, unknown>[], limit)
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Per-user impact                                                    */
/* ------------------------------------------------------------------ */

export type PersonalImpact = CanonicalImpact

export function useImpactStats(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['impact-stats', id],
    queryFn: async (): Promise<PersonalImpact> => {
      if (!id) throw new Error('No user ID')

      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', id)
        .eq('status', 'attended')

      const eventIds = registrations?.map((r) => r.event_id) ?? []
      const eventsAttended = eventIds.length

      if (eventIds.length === 0) {
        return {
          eventsAttended: 0,
          volunteerHours: 0,
          eventsHeld: 0,
          treesPlanted: 0,
          invasiveWeedsPulled: 0,
          rubbishCollectedTonnes: 0,
          cleanupSites: 0,
          coastlineCleanedM: 0,
          collectivesCount: 0,
          leadersEmpowered: 0,
        }
      }

      // Batch event_impact and cleanup queries to avoid URL length limits
      const fetchImpacts = async () => {
        const rows: Record<string, number | null>[] = []
        for (const chunk of chunks(eventIds)) {
          const { data } = await supabase
            .from('event_impact')
            .select(IMPACT_SELECT_COLUMNS)
            .in('event_id', chunk)
          if (data) rows.push(...(data as unknown as Record<string, number | null>[]))
        }
        return rows
      }

      const fetchCleanups = async () => {
        const rows: { address: string | null }[] = []
        for (const chunk of chunks(eventIds)) {
          const { data } = await supabase
            .from('events')
            .select('id, address')
            .in('id', chunk)
            .in('activity_type', ['shore_cleanup', 'marine_restoration'])
          if (data) rows.push(...data)
        }
        return rows
      }

      const [impacts, cleanupEvents, collectivesRes, leadersRes] = await Promise.all([
        fetchImpacts(),
        fetchCleanups(),
        supabase
          .from('collective_members')
          .select('collective_id, role')
          .eq('user_id', id),
        supabase
          .from('collective_members')
          .select('user_id')
          .eq('user_id', id)
          .in('role', ['assist_leader', 'co_leader', 'leader']),
      ])
      let totalHours = 0
      let totalTrees = 0
      let totalWeeds = 0
      let totalRubbishKg = 0
      let totalCoastlineM = 0

      for (const impact of impacts) {
        totalHours += impact.hours_total ?? 0
        totalTrees += impact.trees_planted ?? 0
        totalWeeds += impact.invasive_weeds_pulled ?? 0
        totalRubbishKg += impact.rubbish_kg ?? 0
        totalCoastlineM += impact.coastline_cleaned_m ?? 0
      }

      const cleanupAddresses = new Set(
        cleanupEvents.map((e) => (e.address ?? '').trim().toLowerCase()).filter(Boolean),
      )

      // Count unique collectives the user belongs to
      const uniqueCollectives = new Set(
        (collectivesRes.data ?? []).map((c) => c.collective_id),
      )

      // Count events the user organised (logged impact for)
      const { count: eventsOrganised } = await supabase
        .from('event_impact')
        .select('event_id', { count: 'exact', head: true })
        .eq('logged_by', id)

      return {
        eventsAttended,
        volunteerHours: Math.round(totalHours),
        eventsHeld: eventsOrganised ?? 0,
        treesPlanted: totalTrees,
        invasiveWeedsPulled: totalWeeds,
        rubbishCollectedTonnes: Math.round((totalRubbishKg / 1000) * 100) / 100,
        cleanupSites: cleanupAddresses.size,
        coastlineCleanedM: Math.round(totalCoastlineM),
        collectivesCount: uniqueCollectives.size,
        leadersEmpowered: (leadersRes.data ?? []).length > 0 ? 1 : 0,
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Monthly activity                                                   */
/* ------------------------------------------------------------------ */

interface MonthlyActivity {
  month: string
  count: number
}

export function useMonthlyActivity(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['monthly-activity', id],
    queryFn: async (): Promise<MonthlyActivity[]> => {
      if (!id) throw new Error('No user ID')

      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('registered_at')
        .eq('user_id', id)
        .eq('status', 'attended')
        .order('registered_at', { ascending: true })

      if (!registrations?.length) return []

      const monthCounts = new Map<string, number>()
      for (const reg of registrations) {
        const date = new Date(reg.registered_at!)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1)
      }

      return Array.from(monthCounts.entries()).map(([month, count]) => ({
        month,
        count,
      }))
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Impact by category                                                 */
/* ------------------------------------------------------------------ */

interface ImpactByCategory {
  category: string
  count: number
}

export function useImpactByCategory(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['impact-by-category', id],
    queryFn: async (): Promise<ImpactByCategory[]> => {
      if (!id) throw new Error('No user ID')

      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id, events(activity_type)')
        .eq('user_id', id)
        .eq('status', 'attended')

      if (!registrations?.length) return []

      const categoryCounts = new Map<string, number>()
      for (const reg of registrations) {
        const actType = (reg.events as { activity_type: string } | null)?.activity_type ?? 'workshop'
        categoryCounts.set(actType, (categoryCounts.get(actType) ?? 0) + 1)
      }

      return Array.from(categoryCounts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Streak                                                             */
/* ------------------------------------------------------------------ */

interface StreakData {
  currentWeeks: number
  longestWeeks: number
  currentMonths: number
  longestMonths: number
}

export function useStreak(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['streak', id],
    queryFn: async (): Promise<StreakData> => {
      if (!id) throw new Error('No user ID')

      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('registered_at')
        .eq('user_id', id)
        .eq('status', 'attended')
        .order('registered_at', { ascending: true })

      if (!registrations?.length) {
        return { currentWeeks: 0, longestWeeks: 0, currentMonths: 0, longestMonths: 0 }
      }

      // Calculate week-based streaks
      const weeks = new Set<string>()
      const months = new Set<string>()

      for (const reg of registrations) {
        const date = new Date(reg.registered_at!)
        // ISO week
        const startOfYear = new Date(date.getFullYear(), 0, 1)
        const dayOfYear = Math.floor((date.getTime() - startOfYear.getTime()) / 86400000)
        const weekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
        weeks.add(`${date.getFullYear()}-W${weekNum}`)
        months.add(`${date.getFullYear()}-${date.getMonth()}`)
      }

      // Get current week/month keys for "is streak still active" check
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000)
      const currentWeekNum = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7)
      const currentWeekKey = `${now.getFullYear()}-W${currentWeekNum}`
      const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`

      // Also compute "last week/month" for grace period (streak counts if active this or last period)
      const lastWeekDate = new Date(now.getTime() - 7 * 86400000)
      const lStartOfYear = new Date(lastWeekDate.getFullYear(), 0, 1)
      const lDayOfYear = Math.floor((lastWeekDate.getTime() - lStartOfYear.getTime()) / 86400000)
      const lastWeekNum = Math.ceil((lDayOfYear + lStartOfYear.getDay() + 1) / 7)
      const lastWeekKey = `${lastWeekDate.getFullYear()}-W${lastWeekNum}`

      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`

      const calcStreak = (sortedKeys: string[], isWeek: boolean, currentKey: string, lastKey: string) => {
        if (sortedKeys.length === 0) return { current: 0, longest: 0 }

        let current = 1
        let longest = 1
        for (let i = 1; i < sortedKeys.length; i++) {
          const prev = sortedKeys[i - 1]
          const curr = sortedKeys[i]
          let isConsecutive = false

          if (isWeek) {
            const [prevY, prevW] = prev.split('-W').map(Number)
            const [currY, currW] = curr.split('-W').map(Number)
            isConsecutive =
              (currY === prevY && currW === prevW + 1) ||
              (currY === prevY + 1 && prevW >= 52 && currW === 1)
          } else {
            const [prevY, prevM] = prev.split('-').map(Number)
            const [currY, currM] = curr.split('-').map(Number)
            isConsecutive =
              (currY === prevY && currM === prevM + 1) ||
              (currY === prevY + 1 && prevM === 11 && currM === 0)
          }

          if (isConsecutive) {
            current++
            if (current > longest) longest = current
          } else {
            current = 1
          }
        }

        // Only count as "current" if the last entry is this period or the previous one
        const lastEntry = sortedKeys[sortedKeys.length - 1]
        const isActive = lastEntry === currentKey || lastEntry === lastKey
        return { current: isActive ? current : 0, longest }
      }

      const weekArr = Array.from(weeks).sort()
      const monthArr = Array.from(months).sort()
      const weekStreak = calcStreak(weekArr, true, currentWeekKey, lastWeekKey)
      const monthStreak = calcStreak(monthArr, false, currentMonthKey, lastMonthKey)

      return {
        currentWeeks: weekStreak.current,
        longestWeeks: weekStreak.longest,
        currentMonths: monthStreak.current,
        longestMonths: monthStreak.longest,
      }
    },
    enabled: !!id,
    staleTime: 10 * 60 * 1000,
  })
}
