import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

interface ImpactStats {
  treesPlanted: number
  hoursVolunteered: number
  eventsAttended: number
  rubbishCollectedKg: number
  coastlineCleanedM: number
  areaRestoredSqm: number
  nativePlants: number
  wildlifeSightings: number
}

interface MonthlyActivity {
  month: string
  count: number
}

interface ImpactByCategory {
  category: string
  count: number
}

interface StreakData {
  currentWeeks: number
  longestWeeks: number
  currentMonths: number
  longestMonths: number
}

export function useImpactStats(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['impact-stats', id],
    queryFn: async (): Promise<ImpactStats> => {
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
          treesPlanted: 0,
          hoursVolunteered: 0,
          eventsAttended: 0,
          rubbishCollectedKg: 0,
          coastlineCleanedM: 0,
          areaRestoredSqm: 0,
          nativePlants: 0,
          wildlifeSightings: 0,
        }
      }

      const { data: impacts } = await supabase
        .from('event_impact')
        .select('*')
        .in('event_id', eventIds)

      const stats: ImpactStats = {
        treesPlanted: 0,
        hoursVolunteered: 0,
        eventsAttended,
        rubbishCollectedKg: 0,
        coastlineCleanedM: 0,
        areaRestoredSqm: 0,
        nativePlants: 0,
        wildlifeSightings: 0,
      }

      if (impacts) {
        for (const impact of impacts) {
          stats.treesPlanted += impact.trees_planted
          stats.hoursVolunteered += impact.hours_total
          stats.rubbishCollectedKg += impact.rubbish_kg
          stats.coastlineCleanedM += impact.coastline_cleaned_m
          stats.areaRestoredSqm += impact.area_restored_sqm
          stats.nativePlants += impact.native_plants
          stats.wildlifeSightings += impact.wildlife_sightings
        }
      }

      return stats
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
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
        const actType = (reg.events as { activity_type: string } | null)?.activity_type ?? 'other'
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
