import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown, Lock, X, Reply } from 'lucide-react'
import { Header } from '@/components/header'
import { ChatBubble } from '@/components/chat-bubble'
import { MessageInput } from '@/components/message-input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { UploadProgress } from '@/components/upload-progress'
import { CreatePollSheet } from '@/components/create-poll-sheet'
import { CreateAnnouncementSheet } from '@/components/create-announcement-sheet'
import { BroadcastNotificationSheet } from '@/components/broadcast-notification-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
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
  useCreatePoll,
  useCreateAnnouncement,
  useSendBroadcastNotification,
  useBroadcastLog,
} from '@/hooks/use-chat'

/* ------------------------------------------------------------------ */
/*  Channel type labels + icons                                        */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  staff_collective: 'Staff',
  staff_state: 'State Staff',
  staff_national: 'National Staff',
}

/** Strip redundant words from channel name for cleaner display */
function cleanChannelName(name: string): string {
  return name
    .replace(/\bCollective\b\s*/i, '')
    .replace(/\bStaff\b\s*/i, '')
    .trim()
    || name
}

const TYPE_COLORS: Record<string, string> = {
  staff_collective: 'bg-primary-200 text-primary-800 font-bold',
  staff_state: 'bg-info-200 text-info-800 font-bold',
  staff_national: 'bg-plum-200 text-plum-800 font-bold',
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChannelChatPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { user, isStaff, isAdmin, isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const { navMode } = useLayout()
  const hasBottomTabs = navMode === 'bottom-tabs'

  const { data: channels } = useMyStaffChannels()
  const channel = channels?.find((c) => c.id === channelId)

  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useChannelMessages(channelId)
  const sendMessage = useSendChannelMessage()
  const markRead = useMarkChannelRead()
  const { pickFromGallery } = useCamera()
  const chatUpload = useImageUpload({ bucket: 'chat-images' })

  // Staff always have leader-like powers in staff channels
  const isLeaderOrAbove = isStaff || isAdmin || isSuperAdmin

  // Leader features
  const createPoll = useCreatePoll()
  const createAnnouncement = useCreateAnnouncement()
  const collectiveId = channel?.collective_id
  const { data: broadcastLog = [] } = useBroadcastLog(isLeaderOrAbove && collectiveId ? collectiveId : undefined)
  const sendBroadcast = useSendBroadcastNotification()

  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [replyTo, setReplyTo] = useState<ChannelMessageWithSender | null>(null)
  const [showPollSheet, setShowPollSheet] = useState(false)
  const [showAnnouncementSheet, setShowAnnouncementSheet] = useState(false)
  const [showBroadcastSheet, setShowBroadcastSheet] = useState(false)

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (channelId && collectiveId && messages.length > 0) {
      markRead.mutate({ channelId, collectiveId })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, messages.length])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !showScrollDown) {
      messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    }
  }, [messages.length, isLoading, shouldReduceMotion, showScrollDown])

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(distFromBottom > 300)

    // Load more when scrolling near top
    if (el.scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = useCallback(
    (content: string) => {
      if (!channelId || !collectiveId || !content.trim()) return
      sendMessage.mutate({
        channelId,
        collectiveId,
        content: content.trim(),
        replyToId: replyTo?.id,
      })
      setReplyTo(null)
    },
    [channelId, collectiveId, sendMessage, replyTo],
  )

  const handleAttach = useCallback(async () => {
    if (!channelId || !collectiveId) return
    const result = await pickFromGallery()
    if (!result) return
    try {
      const uploaded = await chatUpload.upload(result.blob)
      sendMessage.mutate({
        channelId,
        collectiveId,
        content: '',
        imageUrl: uploaded.url,
      })
    } catch {
      toast.error('Failed to upload image')
    }
  }, [channelId, collectiveId, pickFromGallery, chatUpload, sendMessage, toast])

  // Leader action handlers
  const handleCreatePoll = (data: {
    question: string
    options: string[]
    allowMultiple: boolean
    anonymous: boolean
  }) => {
    if (!collectiveId) return
    setShowPollSheet(false)
    toast.info('Creating poll...')
    createPoll.mutate(
      { collectiveId, ...data },
      {
        onSuccess: () => toast.success('Poll posted!'),
        onError: () => toast.error('Failed to create poll'),
      },
    )
  }

  const handleCreateAnnouncement = (data: {
    type: 'announcement' | 'event_invite' | 'rsvp'
    title: string
    body?: string
    metadata?: Record<string, unknown>
  }) => {
    if (!collectiveId) return
    setShowAnnouncementSheet(false)
    toast.info('Posting announcement...')
    createAnnouncement.mutate(
      { collectiveId, ...data },
      {
        onSuccess: () => toast.success('Announcement posted!'),
        onError: () => toast.error('Failed to create announcement'),
      },
    )
  }

  const handleBroadcast = (data: { title: string; body: string }) => {
    if (!collectiveId) return
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
      <div className="flex flex-col h-full overflow-hidden relative bg-gradient-to-b from-primary-50/80 to-primary-100/40">
        <Header title="Staff Chat" back />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState illustration="empty" title="Channel not found" description="This channel may have been removed." />
        </div>
      </div>
    )
  }

  const channelName = channel ? cleanChannelName(channel.name) : 'Staff Chat'
  const channelType = channel?.type ?? 'staff_collective'

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-gradient-to-b from-primary-50/80 to-primary-100/40">
      {/* Header */}
      <Header
        title={channelName}
        back
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
        {isLoading ? (
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
                        onAvatarTap={(userId) => navigate(`/profile/${userId}`)}
                        onSenderTap={(userId) => navigate(`/profile/${userId}`)}
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
              'absolute right-4 z-20 flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-primary-200/60 text-primary-600 hover:bg-primary-50 active:scale-[0.93] transition-all duration-150 cursor-pointer select-none',
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
            className="bg-white/95 px-4 py-2.5 backdrop-blur-sm shadow-md border-t border-primary-100/50"
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
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
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

      {/* Message input — pinned to bottom */}
      <MessageInput
        onSend={handleSend}
        onAttach={handleAttach}
        placeholder="Message staff..."
        disabled={sendMessage.isPending}
        padForTabBar={hasBottomTabs}
        isLeader={isLeaderOrAbove && !!collectiveId}
        onCreatePoll={() => setShowPollSheet(true)}
        onCreateAnnouncement={() => setShowAnnouncementSheet(true)}
        onBroadcastNotification={() => setShowBroadcastSheet(true)}
      />

      {/* Poll creation sheet */}
      <CreatePollSheet
        open={showPollSheet}
        onClose={() => setShowPollSheet(false)}
        onSubmit={handleCreatePoll}
        loading={createPoll.isPending}
      />

      {/* Announcement creation sheet */}
      <CreateAnnouncementSheet
        open={showAnnouncementSheet}
        onClose={() => setShowAnnouncementSheet(false)}
        onSubmit={handleCreateAnnouncement}
        loading={createAnnouncement.isPending}
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
    </div>
  )
}
