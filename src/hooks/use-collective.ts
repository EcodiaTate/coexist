import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  Database,
  Collective,
  CollectiveMember,
  Profile,
  TablesUpdate,
} from '@/types/database.types'

type CollectiveRole = Database['public']['Enums']['collective_role']

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CollectiveWithLeader extends Collective {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

export interface CollectiveMemberWithProfile extends CollectiveMember {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'instagram_handle' | 'pronouns' | 'location' | 'membership_level'> | null
}

export interface CollectiveStats {
  totalEvents: number
  totalTreesPlanted: number
  totalRubbishKg: number
  totalHours: number
  totalCoastlineCleaned: number
  totalAreaRestored: number
  totalNativePlants: number
  totalWildlifeSightings: number
  activeMembers: number
  /** Attendance rate: checked-in / registered (0-1) */
  attendanceRate: number
}

/* ------------------------------------------------------------------ */
/*  Collective detail                                                  */
/* ------------------------------------------------------------------ */

export function useCollective(idOrSlug: string | undefined) {
  // Detect whether the param is a UUID or a slug
  const isUuid = !!idOrSlug && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

  return useQuery({
    queryKey: ['collective', idOrSlug],
    queryFn: async () => {
      if (!idOrSlug) throw new Error('No collective ID or slug')
      const { data, error } = await supabase
        .from('collectives')
        .select('*, profiles!collectives_leader_id_fkey(id, display_name, avatar_url)')
        .eq(isUuid ? 'id' : 'slug', idOrSlug)
        .single()
      if (error) throw error
      return data as CollectiveWithLeader
    },
    enabled: !!idOrSlug,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  All collectives (for discovery)                                    */
/* ------------------------------------------------------------------ */

export function useCollectives(filters?: { state?: string; search?: string }) {
  return useQuery({
    queryKey: ['collectives', filters],
    queryFn: async () => {
      let query = supabase
        .from('collectives')
        .select('*, profiles!collectives_leader_id_fkey(id, display_name, avatar_url)')
        .eq('is_active', true)
        .order('name')

      if (filters?.state) {
        query = query.eq('state', filters.state)
      }
      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return data as CollectiveWithLeader[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  My collectives                                                     */
/* ------------------------------------------------------------------ */

export function useMyCollectives() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-collectives', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')
      const { data, error } = await supabase
        .from('collective_members')
        .select('collective_id, role, joined_at, collectives(id, name, slug, cover_image_url, region, state, member_count)')
        .eq('user_id', user.id)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Members list                                                       */
/* ------------------------------------------------------------------ */

export function useCollectiveMembers(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['collective-members', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      const { data, error } = await supabase
        .from('collective_members')
        .select('*, profiles(id, display_name, avatar_url, instagram_handle, pronouns, location, membership_level)')
        .eq('collective_id', collectiveId)
        .eq('status', 'active')
        .order('role', { ascending: false })
      if (error) throw error
      return data as CollectiveMemberWithProfile[]
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Leaders (leader + co_leader + assist_leader)                       */
/* ------------------------------------------------------------------ */

export function useCollectiveLeaders(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['collective-leaders', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      const { data, error } = await supabase
        .from('collective_members')
        .select('*, profiles(id, display_name, avatar_url, instagram_handle)')
        .eq('collective_id', collectiveId)
        .eq('status', 'active')
        .in('role', ['leader', 'co_leader', 'assist_leader'])
        .order('role', { ascending: false })
      if (error) throw error
      return data as CollectiveMemberWithProfile[]
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective events                                                  */
/* ------------------------------------------------------------------ */

export function useCollectiveEvents(collectiveId: string | undefined, type: 'upcoming' | 'past') {
  return useQuery({
    queryKey: ['collective-events', collectiveId, type],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      const now = new Date().toISOString()

      let query = supabase
        .from('events')
        .select('*')
        .eq('collective_id', collectiveId)
        .eq('status', type === 'upcoming' ? 'published' : 'completed')

      if (type === 'upcoming') {
        query = query.gte('date_start', now).order('date_start', { ascending: true })
      } else {
        query = query.lt('date_start', now).order('date_start', { ascending: false })
      }

      const { data, error } = await query.limit(20)
      if (error) throw error
      return data
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective stats                                                   */
/* ------------------------------------------------------------------ */

export function useCollectiveStats(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['collective-stats', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')

      // Total events
      const { count: totalEvents } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('collective_id', collectiveId)
        .in('status', ['published', 'completed'])

      // Impact from all events — all metrics
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('collective_id', collectiveId)

      const eventIds = events?.map((e) => e.id) ?? []
      let totalTreesPlanted = 0
      let totalRubbishKg = 0
      let totalHours = 0
      let totalCoastlineCleaned = 0
      let totalAreaRestored = 0
      let totalNativePlants = 0
      let totalWildlifeSightings = 0

      if (eventIds.length > 0) {
        const { data: impacts } = await supabase
          .from('event_impact')
          .select('trees_planted, rubbish_kg, hours_total, coastline_cleaned_m, area_restored_sqm, native_plants, wildlife_sightings')
          .in('event_id', eventIds)

        if (impacts) {
          for (const i of impacts) {
            totalTreesPlanted += i.trees_planted ?? 0
            totalRubbishKg += i.rubbish_kg ?? 0
            totalHours += i.hours_total ?? 0
            totalCoastlineCleaned += i.coastline_cleaned_m ?? 0
            totalAreaRestored += i.area_restored_sqm ?? 0
            totalNativePlants += i.native_plants ?? 0
            totalWildlifeSightings += i.wildlife_sightings ?? 0
          }
        }
      }

      // Active members
      const { count: activeMembers } = await supabase
        .from('collective_members')
        .select('*', { count: 'exact', head: true })
        .eq('collective_id', collectiveId)
        .eq('status', 'active')

      // Attendance rate across all events
      let attendanceRate = 0
      if (eventIds.length > 0) {
        const { count: totalRegistered } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .in('status', ['registered', 'attended'])

        const { count: totalAttended } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .eq('status', 'attended')

        if (totalRegistered && totalRegistered > 0) {
          attendanceRate = Math.round(((totalAttended ?? 0) / totalRegistered) * 100) / 100
        }
      }

      return {
        totalEvents: totalEvents ?? 0,
        totalTreesPlanted,
        totalRubbishKg,
        totalHours,
        totalCoastlineCleaned,
        totalAreaRestored,
        totalNativePlants,
        totalWildlifeSightings,
        activeMembers: activeMembers ?? 0,
        attendanceRate,
      } satisfies CollectiveStats
    },
    enabled: !!collectiveId,
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Membership status                                                  */
/* ------------------------------------------------------------------ */

export function useCollectiveMembership(collectiveId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['collective-membership', collectiveId, user?.id],
    queryFn: async () => {
      if (!user || !collectiveId) return null
      const { data } = await supabase
        .from('collective_members')
        .select('id, role, status, joined_at')
        .eq('collective_id', collectiveId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      return data
    },
    enabled: !!user && !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Join collective                                                    */
/* ------------------------------------------------------------------ */

export function useJoinCollective() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (collectiveId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('collective_members')
        .insert({
          collective_id: collectiveId,
          user_id: user.id,
          role: 'member',
          status: 'active',
        })
      if (error) throw error
    },
    onMutate: async (collectiveId) => {
      await queryClient.cancelQueries({ queryKey: ['collective-membership', collectiveId] })
      const previous = queryClient.getQueryData(['collective-membership', collectiveId, user?.id])
      queryClient.setQueryData(['collective-membership', collectiveId, user?.id], {
        id: `temp-${Date.now()}`,
        role: 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      return { previous }
    },
    onError: (_err, collectiveId, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(['collective-membership', collectiveId, user?.id], context.previous)
    },
    onSettled: (_, __, collectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['collective-membership', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['my-collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Leave collective                                                   */
/* ------------------------------------------------------------------ */

export function useLeaveCollective() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (collectiveId: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('collective_members')
        .update({ status: 'left' })
        .eq('collective_id', collectiveId)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: async (collectiveId) => {
      await queryClient.cancelQueries({ queryKey: ['collective-membership', collectiveId] })
      const previous = queryClient.getQueryData(['collective-membership', collectiveId, user?.id])
      queryClient.setQueryData(['collective-membership', collectiveId, user?.id], null)
      return { previous }
    },
    onError: (_err, collectiveId, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(['collective-membership', collectiveId, user?.id], context.previous)
    },
    onSettled: (_, __, collectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['collective-membership', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['my-collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Update collective (leader)                                         */
/* ------------------------------------------------------------------ */

export function useUpdateCollective() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectiveId, updates }: { collectiveId: string; updates: TablesUpdate<'collectives'> }) => {
      const { error } = await supabase
        .from('collectives')
        .update(updates)
        .eq('id', collectiveId)
      if (error) throw error
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['collective', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Remove member (leader)                                             */
/* ------------------------------------------------------------------ */

export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectiveId, userId }: { collectiveId: string; userId: string }) => {
      const { error } = await supabase
        .from('collective_members')
        .update({ status: 'removed' })
        .eq('collective_id', collectiveId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onMutate: async ({ collectiveId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['collective-members', collectiveId] })
      const previous = queryClient.getQueryData<CollectiveMemberWithProfile[]>(['collective-members', collectiveId])
      queryClient.setQueryData<CollectiveMemberWithProfile[]>(['collective-members', collectiveId], (old) => old?.filter(m => m.user_id !== userId))
      return { previous }
    },
    onError: (_err, { collectiveId }, context) => {
      if (context?.previous) queryClient.setQueryData(['collective-members', collectiveId], context.previous)
    },
    onSettled: (_, __, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Update member role (leader)                                        */
/* ------------------------------------------------------------------ */

export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectiveId, userId, role }: { collectiveId: string; userId: string; role: CollectiveRole }) => {
      const { error } = await supabase
        .from('collective_members')
        .update({ role })
        .eq('collective_id', collectiveId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onMutate: async ({ collectiveId, userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['collective-members', collectiveId] })
      const previous = queryClient.getQueryData<CollectiveMemberWithProfile[]>(['collective-members', collectiveId])
      queryClient.setQueryData<CollectiveMemberWithProfile[]>(['collective-members', collectiveId], (old) => {
        if (!old) return old
        return old.map(m => m.user_id === userId ? { ...m, role } : m)
      })
      return { previous }
    },
    onError: (_err, { collectiveId }, context) => {
      if (context?.previous) queryClient.setQueryData(['collective-members', collectiveId], context.previous)
    },
    onSettled: (_, __, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective-leaders', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['collective-role', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Export members CSV                                                  */
/* ------------------------------------------------------------------ */

export function exportMembersCSV(members: CollectiveMemberWithProfile[]) {
  const header = 'Name,Role,Instagram,Location,Joined\n'
  const rows = members.map((m) => {
    const p = m.profiles
    return [
      `"${p?.display_name ?? ''}"`,
      m.role,
      p?.instagram_handle ?? '',
      `"${p?.location ?? ''}"`,
      new Date(m.joined_at).toLocaleDateString(),
    ].join(',')
  }).join('\n')

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'collective-members.csv'
  a.click()
  URL.revokeObjectURL(url)
}
