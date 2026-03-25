import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  Tables,
} from '@/types/database.types'

type Event = Tables<'events'>
type Collective = Tables<'collectives'>
type GlobalAnnouncement = Tables<'global_announcements'>
type Challenge = Tables<'challenges'>
type Profile = Tables<'profiles'>

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ImpactStats {
  events_attended: number
  trees_planted: number
  hours_volunteered: number
  rubbish_kg: number
  area_restored_sqm: number
  native_plants: number
  wildlife_sightings: number
  invasive_weeds_pulled: number
  leaders_trained: number
}

export interface CollectiveWithNextEvent extends Collective {
  next_event: Event | null
  events_this_month: number
}

export interface ActiveChallenge extends Challenge {
  user_progress: number
  total_progress: number
}

interface EventWithCollective extends Event {
  collectives: Pick<Collective, 'id' | 'name'> | null
}

export interface MyUpcomingEvent extends Event {
  collectives: Pick<Collective, 'id' | 'name'> | null
  registration_status: string
}

/* ------------------------------------------------------------------ */
/*  Greeting                                                           */
/* ------------------------------------------------------------------ */

export function getGreeting(firstName: string | undefined): string {
  const hour = new Date().getHours()
  const name = firstName ?? 'there'

  if (hour < 12) return `Good morning, ${name}`
  if (hour < 17) return `Good afternoon, ${name}`
  if (hour < 21) return `Good evening, ${name}`
  return `Good night, ${name}`
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Pinned or urgent updates */
export function useLatestUpdate() {
  return useQuery({
    queryKey: ['home', 'latest-update'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_announcements')
        .select('*')
        .or('is_pinned.eq.true,priority.eq.urgent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as GlobalAnnouncement | null
    },
    staleTime: 2 * 60 * 1000,
  })
}

/** Featured events for hero carousel */
export function useFeaturedEvents() {
  return useQuery({
    queryKey: ['home', 'featured-events'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('events')
        .select('*, collectives(id, name)')
        .eq('status', 'published')
        .eq('is_public', true)
        .or(`date_start.gte.${now},date_end.gte.${now}`)
        .order('date_start', { ascending: true })
        .limit(5)
      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** Upcoming events near user (all if no location) */
export function useUpcomingNearby() {
  return useQuery({
    queryKey: ['home', 'upcoming-nearby'],
    queryFn: async () => {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('events')
        .select('*, collectives(id, name)')
        .eq('status', 'published')
        .or(`date_start.gte.${now},date_end.gte.${now}`)
        .order('date_start', { ascending: true })
        .limit(10)
      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** User's primary collective with next event + stats */
export function useMyCollective() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['home', 'my-collective', user?.id],
    queryFn: async () => {
      if (!user) return null

      // Get user's collective membership
      const { data: membership } = await supabase
        .from('collective_members')
        .select('collective_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (!membership) return null

      // Fetch collective
      const { data: collective, error } = await supabase
        .from('collectives')
        .select('*')
        .eq('id', membership.collective_id)
        .single()
      if (error) throw error

      // Next event (include currently-happening events)
      const nowStr = new Date().toISOString()
      const { data: nextEvent } = await supabase
        .from('events')
        .select('*')
        .eq('collective_id', collective.id)
        .eq('status', 'published')
        .or(`date_start.gte.${nowStr},date_end.gte.${nowStr}`)
        .order('date_start', { ascending: true })
        .limit(1)
        .maybeSingle()

      // Events this month
      const monthStart = new Date()
      monthStart.setDate(1)
      monthStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('collective_id', collective.id)
        .gte('date_start', monthStart.toISOString())

      return {
        ...collective,
        next_event: nextEvent ?? null,
        events_this_month: count ?? 0,
      } as CollectiveWithNextEvent
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/** Impact stats from RPC */
export function useImpactStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['home', 'impact-stats', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase.rpc('get_user_impact_stats', {
        p_user_id: user.id,
      })
      if (error) throw error
      return (data ?? {
        events_attended: 0,
        trees_planted: 0,
        hours_volunteered: 0,
        rubbish_kg: 0,
        area_restored_sqm: 0,
        native_plants: 0,
        wildlife_sightings: 0,
        invasive_weeds_pulled: 0,
        leaders_trained: 0,
      }) as unknown as ImpactStats
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  })
}

/** Active national challenge */
export function useActiveChallenge() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['home', 'active-challenge', user?.id],
    queryFn: async () => {
      const { data: challenge, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      if (!challenge) return null

      // Get aggregated progress
      const { data: participants } = await supabase
        .from('challenge_participants')
        .select('progress')
        .eq('challenge_id', challenge.id)

      const totalProgress = (participants ?? []).reduce(
        (sum, p) => sum + (p.progress ?? 0),
        0,
      )

      // User's individual progress
      let userProgress = 0
      if (user) {
        const { data: myParticipation } = await supabase
          .from('challenge_participants')
          .select('progress')
          .eq('challenge_id', challenge.id)
          .eq('user_id', user.id)
          .maybeSingle()
        userProgress = myParticipation?.progress ?? 0
      }

      return {
        ...challenge,
        user_progress: userProgress,
        total_progress: totalProgress,
      } as ActiveChallenge
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** Trending collectives (for users not in one) */
export function useTrendingCollectives() {
  return useQuery({
    queryKey: ['home', 'trending-collectives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false })
        .limit(8)
      if (error) throw error
      return (data ?? []) as Collective[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

/** Events the user has registered for, coming up soon */
export function useMyUpcomingEvents() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['home', 'my-upcoming-events', user?.id],
    queryFn: async () => {
      if (!user) return []

      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('event_registrations')
        .select('status, events!inner(*, collectives(id, name))')
        .eq('user_id', user.id)
        .in('status', ['registered', 'waitlisted'])
        .or(`date_start.gte.${now},date_end.gte.${now}`, { referencedTable: 'events' })
        .order('date_start', { referencedTable: 'events', ascending: true })
        .limit(5)

      if (error) throw error

      const nowMs = Date.now()
      return (data ?? [])
        .filter((r) => r.events !== null)
        .map((r) => ({
          ...(r.events as EventWithCollective),
          registration_status: r.status,
        }))
        .sort((a, b) => {
          // Happening-now events always come first
          const aStart = new Date(a.date_start).getTime()
          const aEnd = a.date_end ? new Date(a.date_end).getTime() : aStart + 4 * 60 * 60 * 1000
          const bStart = new Date(b.date_start).getTime()
          const bEnd = b.date_end ? new Date(b.date_end).getTime() : bStart + 4 * 60 * 60 * 1000
          const aHappening = nowMs >= aStart && nowMs <= aEnd
          const bHappening = nowMs >= bStart && nowMs <= bEnd
          if (aHappening !== bHappening) return aHappening ? -1 : 1
          return aStart - bStart
        }) as MyUpcomingEvent[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })
}

/** Upcoming events from all of the user's collectives (for home carousel) */
export function useCollectiveUpcomingEvents() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['home', 'collective-upcoming-events', user?.id],
    queryFn: async () => {
      if (!user) return []

      // Get all collective memberships
      const { data: memberships } = await supabase
        .from('collective_members')
        .select('collective_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const collectiveIds = (memberships ?? []).map((m) => m.collective_id)
      if (collectiveIds.length === 0) return []

      const nowIso = new Date().toISOString()
      const { data, error } = await supabase
        .from('events')
        .select('*, collectives(id, name)')
        .in('collective_id', collectiveIds)
        .eq('status', 'published')
        .or(`date_start.gte.${nowIso},date_end.gte.${nowIso}`)
        .order('date_start', { ascending: true })
        .limit(10)

      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/** Recent updates for the home updates section */
export function useRecentUpdates() {
  return useQuery({
    queryKey: ['home', 'recent-updates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_announcements')
        .select(`
          *,
          author:profiles!global_announcements_author_id_fkey(id, display_name, avatar_url, role)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return (data ?? []) as (GlobalAnnouncement & {
        author: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'role'> | null
      })[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

/** Activity type labels for chips */
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  shore_cleanup: 'Shore Cleanup',
  tree_planting: 'Tree Planting',
  land_regeneration: 'Land Regeneration',
  nature_walk: 'Nature Walks',
  camp_out: 'Camp Out',
  retreat: 'Retreats',
  film_screening: 'Film Screening',
  marine_restoration: 'Marine Restoration',
  workshop: 'Workshop',
}
