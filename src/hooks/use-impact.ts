import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

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

/** The canonical Co-Exist impact metrics */
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

export function useNationalImpact(timeRange: TimeRange = 'all-time') {
  return useQuery({
    queryKey: ['national-impact', timeRange],
    queryFn: async (): Promise<NationalImpact> => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()

      let impactQuery = supabase
        .from('event_impact')
        .select('trees_planted, hours_total, rubbish_kg, invasive_weeds_pulled, leaders_trained, event_id')
      if (timeRange === 'current-year') {
        impactQuery = impactQuery.gte('logged_at', yearStart)
      }

      let eventsQuery = supabase
        .from('events')
        .select('id, activity_type', { count: 'exact' })
        .lt('date_start', new Date().toISOString())
      if (timeRange === 'current-year') {
        eventsQuery = eventsQuery.gte('date_start', yearStart)
      }

      // Cleanup events — fetch addresses so we can count unique sites
      let cleanupQuery = supabase
        .from('events')
        .select('id, address')
        .in('activity_type', ['shore_cleanup', 'marine_restoration'])
        .lt('date_start', new Date().toISOString())
      if (timeRange === 'current-year') {
        cleanupQuery = cleanupQuery.gte('date_start', yearStart)
      }

      // Leaders empowered = anyone who holds a leadership role in any collective
      const leadersQuery = supabase
        .from('collective_members')
        .select('user_id')
        .in('role', ['assist_leader', 'co_leader', 'leader'])

      const [impactRes, eventsRes, membersRes, collectivesRes, cleanupRes, leadersRes] = await Promise.all([
        impactQuery,
        eventsQuery,
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        cleanupQuery,
        leadersQuery,
      ])

      const logs = (impactRes.data ?? []) as unknown as Record<string, number>[]
      const sum = (key: string) => logs.reduce((s, r) => s + (r[key] ?? 0), 0)

      // Count ALL event attendances nationally (not just events with impact logs)
      let attendanceQuery = supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'attended')
      if (timeRange === 'current-year') {
        attendanceQuery = attendanceQuery.gte('registered_at', yearStart)
      }
      const { count: attendanceCount } = await attendanceQuery

      // Count unique cleanup sites by address
      const cleanupAddresses = new Set(
        (cleanupRes.data ?? []).map((e: { address: string | null }) => (e.address ?? '').trim().toLowerCase()).filter(Boolean)
      )

      // Count unique users with leadership roles
      const uniqueLeaders = new Set((leadersRes.data ?? []).map((r: { user_id: string }) => r.user_id))

      return {
        eventsAttended: attendanceCount ?? 0,
        volunteerHours: Math.round(sum('hours_total')),
        eventsHeld: eventsRes.count ?? 0,
        treesPlanted: sum('trees_planted'),
        invasiveWeedsPulled: sum('invasive_weeds_pulled'),
        rubbishCollectedTonnes: Math.round((sum('rubbish_kg') / 1000) * 100) / 100,
        cleanupSites: cleanupAddresses.size,
        collectivesCount: collectivesRes.count ?? 0,
        leadersEmpowered: uniqueLeaders.size,
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

      let impactQuery = supabase
        .from('event_impact')
        .select('trees_planted, hours_total, rubbish_kg, invasive_weeds_pulled, leaders_trained, event_id, events!inner(collective_id)')
        .eq('events.collective_id', collectiveId)
      if (timeRange === 'current-year') {
        impactQuery = impactQuery.gte('logged_at', yearStart)
      }

      let cleanupQuery = supabase
        .from('events')
        .select('id, address')
        .eq('collective_id', collectiveId)
        .in('activity_type', ['shore_cleanup', 'marine_restoration'])
        .lt('date_start', new Date().toISOString())
      if (timeRange === 'current-year') {
        cleanupQuery = cleanupQuery.gte('date_start', yearStart)
      }

      let eventsQuery = supabase
        .from('events')
        .select('id', { count: 'exact' })
        .eq('collective_id', collectiveId)
        .lt('date_start', new Date().toISOString())
      if (timeRange === 'current-year') {
        eventsQuery = eventsQuery.gte('date_start', yearStart)
      }

      const leadersQuery = supabase
        .from('collective_members')
        .select('user_id')
        .eq('collective_id', collectiveId)
        .in('role', ['assist_leader', 'co_leader', 'leader'])

      const [impactRes, cleanupRes, eventsRes, leadersRes] = await Promise.all([impactQuery, cleanupQuery, eventsQuery, leadersQuery])

      const rows = (impactRes.data ?? []) as unknown as Record<string, unknown>[]
      const sum = (key: string) => rows.reduce((s: number, r) => s + (Number(r[key]) || 0), 0)

      // Count ALL event attendances for this collective's events (not just those with impact)
      const allEventIds = (eventsRes.data ?? []).map((e) => e.id)

      let attendanceCount = 0
      for (const chunk of chunks(allEventIds)) {
        const { count } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', chunk)
          .eq('status', 'attended')
        attendanceCount += count ?? 0
      }

      const cleanupAddresses = new Set(
        (cleanupRes.data ?? []).map((e: { address: string | null }) => (e.address ?? '').trim().toLowerCase()).filter(Boolean)
      )
      const uniqueLeaders = new Set((leadersRes.data ?? []).map((r: { user_id: string }) => r.user_id))

      return {
        eventsAttended: attendanceCount,
        volunteerHours: Math.round(sum('hours_total')),
        eventsHeld: eventsRes.count ?? 0,
        treesPlanted: sum('trees_planted'),
        invasiveWeedsPulled: sum('invasive_weeds_pulled'),
        rubbishCollectedTonnes: Math.round((sum('rubbish_kg') / 1000) * 100) / 100,
        cleanupSites: cleanupAddresses.size,
        collectivesCount: 1,
        leadersEmpowered: uniqueLeaders.size,
      }
    },
    enabled: !!collectiveId,
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
            .select('trees_planted, hours_total, rubbish_kg, invasive_weeds_pulled')
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

      for (const impact of impacts) {
        totalHours += impact.hours_total ?? 0
        totalTrees += impact.trees_planted ?? 0
        totalWeeds += impact.invasive_weeds_pulled ?? 0
        totalRubbishKg += impact.rubbish_kg ?? 0
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
