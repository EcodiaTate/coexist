import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowDown, Lock, Users } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { ChatBubble } from '@/components/chat-bubble'
import { MessageInput } from '@/components/message-input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import {
  useChannelMessages,
  useSendChannelMessage,
  useMarkChannelRead,
  useMyStaffChannels,
  type ChannelMessageWithSender,
} from '@/hooks/use-staff-channels'

/* ------------------------------------------------------------------ */
/*  Channel type labels + icons                                        */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  staff_collective: 'Collective Staff',
  staff_state: 'State Staff',
  staff_national: 'National Staff',
}

const TYPE_COLORS: Record<string, string> = {
  staff_collective: 'bg-primary-100 text-primary-700',
  staff_state: 'bg-info-100 text-info-700',
  staff_national: 'bg-plum-100 text-plum-700',
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
  const { user } = useAuth()

  const { data: channels } = useMyStaffChannels()
  const channel = channels?.find((c) => c.id === channelId)

  const { messages, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useChannelMessages(channelId)
  const sendMessage = useSendChannelMessage()
  const markRead = useMarkChannelRead()

  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [replyTo, setReplyTo] = useState<ChannelMessageWithSender | null>(null)

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (channelId && messages.length > 0) {
      markRead.mutate(channelId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, messages.length])

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      // Only auto-scroll if near bottom
      const el = scrollRef.current
      if (el) {
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
        if (isNearBottom) scrollToBottom()
      }
    }
  }, [messages.length, isLoading, scrollToBottom])

  // Track scroll position for "scroll to bottom" button
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    setShowScrollDown(distFromBottom > 300)

    // Load more when scrolling near top
    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleSend = useCallback(
    (content: string) => {
      if (!channelId || !content.trim()) return
      sendMessage.mutate({
        channelId,
        content: content.trim(),
        replyToId: replyTo?.id,
      })
      setReplyTo(null)
    },
    [channelId, sendMessage, replyTo],
  )

  if (!channelId) {
    return (
      <Page header={<Header title="Staff Chat" backTo="/chat" />}>
        <EmptyState illustration="empty" title="Channel not found" />
      </Page>
    )
  }

  const channelName = channel?.name ?? 'Staff Chat'
  const channelType = channel?.type ?? 'staff_collective'

  return (
    <Page
      header={
        <Header
          title={channelName}
          backTo="/chat"
          subtitle={
            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1', TYPE_COLORS[channelType])}>
              <Lock size={10} />
              {TYPE_LABELS[channelType]}
            </span>
          }
        />
      }
      noPadding
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Messages */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {isLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton variant="list-item" count={8} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
                  <Lock size={20} className="text-primary-600" />
                </div>
                <p className="text-sm font-medium text-primary-800">Staff-only chat</p>
                <p className="text-xs text-primary-400 mt-1">
                  Messages here are only visible to staff members
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {isFetchingNextPage && (
                <div className="text-center py-2">
                  <Skeleton variant="list-item" count={3} />
                </div>
              )}
              {messages.map((msg, i) => {
                const prevMsg = i > 0 ? messages[i - 1] : undefined
                const showDate = shouldShowDateSeparator(msg, prevMsg)
                const isOwn = msg.user_id === user?.id

                return (
                  <Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center py-2">
                        <span className="text-[10px] font-medium text-primary-400 bg-primary-50 px-2.5 py-0.5 rounded-full">
                          {formatDateHeader(new Date(msg.created_at))}
                        </span>
                      </div>
                    )}
                    <ChatBubble
                      message={msg as any}
                      isOwn={isOwn}
                      onReply={() => setReplyTo(msg)}
                      senderRole={undefined}
                    />
                  </Fragment>
                )
              })}
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
              onClick={scrollToBottom}
              className={cn(
                'absolute bottom-20 right-4 z-10',
                'w-9 h-9 rounded-full bg-white shadow-lg',
                'flex items-center justify-center',
                'text-primary-400 hover:text-primary-800',
                'cursor-pointer',
              )}
            >
              <ArrowDown size={18} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 border-t border-primary-100">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary-400">
                Replying to <strong>{replyTo.profiles?.display_name ?? 'Unknown'}</strong>
              </p>
              <p className="text-xs text-primary-600 truncate">{replyTo.content}</p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="p-1 text-primary-400 hover:text-primary-800 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Message input */}
        <MessageInput
          onSend={handleSend}
          placeholder="Message staff..."
          loading={sendMessage.isPending}
        />
      </div>
    </Page>
  )
}
