import { useState, useRef, useEffect, useLayoutEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown, Lock, X, Reply, Search } from 'lucide-react'
import { Header } from '@/components/header'
import { ChatSwitcherDropdown } from '@/components/chat-switcher-dropdown'
import { ChatBubble, PollCard, AnnouncementCard } from '@/components/chat-bubble'
import { HtmlChatBubble } from '@/components/html-chat-bubble'
import { MessageInput } from '@/components/message-input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { UploadProgress } from '@/components/upload-progress'
import { ProfileModal } from '@/components/profile-modal'
import { CreatePollSheet } from '@/components/create-poll-sheet'
import { CreateAnnouncementSheet } from '@/components/create-announcement-sheet'
import { BroadcastNotificationSheet } from '@/components/broadcast-notification-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useLayout } from '@/hooks/use-layout'
import {
    useChannelMessages,
    useSendChannelMessage,
    useMarkChannelRead,
    useMyStaffChannels,
    type ChannelMessageWithSender,
} from '@/hooks/use-staff-channels'
import {
    useSendBroadcastNotification,
    useBroadcastLog,
    usePollDetail,
    usePollVote,
    useRemovePollVote,
    useAnnouncementDetail,
    useRespondToAnnouncement,
} from '@/hooks/use-chat'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEventDetail, type EventDetailData } from '@/hooks/use-events'
import type { Tables } from '@/types/database.types'

type EventRegistration = Tables<'event_registrations'>

/* ------------------------------------------------------------------ */
/*  Channel type labels + icons                                        */
/* ------------------------------------------------------------------ */


/** Strip redundant words from channel name for cleaner display */
function cleanChannelName(name: string): string {
  return name
    .replace(/\bCollective\b\s*/i, '')
    .replace(/\bStaff\b\s*/i, '')
    .trim()
    || name
}


/* ------------------------------------------------------------------ */
/*  Date separator                                                     */
/* ------------------------------------------------------------------ */

function formatDateHeader(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diff = Math.round((today.getTime() - msgDate.getTime()) / 86400000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return date.toLocaleDateString('en-AU', { weekday: 'long' })
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function shouldShowDateSeparator(
  current: ChannelMessageWithSender,
  previous: ChannelMessageWithSender | undefined,
): boolean {
  if (!previous) return true
  const currentDate = new Date(current.created_at)
  const previousDate = new Date(previous.created_at)
  return (
    currentDate.getDate() !== previousDate.getDate() ||
    currentDate.getMonth() !== previousDate.getMonth() ||
    currentDate.getFullYear() !== previousDate.getFullYear()
  )
}

/* ------------------------------------------------------------------ */
/*  Inline Poll Renderer                                               */
/* ------------------------------------------------------------------ */

function InlinePoll({
  pollId,
  collectiveId,
  sent,
}: {
  pollId: string
  collectiveId?: string | null
  sent: boolean
}) {
  const { data: poll } = usePollDetail(pollId)
  const vote = usePollVote()
  const removeVote = useRemovePollVote()

  if (!poll) return null

  return (
    <PollCard
      question={poll.question}
      options={poll.options}
      voteCounts={poll._vote_counts ?? {}}
      totalVotes={poll._total_votes ?? 0}
      userVotes={poll._user_votes ?? []}
      isClosed={poll.is_closed}
      allowMultiple={poll.allow_multiple}
      anonymous={poll.anonymous}
      creatorName={poll.profiles?.display_name ?? undefined}
      closesAt={poll.closes_at}
      onVote={(optionId) => vote.mutate({ pollId, optionId, collectiveId: poll.collective_id ?? collectiveId ?? '' })}
      onRemoveVote={(optionId) => removeVote.mutate({ pollId, optionId, collectiveId: poll.collective_id ?? collectiveId ?? '' })}
      sent={sent}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Inline Announcement Renderer                                       */
/* ------------------------------------------------------------------ */

function InlineAnnouncement({
  announcementId,
  sent,
}: {
  announcementId: string
  sent: boolean
}) {
  const { data: announcement } = useAnnouncementDetail(announcementId)
  const respond = useRespondToAnnouncement()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Derive event info before any early returns so hooks are always called in the same order
  const eventId = (announcement?.metadata as Record<string, unknown> | undefined)?.event_id as string | undefined
  const isEventType = announcement?.type === 'event_invite' || announcement?.type === 'rsvp'
  const { data: eventDetail } = useEventDetail(isEventType && eventId ? eventId : undefined)

  const queryClient = useQueryClient()

  if (!announcement) return null

  const userResponse = announcement.responses?.find((r) => r.user_id === user?.id)?.response ?? null

  const handleRespond = async (response: string) => {
    respond.mutate({ announcementId, response })

    if (isEventType && eventId) {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })

      // Optimistic update for event detail page
      const prevEvent = queryClient.getQueryData<EventDetailData>(['event', eventId, user?.id])
      if (prevEvent) {
        queryClient.setQueryData<EventDetailData>(['event', eventId, user?.id], (old) => {
          if (!old) return old
          if (response === 'going') {
            const wasRegistered = old.user_registration && old.user_registration.status === 'registered'
            return {
              ...old,
              registration_count: old.registration_count + (wasRegistered ? 0 : 1),
              user_registration: {
                event_id: eventId,
                user_id: user!.id,
                status: 'registered',
                checked_in_at: null,
                registered_at: new Date().toISOString(),
                invited_at: null,
                id: old.user_registration?.id ?? crypto.randomUUID(),
              } as EventRegistration,
            }
          } else if (response === 'not_going') {
            const wasRegistered = old.user_registration && ['registered', 'invited', 'waitlisted'].includes(old.user_registration.status!)
            return {
              ...old,
              registration_count: Math.max(0, old.registration_count - (wasRegistered ? 1 : 0)),
              user_registration: null,
            }
          }
          return old
        })
      }

      try {
        if (response === 'going') {
          const { error } = await supabase
            .from('event_registrations')
            .upsert(
              { event_id: eventId, user_id: user!.id, status: 'registered' as const, registered_at: new Date().toISOString() },
              { onConflict: 'event_id,user_id' },
            )
          if (error) throw error
          toast.success("You're registered!")
        } else if (response === 'not_going') {
          await supabase
            .from('event_registrations')
            .update({ status: 'cancelled' as const })
            .eq('event_id', eventId)
            .eq('user_id', user!.id)
          toast.info('RSVP removed')
        } else if (response === 'maybe') {
          try {
            await supabase.rpc('handle_announcement_rsvp', {
              p_event_id: eventId,
              p_response: 'maybe',
            })
          } catch {
            // RPC might not exist yet
          }
          toast.info("We'll remind you closer to the date")
        }
      } catch {
        if (prevEvent) {
          queryClient.setQueryData(['event', eventId, user?.id], prevEvent)
        }
        toast.error('Failed to update your RSVP')
      }

      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
      queryClient.invalidateQueries({ queryKey: ['home', 'my-upcoming-events'] })
    }
  }

  const eventDetails = eventDetail
    ? {
        coverImageUrl: eventDetail.cover_image_url,
        dateStart: eventDetail.date_start,
        dateEnd: eventDetail.date_end,
        address: eventDetail.address,
        activityType: eventDetail.activity_type,
        collectiveName: eventDetail.collectives?.name,
      }
    : null

  return (
    <AnnouncementCard
      type={announcement.type}
      title={announcement.title}
      body={announcement.body}
      creatorName={announcement.profiles?.display_name ?? undefined}
      metadata={announcement.metadata}
      responses={announcement.responses}
      userResponse={userResponse}
      isActive={announcement.is_active}
      sent={sent}
      onRespond={handleRespond}
      onViewEvent={(evId) => navigate(`/events/${evId}`)}
      eventDetails={eventDetails}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChannelChatPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const shouldReduceMotion = useReducedMotion()
  const { user, isStaff, isAdmin, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const { navMode } = useLayout()
  const hasBottomTabs = navMode === 'bottom-tabs'

  const { data: channels } = useMyStaffChannels()
  const channel = channels?.find((c) => c.id === channelId)

  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useChannelMessages(channelId)
  const showLoading = useDelayedLoading(isLoading)
  const sendMessage = useSendChannelMessage()
  const markRead = useMarkChannelRead()
  const { pickFromGallery } = useCamera()
  const chatUpload = useImageUpload({ bucket: 'chat-images' })

  // Staff always have leader-like powers in staff channels
  const isLeaderOrAbove = isStaff || isAdmin || isSuperAdmin

  // Leader features
  const collectiveId = channel?.collective_id
  const { data: broadcastLog = [] } = useBroadcastLog(isLeaderOrAbove && collectiveId ? collectiveId : undefined)
  const sendBroadcast = useSendBroadcastNotification()

  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const initialScrollDone = useRef(false)

  // Reset scroll state when switching channels
  useEffect(() => {
    initialScrollDone.current = false
  }, [channelId])
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [replyTo, setReplyTo] = useState<ChannelMessageWithSender | null>(null)
  const [showPollSheet, setShowPollSheet] = useState(false)
  const [showAnnouncementSheet, setShowAnnouncementSheet] = useState(false)
  const [showBroadcastSheet, setShowBroadcastSheet] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  // Mark as read on mount and when new messages arrive (only if user is at bottom)
  useEffect(() => {
    if (channelId && messages.length > 0 && !showScrollDown) {
      markRead.mutate({ channelId, collectiveId })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, messages.length, showScrollDown])

  // Instant scroll to bottom BEFORE paint on first load (no visible jump)
  useLayoutEffect(() => {
    if (!initialScrollDone.current && !isLoading && messages.length > 0) {
      const container = scrollRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
        initialScrollDone.current = true
      })
    }
  }, [messages.length, isLoading])

  // Smooth scroll on subsequent new messages (only after initial load)
  useEffect(() => {
    if (initialScrollDone.current && !showScrollDown) {
      messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    }
  }, [messages.length, shouldReduceMotion, showScrollDown])

  // Track scroll position for "scroll to bottom" button
  const scrollRafId = useRef(0)
  useEffect(() => () => cancelAnimationFrame(scrollRafId.current), [])
  const handleScroll = useCallback(() => {
    if (!initialScrollDone.current) return
    cancelAnimationFrame(scrollRafId.current)
    scrollRafId.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollDown(distFromBottom > 300)

      // Load more when scrolling near top
      if (el.scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = useCallback(
    (content: string) => {
      if (!channelId || !content.trim()) return
      sendMessage.mutate({
        channelId,
        collectiveId: collectiveId ?? null,
        content: content.trim(),
        replyToId: replyTo?.id,
      })
      setReplyTo(null)
    },
    [channelId, collectiveId, sendMessage, replyTo],
  )

  const handleAttach = useCallback(async () => {
    if (!channelId) return
    const result = await pickFromGallery()
    if (!result) return
    try {
      const uploaded = await chatUpload.upload(result.blob)
      sendMessage.mutate({
        channelId,
        collectiveId: collectiveId ?? null,
        content: '',
        imageUrl: uploaded.url,
      })
    } catch {
      toast.error('Failed to upload image')
    }
  }, [channelId, collectiveId, pickFromGallery, chatUpload, sendMessage, toast])

  const handleAttachHtml = useCallback(async (htmlContent: string) => {
    if (!channelId) return
    sendMessage.mutate({
      channelId,
      collectiveId: collectiveId ?? null,
      content: htmlContent,
      messageType: 'html',
    })
  }, [channelId, collectiveId, sendMessage])

  // Leader action handlers - create the record then send a channel message
  // (can't reuse useCreatePoll/useCreateAnnouncement because those send to the
  //  collective's public chat via useSendMessage, not to the staff channel)
  const [creatingPoll, setCreatingPoll] = useState(false)
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false)

  const handleCreatePoll = async (data: {
    question: string
    options: string[]
    allowMultiple: boolean
    anonymous: boolean
  }) => {
    if (!channelId || !user) return
    setShowPollSheet(false)
    setCreatingPoll(true)
    toast.info('Creating poll...')

    try {
      const pollOptions = data.options.map((text, i) => ({
        id: `opt-${Date.now()}-${i}`,
        text,
      }))

      const { data: poll, error } = await supabase
        .from('chat_polls')
        .insert({
          collective_id: collectiveId || null,
          created_by: user.id,
          question: data.question,
          options: pollOptions,
          allow_multiple: data.allowMultiple,
          anonymous: data.anonymous,
        })
        .select()
        .single()

      if (error) throw error

      // Send the poll message into the staff channel
      await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          collective_id: collectiveId || null,
          user_id: user.id,
          content: data.question,
          message_type: 'poll',
          poll_id: poll.id,
        })

      toast.success('Poll posted!')
    } catch {
      toast.error('Failed to create poll')
    } finally {
      setCreatingPoll(false)
    }
  }

  const handleCreateAnnouncement = async (data: {
    type: 'announcement' | 'event_invite' | 'rsvp'
    title: string
    body?: string
    metadata?: Record<string, unknown>
  }) => {
    if (!channelId || !user) return
    setShowAnnouncementSheet(false)
    setCreatingAnnouncement(true)
    toast.info('Posting announcement...')

    try {
      const { data: announcement, error } = await supabase
        .from('chat_announcements')
        .insert({
          collective_id: collectiveId || null,
          created_by: user.id,
          type: data.type,
          title: data.title,
          body: data.body ?? null,
          metadata: data.metadata ?? {},
        })
        .select()
        .single()

      if (error) throw error

      // Send the announcement message into the staff channel
      await supabase
        .from('chat_messages')
        .insert({
          channel_id: channelId,
          collective_id: collectiveId || null,
          user_id: user.id,
          content: data.title,
          message_type: 'announcement',
          announcement_id: announcement.id,
        })

      toast.success('Announcement posted!')
    } catch {
      toast.error('Failed to create announcement')
    } finally {
      setCreatingAnnouncement(false)
    }
  }

  const handleBroadcast = (data: { title: string; body: string }) => {
    if (!collectiveId) {
      toast.error('Broadcast notifications require a collective')
      return
    }
    setShowBroadcastSheet(false)
    toast.info('Sending notification...')
    sendBroadcast.mutate(
      { collectiveId, ...data },
      {
        onSuccess: (result) => toast.success(`Notification sent to ${result?.sent ?? 0} members`),
        onError: () => toast.error('Failed to send notification'),
      },
    )
  }

  if (!channelId) {
    return (
      <div className="flex flex-col h-full max-h-dvh overflow-hidden relative bg-gradient-to-b from-primary-50/80 to-primary-100/40">
        <Header title="Staff Chat" back />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState illustration="empty" title="Channel not found" description="This channel may have been removed." />
        </div>
      </div>
    )
  }

  const channelName = channel ? cleanChannelName(channel.name) : 'Staff Chat'

  return (
    <div className="flex flex-col h-full max-h-dvh overflow-hidden relative bg-gradient-to-b from-primary-50/80 to-primary-100/40">
      {/* Header */}
      <Header
        title={channelName}
        back
        rightActions={
          <div className="flex items-center gap-1">
            <ChatSwitcherDropdown currentChannelId={channelId} />
            <button
              type="button"
              onClick={() => {/* TODO: channel search */}}
              aria-label="Search messages"
              className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-500 hover:bg-primary-100 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
            >
              <Search size={20} />
            </button>
          </div>
        }
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-3 py-2"
        role="log"
        aria-label="Staff chat messages"
        aria-live="polite"
      >
        {showLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton variant="list-item" count={8} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200/40">
                <Lock size={24} strokeWidth={2.5} className="text-white" />
              </div>
              <p className="text-base font-bold text-primary-900">Staff-only chat</p>
              <p className="text-sm text-primary-500 mt-1.5">
                Messages here are only visible to staff members
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Load more indicator */}
            {isFetchingNextPage && (
              <div className="flex justify-center py-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
            )}
            {messages.map((msg, i) => {
              const prevMsg = i > 0 ? messages[i - 1] : undefined
              const showDate = shouldShowDateSeparator(msg, prevMsg)
              const isSent = msg.user_id === user?.id
              const isDeleted = msg.is_deleted
              const messageType = msg.message_type ?? 'text'
              const msgCollectiveId = msg.collective_id ?? collectiveId

              return (
                <Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center py-5">
                      <span className="text-[11px] font-bold text-primary-600 bg-white px-4 py-1.5 rounded-full shadow-md ring-1 ring-primary-200/60">
                        {formatDateHeader(new Date(msg.created_at))}
                      </span>
                    </div>
                  )}

                  <div className="py-1">
                    {isDeleted ? (
                      <div className={cn('flex py-1', isSent ? 'justify-end' : 'justify-start')}>
                        <p className="text-xs italic text-primary-400 font-medium px-3.5 py-2.5 rounded-2xl bg-white/70 ring-1 ring-primary-200/50 shadow-sm">
                          Message removed
                        </p>
                      </div>
                    ) : messageType === 'poll' && msg.poll_id ? (
                      <InlinePoll pollId={msg.poll_id} collectiveId={msgCollectiveId} sent={isSent} />
                    ) : messageType === 'announcement' && msg.announcement_id ? (
                      <InlineAnnouncement announcementId={msg.announcement_id} sent={isSent} />
                    ) : messageType === 'system' ? (
                      <div className="flex justify-center py-3">
                        <p className="text-xs text-primary-500 italic font-medium bg-white/80 px-4 py-2 rounded-full shadow-sm ring-1 ring-primary-200/40">
                          {msg.content}
                        </p>
                      </div>
                    ) : messageType === 'html' ? (
                      <HtmlChatBubble
                        htmlContent={msg.content ?? ''}
                        sent={isSent}
                        timestamp={new Date(msg.created_at)}
                        senderName={msg.profiles?.display_name ?? undefined}
                        senderAvatar={msg.profiles?.avatar_url ?? undefined}
                        senderId={msg.user_id ?? undefined}
                        skipAnimation={msg._confirmed}
                        onAvatarTap={(userId) => setProfileUserId(userId)}
                        onSenderTap={(userId) => setProfileUserId(userId)}
                        onLongPress={() => {
                          if (!msg._optimistic) setReplyTo(msg)
                        }}
                      />
                    ) : (
                      <ChatBubble
                        message={msg.content ?? ''}
                        sent={isSent}
                        timestamp={new Date(msg.created_at)}
                        senderName={msg.profiles?.display_name ?? undefined}
                        senderAvatar={msg.profiles?.avatar_url ?? undefined}
                        senderId={msg.user_id ?? undefined}
                        photo={msg.image_url ?? undefined}
                        skipAnimation={msg._confirmed}
                        onAvatarTap={(userId) => setProfileUserId(userId)}
                        onSenderTap={(userId) => setProfileUserId(userId)}
                        onLongPress={() => {
                          if (!msg._optimistic) setReplyTo(msg)
                        }}
                        replyTo={
                          msg.reply_message
                            ? {
                                message: msg.reply_message.content ?? '',
                                senderName: messages.find((m) => m.id === msg.reply_message!.id)?.profiles?.display_name ?? 'Someone',
                              }
                            : undefined
                        }
                      />
                    )}
                  </div>
                </Fragment>
              )
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom FAB */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            type="button"
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
              setShowScrollDown(false)
            }}
            className={cn(
              'absolute right-4 z-20 flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-primary-200/60 text-primary-600 hover:bg-primary-50 active:scale-[0.93] transition-transform duration-150 cursor-pointer select-none',
              hasBottomTabs ? 'bottom-32' : 'bottom-20',
            )}
          >
            <ArrowDown size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-surface-1 px-4 py-2.5 shadow-[0_-2px_8px_rgba(74,74,66,0.06)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary-100">
                <Reply size={14} className="text-primary-600 shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary-600">{replyTo.profiles?.display_name ?? 'Unknown'}</p>
                <p className="text-xs text-primary-500 truncate">{replyTo.content ?? 'Image'}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      {(chatUpload.uploading || chatUpload.error) && (
        <div className="px-4 py-1">
          <UploadProgress
            progress={chatUpload.progress}
            uploading={chatUpload.uploading}
            error={chatUpload.error}
          />
        </div>
      )}

      {/* Message input - pinned to bottom */}
      <MessageInput
        onSend={handleSend}
        onAttach={handleAttach}
        onAttachHtml={handleAttachHtml}
        placeholder="Message staff..."
        disabled={sendMessage.isPending}
        padForTabBar={hasBottomTabs}
        isLeader={isLeaderOrAbove}
        onCreatePoll={() => setShowPollSheet(true)}
        onCreateAnnouncement={() => setShowAnnouncementSheet(true)}
        onBroadcastNotification={() => setShowBroadcastSheet(true)}
      />

      {/* Poll creation sheet */}
      <CreatePollSheet
        open={showPollSheet}
        onClose={() => setShowPollSheet(false)}
        onSubmit={handleCreatePoll}
        loading={creatingPoll}
      />

      {/* Announcement creation sheet */}
      <CreateAnnouncementSheet
        open={showAnnouncementSheet}
        onClose={() => setShowAnnouncementSheet(false)}
        onSubmit={handleCreateAnnouncement}
        loading={creatingAnnouncement}
      />

      {/* Broadcast notification sheet */}
      <BroadcastNotificationSheet
        open={showBroadcastSheet}
        onClose={() => setShowBroadcastSheet(false)}
        onSend={handleBroadcast}
        loading={sendBroadcast.isPending}
        recentBroadcasts={broadcastLog}
        collectiveName={channel?.name}
      />

      {/* Profile modal */}
      <ProfileModal userId={profileUserId} open={!!profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  )
}
