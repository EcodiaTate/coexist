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
/*  Fetch updates (with read status for current user)                  */
/* ------------------------------------------------------------------ */

export function useUpdates() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

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

  // Realtime for new updates
  useEffect(() => {
    const channel = supabase
      .channel('global_announcements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_announcements',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['updates'] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Split pinned + regular
  const pinned = (query.data ?? []).filter((a) => a.is_pinned)
  const regular = (query.data ?? []).filter((a) => !a.is_pinned)

  return { ...query, pinned, regular }
}

/* ------------------------------------------------------------------ */
/*  Unread update count                                                */
/* ------------------------------------------------------------------ */

export function useUnreadUpdateCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['updates-unread', user?.id],
    queryFn: async () => {
      if (!user) return 0

      // Total updates
      const { count: total } = await supabase
        .from('global_announcements')
        .select('*', { count: 'exact', head: true })

      // Read by user
      const { count: readCount } = await supabase
        .from('announcement_reads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      return Math.max(0, (total ?? 0) - (readCount ?? 0))
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
      const previous = queryClient.getQueryData<UpdateWithAuthor[]>(['updates', user?.id])
      queryClient.setQueryData<UpdateWithAuthor[]>(['updates', user?.id], (old) => {
        if (!old) return old
        return old.map(a => a.id === updateId ? { ...a, is_read: true } : a)
      })
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

      queryClient.setQueryData<UpdateWithAuthor[]>(['updates', user?.id], (old) =>
        old ? [optimistic, ...old] : [optimistic],
      )
      return { previous }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['updates', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['updates'] })
    },
  })
}
