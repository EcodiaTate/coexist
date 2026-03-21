import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { ChatMessage, Profile } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface StaffChannel {
  id: string
  type: 'staff_collective' | 'staff_state' | 'staff_national'
  collective_id: string | null
  state: string | null
  name: string
  created_at: string
}

export interface ChannelMessageWithSender {
  id: string
  channel_id: string
  user_id: string | null
  content: string | null
  image_url: string | null
  voice_url: string | null
  video_url: string | null
  reply_to_id: string | null
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  reply_message: { id: string; content: string | null; user_id: string | null } | null
  _optimistic?: boolean
  _optimisticId?: string
  _confirmed?: boolean
}

/* ------------------------------------------------------------------ */
/*  useMyStaffChannels — channels the user is a member of              */
/* ------------------------------------------------------------------ */

export function useMyStaffChannels() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-staff-channels', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('chat_channel_members' as any)
        .select('channel_id, chat_channels(id, type, collective_id, state, name, created_at)')
        .eq('user_id', user.id)

      if (error) throw error

      return (data ?? [])
        .map((row: any) => row.chat_channels as StaffChannel)
        .filter(Boolean)
        .sort((a: StaffChannel, b: StaffChannel) => {
          // National first, then state, then collective
          const typeOrder = { staff_national: 0, staff_state: 1, staff_collective: 2 }
          return (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3)
        })
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  useChannelMessages — paginated messages for a channel              */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 40

export function useChannelMessages(channelId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: ['channel-messages', channelId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!channelId) return []

      let q = supabase
        .from('chat_messages' as any)
        .select(`
          *,
          profiles!chat_messages_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        q = q.lt('created_at', pageParam)
      }

      const { data, error } = await q
      if (error) throw error

      const messages = (data ?? []) as unknown as ChannelMessageWithSender[]

      // Resolve reply_message client-side (self-referencing FK not in PostgREST cache)
      const replyIds = messages
        .map((m) => (m as any).reply_to_id)
        .filter((id: unknown): id is string => !!id)

      if (replyIds.length > 0) {
        const { data: replies } = await supabase
          .from('chat_messages' as any)
          .select('id, content, user_id')
          .in('id', replyIds)

        const replyMap = new Map((replies ?? []).map((r: any) => [r.id, r]))
        for (const msg of messages) {
          msg.reply_message = (msg as any).reply_to_id ? (replyMap.get((msg as any).reply_to_id) ?? null) : null
        }
      } else {
        for (const msg of messages) {
          msg.reply_message = null
        }
      }

      return messages
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return lastPage[lastPage.length - 1]?.created_at
    },
    enabled: !!channelId && !!user,
    staleTime: 10 * 1000,
  })

  // Realtime subscription for new messages
  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`channel-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: any) => {
          // Invalidate to refetch — simple approach
          queryClient.invalidateQueries({ queryKey: ['channel-messages', channelId] })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, queryClient])

  // Flatten pages into a single array (pages are newest-first, reverse for display)
  const messages = useMemo(
    () => query.data?.pages.flat().reverse() ?? [],
    [query.data],
  )

  return {
    ...query,
    messages,
  }
}

/* ------------------------------------------------------------------ */
/*  useSendChannelMessage — send a message to a channel                */
/* ------------------------------------------------------------------ */

export function useSendChannelMessage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      channelId,
      collectiveId,
      content,
      imageUrl,
      replyToId,
    }: {
      channelId: string
      collectiveId: string
      content?: string
      imageUrl?: string
      replyToId?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('chat_messages' as any)
        .insert({
          channel_id: channelId,
          collective_id: collectiveId,
          user_id: user.id,
          content: content || null,
          image_url: imageUrl || null,
          reply_to_id: replyToId || null,
        })

      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['channel-messages', variables.channelId] })
      queryClient.invalidateQueries({ queryKey: ['channel-unread'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  useChannelUnreadCounts — unread counts per channel                 */
/* ------------------------------------------------------------------ */

export function useChannelUnreadCounts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['channel-unread', user?.id],
    queryFn: async () => {
      if (!user) return {}

      // Get user's channel memberships with collective_id
      const { data: memberships } = await supabase
        .from('chat_channel_members' as any)
        .select('channel_id, chat_channels(collective_id)')
        .eq('user_id', user.id)

      if (!memberships?.length) return {}

      // Build channel → collectiveId map
      const channelToCollective = new Map<string, string>()
      for (const m of memberships as any[]) {
        const cid = m.chat_channels?.collective_id
        if (cid) channelToCollective.set(m.channel_id, cid)
      }

      // Get read receipts by collective_id (that's the unique key on chat_read_receipts)
      const collectiveIds = [...new Set(channelToCollective.values())]
      const { data: receipts } = await supabase
        .from('chat_read_receipts' as any)
        .select('collective_id, last_read_at')
        .eq('user_id', user.id)
        .in('collective_id', collectiveIds)

      const receiptMap = new Map<string, string>()
      for (const r of receipts ?? []) {
        receiptMap.set((r as any).collective_id, (r as any).last_read_at)
      }

      // Count unread messages per channel
      const counts: Record<string, number> = {}
      for (const [channelId, collectiveId] of channelToCollective) {
        const lastRead = receiptMap.get(collectiveId)
        let q = supabase
          .from('chat_messages' as any)
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .eq('is_deleted', false)

        if (lastRead) {
          q = q.gt('created_at', lastRead)
        }

        // Exclude own messages
        q = q.neq('user_id', user.id)

        const { count } = await q
        if (count && count > 0) {
          counts[channelId] = count
        }
      }

      return counts
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  useMarkChannelRead — update read receipt for a channel             */
/* ------------------------------------------------------------------ */

export function useMarkChannelRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ channelId, collectiveId }: { channelId: string; collectiveId: string }) => {
      if (!user) return

      await supabase
        .from('chat_read_receipts' as any)
        .upsert({
          collective_id: collectiveId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        }, { onConflict: 'collective_id,user_id' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-unread'] })
    },
  })
}
