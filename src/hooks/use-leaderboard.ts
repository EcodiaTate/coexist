import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all-time'
type Metric = 'points' | 'trees' | 'events' | 'hours'

interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  tier: string
  value: number
  rank: number
}

interface CollectiveLeaderboardEntry {
  collectiveId: string
  name: string
  coverImageUrl: string | null
  region: string | null
  value: number
  rank: number
}

function getStartDate(period: TimePeriod): string | null {
  if (period === 'all-time') return null
  const now = new Date()
  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7)
      break
    case 'month':
      now.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
      now.setMonth(now.getMonth() - 3)
      break
    case 'year':
      now.setFullYear(now.getFullYear() - 1)
      break
  }
  return now.toISOString()
}

export function useIndividualLeaderboard(
  collectiveId: string | null,
  period: TimePeriod = 'all-time',
  metric: Metric = 'points',
) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['leaderboard', 'individual', collectiveId, period, metric],
    queryFn: async (): Promise<{ entries: LeaderboardEntry[]; userRank: number | null }> => {
      if (metric === 'points') {
        // Points-based leaderboard
        let query = supabase
          .from('points_ledger')
          .select('user_id, amount')

        const startDate = getStartDate(period)
        if (startDate) {
          query = query.gte('created_at', startDate)
        }

        // If collective-scoped, get members first
        let memberIds: string[] | null = null
        if (collectiveId) {
          const { data: members } = await supabase
            .from('collective_members')
            .select('user_id')
            .eq('collective_id', collectiveId)
            .eq('status', 'active')
          memberIds = members?.map((m) => m.user_id) ?? []
          if (memberIds.length > 0) {
            query = query.in('user_id', memberIds)
          }
        }

        const { data: ledger } = await query

        // Aggregate by user
        const userTotals = new Map<string, number>()
        for (const entry of ledger ?? []) {
          userTotals.set(entry.user_id, (userTotals.get(entry.user_id) ?? 0) + entry.amount)
        }

        const sortedIds = Array.from(userTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 50)

        if (sortedIds.length === 0) return { entries: [], userRank: null }

        // Fetch profile info
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, membership_level')
          .in('id', sortedIds.map(([id]) => id))

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

        const entries: LeaderboardEntry[] = sortedIds.map(([userId, value], i) => {
          const profile = profileMap.get(userId)
          return {
            userId,
            displayName: profile?.display_name ?? 'Unknown',
            avatarUrl: profile?.avatar_url ?? null,
            tier: profile?.membership_level ?? 'seedling',
            value,
            rank: i + 1,
          }
        })

        const userRank = user ? entries.findIndex((e) => e.userId === user.id) + 1 || null : null

        return { entries, userRank }
      }

      // For other metrics, use event data
      let memberIds: string[] | null = null
      if (collectiveId) {
        const { data: members } = await supabase
          .from('collective_members')
          .select('user_id')
          .eq('collective_id', collectiveId)
          .eq('status', 'active')
        memberIds = members?.map((m) => m.user_id) ?? []
      }

      let regQuery = supabase
        .from('event_registrations')
        .select('user_id, event_id')
        .eq('status', 'attended')

      const startDate = getStartDate(period)
      if (startDate) {
        regQuery = regQuery.gte('registered_at', startDate)
      }
      if (memberIds && memberIds.length > 0) {
        regQuery = regQuery.in('user_id', memberIds)
      }

      const { data: regs } = await regQuery

      if (!regs?.length) return { entries: [], userRank: null }

      if (metric === 'events') {
        const userCounts = new Map<string, number>()
        for (const reg of regs) {
          userCounts.set(reg.user_id, (userCounts.get(reg.user_id) ?? 0) + 1)
        }

        const sorted = Array.from(userCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 50)

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, membership_level')
          .in('id', sorted.map(([id]) => id))

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

        const entries: LeaderboardEntry[] = sorted.map(([userId, value], i) => ({
          userId,
          displayName: profileMap.get(userId)?.display_name ?? 'Unknown',
          avatarUrl: profileMap.get(userId)?.avatar_url ?? null,
          tier: profileMap.get(userId)?.membership_level ?? 'seedling',
          value,
          rank: i + 1,
        }))

        const userRank = user ? entries.findIndex((e) => e.userId === user.id) + 1 || null : null
        return { entries, userRank }
      }

      // trees or hours — need impact data
      const eventIds = [...new Set(regs.map((r) => r.event_id))]
      const userEventMap = new Map<string, string[]>()
      for (const reg of regs) {
        const list = userEventMap.get(reg.user_id) ?? []
        list.push(reg.event_id)
        userEventMap.set(reg.user_id, list)
      }

      const { data: impacts } = await supabase
        .from('event_impact')
        .select('event_id, trees_planted, hours_total')
        .in('event_id', eventIds)

      const impactMap = new Map(impacts?.map((i) => [i.event_id, i]) ?? [])

      const userTotals = new Map<string, number>()
      for (const [userId, events] of userEventMap) {
        let total = 0
        for (const eid of events) {
          const impact = impactMap.get(eid)
          if (impact) {
            total += metric === 'trees' ? impact.trees_planted : impact.hours_total
          }
        }
        userTotals.set(userId, total)
      }

      const sorted = Array.from(userTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, membership_level')
        .in('id', sorted.map(([id]) => id))

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? [])

      const entries: LeaderboardEntry[] = sorted.map(([userId, value], i) => ({
        userId,
        displayName: profileMap.get(userId)?.display_name ?? 'Unknown',
        avatarUrl: profileMap.get(userId)?.avatar_url ?? null,
        tier: profileMap.get(userId)?.membership_level ?? 'seedling',
        value,
        rank: i + 1,
      }))

      const userRank = user ? entries.findIndex((e) => e.userId === user.id) + 1 || null : null
      return { entries, userRank }
    },
    staleTime: 2 * 60 * 1000,
  })
}

export function useCollectiveLeaderboard(
  period: TimePeriod = 'all-time',
  metric: Metric = 'events',
) {
  return useQuery({
    queryKey: ['leaderboard', 'collective', period, metric],
    queryFn: async (): Promise<CollectiveLeaderboardEntry[]> => {
      // Get all collectives
      const { data: collectives } = await supabase
        .from('collectives')
        .select('id, name, cover_image_url, region')
        .eq('is_active', true)

      if (!collectives?.length) return []

      // Get all events with collective mapping
      let eventQuery = supabase
        .from('events')
        .select('id, collective_id')
        .eq('status', 'completed')

      const startDate = getStartDate(period)
      if (startDate) {
        eventQuery = eventQuery.gte('date_start', startDate)
      }

      const { data: events } = await eventQuery

      if (!events?.length) {
        return collectives.map((c, i) => ({
          collectiveId: c.id,
          name: c.name,
          coverImageUrl: c.cover_image_url,
          region: c.region,
          value: 0,
          rank: i + 1,
        }))
      }

      const eventsByCollective = new Map<string, string[]>()
      for (const event of events) {
        const list = eventsByCollective.get(event.collective_id) ?? []
        list.push(event.id)
        eventsByCollective.set(event.collective_id, list)
      }

      if (metric === 'events') {
        const entries = collectives
          .map((c) => ({
            collectiveId: c.id,
            name: c.name,
            coverImageUrl: c.cover_image_url,
            region: c.region,
            value: eventsByCollective.get(c.id)?.length ?? 0,
            rank: 0,
          }))
          .sort((a, b) => b.value - a.value)
          .map((e, i) => ({ ...e, rank: i + 1 }))

        return entries
      }

      // For trees/hours, get impact data
      const allEventIds = events.map((e) => e.id)
      const { data: impacts } = await supabase
        .from('event_impact')
        .select('event_id, trees_planted, hours_total')
        .in('event_id', allEventIds)

      const impactByEvent = new Map(impacts?.map((i) => [i.event_id, i]) ?? [])

      const entries = collectives
        .map((c) => {
          const eIds = eventsByCollective.get(c.id) ?? []
          let value = 0
          for (const eid of eIds) {
            const impact = impactByEvent.get(eid)
            if (impact) {
              value += metric === 'trees' ? impact.trees_planted : impact.hours_total
            }
          }
          return {
            collectiveId: c.id,
            name: c.name,
            coverImageUrl: c.cover_image_url,
            region: c.region,
            value,
            rank: 0,
          }
        })
        .sort((a, b) => b.value - a.value)
        .map((e, i) => ({ ...e, rank: i + 1 }))

      return entries
    },
    staleTime: 5 * 60 * 1000,
  })
}
