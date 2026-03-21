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
      if (!channelId) return { messages: [], nextCursor: null }

      let q = supabase
        .from('chat_messages' as any)
        .select('*, profiles(id, display_name, avatar_url)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        q = q.lt('created_at', pageParam)
      }

      const { data, error } = await q
      if (error) throw error

      const messages = (data ?? []) as ChannelMessageWithSender[]
      const nextCursor = messages.length === PAGE_SIZE ? messages[messages.length - 1]?.created_at : null

      return { messages, nextCursor }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
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

  // Flatten pages into a single array
  const messages = useMemo(
    () => query.data?.pages.flatMap((p) => p.messages).reverse() ?? [],
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
      content,
      imageUrl,
      replyToId,
    }: {
      channelId: string
      content?: string
      imageUrl?: string
      replyToId?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('chat_messages' as any)
        .insert({
          channel_id: channelId,
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

      // Get user's channel memberships
      const { data: memberships } = await supabase
        .from('chat_channel_members' as any)
        .select('channel_id')
        .eq('user_id', user.id)

      if (!memberships?.length) return {}

      // Get read receipts for channels
      const channelIds = memberships.map((m: any) => m.channel_id)
      const { data: receipts } = await supabase
        .from('chat_read_receipts' as any)
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)
        .in('channel_id', channelIds)

      const receiptMap = new Map<string, string>()
      for (const r of receipts ?? []) {
        receiptMap.set((r as any).channel_id, (r as any).last_read_at)
      }

      // Count unread messages per channel
      const counts: Record<string, number> = {}
      for (const channelId of channelIds) {
        const lastRead = receiptMap.get(channelId)
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
    mutationFn: async (channelId: string) => {
      if (!user) return

      await supabase
        .from('chat_read_receipts' as any)
        .upsert({
          channel_id: channelId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        }, { onConflict: 'channel_id,user_id' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-unread'] })
    },
  })
}
