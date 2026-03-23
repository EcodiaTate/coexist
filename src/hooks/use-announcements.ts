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

export interface AnnouncementWithAuthor extends GlobalAnnouncement {
  author: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'role'> | null
  is_read: boolean
}

/* ------------------------------------------------------------------ */
/*  Fetch announcements (with read status for current user)            */
/* ------------------------------------------------------------------ */

export function useAnnouncements() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['announcements', user?.id],
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
      })) as AnnouncementWithAuthor[]
    },
    staleTime: 2 * 60 * 1000,
  })

  // Realtime for new announcements
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
          queryClient.invalidateQueries({ queryKey: ['announcements'] })
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
/*  Unread announcement count                                          */
/* ------------------------------------------------------------------ */

export function useUnreadAnnouncementCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['announcements-unread', user?.id],
    queryFn: async () => {
      if (!user) return 0

      // Total announcements
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
/*  Mark announcement as read                                          */
/* ------------------------------------------------------------------ */

export function useMarkAnnouncementRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user) return

      const { error } = await supabase
        .from('announcement_reads')
        .upsert(
          { announcement_id: announcementId, user_id: user.id },
          { onConflict: 'announcement_id,user_id' },
        )

      if (error) throw error
    },
    onMutate: async (announcementId) => {
      await queryClient.cancelQueries({ queryKey: ['announcements'] })
      const previous = queryClient.getQueryData<AnnouncementWithAuthor[]>(['announcements', user?.id])
      queryClient.setQueryData<AnnouncementWithAuthor[]>(['announcements', user?.id], (old) => {
        if (!old) return old
        return old.map(a => a.id === announcementId ? { ...a, is_read: true } : a)
      })
      return { previous }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['announcements', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
      queryClient.invalidateQueries({ queryKey: ['announcements-unread'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Create announcement (staff/admin)                                  */
/* ------------------------------------------------------------------ */

interface CreateAnnouncementParams {
  title: string
  content: string
  imageUrls?: string[]
  priority: Enums<'announcement_priority'>
  targetAudience: Enums<'announcement_target'>
  targetCollectiveId?: string
  isPinned?: boolean
}

export function useCreateAnnouncement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateAnnouncementParams) => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })
}
