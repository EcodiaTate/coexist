import { useEffect, useCallback, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { ChatMessage, Profile } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ChatMessageWithSender extends ChatMessage {
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  reply_message: Pick<ChatMessage, 'id' | 'content' | 'user_id'> | null
  sender_role?: string
  message_type?: 'text' | 'image' | 'voice' | 'video' | 'poll' | 'announcement' | 'system'
  poll_id?: string | null
  announcement_id?: string | null
  /** Client-only: optimistic message not yet confirmed by server */
  _optimistic?: boolean
  _optimisticId?: string
  /** Client-only: was optimistic, now confirmed — skip entrance animation */
  _confirmed?: boolean
}

interface SendMessageInput {
  collectiveId: string
  content?: string
  imageUrl?: string
  voiceUrl?: string
  videoUrl?: string
  replyToId?: string
  messageType?: string
  pollId?: string
  announcementId?: string
}

export interface ChatPoll {
  id: string
  collective_id: string
  created_by: string
  question: string
  options: { id: string; text: string }[]
  allow_multiple: boolean
  anonymous: boolean
  closes_at: string | null
  is_closed: boolean
  created_at: string
  profiles?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  votes?: ChatPollVote[]
  _vote_counts?: Record<string, number>
  _total_votes?: number
  _user_votes?: string[]
}

export interface ChatPollVote {
  id: string
  poll_id: string
  user_id: string
  option_id: string
  created_at: string
}

export interface ChatAnnouncement {
  id: string
  collective_id: string
  created_by: string
  type: 'announcement' | 'event_invite' | 'rsvp' | 'checklist'
  title: string
  body: string | null
  metadata: Record<string, unknown>
  expires_at: string | null
  is_active: boolean
  created_at: string
  profiles?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  responses?: ChatAnnouncementResponse[]
}

export interface ChatAnnouncementResponse {
  id: string
  announcement_id: string
  user_id: string
  response: string
  created_at: string
}

export interface BroadcastLogEntry {
  id: string
  collective_id: string
  sent_by: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown>
  recipient_count: number
  created_at: string
  profiles?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

const PAGE_SIZE = 40

/* ------------------------------------------------------------------ */
/*  Messages query (infinite scroll) + realtime                        */
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
          profiles!chat_messages_user_id_fkey(id, display_name, avatar_url)
        `)
        .eq('collective_id', collectiveId)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (pageParam) {
        q = q.lt('created_at', pageParam)
      }

      const { data, error } = await q
      if (error) throw error

      const messages = (data ?? []) as unknown as ChatMessageWithSender[]

      // Resolve reply_message client-side (self-referencing FK not in PostgREST cache)
      const replyIds = messages
        .map((m) => m.reply_to_id)
        .filter((id): id is string => !!id)

      if (replyIds.length > 0) {
        const { data: replies } = await supabase
          .from('chat_messages')
          .select('id, content, user_id')
          .in('id', replyIds)

        const replyMap = new Map((replies ?? []).map((r) => [r.id, r]))
        for (const msg of messages) {
          msg.reply_message = msg.reply_to_id ? (replyMap.get(msg.reply_to_id) ?? null) : null
        }
      } else {
        for (const msg of messages) {
          msg.reply_message = null
        }
      }

      return messages
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
          const newMsg = payload.new as ChatMessageWithSender

          // If this is our own message from optimistic update, replace it
          queryClient.setQueryData(
            ['chat-messages', collectiveId],
            (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
              if (!old) return old

              // Check if we have an optimistic version of this message
              const hasOptimistic = old.pages[0]?.some(
                (m) => m._optimistic && m.user_id === newMsg.user_id && m._optimisticId,
              )

              // Fetch full message with profile join (no self-ref FK)
              supabase
                .from('chat_messages')
                .select(`
                  *,
                  profiles!chat_messages_user_id_fkey(id, display_name, avatar_url)
                `)
                .eq('id', newMsg.id)
                .single()
                .then(async ({ data }) => {
                  // Resolve reply_message if needed
                  if (data && (data as Record<string, unknown>).reply_to_id) {
                    const { data: reply } = await supabase
                      .from('chat_messages')
                      .select('id, content, user_id')
                      .eq('id', (data as Record<string, unknown>).reply_to_id as string)
                      .single();
                    (data as Record<string, unknown>).reply_message = reply ?? null
                  } else if (data) {
                    (data as Record<string, unknown>).reply_message = null
                  }
                  if (!data) return
                  queryClient.setQueryData(
                    ['chat-messages', collectiveId],
                    (current: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
                      if (!current) return current

                      // Remove any optimistic message that matches this real one
                      let firstPage = current.pages[0] ?? []

                      // Replace optimistic message from same user sent around same time
                      const optimisticIdx = firstPage.findIndex(
                        (m) =>
                          m._optimistic &&
                          m.user_id === (data as unknown as ChatMessageWithSender).user_id &&
                          m.content === (data as unknown as ChatMessageWithSender).content,
                      )

                      if (optimisticIdx !== -1) {
                        // Merge server data into the optimistic slot, mark as confirmed
                        firstPage = [...firstPage]
                        firstPage[optimisticIdx] = {
                          ...(data as unknown as ChatMessageWithSender),
                          _optimistic: false,
                          _optimisticId: undefined,
                          _confirmed: true, // Skip entrance animation
                        } as ChatMessageWithSender
                      } else if (!firstPage.some((m) => m.id === (data as unknown as ChatMessageWithSender).id)) {
                        // New message from someone else - prepend
                        firstPage = [data as unknown as ChatMessageWithSender, ...firstPage]
                      }

                      return { ...current, pages: [firstPage, ...current.pages.slice(1)] }
                    },
                  )
                })

              // Return old for now - the .then() above will update with full data
              return old
            },
          )
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
  }, [collectiveId, queryClient, user?.id])

  return query
}

/* ------------------------------------------------------------------ */
/*  Send message (with optimistic update)                              */
/* ------------------------------------------------------------------ */

const MAX_MESSAGE_LENGTH = 4000
const RATE_LIMIT_WINDOW_MS = 10_000
const RATE_LIMIT_MAX = 5

export function useSendMessage() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()
  const sendTimestamps = useRef<number[]>([])

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      if (!user) throw new Error('Not authenticated')

      // Client-side rate limiting
      const now = Date.now()
      sendTimestamps.current = sendTimestamps.current.filter(
        (t) => now - t < RATE_LIMIT_WINDOW_MS,
      )
      if (sendTimestamps.current.length >= RATE_LIMIT_MAX) {
        throw new Error('Slow down! You\'re sending messages too quickly.')
      }
      sendTimestamps.current.push(now)

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
          message_type: input.messageType ?? 'text',
          poll_id: input.pollId ?? null,
          announcement_id: input.announcementId ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    // Optimistic update - show message immediately
    onMutate: async (input) => {
      if (!user) return

      await queryClient.cancelQueries({ queryKey: ['chat-messages', input.collectiveId] })

      const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const optimisticMessage: ChatMessageWithSender = {
        id: optimisticId,
        collective_id: input.collectiveId,
        user_id: user.id,
        content: input.content ?? null,
        image_url: input.imageUrl ?? null,
        voice_url: input.voiceUrl ?? null,
        video_url: input.videoUrl ?? null,
        reply_to_id: input.replyToId ?? null,
        is_pinned: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        message_type: (input.messageType ?? 'text') as ChatMessageWithSender['message_type'],
        poll_id: input.pollId ?? null,
        announcement_id: input.announcementId ?? null,
        profiles: {
          id: user.id,
          display_name: profile?.display_name ?? 'You',
          avatar_url: profile?.avatar_url ?? null,
        },
        reply_message: null,
        _optimistic: true,
        _optimisticId: optimisticId,
      }

      queryClient.setQueryData(
        ['chat-messages', input.collectiveId],
        (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
          if (!old) return old
          const firstPage = [optimisticMessage, ...(old.pages[0] ?? [])]
          return { ...old, pages: [firstPage, ...old.pages.slice(1)] }
        },
      )

      return { optimisticId }
    },
    onSuccess: (data, input) => {
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
    onError: (_err, input, context) => {
      // Remove optimistic message on error
      if (context?.optimisticId) {
        queryClient.setQueryData(
          ['chat-messages', input.collectiveId],
          (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) =>
                page.filter((m) => m._optimisticId !== context.optimisticId),
              ),
            }
          },
        )
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
    onMutate: async ({ messageId, content, collectiveId }) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', collectiveId] })
      const previous = queryClient.getQueryData(['chat-messages', collectiveId])
      queryClient.setQueryData(
        ['chat-messages', collectiveId],
        (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(page => page.map(msg => msg.id === messageId ? { ...msg, content } : msg)) }
        },
      )
      return { previous }
    },
    onError: (_err, { collectiveId }, context) => {
      if (context?.previous) queryClient.setQueryData(['chat-messages', collectiveId], context.previous)
    },
    onSettled: (collectiveId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', collectiveId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Delete message (soft delete - moderator)                           */
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
    onMutate: async ({ messageId, collectiveId }) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', collectiveId] })
      const previous = queryClient.getQueryData(['chat-messages', collectiveId])
      queryClient.setQueryData(
        ['chat-messages', collectiveId],
        (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(page => page.map(msg => msg.id === messageId ? { ...msg, is_deleted: true } : msg)) }
        },
      )
      return { previous }
    },
    onError: (_err, { collectiveId }, context) => {
      if (context?.previous) queryClient.setQueryData(['chat-messages', collectiveId], context.previous)
    },
    onSettled: (collectiveId) => {
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
    onMutate: async ({ messageId, collectiveId, pinned }) => {
      await queryClient.cancelQueries({ queryKey: ['chat-messages', collectiveId] })
      const previous = queryClient.getQueryData(['chat-messages', collectiveId])
      queryClient.setQueryData(
        ['chat-messages', collectiveId],
        (old: { pages: ChatMessageWithSender[][]; pageParams: (string | null)[] } | undefined) => {
          if (!old) return old
          return { ...old, pages: old.pages.map(page => page.map(msg => msg.id === messageId ? { ...msg, is_pinned: pinned } : msg)) }
        },
      )
      return { previous }
    },
    onError: (_err, { collectiveId }, context) => {
      if (context?.previous) queryClient.setQueryData(['chat-messages', collectiveId], context.previous)
    },
    onSettled: (collectiveId) => {
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

      const { data: memberships } = await supabase
        .from('collective_members')
        .select('collective_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (!memberships?.length) return {}

      const { data: receipts } = await supabase
        .from('chat_read_receipts')
        .select('collective_id, last_read_at')
        .eq('user_id', user.id)

      const receiptMap = new Map(receipts?.map((r) => [r.collective_id, r.last_read_at]) ?? [])
      const counts: Record<string, number> = {}

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
/*  Polls                                                              */
/* ------------------------------------------------------------------ */

export function useCreatePoll() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const sendMessage = useSendMessage()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      question,
      options,
      allowMultiple = false,
      anonymous = false,
      closesAt,
    }: {
      collectiveId: string
      question: string
      options: string[]
      allowMultiple?: boolean
      anonymous?: boolean
      closesAt?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const pollOptions = options.map((text, i) => ({
        id: `opt-${Date.now()}-${i}`,
        text,
      }))

      const { data: poll, error } = await supabase
        .from('chat_polls')
        .insert({
          collective_id: collectiveId,
          created_by: user.id,
          question,
          options: pollOptions,
          allow_multiple: allowMultiple,
          anonymous,
          closes_at: closesAt ?? null,
        })
        .select()
        .single()

      if (error) throw error

      // Send a poll message in the chat
      await sendMessage.mutateAsync({
        collectiveId,
        content: question,
        messageType: 'poll',
        pollId: poll.id,
      })

      return poll
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['chat-polls', input.collectiveId] })
    },
  })
}

export function usePollVote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pollId, optionId, collectiveId }: { pollId: string; optionId: string; collectiveId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('chat_poll_votes')
        .upsert({
          poll_id: pollId,
          user_id: user.id,
          option_id: optionId,
        }, { onConflict: 'poll_id,user_id,option_id' })

      if (error) throw error
      return { pollId, collectiveId }
    },
    onSuccess: ({ pollId, collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-poll', pollId] })
      queryClient.invalidateQueries({ queryKey: ['chat-polls', collectiveId] })
    },
  })
}

export function useRemovePollVote() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ pollId, optionId, collectiveId }: { pollId: string; optionId: string; collectiveId: string }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('chat_poll_votes')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .eq('option_id', optionId)

      if (error) throw error
      return { pollId, collectiveId }
    },
    onSuccess: ({ pollId, collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-poll', pollId] })
      queryClient.invalidateQueries({ queryKey: ['chat-polls', collectiveId] })
    },
  })
}

export function usePollDetail(pollId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['chat-poll', pollId],
    queryFn: async () => {
      if (!pollId) throw new Error('No poll ID')

      const { data: poll, error } = await supabase
        .from('chat_polls')
        .select(`
          *,
          profiles!chat_polls_created_by_fkey(id, display_name, avatar_url)
        `)
        .eq('id', pollId)
        .single()

      if (error) throw error

      // Get vote counts
      const { data: votes } = await supabase
        .from('chat_poll_votes')
        .select('option_id, user_id')
        .eq('poll_id', pollId)

      const voteCounts: Record<string, number> = {}
      const userVotes: string[] = []
      let totalVoters = new Set<string>()

      for (const v of votes ?? []) {
        voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1
        totalVoters.add(v.user_id)
        if (v.user_id === user?.id) {
          userVotes.push(v.option_id)
        }
      }

      return {
        ...poll,
        _vote_counts: voteCounts,
        _total_votes: totalVoters.size,
        _user_votes: userVotes,
      } as ChatPoll
    },
    enabled: !!pollId,
    staleTime: 10 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Announcements                                                      */
/* ------------------------------------------------------------------ */

export function useCreateAnnouncement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const sendMessage = useSendMessage()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      type,
      title,
      body,
      metadata = {},
      expiresAt,
    }: {
      collectiveId: string
      type: 'announcement' | 'event_invite' | 'rsvp' | 'checklist'
      title: string
      body?: string
      metadata?: Record<string, unknown>
      expiresAt?: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      const { data: announcement, error } = await supabase
        .from('chat_announcements')
        .insert({
          collective_id: collectiveId,
          created_by: user.id,
          type,
          title,
          body: body ?? null,
          metadata,
          expires_at: expiresAt ?? null,
        })
        .select()
        .single()

      if (error) throw error

      // Send an announcement message in the chat
      await sendMessage.mutateAsync({
        collectiveId,
        content: title,
        messageType: 'announcement',
        announcementId: announcement.id,
      })

      return announcement
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: ['chat-announcements', input.collectiveId] })
    },
  })
}

export function useAnnouncementDetail(announcementId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['chat-announcement', announcementId],
    queryFn: async () => {
      if (!announcementId) throw new Error('No announcement ID')

      const { data, error } = await supabase
        .from('chat_announcements')
        .select(`
          *,
          profiles!chat_announcements_created_by_fkey(id, display_name, avatar_url)
        `)
        .eq('id', announcementId)
        .single()

      if (error) throw error

      // Get responses
      const { data: responses } = await supabase
        .from('chat_announcement_responses')
        .select('*')
        .eq('announcement_id', announcementId)

      return { ...data, responses: responses ?? [] } as ChatAnnouncement
    },
    enabled: !!announcementId,
    staleTime: 15 * 1000,
  })
}

export function useRespondToAnnouncement() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      announcementId,
      response,
    }: {
      announcementId: string
      response: string
    }) => {
      if (!user) throw new Error('Not authenticated')

      // Remove existing response first (single-choice)
      await supabase
        .from('chat_announcement_responses')
        .delete()
        .eq('announcement_id', announcementId)
        .eq('user_id', user.id)

      const { error } = await supabase
        .from('chat_announcement_responses')
        .insert({
          announcement_id: announcementId,
          user_id: user.id,
          response,
        })

      if (error) throw error
    },
    onSuccess: (_, { announcementId }) => {
      queryClient.invalidateQueries({ queryKey: ['chat-announcement', announcementId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Broadcast notifications (leader feature)                           */
/* ------------------------------------------------------------------ */

export function useBroadcastLog(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['broadcast-log', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective ID')

      const { data, error } = await supabase
        .from('chat_broadcast_log')
        .select(`
          *,
          profiles!chat_broadcast_log_sent_by_fkey(id, display_name, avatar_url)
        `)
        .eq('collective_id', collectiveId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return (data ?? []) as BroadcastLogEntry[]
    },
    enabled: !!collectiveId,
    staleTime: 30 * 1000,
  })
}

export function useSendBroadcastNotification() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      collectiveId,
      title,
      body,
      type = 'push_notification',
      metadata = {},
    }: {
      collectiveId: string
      title: string
      body: string
      type?: string
      metadata?: Record<string, unknown>
    }) => {
      if (!user) throw new Error('Not authenticated')

      // Send push notification to all collective members
      const { data: pushResult } = await supabase.functions.invoke('send-push', {
        body: {
          collectiveId,
          title,
          body,
          data: {
            type: 'chat_messages',
            collective_id: collectiveId,
          },
        },
      })

      // Log the broadcast for dedup visibility
      const { error } = await supabase
        .from('chat_broadcast_log')
        .insert({
          collective_id: collectiveId,
          sent_by: user.id,
          type,
          title,
          body,
          metadata,
          recipient_count: pushResult?.sent ?? 0,
        })

      if (error) throw error
      return pushResult
    },
    onSuccess: (_, { collectiveId }) => {
      queryClient.invalidateQueries({ queryKey: ['broadcast-log', collectiveId] })
    },
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

      const { data: signedData, error: signError } = await supabase.storage
        .from('chat-images')
        .createSignedUrl(path, 60 * 60 * 24 * 7)
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
