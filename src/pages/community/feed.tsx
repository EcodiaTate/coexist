import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  MoreHorizontal,
  Leaf,
  Award,
  Calendar,
  Users,
  PenSquare,
  Sparkles,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { PhotoGrid } from '@/components/photo-grid'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import {
  useFeed,
  useToggleLike,
  usePostComments,
  useAddComment,
  useReportPost,
  sharePost,
  type PostWithDetails,
  type CommentWithAuthor,
} from '@/hooks/use-feed'

/* ------------------------------------------------------------------ */
/*  Post type config                                                   */
/* ------------------------------------------------------------------ */

const postTypeConfig: Record<string, { icon: typeof Heart; label: string; bg: string; color: string; border: string }> = {
  photo: { icon: Users, label: 'Post', bg: 'bg-primary-100/70', color: 'text-primary-600', border: 'border-primary-200/40' },
  milestone: { icon: Award, label: 'Milestone', bg: 'bg-warning-100/70', color: 'text-warning-700', border: 'border-warning-200/40' },
  event_recap: { icon: Calendar, label: 'Event Recap', bg: 'bg-moss-100/70', color: 'text-moss-700', border: 'border-moss-200/40' },
  announcement: { icon: Leaf, label: 'Announcement', bg: 'bg-bark-100/70', color: 'text-bark-700', border: 'border-bark-200/40' },
}

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

/* ------------------------------------------------------------------ */
/*  Time helpers                                                       */
/* ------------------------------------------------------------------ */

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/* ------------------------------------------------------------------ */
/*  Decorative background                                              */
/* ------------------------------------------------------------------ */

function DecorativeBackground() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Rich gradient base — deep greens fading to warm neutrals */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-100/60 via-primary-50/30 via-40% to-moss-50/20" />

      {/* Hero glow — warm emerald wash at top */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-gradient-to-b from-primary-200/40 to-transparent blur-3xl" />

      {/* Large breathing ring — top right */}
      <motion.div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full border-[3px] border-secondary-200/30"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.06, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
      />

      {/* Medium ring — left side */}
      <motion.div
        className="absolute top-[30%] -left-14 w-48 h-48 rounded-full border-[2.5px] border-moss-200/30"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 2 }}
      />

      {/* Small ring — bottom right */}
      <motion.div
        className="absolute bottom-[20%] right-4 w-28 h-28 rounded-full border-2 border-primary-200/25"
        animate={shouldReduceMotion ? {} : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 40, ease: 'linear' }}
      />

      {/* Warm glow — mid left */}
      <motion.div
        className="absolute top-[45%] -left-10 w-56 h-56 rounded-full bg-sprout-100/20 blur-3xl"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.12, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 1 }}
      />

      {/* Deep glow — bottom */}
      <motion.div
        className="absolute -bottom-16 right-1/4 w-64 h-64 rounded-full bg-moss-100/25 blur-3xl"
        animate={shouldReduceMotion ? {} : { scale: [1, 1.08, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 3 }}
      />

      {/* Floating dots */}
      <motion.div
        className="absolute top-28 right-12 w-3 h-3 rounded-full bg-primary-300/30"
        animate={shouldReduceMotion ? {} : { y: [-5, 5, -5], x: [0, 3, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[55%] left-8 w-2.5 h-2.5 rounded-full bg-moss-300/25"
        animate={shouldReduceMotion ? {} : { y: [3, -4, 3] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        className="absolute bottom-[30%] right-[15%] w-2 h-2 rounded-full bg-sprout-300/25"
        animate={shouldReduceMotion ? {} : { y: [-3, 4, -3], x: [0, -2, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.5 }}
      />
      <motion.div
        className="absolute top-[40%] right-[30%] w-1.5 h-1.5 rounded-full bg-secondary-300/20"
        animate={shouldReduceMotion ? {} : { y: [2, -3, 2] }}
        transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 2.5 }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero header — greeting + create prompt                             */
/* ------------------------------------------------------------------ */

function HeroHeader({
  displayName,
  avatarUrl,
  onCreatePost,
}: {
  displayName: string
  avatarUrl?: string | null
  onCreatePost: () => void
}) {
  const shouldReduceMotion = useReducedMotion()
  const firstName = displayName.split(' ')[0]

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="pb-2"
    >
      {/* Greeting */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-secondary-400" />
        <h1 className="font-heading text-xl font-bold text-secondary-800">
          Community
        </h1>
      </div>

      {/* Create post card */}
      <button
        type="button"
        onClick={onCreatePost}
        className={cn(
          'flex items-center gap-3.5 w-full p-4 rounded-2xl text-left',
          'bg-white/90 backdrop-blur-sm',
          'border border-primary-100/60',
          'shadow-[0_2px_12px_-2px_rgba(61,77,51,0.10)]',
          'hover:shadow-[0_4px_20px_-4px_rgba(61,77,51,0.15)] hover:bg-white',
          'active:scale-[0.98]',
          'transition-all duration-200 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        )}
      >
        <Avatar
          src={avatarUrl}
          name={displayName}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary-400 font-medium">
            What's happening, {firstName}?
          </p>
        </div>
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 shadow-sm">
          <PenSquare size={16} className="text-white" />
        </div>
      </button>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Like button with animation                                         */
/* ------------------------------------------------------------------ */

function LikeButton({
  isLiked,
  count,
  onToggle,
}: {
  isLiked: boolean
  count: number
  onToggle: () => void
}) {
  const shouldReduceMotion = useReducedMotion()
  const [burst, setBurst] = useState(false)

  const handleClick = () => {
    if (!isLiked) {
      setBurst(true)
      setTimeout(() => setBurst(false), 600)
    }
    onToggle()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl min-h-11',
        'active:scale-[0.95] transition-all duration-150 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        isLiked
          ? 'text-error-500 bg-error-50/80'
          : 'text-primary-500 hover:bg-primary-50/80 hover:text-primary-700',
      )}
      aria-label={isLiked ? 'Unlike post' : 'Like post'}
      aria-pressed={isLiked}
    >
      {/* Burst particles */}
      <AnimatePresence>
        {burst && !shouldReduceMotion && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, scale: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: Math.cos((i * Math.PI * 2) / 6) * 16,
                  y: Math.sin((i * Math.PI * 2) / 6) * 16,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute left-3 top-2 w-1.5 h-1.5 rounded-full bg-error-400"
                aria-hidden="true"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.span
        animate={isLiked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
        className="flex items-center"
      >
        <Heart
          size={18}
          fill={isLiked ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </motion.span>

      {count > 0 && (
        <span className="text-sm font-semibold">{count}</span>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Comment section                                                    */
/* ------------------------------------------------------------------ */

function CommentSection({
  postId,
  commentCount,
}: {
  postId: string
  commentCount: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const { data: comments, isLoading } = usePostComments(postId)
  const addComment = useAddComment()
  const { user } = useAuth()
  const { toast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    if (!text.trim()) return
    addComment.mutate(
      { postId, content: text.trim() },
      {
        onSuccess: () => {
          setText('')
          toast.success('Comment added')
        },
        onError: () => toast.error('Failed to comment'),
      },
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setExpanded(!expanded)
          if (!expanded) {
            setTimeout(() => inputRef.current?.focus(), 100)
          }
        }}
        className={cn(
          'flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl min-h-11',
          'text-primary-500 hover:bg-primary-50/80 hover:text-primary-700',
          'active:scale-[0.95] transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        )}
        aria-label={`${commentCount} comments`}
        aria-expanded={expanded}
      >
        <MessageCircle size={18} aria-hidden="true" />
        {commentCount > 0 && (
          <span className="text-sm font-semibold">{commentCount}</span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-3 mt-2 space-y-3 px-4 pb-1 border-t border-primary-100/40">
              {isLoading ? (
                <Skeleton variant="list-item" count={2} />
              ) : (
                (comments ?? []).map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))
              )}

              {user && (
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit()
                    }}
                    placeholder="Write a comment..."
                    className={cn(
                      'flex-1 h-9 px-3.5 rounded-full text-sm',
                      'bg-surface-3 text-primary-800 placeholder:text-primary-400',
                      'border-none outline-none',
                      'focus:ring-2 focus:ring-primary-300 focus:bg-surface-2',
                      'transition-colors duration-200',
                    )}
                    aria-label="Write a comment"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    loading={addComment.isPending}
                    disabled={!text.trim()}
                  >
                    Post
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CommentItem({ comment }: { comment: CommentWithAuthor }) {
  return (
    <div className="flex gap-2.5">
      <Avatar
        src={comment.author?.avatar_url}
        name={comment.author?.display_name ?? 'User'}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-surface-3/80 rounded-2xl px-3.5 py-2.5">
          <span className="text-sm font-bold text-primary-800">
            {comment.author?.display_name ?? 'User'}
          </span>
          <p className="text-sm text-primary-700 mt-0.5 leading-relaxed">{comment.content}</p>
        </div>
        <span className="text-xs text-primary-400 font-medium ml-3 mt-1 block">
          {timeAgo(comment.created_at)}
        </span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Post card                                                          */
/* ------------------------------------------------------------------ */

function PostCard({ post }: { post: PostWithDetails }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const toggleLike = useToggleLike()
  const reportPost = useReportPost()
  const [showMenu, setShowMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')

  const config = postTypeConfig[post.type] ?? postTypeConfig.photo

  const handleLike = () => {
    toggleLike.mutate({ postId: post.id, isLiked: post.is_liked })
  }

  const handleShare = () => {
    sharePost(post)
  }

  const handleReport = () => {
    setShowMenu(false)
    setShowReport(true)
  }

  const confirmReport = () => {
    if (!reportReason) return
    reportPost.mutate(
      { contentId: post.id, contentType: 'post', reason: reportReason },
      {
        onSuccess: () => {
          toast.info('Post reported. Our team will review it.')
          setReportReason('')
        },
        onError: () => toast.error('Failed to report post'),
      },
    )
  }

  const handleAvatarTap = () => {
    navigate(`/profile/${post.user_id}`)
  }

  const hasImages = post.images.length > 0

  return (
    <motion.article
      variants={fadeUp}
      className={cn(
        'rounded-3xl overflow-hidden',
        'bg-white/95 backdrop-blur-sm',
        'border border-primary-100/50',
        'shadow-[0_2px_16px_-4px_rgba(61,77,51,0.12)]',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-2.5">
        <button
          type="button"
          onClick={handleAvatarTap}
          className="shrink-0 flex items-center justify-center min-h-11 min-w-11 cursor-pointer select-none active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-full"
          aria-label={`View ${post.author?.display_name ?? 'user'}'s profile`}
        >
          <Avatar
            src={post.author?.avatar_url}
            name={post.author?.display_name ?? 'User'}
            size="md"
          />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAvatarTap}
              className="flex items-center min-h-11 font-heading font-bold text-sm text-secondary-800 truncate cursor-pointer select-none hover:underline active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-xl"
            >
              {post.author?.display_name ?? 'User'}
            </button>
            {post.type !== 'photo' && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border',
                config.bg,
                config.color,
                config.border,
              )}>
                <config.icon size={10} aria-hidden="true" />
                {config.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary-400 font-medium -mt-1">
            <span>{timeAgo(post.created_at)}</span>
            {post.collective && (
              <>
                <span aria-hidden="true" className="text-primary-300">·</span>
                <span className="truncate text-moss-500">{post.collective.name}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMenu(true)}
          className={cn(
            'flex items-center justify-center w-9 h-9 min-h-11 min-w-11 rounded-xl',
            'text-primary-400 hover:bg-primary-50/80 hover:text-primary-600',
            'active:scale-[0.95] transition-all duration-150 cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label="Post options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-5 pb-3 text-sm text-primary-800 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Event tag */}
      {post.event && (
        <button
          type="button"
          onClick={() => navigate(`/events/${post.event!.id}`)}
          className={cn(
            'mx-5 mb-3 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl min-h-11',
            'bg-gradient-to-r from-moss-50/80 to-primary-50/60',
            'border border-moss-200/40',
            'shadow-sm',
            'text-sm text-moss-700 font-semibold',
            'cursor-pointer select-none hover:from-moss-50 hover:to-primary-50 active:scale-[0.97] transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label={`View event: ${post.event.title}`}
        >
          <Calendar size={14} aria-hidden="true" />
          <span className="truncate">{post.event.title}</span>
        </button>
      )}

      {/* Images — edge-to-edge when it's the hero visual */}
      {hasImages && (
        <div className={cn(post.images.length === 1 ? 'px-0' : 'px-5', 'pb-0')}>
          {post.images.length === 1 ? (
            <div className="overflow-hidden">
              <img
                src={post.images[0]}
                alt="Post image"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          ) : (
            <div className="pb-1">
              <PhotoGrid
                images={post.images.map((src, i) => ({
                  id: `${post.id}-${i}`,
                  src,
                  alt: `Post image ${i + 1}`,
                }))}
                maxVisible={4}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className={cn(
        'flex items-center gap-1 px-3 pb-3',
        hasImages ? 'pt-2.5' : 'pt-1',
      )}>
        <LikeButton
          isLiked={post.is_liked}
          count={post.like_count}
          onToggle={handleLike}
        />
        <CommentSection postId={post.id} commentCount={post.comment_count} />
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleShare}
          className={cn(
            'flex items-center justify-center w-9 h-9 min-h-11 min-w-11 rounded-xl',
            'text-primary-500 hover:bg-primary-50/80 hover:text-primary-700',
            'active:scale-[0.95] transition-all duration-150 cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label="Share post"
        >
          <Share2 size={18} />
        </button>
      </div>

      {/* Options menu */}
      <BottomSheet open={showMenu} onClose={() => setShowMenu(false)}>
        <div className="space-y-1 pb-2">
          <button
            type="button"
            onClick={handleReport}
            className={cn(
              'flex items-center justify-center gap-3 w-full px-4 py-3 rounded-xl min-h-11',
              'text-sm text-primary-800 font-medium',
              'hover:bg-primary-50 active:scale-[0.97] transition-all duration-150',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
          >
            <Flag size={18} className="text-primary-400" aria-hidden="true" />
            Report post
          </button>
        </div>
      </BottomSheet>

      {/* Report with reason */}
      <BottomSheet open={showReport} onClose={() => { setShowReport(false); setReportReason('') }}>
        <h3 className="font-heading text-base font-semibold text-primary-800 mb-2">
          Report this post
        </h3>
        <p className="text-xs text-primary-400 mb-3">
          Select a reason. Our moderation team will review and take appropriate action.
        </p>
        <div className="space-y-1.5 mb-4">
          {[
            'Spam or misleading',
            'Harassment or bullying',
            'Hate speech or discrimination',
            'Inappropriate content (NSFW)',
            'Violence or threats',
            'Misinformation',
            'Other',
          ].map((reason) => (
            <button
              key={reason}
              type="button"
              onClick={() => setReportReason(reason)}
              className={cn(
                'w-full text-left px-3.5 py-2.5 rounded-xl text-sm min-h-11 flex items-center',
                'cursor-pointer select-none active:scale-[0.97] transition-all duration-150',
                reportReason === reason
                  ? 'bg-error-50 text-error-700 font-semibold'
                  : 'text-primary-800 hover:bg-primary-50',
              )}
            >
              {reason}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          fullWidth
          disabled={!reportReason}
          onClick={() => { confirmReport(); setShowReport(false) }}
          className="!bg-error-600 hover:!bg-error-700"
        >
          Submit Report
        </Button>
      </BottomSheet>
    </motion.article>
  )
}

/* ------------------------------------------------------------------ */
/*  Feed skeleton                                                      */
/* ------------------------------------------------------------------ */

function FeedSkeleton() {
  return (
    <div className="space-y-5 pt-6 pb-4" role="status" aria-label="Loading feed">
      {/* Create post skeleton */}
      <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-white/80 border border-primary-100/40 animate-pulse">
        <div className="w-10 h-10 rounded-full bg-primary-100/50" />
        <div className="flex-1 h-4 bg-primary-100/30 rounded w-2/3" />
        <div className="w-10 h-10 rounded-xl bg-primary-200/40" />
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-3xl bg-white/80 border border-primary-100/40 shadow-sm overflow-hidden animate-pulse">
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <div className="w-10 h-10 rounded-full bg-primary-100/50" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-primary-100/40 rounded w-1/3" />
              <div className="h-3 bg-primary-100/30 rounded w-1/4" />
            </div>
          </div>
          <div className="px-5 pb-3 space-y-2">
            <div className="h-3.5 bg-primary-100/30 rounded w-full" />
            <div className="h-3.5 bg-primary-100/20 rounded w-3/4" />
          </div>
          <div className="mx-5 mb-4 h-48 bg-primary-100/15 rounded-2xl" />
        </div>
      ))}
      <span className="sr-only">Loading feed</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Feed page                                                          */
/* ------------------------------------------------------------------ */

export default function FeedPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const feed = useFeed(undefined)

  const posts = feed.data?.pages.flat() ?? []
  const isEmpty = !feed.isLoading && posts.length === 0

  const handleRefresh = useCallback(async () => {
    await feed.refetch()
  }, [feed])

  const handleLoadMore = useCallback(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      feed.fetchNextPage()
    }
  }, [feed])

  const handleCreatePost = () => navigate('/community/create-post')

  return (
    <Page noBackground className="!px-0">
      <div className="relative min-h-full">
        <DecorativeBackground />

        {/* Content */}
        <div className="relative z-10 px-4 lg:px-6">
          {feed.isLoading ? (
            <FeedSkeleton />
          ) : isEmpty ? (
            <div className="pt-6">
              <HeroHeader
                displayName={profile?.display_name ?? 'there'}
                avatarUrl={profile?.avatar_url}
                onCreatePost={handleCreatePost}
              />
              <div className="mt-6">
                <EmptyState
                  illustration="empty"
                  title="No posts yet"
                  description="Be the first to share a moment with your collective"
                  action={{
                    label: 'Create Post',
                    onClick: handleCreatePost,
                  }}
                />
              </div>
            </div>
          ) : (
            <PullToRefresh onRefresh={handleRefresh}>
              <motion.div
                className="space-y-5 pt-6 pb-4"
                variants={shouldReduceMotion ? undefined : stagger}
                initial="hidden"
                animate="visible"
              >
                {/* Hero header with create post */}
                <motion.div variants={fadeUp}>
                  <HeroHeader
                    displayName={profile?.display_name ?? 'there'}
                    avatarUrl={profile?.avatar_url}
                    onCreatePost={handleCreatePost}
                  />
                </motion.div>

                {/* Posts */}
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}

                {/* Load more trigger */}
                {feed.hasNextPage && (
                  <motion.div variants={fadeUp} className="flex justify-center py-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      loading={feed.isFetchingNextPage}
                    >
                      Load more
                    </Button>
                  </motion.div>
                )}

                {!feed.hasNextPage && posts.length > 0 && (
                  <motion.div variants={fadeUp} className="flex flex-col items-center py-8 gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100/60 to-moss-100/40 flex items-center justify-center">
                      <Leaf size={16} className="text-primary-400" />
                    </div>
                    <p className="text-xs text-primary-400 font-semibold">
                      You're all caught up
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </PullToRefresh>
          )}
        </div>
      </div>
    </Page>
  )
}
