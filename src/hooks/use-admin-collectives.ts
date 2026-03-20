import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
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

export interface AdminCollective extends Collective {
  memberCount: number
  eventCount: number
  health: 'healthy' | 'moderate' | 'needs-attention'
  leaderName: string | null
}

export interface AdminCollectiveMember extends CollectiveMember {
  profiles: Pick<
    Profile,
    'id' | 'display_name' | 'avatar_url' | 'instagram_handle' | 'pronouns' | 'location' | 'membership_level'
  > | null
}

export interface AdminCollectiveEvent {
  id: string
  title: string
  activity_type: string
  date_start: string
  date_end: string | null
  status: string
  address: string | null
  capacity: number | null
  registrationCount: number
}

export interface AdminCollectiveDetail extends Collective {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

/* ------------------------------------------------------------------ */
/*  Collectives list (admin view — includes archived)                  */
/* ------------------------------------------------------------------ */

export function useAdminCollectives(filters: {
  search: string
  status: 'all' | 'active' | 'archived'
}) {
  return useQuery({
    queryKey: ['admin-collectives', filters],
    queryFn: async () => {
      let query = supabase
        .from('collectives')
        .select('*, profiles!collectives_leader_id_fkey(id, display_name, avatar_url)')
        .order('name')

      if (filters.search) {
        query = query.ilike('name', `%${filters.search}%`)
      }

      if (filters.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.status === 'archived') {
        query = query.eq('is_active', false)
      }

      const { data, error } = await query
      if (error) throw error

      // Enrich with counts in parallel
      const enriched = await Promise.all(
        (data ?? []).map(async (c: any) => {
          const [membersRes, eventsRes] = await Promise.all([
            supabase
              .from('collective_members')
              .select('id', { count: 'exact', head: true })
              .eq('collective_id', c.id)
              .eq('status', 'active'),
            supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .eq('collective_id', c.id),
          ])

          const memberCount = membersRes.count ?? 0
          const eventCount = eventsRes.count ?? 0
          const health =
            memberCount >= 10 && eventCount >= 3
              ? 'healthy'
              : memberCount >= 5
                ? 'moderate'
                : 'needs-attention'

          return {
            ...c,
            memberCount,
            eventCount,
            health,
            leaderName: c.profiles?.display_name ?? null,
          } as AdminCollective
        }),
      )

      return enriched
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Single collective detail                                           */
/* ------------------------------------------------------------------ */

export function useAdminCollectiveDetail(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['admin-collective-detail', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      const { data, error } = await supabase
        .from('collectives')
        .select('*, profiles!collectives_leader_id_fkey(id, display_name, avatar_url)')
        .eq('id', collectiveId)
        .single()
      if (error) throw error
      return data as AdminCollectiveDetail
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Members list (admin — includes ALL statuses)                       */
/* ------------------------------------------------------------------ */

export function useAdminCollectiveMembers(collectiveId: string | undefined, statusFilter: 'active' | 'all' = 'active') {
  return useQuery({
    queryKey: ['admin-collective-members', collectiveId, statusFilter],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      let query = supabase
        .from('collective_members')
        .select('*, profiles(id, display_name, avatar_url, instagram_handle, pronouns, location, membership_level)')
        .eq('collective_id', collectiveId)
        .order('role', { ascending: false })
        .order('joined_at', { ascending: true })

      if (statusFilter === 'active') {
        query = query.eq('status', 'active')
      }

      const { data, error } = await query
      if (error) throw error
      return data as AdminCollectiveMember[]
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Events list for a collective (admin view)                          */
/* ------------------------------------------------------------------ */

export function useAdminCollectiveEvents(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['admin-collective-events', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')

      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, activity_type, date_start, date_end, status, address, capacity')
        .eq('collective_id', collectiveId)
        .order('date_start', { ascending: false })
        .limit(100)

      if (error) throw error

      // Get registration counts
      const enriched = await Promise.all(
        (events ?? []).map(async (ev) => {
          const { count } = await supabase
            .from('event_registrations')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', ev.id)

          return {
            ...ev,
            registrationCount: count ?? 0,
          } as AdminCollectiveEvent
        }),
      )

      return enriched
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Collective stats (admin)                                           */
/* ------------------------------------------------------------------ */

export function useAdminCollectiveStats(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['admin-collective-stats', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')

      const { data, error } = await supabase.rpc('get_collective_stats', {
        p_collective_id: collectiveId,
      })
      if (error) throw error
      return data as {
        member_count: number
        event_count: number
        trees_planted: number
        rubbish_kg: number
        coastline_cleaned_m: number
        hours_total: number
        area_restored_sqm: number
        native_plants: number
      }
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Create collective                                                  */
/* ------------------------------------------------------------------ */

export function useCreateCollective() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      name: string
      description?: string
      region?: string
      state?: string
      leaderId?: string
    }) => {
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

      const { data, error } = await supabase
        .from('collectives')
        .insert({
          name: input.name,
          slug,
          description: input.description || null,
          region: input.region || null,
          state: input.state || null,
          leader_id: input.leaderId || null,
        } as any)
        .select('id')
        .single()

      if (error) throw error

      // If a leader was assigned, also add them as a member with 'leader' role
      if (input.leaderId && data) {
        await supabase.from('collective_members').insert({
          collective_id: data.id,
          user_id: input.leaderId,
          role: 'leader',
          status: 'active',
        })
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Update collective                                                  */
/* ------------------------------------------------------------------ */

export function useAdminUpdateCollective() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      updates,
    }: {
      collectiveId: string
      updates: TablesUpdate<'collectives'>
    }) => {
      const { error } = await supabase
        .from('collectives')
        .update(updates)
        .eq('id', collectiveId)
      if (error) throw error
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Archive / Restore collective                                       */
/* ------------------------------------------------------------------ */

export function useArchiveCollective() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ collectiveId, archive }: { collectiveId: string; archive: boolean }) => {
      const { error } = await supabase
        .from('collectives')
        .update({ is_active: !archive })
        .eq('id', collectiveId)
      if (error) throw error
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Delete collective (super admin only — hard delete)                 */
/* ------------------------------------------------------------------ */

export function useDeleteCollective() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (collectiveId: string) => {
      const { error } = await supabase
        .from('collectives')
        .delete()
        .eq('id', collectiveId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Member mutations (admin)                                           */
/* ------------------------------------------------------------------ */

export function useAdminUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      userId,
      role,
    }: {
      collectiveId: string
      userId: string
      role: CollectiveRole
    }) => {
      const { error } = await supabase
        .from('collective_members')
        .update({ role })
        .eq('collective_id', collectiveId)
        .eq('user_id', userId)
      if (error) throw error

      // If promoting to leader, also update the collectives.leader_id
      if (role === 'leader') {
        await supabase
          .from('collectives')
          .update({ leader_id: userId })
          .eq('id', collectiveId)
      }
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
    },
  })
}

export function useAdminRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      userId,
    }: {
      collectiveId: string
      userId: string
    }) => {
      const { error } = await supabase
        .from('collective_members')
        .update({ status: 'removed' })
        .eq('collective_id', collectiveId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
    },
  })
}

export function useAdminRestoreMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      userId,
    }: {
      collectiveId: string
      userId: string
    }) => {
      const { error } = await supabase
        .from('collective_members')
        .update({ status: 'active' })
        .eq('collective_id', collectiveId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Add member (admin — can add any user to any collective)            */
/* ------------------------------------------------------------------ */

export function useAdminAddMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      userId,
      role = 'member',
    }: {
      collectiveId: string
      userId: string
      role?: CollectiveRole
    }) => {
      const { error } = await supabase.from('collective_members').upsert(
        {
          collective_id: collectiveId,
          user_id: userId,
          role,
          status: 'active',
        },
        { onConflict: 'collective_id,user_id' },
      )
      if (error) throw error
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collective-members', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collective-detail', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['admin-collectives'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Search users (for adding to collective)                            */
/* ------------------------------------------------------------------ */

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['admin-search-users', query],
    queryFn: async () => {
      if (!query || query.length < 2) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, instagram_handle')
        .or(`display_name.ilike.%${query}%,instagram_handle.ilike.%${query}%`)
        .limit(10)
      if (error) throw error
      return data as Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'instagram_handle'>[]
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  CSV export helper                                                  */
/* ------------------------------------------------------------------ */

export function exportAdminMembersCSV(
  members: AdminCollectiveMember[],
  collectiveName: string,
) {
  const header = 'Name,Role,Status,Instagram,Location,Joined\n'
  const rows = members
    .map((m) => {
      const p = m.profiles
      return [
        `"${p?.display_name ?? ''}"`,
        m.role,
        m.status,
        p?.instagram_handle ?? '',
        `"${p?.location ?? ''}"`,
        new Date(m.joined_at).toLocaleDateString(),
      ].join(',')
    })
    .join('\n')

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${collectiveName.replace(/\s+/g, '-').toLowerCase()}-members.csv`
  a.click()
  URL.revokeObjectURL(url)
}
