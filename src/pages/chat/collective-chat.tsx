import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  Fragment,
} from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Search,
  Pin,
  X,
  Reply,
  Pencil,
  ArrowDown,
  ChevronDown,
  Users,
  UserMinus,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { ChatBubble, PollCard, AnnouncementCard } from '@/components/chat-bubble'
import { HtmlChatBubble } from '@/components/html-chat-bubble'
import { MessageInput } from '@/components/message-input'
import { BottomSheet } from '@/components/bottom-sheet'
import { MessageActionsSheet } from '@/components/message-actions-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useToast } from '@/components/toast'
import { UploadProgress } from '@/components/upload-progress'
import { SearchBar } from '@/components/search-bar'
import { CreatePollSheet } from '@/components/create-poll-sheet'
import { CreateAnnouncementSheet } from '@/components/create-announcement-sheet'
import { BroadcastNotificationSheet } from '@/components/broadcast-notification-sheet'
import { ChatSwitcherDropdown } from '@/components/chat-switcher-dropdown'
import { ProfileModal } from '@/components/profile-modal'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { useCollective, useCollectiveMembers, useRemoveMember } from '@/hooks/use-collective'
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
  useCreatePoll,
  usePollVote,
  useRemovePollVote,
  usePollDetail,
  useCreateAnnouncement,
  useAnnouncementDetail,
  useRespondToAnnouncement,
  useBroadcastLog,
  useSendBroadcastNotification,
  type ChatMessageWithSender,
} from '@/hooks/use-chat'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useInviteCollaborator, useEventDetail, type EventDetailData } from '@/hooks/use-events'
import type { Tables } from '@/types/database.types'

type EventRegistration = Tables<'event_registrations'>
import { useCamera } from '@/hooks/use-camera'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useTyping } from '@/hooks/use-typing'
import { useChatSearch } from '@/hooks/use-chat-search'
import { useOffline } from '@/hooks/use-offline'
import { useLayout } from '@/hooks/use-layout'
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


/* ------------------------------------------------------------------ */
/*  Pinned messages bar                                                */
/* ------------------------------------------------------------------ */

function PinnedMessageBar({
  messages,
  isStaff,
  onUnpin,
}: {
  messages: ChatMessageWithSender[]
  isStaff: boolean
  onUnpin: (messageId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (messages.length === 0) return null
  const latest = messages[0]
  const hasMultiple = messages.length > 1

  return (
    <div className="bg-surface-1 shadow-md">
      {/* Main pinned bar */}
      <div className="flex w-full items-center gap-2.5 px-4 py-2.5 min-h-11">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary-100 shrink-0">
          <Pin size={13} className="text-primary-600" />
        </div>
        <p className="text-xs text-primary-800 truncate flex-1 text-left">
          <span className="font-bold">Pinned: </span>
          {latest.content ?? 'Image'}
        </p>

        {/* Expand button for multiple */}
        {hasMultiple && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-100 active:scale-[0.95] transition-transform duration-150 cursor-pointer select-none"
            aria-label={expanded ? 'Collapse pinned messages' : 'Show all pinned messages'}
          >
            <ChevronDown size={16} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
            <span className="text-[11px] font-semibold ml-0.5">{messages.length}</span>
          </button>
        )}

        {/* Unpin button for staff (single message or collapsed view) */}
        {isStaff && !expanded && (
          <button
            type="button"
            onClick={() => onUnpin(latest.id)}
            className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-300 hover:text-primary-500 hover:bg-primary-100 active:scale-[0.95] transition-transform duration-150 cursor-pointer select-none"
            aria-label="Unpin message"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Expanded list of all pinned messages */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2 space-y-1.5">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center gap-2 rounded-xl bg-primary-50/60 px-3 py-2"
                >
                  <Pin size={10} className="text-primary-300 shrink-0" />
                  <p className="text-xs text-primary-700 truncate flex-1">
                    {msg.content ?? 'Image'}
                  </p>
                  <span className="text-[11px] text-primary-400 shrink-0">
                    {msg.profiles?.display_name}
                  </span>
                  {isStaff && (
                    <button
                      type="button"
                      onClick={() => onUnpin(msg.id)}
                      className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-300 hover:text-error-500 hover:bg-error-50 active:scale-[0.95] transition-transform duration-150 cursor-pointer select-none"
                      aria-label={`Unpin: ${msg.content?.slice(0, 30) ?? 'message'}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const { searchQuery, results, isLoading, search } = useChatSearch(collectiveId)
  const showSearchLoading = useDelayedLoading(isLoading)
  const [query, setQuery] = useState('')

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center gap-2 px-3 py-2 shadow-sm">
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
        <button type="button" onClick={onClose} aria-label="Close search" className="flex items-center justify-center shrink-0 min-h-11 min-w-11 rounded-full hover:bg-primary-100/60 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none">
          <X size={18} className="text-primary-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {showSearchLoading ? (
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
              <div key={msg.id} className="rounded-2xl bg-white p-4 shadow-md ring-1 ring-primary-100/60">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Avatar
                    src={msg.profiles?.avatar_url}
                    name={msg.profiles?.display_name}
                    size="xs"
                  />
                  <span className="text-[13px] font-bold text-primary-800">
                    {msg.profiles?.display_name}
                  </span>
                  <span className="text-[11px] font-medium text-primary-400 ml-auto">
                    {relativeTime(msg.created_at!)}
                  </span>
                </div>
                <p className="text-sm text-primary-600 leading-relaxed">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
  collectiveId: string
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
      onVote={(optionId) => vote.mutate({ pollId, optionId, collectiveId })}
      onRemoveVote={(optionId) => removeVote.mutate({ pollId, optionId, collectiveId })}
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
    // Save chat announcement response
    respond.mutate({ announcementId, response })

    // If this announcement links to an event, handle the actual RSVP
    if (isEventType && eventId) {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })

      // Optimistically update the event detail cache so the event page reflects it instantly
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
          // Register or re-register
          const { error } = await supabase
            .from('event_registrations')
            .upsert(
              { event_id: eventId, user_id: user!.id, status: 'registered' as const, registered_at: new Date().toISOString() },
              { onConflict: 'event_id,user_id' },
            )
          if (error) throw error
          toast.success("You're registered!")
        } else if (response === 'not_going') {
          // Cancel registration
          await supabase
            .from('event_registrations')
            .update({ status: 'cancelled' as const })
            .eq('event_id', eventId)
            .eq('user_id', user!.id)
          toast.info('RSVP removed')
        } else if (response === 'maybe') {
          // Try the RPC for scheduling a reminder, fall back gracefully
          try {
            await supabase.rpc('handle_announcement_rsvp', {
              p_event_id: eventId,
              p_response: 'maybe',
            })
          } catch {
            // RPC might not exist yet - that's ok
          }
          toast.info("We'll remind you closer to the date")
        }
      } catch {
        // Rollback optimistic update
        if (prevEvent) {
          queryClient.setQueryData(['event', eventId, user?.id], prevEvent)
        }
        toast.error('Failed to update your RSVP')
      }

      // Refetch to get authoritative state
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
/*  Member management sheet (leader moderation)                        */
/* ------------------------------------------------------------------ */

const MANAGE_ROLE_RANK: Record<string, number> = {
  member: 0,
  assist_leader: 1,
  co_leader: 2,
  leader: 3,
}

function ManageMembersSheet({
  open,
  onClose,
  collectiveId,
}: {
  open: boolean
  onClose: () => void
  collectiveId: string | undefined
}) {
  const { user, isStaff, isAdmin, isSuperAdmin } = useAuth()
  const { data: members = [] } = useCollectiveMembers(open ? collectiveId : undefined)
  const { role: myCollectiveRole } = useCollectiveRole(collectiveId)
  const removeMember = useRemoveMember()
  const { toast } = useToast()
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)

  const handleRemove = async (userId: string) => {
    if (!collectiveId) return
    try {
      await removeMember.mutateAsync({ collectiveId, userId })
      toast.success('Member removed from chat')
    } catch {
      toast.error('Failed to remove member')
    }
    setConfirmRemove(null)
  }

  const isGlobalStaff = isStaff || isAdmin || isSuperAdmin
  const myRank = isGlobalStaff ? 99 : (myCollectiveRole ? MANAGE_ROLE_RANK[myCollectiveRole] ?? -1 : -1)

  // Filter: can remove members ranked strictly below you, never yourself
  const removableMembers = members.filter(
    (m) => m.user_id !== user?.id && (MANAGE_ROLE_RANK[m.role!] ?? 0) < myRank,
  )

  return (
    <>
      <BottomSheet open={open} onClose={onClose}>
        <div className="pb-2">
          <div className="flex items-center gap-2.5 px-4 pb-3">
            <Users size={18} className="text-primary-600" />
            <p className="text-sm font-bold text-primary-800">Manage Members</p>
          </div>

          {removableMembers.length === 0 ? (
            <p className="px-4 py-4 text-sm text-primary-500 text-center">No removable members</p>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {removableMembers.map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <Avatar
                    src={m.profiles?.avatar_url}
                    name={m.profiles?.display_name}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-primary-800 truncate block">
                      {m.profiles?.display_name ?? 'Member'}
                    </span>
                    {m.role !== 'member' && (
                      <span className="text-[11px] font-semibold text-primary-500 capitalize">
                        {m.role!.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(m.user_id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-error-600 hover:bg-error-50 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none min-h-11"
                  >
                    <UserMinus size={14} />
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      <ConfirmationSheet
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && handleRemove(confirmRemove)}
        title="Remove this member?"
        description="They will be removed from this collective's chat and will need to rejoin the collective to access it again."
        confirmLabel="Remove Member"
        variant="danger"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Main chat page                                                     */
/* ------------------------------------------------------------------ */

export default function CollectiveChatPage() {
  const { collectiveId } = useParams<{ collectiveId: string }>()
  const { toast } = useToast()
  const { user, isStaff, isAdmin, isSuperAdmin } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const { data: collective } = useCollective(collectiveId)
  const { isAssistLeader, isCoLeader, isLeader } = useCollectiveRole(collectiveId)
  const { data: memberRoles = new Map() } = useCollectiveMemberRoles(collectiveId)

  // Superadmin/staff get all leader powers in every collective
  const isLeaderOrAbove = isAssistLeader || isCoLeader || isLeader || isStaff || isAdmin || isSuperAdmin

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatMessages(collectiveId)
  const showLoading = useDelayedLoading(isLoading)

  const { data: pinnedMessages = [] } = usePinnedMessages(collectiveId)
  const markRead = useMarkChatRead(collectiveId)
  const sendMessage = useSendMessage()
  const editMessage = useEditMessage()
  const deleteMessage = useDeleteMessage()
  const pinMessage = usePinMessage()
  const { pickFromGallery } = useCamera()
  const chatUpload = useImageUpload({ bucket: 'chat-images' })

  const { typingText, sendTyping, stopTyping } = useTyping(collectiveId)
  const { isOffline } = useOffline()
  const { navMode } = useLayout()
  const hasBottomTabs = navMode === 'bottom-tabs'

  // Leader features
  const createPoll = useCreatePoll()
  const createAnnouncement = useCreateAnnouncement()
  const { data: broadcastLog = [] } = useBroadcastLog(isLeaderOrAbove ? collectiveId : undefined)
  const sendBroadcast = useSendBroadcastNotification()
  const inviteCollaborator = useInviteCollaborator()

  // Restore draft on mount
  const savedDraft = collectiveId ? getChatDraft(collectiveId) : null

  // State
  const [replyTo, setReplyTo] = useState<ChatMessageWithSender | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessageWithSender | null>(null)
  const [editText, setEditText] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<ChatMessageWithSender | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ChatMessageWithSender | null>(null)
  const [showPollSheet, setShowPollSheet] = useState(false)
  const [showAnnouncementSheet, setShowAnnouncementSheet] = useState(false)
  const [announcementType, setAnnouncementType] = useState<'announcement' | 'event_invite' | 'rsvp'>('announcement')
  const [showBroadcastSheet, setShowBroadcastSheet] = useState(false)
  const [showManageMembers, setShowManageMembers] = useState(false)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const initialScrollDone = useRef(false)

  // Reset scroll state when switching chats
  useEffect(() => {
    initialScrollDone.current = false
  }, [collectiveId])

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
      const d = new Date(msg.created_at!).toDateString()
      if (d !== currentDate) {
        currentDate = d
        groups.push({ date: msg.created_at!, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }, [allMessages])

  // Instant scroll to bottom BEFORE paint on first load (no visible jump)
  useLayoutEffect(() => {
    if (!initialScrollDone.current && allMessages.length > 0) {
      const container = scrollContainerRef.current
      if (container) {
        container.scrollTop = container.scrollHeight
      }
      // Also position the sentinel in case layout shifts slightly after paint
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      requestAnimationFrame(() => {
        // Double-check after paint - ensures we're truly at the bottom
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
        }
        initialScrollDone.current = true
      })
    }
  }, [allMessages.length])

  // Smooth scroll on subsequent new messages (only after initial load)
  useEffect(() => {
    if (initialScrollDone.current && !showScrollDown) {
      messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    }
  }, [allMessages.length, shouldReduceMotion, showScrollDown])

  // Mark as read on mount + when user is at bottom and new messages arrive
  useEffect(() => {
    if (!showScrollDown) {
      markRead()
    }
  }, [markRead, allMessages.length, showScrollDown])

  // Scroll detection for "scroll to bottom" button + infinite scroll
  const scrollRafId = useRef(0)
  useEffect(() => () => cancelAnimationFrame(scrollRafId.current), [])
  const handleScroll = useCallback(() => {
    if (!initialScrollDone.current) return
    cancelAnimationFrame(scrollRafId.current)
    scrollRafId.current = requestAnimationFrame(() => {
      const container = scrollContainerRef.current
      if (!container) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setShowScrollDown(distanceFromBottom > 200)

      if (scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    })
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

    removeChatDraft(collectiveId)

    if (isOffline) {
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

    try {
      await sendMessage.mutateAsync({
        collectiveId,
        content: text,
        replyToId: replyTo?.id,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Message failed to send'
      toast.error(msg)
    }
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
        messageType: 'image',
      })
    } catch {
      toast.error('Failed to upload image')
    }
  }

  const handleAttachHtml = async (htmlContent: string) => {
    if (!collectiveId) return
    try {
      await sendMessage.mutateAsync({
        collectiveId,
        content: htmlContent,
        messageType: 'html',
      })
    } catch {
      toast.error('Failed to send HTML content')
    }
  }

  const handleMessageLongPress = (msg: ChatMessageWithSender) => {
    if (msg._optimistic) return
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
    setDeleteTarget(selectedMessage)
    setSelectedMessage(null)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget || !collectiveId) return
    try {
      await deleteMessage.mutateAsync({
        messageId: deleteTarget.id,
        collectiveId,
      })
      toast.info('Message removed')
    } catch {
      toast.error('Failed to delete message')
    }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: shouldReduceMotion ? 'auto' : 'smooth' })
    setShowScrollDown(false)
  }

  // Leader action handlers - close dialog immediately, run mutation in background
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

  const handleInviteCollectives = (data: {
    eventId: string
    collectiveIds: string[]
    message?: string
  }) => {
    if (!collectiveId) return
    const count = data.collectiveIds.length
    toast.info(`Inviting ${count} collective${count !== 1 ? 's' : ''} to collaborate...`)
    // Fire all invitations in parallel
    Promise.all(
      data.collectiveIds.map((targetId) =>
        inviteCollaborator.mutateAsync({
          eventId: data.eventId,
          collectiveId: targetId,
          hostCollectiveId: collectiveId,
          message: data.message,
        }),
      ),
    )
      .then(() => toast.success(`Collaboration invite${count !== 1 ? 's' : ''} sent!`))
      .catch(() => toast.error('Some invites failed to send'))
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

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Chat" back />}>
        <div className="py-4">
          <Skeleton variant="list-item" count={8} />
        </div>
      </Page>
    )
  }
  return (
    <div className="flex flex-col h-full max-h-dvh overflow-hidden relative bg-gradient-to-b from-primary-50/80 to-primary-100/40">
      {/* Header */}
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <Header
          title={collective?.name ?? 'Chat'}
          back
          showTitle
          rightActions={
            <div className="flex items-center gap-1">
              <ChatSwitcherDropdown currentCollectiveId={collectiveId} />
              {isLeaderOrAbove && (
                <button
                  type="button"
                  onClick={() => setShowManageMembers(true)}
                  aria-label="Manage members"
                  className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-500 hover:bg-primary-100 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
                >
                  <Users size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                aria-label="Search messages"
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-500 hover:bg-primary-100 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
              >
                <Search size={20} />
              </button>
            </div>
          }
        />
      </motion.div>

      {/* Pinned messages */}
      <PinnedMessageBar
        messages={pinnedMessages as ChatMessageWithSender[]}
        isStaff={isLeaderOrAbove}
        onUnpin={async (messageId) => {
          try {
            await pinMessage.mutateAsync({ messageId, collectiveId: collectiveId!, pinned: false })
            toast.success('Message unpinned')
          } catch {
            toast.error('Failed to unpin')
          }
        }}
      />

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth px-3 py-2"
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
              <div className="flex items-center justify-center py-5">
                <motion.span
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-full bg-white px-4 py-1.5 text-[11px] font-bold text-primary-600 shadow-md ring-1 ring-primary-200/60"
                >
                  {dateHeader(group.date)}
                </motion.span>
              </div>

              {/* Messages */}
              {group.messages.map((msg) => {
                const isSent = msg.user_id === user?.id
                const isDeleted = msg.is_deleted
                const roleBadge = msg.user_id ? memberRoles.get(msg.user_id) : undefined
                const messageType = msg.message_type ?? 'text'

                return (
                  <div
                    key={msg.id}
                    className="py-1"
                    onContextMenu={(e) => {
                      e.preventDefault()
                      handleMessageLongPress(msg)
                    }}
                  >
                    {isDeleted ? (
                      <div className={cn('flex py-1', isSent ? 'justify-end' : 'justify-start')}>
                        <p className="text-xs italic text-primary-400 font-medium px-3.5 py-2.5 rounded-2xl bg-white/70 ring-1 ring-primary-200/50 shadow-sm">
                          Message removed
                        </p>
                      </div>
                    ) : messageType === 'poll' && msg.poll_id ? (
                      <InlinePoll pollId={msg.poll_id} collectiveId={collectiveId!} sent={isSent} />
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
                        timestamp={new Date(msg.created_at!)}
                        senderName={msg.profiles?.display_name ?? undefined}
                        senderAvatar={msg.profiles?.avatar_url ?? undefined}
                        senderId={msg.user_id ?? undefined}
                        roleBadge={roleBadge}
                        skipAnimation={msg._confirmed}
                        onAvatarTap={(userId) => setProfileUserId(userId)}
                        onSenderTap={(userId) => setProfileUserId(userId)}
                        onLongPress={() => handleMessageLongPress(msg)}
                      />
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
                          timestamp={new Date(msg.created_at!)}
                          senderName={msg.profiles?.display_name ?? undefined}
                          senderAvatar={msg.profiles?.avatar_url ?? undefined}
                          senderId={msg.user_id ?? undefined}
                          photo={msg.image_url ?? undefined}
                          roleBadge={roleBadge}
                          skipAnimation={msg._confirmed}
                          onAvatarTap={(userId) => setProfileUserId(userId)}
                          onSenderTap={(userId) => setProfileUserId(userId)}
                          onLongPress={() => handleMessageLongPress(msg)}
                          replyTo={
                            msg.reply_message
                              ? {
                                  message: msg.reply_message.content ?? '',
                                  senderName: allMessages.find((m) => m.id === msg.reply_message!.id)?.profiles?.display_name ?? 'Someone',
                                }
                              : undefined
                          }
                        />

                        {(msg as unknown as { updated_at?: string }).updated_at && (msg as unknown as { updated_at?: string }).updated_at !== msg.created_at && (
                          <p className={cn(
                            'text-[11px] text-primary-400 mt-0.5',
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
            transition={{ duration: 0.15 }}
            className="px-4 pb-1.5 bg-white/90"
          >
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-2 w-2 rounded-full bg-primary-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.6s' }}
                  />
                ))}
              </div>
              <p className="text-xs text-primary-600 italic font-medium">{typingText}</p>
            </div>
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
            transition={{ duration: 0.15 }}
            className="bg-surface-1 px-4 py-2.5 shadow-[0_-2px_8px_rgba(74,74,66,0.06)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary-100">
                <Reply size={14} className="text-primary-600 shrink-0" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-primary-600">{replyTo.profiles?.display_name}</p>
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

      {/* Edit bar */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-warning-100 px-4 py-2.5 shadow-[0_-2px_8px_rgba(74,74,66,0.06)]"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-warning-200">
                <Pencil size={14} className="text-warning-700 shrink-0" />
              </div>
              <p className="text-xs font-bold text-warning-800 flex-1">Editing message</p>
              <button
                type="button"
                onClick={() => { setEditingMessage(null); setEditText('') }}
                aria-label="Cancel edit"
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 active:scale-[0.97] transition-transform duration-150 cursor-pointer select-none"
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
            className={cn(
              'absolute right-4 z-20 flex min-h-12 min-w-12 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-primary-200/60 text-primary-600 hover:bg-primary-50 active:scale-[0.93] transition-transform duration-150 cursor-pointer select-none',
              hasBottomTabs ? 'bottom-32' : 'bottom-20',
            )}
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
      <motion.div
        variants={shouldReduceMotion ? undefined : fadeUp}
        initial="hidden"
        animate="visible"
      >
        <MessageInput
          onSend={handleSend}
          onAttach={isOffline ? undefined : handleAttach}
          onAttachHtml={isOffline ? undefined : handleAttachHtml}
          onTyping={sendTyping}
          placeholder={
            editingMessage
              ? 'Edit message...'
              : isOffline
                ? 'Type a message (will send when online)...'
                : 'Type a message...'
          }
          initialValue={editingMessage ? editText : (savedDraft?.content ?? '')}
          onValueChange={(text) => {
            if (collectiveId && !editingMessage) saveChatDraft(collectiveId, text, replyTo?.id)
          }}
          padForTabBar={hasBottomTabs}
          isLeader={isLeaderOrAbove}
          onCreatePoll={() => setShowPollSheet(true)}
          onCreateAnnouncement={() => {
            setAnnouncementType('announcement')
            setShowAnnouncementSheet(true)
          }}
          onBroadcastNotification={() => setShowBroadcastSheet(true)}
        />
      </motion.div>

      {/* Message actions sheet */}
      <MessageActionsSheet
        message={selectedMessage}
        isModerator={isLeaderOrAbove}
        isOwnMessage={selectedMessage?.user_id === user?.id}
        onClose={() => setSelectedMessage(null)}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
      />

      {/* Delete message confirmation */}
      <ConfirmationSheet
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeleteTarget(null) }}
        onConfirm={confirmDelete}
        title="Delete this message?"
        description="This message will be permanently removed for everyone in the chat."
        confirmLabel="Delete Message"
        variant="danger"
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
        onInviteCollectives={handleInviteCollectives}
        loading={createAnnouncement.isPending}
        defaultType={announcementType}
        collectiveId={collectiveId}
      />

      {/* Broadcast notification sheet */}
      <BroadcastNotificationSheet
        open={showBroadcastSheet}
        onClose={() => setShowBroadcastSheet(false)}
        onSend={handleBroadcast}
        loading={sendBroadcast.isPending}
        recentBroadcasts={broadcastLog}
        collectiveName={collective?.name}
      />

      {/* Member management sheet (leader moderation) */}
      {isLeaderOrAbove && (
        <ManageMembersSheet
          open={showManageMembers}
          onClose={() => setShowManageMembers(false)}
          collectiveId={collectiveId}
        />
      )}

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

      {/* Profile modal */}
      <ProfileModal userId={profileUserId} open={!!profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  )
}
