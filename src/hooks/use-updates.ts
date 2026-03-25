import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  GlobalAnnouncement,
  Profile,
  Enums,
} from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UpdateWithAuthor extends GlobalAnnouncement {
  author: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'role'> | null
  is_read: boolean
}

/* ------------------------------------------------------------------ */
/*  Audience filter helper                                             */
/*                                                                     */
/*  Applies target_audience filtering client-side based on the         */
/*  current user's role and collective memberships.                    */
/* ------------------------------------------------------------------ */

function filterByAudience(
  announcements: UpdateWithAuthor[],
  userRole: string | null | undefined,
  collectiveIds: string[],
): UpdateWithAuthor[] {
  const isLeaderRole = ['leader', 'co_leader', 'assist_leader'].includes(
    userRole ?? '',
  )
  const isStaffOrAdmin = ['national_staff', 'national_admin', 'super_admin'].includes(
    userRole ?? '',
  )

  return announcements.filter((a) => {
    // Staff/admins always see everything
    if (isStaffOrAdmin) return true

    switch (a.target_audience) {
      case 'all':
        return true
      case 'leaders':
        return isLeaderRole
      case 'collective_specific':
        return a.target_collective_id
          ? collectiveIds.includes(a.target_collective_id)
          : true
      default:
        return true
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Fetch updates (with read status for current user)                  */
/* ------------------------------------------------------------------ */

export function useUpdates() {
  const { user, profile, collectiveRoles } = useAuth()
  const queryClient = useQueryClient()

  const collectiveIds = collectiveRoles.map((m) => m.collective_id)
  const highestCollectiveRole = collectiveRoles.length > 0
    ? collectiveRoles.reduce((best, m) => {
        const rank: Record<string, number> = { member: 0, assist_leader: 1, co_leader: 2, leader: 3 }
        return (rank[m.role] ?? 0) > (rank[best.role] ?? 0) ? m : best
      }, collectiveRoles[0]).role
    : null

  const query = useQuery({
    queryKey: ['updates', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_announcements')
        .select(`
          *,
          author:profiles!global_announcements_author_id_fkey(id, display_name, avatar_url, role)
        `)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // Fetch read status for current user
      let readIds = new Set<string>()
      if (user) {
        const { data: reads } = await supabase
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id)

        readIds = new Set((reads ?? []).map((r) => r.announcement_id))
      }

      return (data ?? []).map((a) => ({
        ...a,
        is_read: readIds.has(a.id),
      })) as UpdateWithAuthor[]
    },
    staleTime: 2 * 60 * 1000,
  })

  // Realtime for new, updated, and deleted announcements
  useEffect(() => {
    const channel = supabase
      .channel('global_announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'global_announcements',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['updates'] })
          queryClient.invalidateQueries({ queryKey: ['updates-unread'] })
          queryClient.invalidateQueries({ queryKey: ['home', 'latest-update'] })
          queryClient.invalidateQueries({ queryKey: ['home', 'recent-updates'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Apply audience filtering, then split pinned + regular
  const effectiveRole = profile?.role ?? highestCollectiveRole
  const filtered = filterByAudience(query.data ?? [], effectiveRole, collectiveIds)
  const pinned = filtered.filter((a) => a.is_pinned)
  const regular = filtered.filter((a) => !a.is_pinned)

  return { ...query, pinned, regular, all: filtered }
}

/* ------------------------------------------------------------------ */
/*  Unread update count                                                */
/* ------------------------------------------------------------------ */

export function useUnreadUpdateCount() {
  const { user, profile, collectiveRoles } = useAuth()

  const collectiveIds = collectiveRoles.map((m) => m.collective_id)
  const highestCollectiveRole = collectiveRoles.length > 0
    ? collectiveRoles.reduce((best, m) => {
        const rank: Record<string, number> = { member: 0, assist_leader: 1, co_leader: 2, leader: 3 }
        return (rank[m.role] ?? 0) > (rank[best.role] ?? 0) ? m : best
      }, collectiveRoles[0]).role
    : null

  return useQuery({
    queryKey: ['updates-unread', user?.id],
    queryFn: async () => {
      if (!user) return 0

      // Fetch all announcement IDs (lightweight — id + audience fields only)
      const { data: announcements } = await supabase
        .from('global_announcements')
        .select('id, target_audience, target_collective_id')

      if (!announcements || announcements.length === 0) return 0

      // Apply audience filtering
      const effectiveRole = profile?.role ?? highestCollectiveRole
      const isLeaderRole = ['leader', 'co_leader', 'assist_leader'].includes(effectiveRole ?? '')
      const isStaffOrAdmin = ['national_staff', 'national_admin', 'super_admin'].includes(effectiveRole ?? '')

      const visibleIds = new Set(
        announcements
          .filter((a) => {
            if (isStaffOrAdmin) return true
            switch (a.target_audience) {
              case 'all': return true
              case 'leaders': return isLeaderRole
              case 'collective_specific':
                return a.target_collective_id ? collectiveIds.includes(a.target_collective_id) : true
              default: return true
            }
          })
          .map((a) => a.id),
      )

      // Fetch user's reads
      const { data: reads } = await supabase
        .from('announcement_reads')
        .select('announcement_id')
        .eq('user_id', user.id)

      const readIds = new Set((reads ?? []).map((r) => r.announcement_id))

      // Count visible announcements that haven't been read
      // Also ignore reads for deleted announcements (readId not in visibleIds)
      let unread = 0
      for (const id of visibleIds) {
        if (!readIds.has(id)) unread++
      }

      return unread
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Mark update as read                                                */
/* ------------------------------------------------------------------ */

export function useMarkUpdateRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateId: string) => {
      if (!user) return

      const { error } = await supabase
        .from('announcement_reads')
        .upsert(
          { announcement_id: updateId, user_id: user.id },
          { onConflict: 'announcement_id,user_id' },
        )

      if (error) throw error
    },
    onMutate: async (updateId) => {
      await queryClient.cancelQueries({ queryKey: ['updates'] })
      await queryClient.cancelQueries({ queryKey: ['updates-unread'] })
      const previous = queryClient.getQueryData<UpdateWithAuthor[]>(['updates', user?.id])

      queryClient.setQueryData<UpdateWithAuthor[]>(['updates', user?.id], (old) => {
        if (!old) return old
        return old.map(a => a.id === updateId ? { ...a, is_read: true } : a)
      })

      // Optimistically decrement unread count
      queryClient.setQueryData<number>(['updates-unread', user?.id], (old) =>
        old != null && old > 0 ? old - 1 : 0,
      )

      return { previous }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['updates', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['updates'] })
      queryClient.invalidateQueries({ queryKey: ['updates-unread'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Create update (staff/admin)                                        */
/* ------------------------------------------------------------------ */

interface CreateUpdateParams {
  title: string
  content: string
  imageUrls?: string[]
  priority: Enums<'announcement_priority'>
  targetAudience: Enums<'announcement_target'>
  targetCollectiveId?: string
  isPinned?: boolean
}

export function useCreateUpdate() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateUpdateParams) => {
      if (!user) throw new Error('Not authenticated')

      const urls = params.imageUrls ?? []
      const { data, error } = await supabase
        .from('global_announcements')
        .insert({
          author_id: user.id,
          title: params.title,
          content: params.content,
          image_url: urls[0] ?? null,
          image_urls: urls,
          priority: params.priority,
          target_audience: params.targetAudience,
          target_collective_id: params.targetCollectiveId ?? null,
          is_pinned: params.isPinned ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: ['updates'] })
      const previous = queryClient.getQueryData<UpdateWithAuthor[]>(['updates', user?.id])

      const urls = params.imageUrls ?? []
      const optimistic: UpdateWithAuthor = {
        id: `optimistic-${Date.now()}`,
        author_id: user!.id,
        title: params.title,
        content: params.content,
        image_url: urls[0] ?? null,
        image_urls: urls,
        priority: params.priority,
        target_audience: params.targetAudience,
        target_collective_id: params.targetCollectiveId ?? null,
        is_pinned: params.isPinned ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: { id: user!.id, display_name: profile?.display_name ?? null, avatar_url: profile?.avatar_url ?? null, role: profile?.role ?? null },
        is_read: true,
      } as UpdateWithAuthor

      // Insert optimistic entry respecting pinned sort order
      queryClient.setQueryData<UpdateWithAuthor[]>(['updates', user?.id], (old) => {
        if (!old) return [optimistic]
        if (optimistic.is_pinned) {
          // Prepend to the list (pinned items come first)
          return [optimistic, ...old]
        }
        // Insert after all pinned items
        const firstNonPinnedIdx = old.findIndex((a) => !a.is_pinned)
        if (firstNonPinnedIdx === -1) return [...old, optimistic]
        return [
          ...old.slice(0, firstNonPinnedIdx),
          optimistic,
          ...old.slice(firstNonPinnedIdx),
        ]
      })
      return { previous }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['updates', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['updates'] })
      queryClient.invalidateQueries({ queryKey: ['updates-unread'] })
      queryClient.invalidateQueries({ queryKey: ['home', 'latest-update'] })
      queryClient.invalidateQueries({ queryKey: ['home', 'recent-updates'] })
    },
  })
}
