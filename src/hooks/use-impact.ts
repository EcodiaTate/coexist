import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

/* ------------------------------------------------------------------ */
/*  Canonical impact metrics                                           */
/* ------------------------------------------------------------------ */

/** The 8 canonical Co-Exist impact metrics */
export interface CanonicalImpact {
  /* Community Events */
  eventsAttended: number
  volunteerHours: number
  /* Land Restoration Projects */
  treesPlanted: number
  invasiveWeedsPulled: number
  /* Cleanup Sites */
  rubbishCollectedTonnes: number
  cleanupEventsHeld: number
  /* Organisational */
  collectivesCount: number
  leadersTrainedCount: number
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

      // Cleanup events = events with activity_type shore_cleanup or marine_restoration
      let cleanupQuery = supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .in('activity_type', ['shore_cleanup', 'marine_restoration'] as any)
        .lt('date_start', new Date().toISOString())
      if (timeRange === 'current-year') {
        cleanupQuery = cleanupQuery.gte('date_start', yearStart)
      }

      const [impactRes, eventsRes, membersRes, collectivesRes, cleanupRes] = await Promise.all([
        impactQuery,
        eventsQuery,
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        cleanupQuery,
      ])

      const logs = (impactRes.data ?? []) as Record<string, number>[]
      const sum = (key: string) => logs.reduce((s, r) => s + (r[key] ?? 0), 0)

      // Count event attendances (non-unique sign-ins) across all events with impact
      let attendanceCount = 0
      const impactEventIds = [...new Set(logs.map((l) => l.event_id).filter(Boolean))]
      if (impactEventIds.length > 0) {
        // Batch in chunks to avoid URL length limits
        const chunks = []
        for (let i = 0; i < impactEventIds.length; i += 50) {
          chunks.push(impactEventIds.slice(i, i + 50))
        }
        for (const chunk of chunks) {
          const { count } = await supabase
            .from('event_registrations')
            .select('id', { count: 'exact', head: true })
            .in('event_id', chunk as any)
            .eq('status', 'attended')
          attendanceCount += count ?? 0
        }
      }

      return {
        eventsAttended: attendanceCount,
        volunteerHours: Math.round(sum('hours_total')),
        treesPlanted: sum('trees_planted'),
        invasiveWeedsPulled: sum('invasive_weeds_pulled'),
        rubbishCollectedTonnes: Math.round((sum('rubbish_kg') / 1000) * 100) / 100,
        cleanupEventsHeld: cleanupRes.count ?? 0,
        collectivesCount: collectivesRes.count ?? 0,
        leadersTrainedCount: sum('leaders_trained'),
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
        .eq('events.collective_id' as any, collectiveId)
      if (timeRange === 'current-year') {
        impactQuery = impactQuery.gte('logged_at', yearStart)
      }

      let cleanupQuery = supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('collective_id', collectiveId)
        .in('activity_type', ['shore_cleanup', 'marine_restoration'] as any)
        .lt('date_start', new Date().toISOString())
      if (timeRange === 'current-year') {
        cleanupQuery = cleanupQuery.gte('date_start', yearStart)
      }

      const [impactRes, cleanupRes] = await Promise.all([impactQuery, cleanupQuery])

      const rows = (impactRes.data ?? []) as any[]
      const sum = (key: string) => rows.reduce((s: number, r: any) => s + (r[key] ?? 0), 0)

      // Count event attendances for this collective's events
      const impactEventIds = [...new Set(rows.map((r: any) => r.event_id).filter(Boolean))]
      let attendanceCount = 0
      if (impactEventIds.length > 0) {
        const { count } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', impactEventIds)
          .eq('status', 'attended')
        attendanceCount = count ?? 0
      }

      return {
        eventsAttended: attendanceCount,
        volunteerHours: Math.round(sum('hours_total')),
        treesPlanted: sum('trees_planted'),
        invasiveWeedsPulled: sum('invasive_weeds_pulled'),
        rubbishCollectedTonnes: Math.round((sum('rubbish_kg') / 1000) * 100) / 100,
        cleanupEventsHeld: cleanupRes.count ?? 0,
        collectivesCount: 1,
        leadersTrainedCount: sum('leaders_trained'),
      }
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Per-user impact                                                    */
/* ------------------------------------------------------------------ */

export interface PersonalImpact extends CanonicalImpact {}

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
          treesPlanted: 0,
          invasiveWeedsPulled: 0,
          rubbishCollectedTonnes: 0,
          cleanupEventsHeld: 0,
          collectivesCount: 0,
          leadersTrainedCount: 0,
        }
      }

      const [impactsRes, cleanupRes, collectivesRes] = await Promise.all([
        supabase
          .from('event_impact')
          .select('*')
          .in('event_id', eventIds),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .in('id', eventIds)
          .in('activity_type', ['shore_cleanup', 'marine_restoration'] as any),
        supabase
          .from('collective_members')
          .select('collective_id', { count: 'exact', head: true })
          .eq('user_id', id),
      ])

      const impacts = impactsRes.data ?? []
      let totalHours = 0
      let totalTrees = 0
      let totalWeeds = 0
      let totalRubbishKg = 0
      let totalLeaders = 0

      for (const impact of impacts) {
        totalHours += impact.hours_total
        totalTrees += impact.trees_planted
        totalWeeds += impact.invasive_weeds_pulled
        totalRubbishKg += impact.rubbish_kg
        totalLeaders += impact.leaders_trained
      }

      return {
        eventsAttended,
        volunteerHours: Math.round(totalHours),
        treesPlanted: totalTrees,
        invasiveWeedsPulled: totalWeeds,
        rubbishCollectedTonnes: Math.round((totalRubbishKg / 1000) * 100) / 100,
        cleanupEventsHeld: cleanupRes.count ?? 0,
        collectivesCount: collectivesRes.count ?? 0,
        leadersTrainedCount: totalLeaders,
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
        const date = new Date(reg.registered_at)
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
        const date = new Date(reg.registered_at)
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
