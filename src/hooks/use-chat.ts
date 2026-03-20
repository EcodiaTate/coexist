import { useEffect, useCallback, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { ChatMessage, Profile, Database } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChatMessageWithSender extends ChatMessage {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  reply_message: Pick<ChatMessage, 'id' | 'content' | 'user_id'> & {
    profiles: Pick<Profile, 'id' | 'display_name'> | null
  } | null
  sender_role?: string
}

interface SendMessageInput {
  collectiveId: string
  content?: string
  imageUrl?: string
  voiceUrl?: string
  videoUrl?: string
  replyToId?: string
}

const PAGE_SIZE = 40

/* ------------------------------------------------------------------ */
/*  Messages query (infinite scroll)                                   */
/* ------------------------------------------------------------------ */

export function useChatMessages(collectiveId: string | undefined) {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const query = useInfiniteQuery({
    queryKey: ['chat-messages', collectiveId],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      if (!collectiveId) throw new Error('No collective ID')

      let q = supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_user_id_fkey(id, display_name, avatar_url),
          reply_message:chat_messages!chat_messages_reply_to_id_fkey(id, content, user_id, profiles!chat_messages_user_id_fkey(id, display_name))
        `)
        .eq('collective_id', collectiveId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        q = q.lt('created_at', pageParam)
      }

      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ChatMessageWithSender[]
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined
      return lastPage[lastPage.length - 1]?.created_at
    },
    initialPageParam: null as string | null,
    enabled: !!collectiveId,
    staleTime: 30 * 1000,
  })

  // Realtime subscription
  useEffect(() => {
    if (!collectiveId) return

    const channel = supabase
      .channel(`chat:${collectiveId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `collective_id=eq.${collectiveId}`,
        },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profiles!chat_messages_user_id_fkey(id, display_name, avatar_url),
              reply_message:chat_messages!chat_messages_reply_to_id_fkey(id, content, user_id, profiles!chat_messages_user_id_fkey(id, display_name))
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            queryClient.setQueryData(
              ['chat-messages', collectiveId],
              (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
                if (!old) return old
                // Prevent duplicate: skip if message already exists in first page
                if (old.pages[0]?.some((m) => m.id === data.id)) return old
                const firstPage = [data as ChatMessageWithSender, ...old.pages[0]]
                return { ...old, pages: [firstPage, ...old.pages.slice(1)] }
              },
            )
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `collective_id=eq.${collectiveId}`,
        },
        (payload) => {
          // Only merge raw column fields — preserve joined relations (profiles, reply_message)
          const { profiles: _, reply_message: __, ...columnUpdates } = payload.new as Record<string, unknown>
          queryClient.setQueryData(
            ['chat-messages', collectiveId],
            (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map((page) =>
                  page.map((msg) =>
                    msg.id === payload.new.id ? { ...msg, ...columnUpdates } : msg,
                  ),
                ),
              }
            },
          )
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [collectiveId, queryClient])

  return query
}

/* ------------------------------------------------------------------ */
/*  Send message                                                       */
/* ------------------------------------------------------------------ */

const MAX_MESSAGE_LENGTH = 4000
const RATE_LIMIT_WINDOW_MS = 10_000
const RATE_LIMIT_MAX = 5

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const sendTimestamps = useRef<number[]>([])

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      if (!user) throw new Error('Not authenticated')

      // Client-side rate limiting: max 5 messages per 10 seconds
      const now = Date.now()
      sendTimestamps.current = sendTimestamps.current.filter(
        (t) => now - t < RATE_LIMIT_WINDOW_MS,
      )
      if (sendTimestamps.current.length >= RATE_LIMIT_MAX) {
        throw new Error('Slow down! You\'re sending messages too quickly.')
      }
      sendTimestamps.current.push(now)

      // Validate content length
      if (input.content && input.content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(`Message too long (max ${MAX_MESSAGE_LENGTH} characters)`)
      }

      const { error, data } = await supabase
        .from('chat_messages')
        .insert({
          collective_id: input.collectiveId,
          user_id: user.id,
          content: input.content?.slice(0, MAX_MESSAGE_LENGTH) ?? null,
          image_url: input.imageUrl ?? null,
          voice_url: input.voiceUrl ?? null,
          video_url: input.videoUrl ?? null,
          reply_to_id: input.replyToId ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    // Optimistic update handled by realtime subscription
    onSuccess: (_, input) => {
      // Update read receipt
      if (user) {
        supabase
          .from('chat_read_receipts')
          .upsert({
            collective_id: input.collectiveId,
            user_id: user.id,
            last_read_at: new Date().toISOString(),
          }, { onConflict: 'collective_id,user_id' })
          .then()
      }
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Edit message                                                       */
/* ------------------------------------------------------------------ */

export function useEditMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, content, collectiveId }: { messageId: string; content: string; collectiveId: string }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ content })
        .eq('id', messageId)
      if (error) throw error
      return collectiveId
    },
    onSuccess: (collectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Delete message (soft delete — moderator)                           */
/* ------------------------------------------------------------------ */

export function useDeleteMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, collectiveId }: { messageId: string; collectiveId: string }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
      if (error) throw error
      return collectiveId
    },
    onSuccess: (collectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Pin / unpin message (moderator)                                    */
/* ------------------------------------------------------------------ */

export function usePinMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messageId, collectiveId, pinned }: { messageId: string; collectiveId: string; pinned: boolean }) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_pinned: pinned })
        .eq('id', messageId)
      if (error) throw error
      return collectiveId
    },
    onSuccess: (collectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', collectiveId] })
      queryClient.invalidateQueries({ queryKey: ['pinned-messages', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Pinned messages                                                    */
/* ------------------------------------------------------------------ */

export function usePinnedMessages(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['pinned-messages', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles!chat_messages_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq('collective_id', collectiveId)
        .eq('is_pinned', true)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!collectiveId,
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Read receipts                                                      */
/* ------------------------------------------------------------------ */

export function useMarkChatRead(collectiveId: string | undefined) {
  const { user } = useAuth()

  return useCallback(async () => {
    if (!user || !collectiveId) return
    await supabase
      .from('chat_read_receipts')
      .upsert({
        collective_id: collectiveId,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      }, { onConflict: 'collective_id,user_id' })
  }, [user, collectiveId])
}

/* ------------------------------------------------------------------ */
/*  Unread count per collective                                        */
/* ------------------------------------------------------------------ */

export function useUnreadCounts() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['unread-counts', user?.id],
    queryFn: async () => {
      if (!user) return {}

      // Get user's collectives
      const { data: memberships } = await supabase
        .from('collective_members')
        .select('collective_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (!memberships?.length) return {}

      // Get read receipts
      const { data: receipts } = await supabase
        .from('chat_read_receipts')
        .select('collective_id, last_read_at')
        .eq('user_id', user.id)

      const receiptMap = new Map(receipts?.map((r) => [r.collective_id, r.last_read_at]) ?? [])
      const counts: Record<string, number> = {}

      // Count unread per collective
      for (const m of memberships) {
        const lastRead = receiptMap.get(m.collective_id)
        let query = supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('collective_id', m.collective_id)
          .eq('is_deleted', false)
          .neq('user_id', user.id)

        if (lastRead) {
          query = query.gt('created_at', lastRead)
        }

        const { count } = await query
        counts[m.collective_id] = count ?? 0
      }

      return counts
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Member roles for chat badges                                       */
/* ------------------------------------------------------------------ */

export function useCollectiveMemberRoles(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['collective-member-roles', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')
      const { data, error } = await supabase
        .from('collective_members')
        .select('user_id, role')
        .eq('collective_id', collectiveId)
        .eq('status', 'active')
        .in('role', ['leader', 'co_leader', 'assist_leader'])
      if (error) throw error
      const map = new Map<string, string>()
      for (const m of data ?? []) {
        const label = m.role === 'leader' ? 'Leader' : m.role === 'co_leader' ? 'Co-Leader' : 'Assist Leader'
        map.set(m.user_id, label)
      }
      return map
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Upload chat image                                                  */
/* ------------------------------------------------------------------ */

export function useUploadChatImage(collectiveId: string) {
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${collectiveId}/${user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(path, file)
      if (uploadError) throw uploadError

      // chat-images is a private bucket — use signed URL (valid for 7 days)
      const { data: signedData, error: signError } = await supabase.storage
        .from('chat-images')
        .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days
      if (signError) throw signError

      return signedData.signedUrl
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Chat export (leader)                                               */
/* ------------------------------------------------------------------ */

export async function exportChatLog(
  collectiveId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('content, created_at, profiles!chat_messages_user_id_fkey(display_name)')
    .eq('collective_id', collectiveId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (error) throw error

  const header = 'Timestamp,Sender,Message\n'
  const rows = (data ?? []).map((m) => {
    const name = (m.profiles as { display_name: string | null } | null)?.display_name ?? 'Unknown'
    const time = new Date(m.created_at).toLocaleString()
    const content = (m.content ?? '').replace(/"/g, '""')
    return `"${time}","${name}","${content}"`
  }).join('\n')

  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
