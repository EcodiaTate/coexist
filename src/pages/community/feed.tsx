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
    TreePine,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { PhotoGrid } from '@/components/photo-grid'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { BottomSheet } from '@/components/bottom-sheet'
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

const postTypeConfig: Record<string, { icon: typeof Heart; label: string; bg: string; color: string; border: string; glow: string }> = {
  photo: { icon: Users, label: 'Post', bg: 'bg-primary-100/80', color: 'text-primary-700', border: 'border-primary-200/50', glow: 'shadow-primary-200/20' },
  milestone: { icon: Award, label: 'Milestone', bg: 'bg-gradient-to-r from-warning-100/80 to-warning-50/60', color: 'text-warning-700', border: 'border-warning-200/50', glow: 'shadow-warning-200/20' },
  event_recap: { icon: Calendar, label: 'Event Recap', bg: 'bg-gradient-to-r from-moss-100/80 to-moss-50/60', color: 'text-moss-700', border: 'border-moss-200/50', glow: 'shadow-moss-200/20' },
  announcement: { icon: Leaf, label: 'Announcement', bg: 'bg-gradient-to-r from-bark-100/80 to-bark-50/60', color: 'text-bark-700', border: 'border-bark-200/50', glow: 'shadow-bark-200/20' },
}

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
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
  const r = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Multi-stop gradient - deep forest canopy feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/65 via-secondary-100/40 via-20% to-primary-100/25 to-60%" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-moss-50/15 to-sprout-50/25" />

      {/* Concentrated hero glow - top center */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-primary-300/35 via-primary-200/25 to-transparent blur-[60px]" />

      {/* Secondary warm glow - top left corner */}
      <div className="absolute -top-16 -left-16 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-sprout-200/30 to-transparent blur-[50px]" />

      {/* Large breathing ring - top right */}
      <motion.div
        className="absolute -top-28 -right-28 w-80 h-80 rounded-full border-[3px] border-secondary-300/25"
        animate={r ? {} : { scale: [1, 1.06, 1], opacity: [0.5, 0.85, 0.5] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
      />
      {/* Concentric inner ring */}
      <motion.div
        className="absolute -top-12 -right-12 w-52 h-52 rounded-full border-[2px] border-primary-200/20"
        animate={r ? {} : { scale: [1, 1.04, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
      />

      {/* Medium ring - left side */}
      <motion.div
        className="absolute top-[28%] -left-16 w-52 h-52 rounded-full border-[2.5px] border-moss-300/25"
        animate={r ? {} : { scale: [1, 1.08, 1], opacity: [0.4, 0.75, 0.4] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 2 }}
      />

      {/* Small ring - bottom right, slowly rotating */}
      <motion.div
        className="absolute bottom-[18%] right-2 w-32 h-32 rounded-full border-2 border-primary-300/20"
        animate={r ? {} : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 45, ease: 'linear' }}
      />

      {/* Deep warm glow - mid left */}
      <motion.div
        className="absolute top-[42%] -left-12 w-64 h-64 rounded-full bg-sprout-100/20 blur-[50px]"
        animate={r ? {} : { scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 1 }}
      />

      {/* Bottom gradient pool */}
      <motion.div
        className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-moss-200/20 blur-[60px]"
        animate={r ? {} : { scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut', delay: 3 }}
      />

      {/* Floating particles */}
      <motion.div className="absolute top-24 right-14 w-3.5 h-3.5 rounded-full bg-primary-400/20"
        animate={r ? {} : { y: [-6, 6, -6], x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[50%] left-6 w-3 h-3 rounded-full bg-moss-400/18"
        animate={r ? {} : { y: [4, -5, 4] }} transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 1.5 }} />
      <motion.div className="absolute bottom-[28%] right-[18%] w-2.5 h-2.5 rounded-full bg-sprout-400/18"
        animate={r ? {} : { y: [-4, 5, -4], x: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }} />
      <motion.div className="absolute top-[38%] right-[28%] w-2 h-2 rounded-full bg-secondary-400/15"
        animate={r ? {} : { y: [3, -4, 3] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 2.5 }} />
      <motion.div className="absolute top-[65%] left-[20%] w-2 h-2 rounded-full bg-primary-400/15"
        animate={r ? {} : { y: [-3, 3, -3], x: [2, -2, 2] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 3.5 }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero header - greeting + create prompt                             */
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
      initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="pb-1"
    >
      {/* Title row */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-primary-600 shadow-sm">
          <TreePine size={15} className="text-white" />
        </div>
        <h1 className="font-heading text-[22px] font-bold text-secondary-900 tracking-tight">
          Community
        </h1>
      </div>

      {/* Create post card */}
      <button
        type="button"
        onClick={onCreatePost}
        className={cn(
          'flex items-center gap-3.5 w-full p-4 rounded-[20px] text-left',
          'bg-gradient-to-br from-[#f0f4ea] via-[#edf1e6] to-[#e8ede1]',
          'border border-primary-200/40',
          'shadow-[0_4px_24px_-6px_rgba(61,77,51,0.16),0_2px_6px_rgba(61,77,51,0.06)]',
          'hover:shadow-[0_8px_32px_-8px_rgba(61,77,51,0.22)] hover:from-[#f2f6ec] hover:to-[#eaf0e4]',
          'active:scale-[0.98]',
          'transition-all duration-250 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        )}
      >
        <div className="relative">
          <Avatar src={avatarUrl} name={displayName} size="md" />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gradient-to-br from-sprout-400 to-primary-500 border-2 border-white flex items-center justify-center">
            <PenSquare size={8} className="text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-primary-400 font-medium leading-snug">
            What's happening, {firstName}?
          </p>
          <p className="text-[11px] text-primary-300 mt-0.5">
            Share a photo, milestone, or update
          </p>
        </div>
        <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-700 shadow-md shadow-primary-500/25">
          <PenSquare size={17} className="text-white" />
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
        'relative flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl min-h-11',
        'active:scale-[0.93] transition-all duration-150 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        isLiked
          ? 'text-error-600 bg-error-50/80 shadow-sm shadow-error-200/30'
          : 'text-primary-500 hover:bg-primary-50/80 hover:text-primary-700',
      )}
      aria-label={isLiked ? 'Unlike post' : 'Like post'}
      aria-pressed={isLiked}
    >
      {/* Burst particles */}
      <AnimatePresence>
        {burst && !shouldReduceMotion && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 1, scale: 0 }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: Math.cos((i * Math.PI * 2) / 8) * 20,
                  y: Math.sin((i * Math.PI * 2) / 8) * 20,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute left-3 top-2 w-1.5 h-1.5 rounded-full bg-error-400"
                aria-hidden="true"
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.span
        animate={isLiked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.35 }}
        className="flex items-center"
      >
        <Heart
          size={18}
          fill={isLiked ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </motion.span>

      {count > 0 && (
        <span className="text-sm font-bold tabular-nums">{count}</span>
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
          'flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl min-h-11',
          'text-primary-500 hover:bg-primary-50/80 hover:text-primary-700',
          'active:scale-[0.93] transition-all duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
        )}
        aria-label={`${commentCount} comments`}
        aria-expanded={expanded}
      >
        <MessageCircle size={18} aria-hidden="true" />
        {commentCount > 0 && (
          <span className="text-sm font-bold tabular-nums">{commentCount}</span>
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
            <div className="pt-3 mt-2 space-y-3 px-5 pb-2 border-t border-primary-100/30">
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
                      'bg-primary-50/80 text-primary-800 placeholder:text-primary-400',
                      'border border-primary-200/35 outline-none',
                      'focus:ring-2 focus:ring-primary-300 focus:bg-primary-50/40 focus:border-primary-300/50',
                      'transition-all duration-200',
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
        <div className="bg-gradient-to-br from-primary-50/70 to-primary-100/40 border border-primary-200/25 rounded-2xl px-3.5 py-2.5">
          <span className="text-sm font-bold text-secondary-800">
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
        'rounded-[22px] overflow-hidden',
        'bg-gradient-to-b from-[#f6f8f2] via-[#f3f6ee] to-[#eef2e8]',
        'border border-primary-200/35',
        'shadow-[0_6px_28px_-6px_rgba(61,77,51,0.16),0_2px_6px_rgba(61,77,51,0.06)]',
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
                'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm',
                config.bg,
                config.color,
                config.border,
                config.glow,
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
                <span aria-hidden="true" className="text-primary-200">·</span>
                <span className="truncate font-semibold text-moss-600">{post.collective.name}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMenu(true)}
          className={cn(
            'flex items-center justify-center w-9 h-9 min-h-11 min-w-11 rounded-xl',
            'text-primary-300 hover:bg-primary-50/80 hover:text-primary-500',
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
            'mx-5 mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl min-h-11',
            'bg-gradient-to-r from-moss-50/90 via-moss-50/70 to-primary-50/60',
            'border border-moss-200/50',
            'shadow-sm shadow-moss-200/15',
            'text-sm text-moss-700 font-semibold',
            'cursor-pointer select-none hover:from-moss-100/90 hover:to-primary-50/80 active:scale-[0.97] transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label={`View event: ${post.event.title}`}
        >
          <Calendar size={14} aria-hidden="true" />
          <span className="truncate">{post.event.title}</span>
        </button>
      )}

      {/* Images - edge-to-edge for single, padded for grid */}
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
        'flex items-center gap-1 px-3 pb-3 mx-3 rounded-xl',
        hasImages ? 'pt-3 mt-1' : 'pt-1',
        'bg-primary-50/40',
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
            'text-primary-400 hover:bg-primary-50/80 hover:text-primary-600',
            'active:scale-[0.93] transition-all duration-150 cursor-pointer select-none',
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
      <div className="flex items-center gap-3.5 p-4 rounded-[20px] bg-gradient-to-br from-[#f0f4ea] to-[#e8ede1] border border-primary-200/30 shadow-sm animate-pulse">
        <div className="w-10 h-10 rounded-full bg-primary-200/40" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-primary-200/30 rounded w-2/3" />
          <div className="h-2.5 bg-primary-200/20 rounded w-1/3" />
        </div>
        <div className="w-11 h-11 rounded-2xl bg-primary-300/25" />
      </div>

      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-[22px] bg-gradient-to-b from-[#f6f8f2] to-[#eef2e8] border border-primary-200/30 shadow-sm overflow-hidden animate-pulse">
          <div className="flex items-center gap-3 px-5 pt-5 pb-3">
            <div className="w-10 h-10 rounded-full bg-primary-200/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-primary-200/35 rounded w-1/3" />
              <div className="h-3 bg-primary-200/25 rounded w-1/4" />
            </div>
          </div>
          <div className="px-5 pb-3 space-y-2">
            <div className="h-3.5 bg-primary-200/25 rounded w-full" />
            <div className="h-3.5 bg-primary-200/15 rounded w-3/4" />
          </div>
          <div className="mx-0 mb-0 h-52 bg-primary-100/20" />
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
                  <motion.div variants={fadeUp} className="flex flex-col items-center py-10 gap-3">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e4ebd8] via-[#dbe5cf] to-[#d0dbc2] flex items-center justify-center shadow-md shadow-primary-300/20 border border-primary-200/30">
                        <Leaf size={20} className="text-primary-600" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-sprout-400 to-primary-500 border-2 border-[#f3f6ee]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-secondary-700">
                        You're all caught up
                      </p>
                      <p className="text-xs text-primary-500 mt-0.5">
                        Check back later for new posts
                      </p>
                    </div>
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
