import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Fragment,
} from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Search,
  Pin,
  MoreVertical,
  X,
  Reply,
  Pencil,
  Trash2,
  Mic,
  Camera,
  MapPin as MapPinIcon,
  Image as ImageIcon,
  ArrowDown,
  Check,
  ChevronDown,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { ChatBubble } from '@/components/chat-bubble'
import { MessageInput } from '@/components/message-input'
import { UserCard } from '@/components/user-card'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { UploadProgress } from '@/components/upload-progress'
import { SearchBar } from '@/components/search-bar'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective, useCollectiveMembers } from '@/hooks/use-collective'
import { useCollectiveRole } from '@/hooks/use-collective-role'
import {
  useChatMessages,
  useSendMessage,
  useEditMessage,
  useDeleteMessage,
  usePinMessage,
  usePinnedMessages,
  useMarkChatRead,
  useCollectiveMemberRoles,
  type ChatMessageWithSender,
} from '@/hooks/use-chat'
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useTyping } from '@/hooks/use-typing'
import { useChatSearch } from '@/hooks/use-chat-search'
import { useProfileStats } from '@/hooks/use-profile'
import { useOffline } from '@/hooks/use-offline'
import { OfflineIndicator } from '@/components/offline-indicator'
import {
  queueOfflineAction,
  saveChatDraft,
  getChatDraft,
  removeChatDraft,
} from '@/lib/offline-sync'

/* ------------------------------------------------------------------ */
/*  Relative time                                                      */
/* ------------------------------------------------------------------ */

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function dateHeader(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function canEdit(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 15 * 60 * 1000
}

/* ------------------------------------------------------------------ */
/*  Message actions sheet                                              */
/* ------------------------------------------------------------------ */

interface MessageActionsProps {
  message: ChatMessageWithSender | null
  isModerator: boolean
  isOwnMessage: boolean
  onClose: () => void
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onPin: () => void
}

function MessageActionsSheet({
  message,
  isModerator,
  isOwnMessage,
  onClose,
  onReply,
  onEdit,
  onDelete,
  onPin,
}: MessageActionsProps) {
  if (!message) return null

  return (
    <BottomSheet open={!!message} onClose={onClose}>
      <div className="space-y-1 pb-2">
        <button
          type="button"
          onClick={onReply}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-primary-800 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
        >
          <Reply size={18} className="text-primary-400" />
          Reply
        </button>

        {isOwnMessage && message.content && canEdit(message.created_at) && (
          <button
            type="button"
            onClick={onEdit}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-primary-800 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
          >
            <Pencil size={18} className="text-primary-400" />
            Edit message
          </button>
        )}

        {isModerator && (
          <>
            <button
              type="button"
              onClick={onPin}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-primary-800 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
            >
              <Pin size={18} className="text-primary-400" />
              {message.is_pinned ? 'Unpin message' : 'Pin message'}
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onDelete()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 min-h-11 text-sm text-error-600 hover:bg-error-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
            >
              <Trash2 size={18} />
              Delete message
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Pinned messages bar                                                */
/* ------------------------------------------------------------------ */

function PinnedMessageBar({
  messages,
  onTap,
}: {
  messages: ChatMessageWithSender[]
  onTap: () => void
}) {
  if (messages.length === 0) return null
  const latest = messages[0]

  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full items-center gap-2 border-b border-primary-100 bg-white/50 px-4 py-2 min-h-11 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
    >
      <Pin size={14} className="text-primary-400 shrink-0" />
      <p className="text-xs text-primary-800 truncate flex-1 text-left">
        <span className="font-semibold">Pinned: </span>
        {latest.content ?? 'Image'}
      </p>
      <span className="text-[10px] text-primary-500 font-semibold shrink-0">
        {messages.length > 1 ? `${messages.length} pinned` : ''}
      </span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  User card popup                                                    */
/* ------------------------------------------------------------------ */

function UserCardPopup({
  userId,
  onClose,
}: {
  userId: string | null
  onClose: () => void
}) {
  const { data: members = [] } = useCollectiveMembers(undefined)
  const { data: stats } = useProfileStats(userId ?? undefined)

  // We fetch profile info via the members list - simple approach
  // For a full impl, use useProfile(userId)

  if (!userId) return null

  return (
    <BottomSheet open={!!userId} onClose={onClose}>
      <div className="flex flex-col items-center pb-4">
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            onClose()
            window.location.href = `/profile/${userId}`
          }}
        >
          View Full Profile
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Search overlay                                                     */
/* ------------------------------------------------------------------ */

function ChatSearchOverlay({
  collectiveId,
  onClose,
}: {
  collectiveId: string
  onClose: () => void
}) {
  const { searchQuery, results, isLoading, search, clearSearch } = useChatSearch(collectiveId)
  const [query, setQuery] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2 border-b border-primary-100 px-3 py-2">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={search}
          placeholder="Search messages..."
          compact
          autoFocus
          className="flex-1"
          aria-label="Search messages"
        />
        <button type="button" onClick={onClose} aria-label="Close search" className="flex items-center justify-center shrink-0 min-h-11 min-w-11 rounded-full hover:bg-primary-100/60 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none">
          <X size={18} className="text-primary-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <Skeleton variant="list-item" count={5} />
        ) : results.length === 0 && searchQuery ? (
          <EmptyState
            illustration="search"
            title="No messages found"
            description={`No messages match "${searchQuery}"`}
          />
        ) : (
          <div className="space-y-2">
            {results.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl bg-white p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Avatar
                    src={msg.profiles?.avatar_url}
                    name={msg.profiles?.display_name}
                    size="xs"
                  />
                  <span className="text-xs font-semibold text-primary-800">
                    {msg.profiles?.display_name}
                  </span>
                  <span className="text-[10px] text-primary-400 ml-auto">
                    {relativeTime(msg.created_at)}
                  </span>
                </div>
                <p className="text-sm text-primary-400">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main chat page                                                     */
/* ------------------------------------------------------------------ */

export default function CollectiveChatPage() {
  const { collectiveId } = useParams<{ collectiveId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const { data: collective } = useCollective(collectiveId)
  const { data: members = [] } = useCollectiveMembers(collectiveId)
  const { isAssistLeader } = useCollectiveRole(collectiveId)
  const { data: memberRoles = new Map() } = useCollectiveMemberRoles(collectiveId)

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(collectiveId)

  const { data: pinnedMessages = [] } = usePinnedMessages(collectiveId)
  const markRead = useMarkChatRead(collectiveId)
  const sendMessage = useSendMessage()
  const editMessage = useEditMessage()
  const deleteMessage = useDeleteMessage()
  const pinMessage = usePinMessage()
  const { pickFromGallery, loading: cameraLoading } = useCamera()
  const chatUpload = useImageUpload({ bucket: 'chat-images' })

  const { typingText, sendTyping, stopTyping } = useTyping(collectiveId)
  const { isOffline } = useOffline()

  // Restore draft on mount
  const savedDraft = collectiveId ? getChatDraft(collectiveId) : null

  // State
  const [replyTo, setReplyTo] = useState<ChatMessageWithSender | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessageWithSender | null>(null)
  const [editText, setEditText] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ChatMessageWithSender | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Flatten pages (already newest-first, reverse for display)
  const allMessages = useMemo(() => {
    if (!messagesData?.pages) return []
    return messagesData.pages.flat().reverse()
  }, [messagesData])

  // Group by date
  const messageGroups = useMemo(() => {
    const groups: { date: string; messages: ChatMessageWithSender[] }[] = []
    let currentDate = ''

    for (const msg of allMessages) {
      const d = new Date(msg.created_at).toDateString()
      if (d !== currentDate) {
        currentDate = d
        groups.push({ date: msg.created_at, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }, [allMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!showScrollDown) {
      messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    }
  }, [allMessages.length, shouldReduceMotion, showScrollDown])

  // Mark as read on mount + new messages
  useEffect(() => {
    markRead()
  }, [markRead, allMessages.length])

  // Scroll detection for "scroll to bottom" button + infinite scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    setShowScrollDown(distanceFromBottom > 200)

    // Load more when near top
    if (scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Handlers
  const handleSend = async (text: string) => {
    if (!collectiveId || !user) return
    stopTyping()

    if (editingMessage) {
      if (isOffline) {
        toast.warning('Cannot edit messages while offline')
        return
      }
      await editMessage.mutateAsync({
        messageId: editingMessage.id,
        content: text,
        collectiveId,
      })
      setEditingMessage(null)
      setEditText('')
      return
    }

    // Clear persisted draft
    removeChatDraft(collectiveId)

    if (isOffline) {
      // Queue message for sync when back online
      queueOfflineAction('chat-message', {
        collectiveId,
        userId: user.id,
        content: text,
        replyToId: replyTo?.id,
      })
      toast.info('Message queued - will send when back online')
      setReplyTo(null)
      return
    }

    await sendMessage.mutateAsync({
      collectiveId,
      content: text,
      replyToId: replyTo?.id,
    })
    setReplyTo(null)
  }

  const handleAttach = async () => {
    if (!collectiveId) return
    const result = await pickFromGallery()
    if (!result) return

    try {
      const uploaded = await chatUpload.upload(result.blob)
      await sendMessage.mutateAsync({
        collectiveId,
        imageUrl: uploaded.url,
      })
    } catch {
      toast.error('Failed to upload image')
    }
  }

  const handleMessageLongPress = (msg: ChatMessageWithSender) => {
    setSelectedMessage(msg)
  }

  const handleReply = () => {
    if (selectedMessage) {
      setReplyTo(selectedMessage)
      setSelectedMessage(null)
    }
  }

  const handleEdit = () => {
    if (selectedMessage) {
      setEditingMessage(selectedMessage)
      setEditText(selectedMessage.content ?? '')
      setSelectedMessage(null)
    }
  }

  const handleDelete = () => {
    if (!selectedMessage) return
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!selectedMessage || !collectiveId) return
    try {
      await deleteMessage.mutateAsync({
        messageId: selectedMessage.id,
        collectiveId,
      })
      toast.info('Message removed')
    } catch {
      toast.error('Failed to delete message')
    }
    setShowDeleteConfirm(false)
    setSelectedMessage(null)
  }

  const handlePin = async () => {
    if (!selectedMessage || !collectiveId) return
    try {
      await pinMessage.mutateAsync({
        messageId: selectedMessage.id,
        collectiveId,
        pinned: !selectedMessage.is_pinned,
      })
      toast.success(selectedMessage.is_pinned ? 'Message unpinned' : 'Message pinned')
    } catch {
      toast.error('Failed to update pin')
    }
    setSelectedMessage(null)
  }

  const handleAvatarTap = (userId: string | null) => {
    if (userId && userId !== user?.id) {
      setSelectedUserId(userId)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    setShowScrollDown(false)
  }

  if (isLoading) {
    return (
      <Page header={<Header title="Chat" back />}>
        <div className="py-4">
          <Skeleton variant="list-item" count={8} />
        </div>
      </Page>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <Header
        title={collective?.name ?? 'Chat'}
        back
        rightActions={
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            aria-label="Search messages"
            className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
          >
            <Search size={20} />
          </button>
        }
      />

      {/* Pinned messages */}
      <PinnedMessageBar
        messages={pinnedMessages as ChatMessageWithSender[]}
        onTap={() => {/* Could scroll to pinned message */}}
      />

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {/* Load more indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        )}

        {allMessages.length === 0 ? (
          <EmptyState
            illustration="empty"
            title="Start the conversation"
            description="Be the first to say hello to your collective!"
          />
        ) : (
          messageGroups.map((group) => (
            <Fragment key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 py-3">
                <div className="flex-1 border-t border-primary-100" />
                <span className="text-[11px] font-semibold text-primary-400 uppercase">
                  {dateHeader(group.date)}
                </span>
                <div className="flex-1 border-t border-primary-100" />
              </div>

              {/* Messages */}
              {group.messages.map((msg) => {
                const isSent = msg.user_id === user?.id
                const isDeleted = msg.is_deleted
                const roleBadge = msg.user_id ? memberRoles.get(msg.user_id) : undefined

                return (
                  <div
                    key={msg.id}
                    className="py-1"
                    onContextMenu={(e) => {
                      e.preventDefault()
                      handleMessageLongPress(msg)
                    }}
                    onClick={() => {
                      // On mobile, long press is handled via touch events
                      // For desktop, context menu is sufficient
                    }}
                  >
                    {isDeleted ? (
                      <div
                        className={cn(
                          'flex py-1',
                          isSent ? 'justify-end' : 'justify-start',
                        )}
                      >
                        <p className="text-xs italic text-primary-400 px-3 py-2 rounded-2xl bg-white">
                          [message removed by moderator]
                        </p>
                      </div>
                    ) : (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Message options for ${msg.profiles?.display_name}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleMessageLongPress(msg)
                        }}
                      >
                        <ChatBubble
                          message={msg.content ?? ''}
                          sent={isSent}
                          timestamp={new Date(msg.created_at)}
                          senderName={msg.profiles?.display_name ?? undefined}
                          senderAvatar={msg.profiles?.avatar_url ?? undefined}
                          senderId={msg.user_id ?? undefined}
                          photo={msg.image_url ?? undefined}
                          roleBadge={roleBadge}
                          onAvatarTap={(userId) => navigate(`/profile/${userId}`)}
                          onSenderTap={(userId) => navigate(`/profile/${userId}`)}
                          replyTo={
                            msg.reply_message
                              ? {
                                  message: msg.reply_message.content ?? '',
                                  senderName: allMessages.find((m) => m.id === msg.reply_message!.id)?.profiles?.display_name ?? 'Someone',
                                }
                              : undefined
                          }
                        />

                        {/* Edited indicator */}
                        {msg.content && msg.created_at !== (msg as unknown as { updated_at?: string }).updated_at && (
                          <p className={cn(
                            'text-[10px] text-primary-400 mt-0.5',
                            isSent ? 'text-right pr-2' : 'pl-10',
                          )}>
                            (edited)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </Fragment>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <AnimatePresence>
        {typingText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-1"
          >
            <p className="text-xs text-primary-400 italic">{typingText}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-primary-100 bg-white px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <Reply size={14} className="text-primary-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-primary-400">
                  {replyTo.profiles?.display_name}
                </p>
                <p className="text-xs text-primary-400 truncate">
                  {replyTo.content ?? 'Image'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:text-primary-400 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit bar */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-primary-100 bg-warning-50 px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <Pencil size={14} className="text-warning-600 shrink-0" />
              <p className="text-xs font-semibold text-warning-700 flex-1">
                Editing message
              </p>
              <button
                type="button"
                onClick={() => { setEditingMessage(null); setEditText('') }}
                aria-label="Cancel edit"
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:text-primary-400 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            aria-label="Scroll to latest messages"
            className="absolute bottom-20 right-4 z-20 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white shadow-md text-primary-400 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
          >
            <ArrowDown size={20} />
          </motion.button>
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

      {/* Offline indicator */}
      {isOffline && (
        <div className="px-4 py-1.5">
          <OfflineIndicator
            dataUpdatedAt={messagesData?.pages?.[0]?.[0]?.created_at ? new Date(messagesData.pages[0][0].created_at).getTime() : undefined}
          />
        </div>
      )}

      {/* Message input */}
      <MessageInput
        onSend={handleSend}
        onAttach={isOffline ? undefined : handleAttach}
        placeholder={
          editingMessage
            ? 'Edit message...'
            : isOffline
              ? 'Type a message (will send when online)...'
              : 'Type a message...'
        }
        initialValue={savedDraft?.content ?? ''}
        onValueChange={(text) => {
          if (collectiveId) saveChatDraft(collectiveId, text, replyTo?.id)
        }}
      />

      {/* Message actions sheet */}
      <MessageActionsSheet
        message={selectedMessage}
        isModerator={isAssistLeader}
        isOwnMessage={selectedMessage?.user_id === user?.id}
        onClose={() => setSelectedMessage(null)}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
      />

      {/* User card popup */}
      <UserCardPopup
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      {/* Delete message confirmation */}
      <ConfirmationSheet
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false)
          setSelectedMessage(null)
        }}
        onConfirm={confirmDelete}
        title="Delete this message?"
        description="This message will be permanently removed for everyone in the chat."
        confirmLabel="Delete Message"
        variant="danger"
      />

      {/* Search overlay */}
      <AnimatePresence>
        {showSearch && collectiveId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ChatSearchOverlay
              collectiveId={collectiveId}
              onClose={() => setShowSearch(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
