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
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
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

const postTypeConfig: Record<string, { icon: typeof Heart; label: string; bg: string; color: string }> = {
  photo: { icon: Users, label: 'Post', bg: 'bg-primary-100/60', color: 'text-primary-500' },
  milestone: { icon: Award, label: 'Milestone', bg: 'bg-warning-100/60', color: 'text-warning-600' },
  event_recap: { icon: Calendar, label: 'Event Recap', bg: 'bg-moss-100/60', color: 'text-moss-600' },
  announcement: { icon: Leaf, label: 'Announcement', bg: 'bg-bark-100/60', color: 'text-bark-600' },
}

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
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
          ? 'text-error-500 bg-error-50/60'
          : 'text-primary-500 hover:bg-primary-50 hover:text-primary-700',
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
          'text-primary-500 hover:bg-primary-50 hover:text-primary-700',
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
            <div className="pt-3 mt-2 space-y-3 px-4 pb-1">
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

  return (
    <motion.article
      variants={fadeUp}
      className="rounded-3xl bg-surface-2 shadow-md overflow-hidden"
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
              className="flex items-center min-h-11 font-heading font-bold text-sm text-primary-900 truncate cursor-pointer select-none hover:underline active:scale-[0.97] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-xl"
            >
              {post.author?.display_name ?? 'User'}
            </button>
            {post.type !== 'photo' && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                config.bg,
                config.color,
              )}>
                <config.icon size={10} aria-hidden="true" />
                {config.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary-400 font-medium">
            <span>{timeAgo(post.created_at)}</span>
            {post.collective && (
              <>
                <span aria-hidden="true" className="text-primary-300">·</span>
                <span className="truncate">{post.collective.name}</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMenu(true)}
          className={cn(
            'flex items-center justify-center w-9 h-9 min-h-11 min-w-11 rounded-xl',
            'text-primary-400 hover:bg-surface-3 hover:text-primary-600',
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
            'bg-primary-100/60 shadow-sm',
            'text-sm text-primary-700 font-semibold',
            'cursor-pointer select-none hover:bg-primary-100 active:scale-[0.97] transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
          )}
          aria-label={`View event: ${post.event.title}`}
        >
          <Calendar size={14} aria-hidden="true" />
          <span className="truncate">{post.event.title}</span>
        </button>
      )}

      {/* Images */}
      {post.images.length > 0 && (
        <div className="px-5 pb-3">
          {post.images.length === 1 ? (
            <div className="rounded-2xl overflow-hidden shadow-sm">
              <img
                src={post.images[0]}
                alt="Post image"
                loading="lazy"
                className="w-full aspect-[4/3] object-cover"
              />
            </div>
          ) : (
            <PhotoGrid
              images={post.images.map((src, i) => ({
                id: `${post.id}-${i}`,
                src,
                alt: `Post image ${i + 1}`,
              }))}
              maxVisible={4}
            />
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-1 px-3 pb-3 pt-1">
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
            'text-primary-500 hover:bg-primary-50 hover:text-primary-700',
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
    <div className="space-y-5 py-4" role="status" aria-label="Loading feed">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-3xl bg-surface-2 shadow-md overflow-hidden animate-pulse">
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
          <div className="mx-5 mb-4 h-48 bg-primary-100/20 rounded-2xl" />
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

  return (
    <Page
      header={
        <Header title="Community" />
      }
    >
      {feed.isLoading ? (
        <FeedSkeleton />
      ) : isEmpty ? (
        <EmptyState
          illustration="empty"
          title="No posts yet"
          description="Be the first to share a moment with your collective"
          action={{
            label: 'Create Post',
            onClick: () => navigate('/community/create-post'),
          }}
        />
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <motion.div
            className="space-y-5 py-4"
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="visible"
          >
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* Load more trigger */}
            {feed.hasNextPage && (
              <div className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoadMore}
                  loading={feed.isFetchingNextPage}
                >
                  Load more
                </Button>
              </div>
            )}

            {!feed.hasNextPage && posts.length > 0 && (
              <p className="text-center text-xs text-primary-400 font-medium py-6">
                You're all caught up
              </p>
            )}
          </motion.div>
        </PullToRefresh>
      )}
    </Page>
  )
}
