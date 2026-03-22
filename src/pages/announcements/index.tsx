import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowLeft, Pin, Megaphone, AlertTriangle, ChevronRight } from 'lucide-react'
import { Page } from '@/components/page'
import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { SearchBar } from '@/components/search-bar'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import {
  useAnnouncements,
  useMarkAnnouncementRead,
  type AnnouncementWithAuthor,
} from '@/hooks/use-announcements'

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

/* ------------------------------------------------------------------ */
/*  Time helper                                                        */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = Math.floor((now - date.getTime()) / 1000)

  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: diff > 31536000 ? 'numeric' : undefined,
  })
}

/* ------------------------------------------------------------------ */
/*  Decorative background shapes                                       */
/* ------------------------------------------------------------------ */

function BackgroundShapes({ reduce }: { reduce: boolean }) {
  if (reduce) return null

  return (
    <>
      {/* Ring 1 — top-right breathing */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-16 -right-20 w-64 h-64 rounded-full border-[3px] border-secondary-200/25"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Ring 2 — mid-left breathing */}
      <motion.div
        aria-hidden="true"
        className="absolute top-48 -left-12 w-44 h-44 rounded-full border-[2.5px] border-secondary-200/25"
        animate={{ scale: [1, 1.06, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />

      {/* Blurred glow — bottom-left */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-24 -left-10 w-56 h-56 rounded-full bg-secondary-100/25 blur-3xl"
        animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      />

      {/* Floating dot 1 */}
      <motion.div
        aria-hidden="true"
        className="absolute top-32 right-12 w-3 h-3 rounded-full bg-secondary-300/20"
        animate={{ y: [0, -10, 0], x: [0, 4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating dot 2 */}
      <motion.div
        aria-hidden="true"
        className="absolute top-72 left-8 w-2.5 h-2.5 rounded-full bg-secondary-300/20"
        animate={{ y: [0, 8, 0], x: [0, -5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Floating dot 3 */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-40 right-20 w-2 h-2 rounded-full bg-primary-300/20"
        animate={{ y: [0, -7, 0], x: [0, 3, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Announcement card                                                  */
/* ------------------------------------------------------------------ */

function AnnouncementCard({
  announcement,
  onRead,
}: {
  announcement: AnnouncementWithAuthor
  onRead: () => void
}) {
  const isUrgent = announcement.priority === 'urgent'
  const isUnread = !announcement.is_read

  const handleTap = () => {
    if (isUnread) onRead()
  }

  const roleLabel = (role: string | undefined) => {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'national_admin': return 'National Admin'
      case 'national_staff': return 'Staff'
      default: return ''
    }
  }

  return (
    <motion.article
      variants={fadeUp}
      onClick={handleTap}
      className={cn(
        'rounded-2xl overflow-hidden cursor-pointer',
        'transition-colors duration-150',
        'bg-white shadow-sm border border-secondary-50/60',
        announcement.is_pinned && 'ring-1 ring-moss-200',
        isUrgent && 'bg-gradient-to-br from-warning-50/80 to-primary-100/60 border-warning-100/60',
        isUnread && !isUrgent && 'shadow-md',
      )}
      role="article"
      aria-label={announcement.title}
    >
      {/* Pinned / Urgent badge */}
      {(announcement.is_pinned || isUrgent) && (
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
          {announcement.is_pinned && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-400">
              <Pin size={12} aria-hidden="true" />
              Pinned
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-800">
              <AlertTriangle size={12} aria-hidden="true" />
              Urgent
            </span>
          )}
        </div>
      )}

      {/* Image */}
      {announcement.image_url && (
        <div className="mx-4 mt-3 rounded-xl overflow-hidden">
          <img
            src={announcement.image_url}
            alt=""
            loading="lazy"
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3 pb-4">
        <h3 className={cn(
          'font-heading font-bold text-base leading-tight',
          isUrgent ? 'text-primary-800' : 'text-primary-800',
        )}>
          {announcement.title}
        </h3>

        <p className={cn(
          'mt-2 text-sm leading-relaxed line-clamp-4',
          isUrgent ? 'text-primary-800' : 'text-primary-400',
        )}>
          {announcement.content}
        </p>

        {/* Author + timestamp */}
        <div className="flex items-center gap-2.5 mt-3 pt-3">
          <Avatar
            src={announcement.author?.avatar_url}
            name={announcement.author?.display_name ?? 'Staff'}
            size="xs"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold text-primary-800">
              {announcement.author?.display_name ?? 'Co-Exist Team'}
            </span>
            {announcement.author?.role && (
              <span className="text-xs text-primary-400 ml-1">
                {roleLabel(announcement.author.role)}
              </span>
            )}
          </div>
          <span className="text-xs text-primary-400 shrink-0">
            {formatDate(announcement.created_at)}
          </span>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="mt-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary-500" aria-hidden="true" />
            <span className="text-xs font-medium text-primary-400">New</span>
          </div>
        )}
      </div>
    </motion.article>
  )
}

/* ------------------------------------------------------------------ */
/*  Announcements page                                                 */
/* ------------------------------------------------------------------ */

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const { isStaff, collectiveRoles } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const isCollectiveStaff = collectiveRoles.some(
    (m) => m.role === 'leader' || m.role === 'co_leader' || m.role === 'assist_leader',
  )
  const canCreate = isStaff || isCollectiveStaff
  const { pinned, regular, isLoading, refetch } = useAnnouncements()
  const markRead = useMarkAnnouncementRead()
  const [searchQuery, setSearchQuery] = useState('')

  const isEmpty = !isLoading && pinned.length === 0 && regular.length === 0

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  // Filter announcements by search
  const filteredPinned = searchQuery
    ? pinned.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : pinned

  const filteredRegular = searchQuery
    ? regular.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : regular

  return (
    <Page noBackground className="!px-0 !bg-transparent">
      <div className="relative min-h-full">
        {/* Full-bleed background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/40 via-white to-primary-50/15" />

        {/* Animated decorative shapes */}
        <BackgroundShapes reduce={!!shouldReduceMotion} />

        {/* Back button */}
        <div className="relative z-20 px-4 pt-[var(--safe-top)]">
          <div className="h-14 flex items-center">
            <motion.button
              type="button"
              onClick={() => navigate(-1)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 -ml-1 rounded-full',
                'text-primary-800 hover:bg-primary-50/80',
                'cursor-pointer select-none',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              )}
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </motion.button>
          </div>
        </div>

        {/* Page content */}
        <div className="relative z-10 px-4 lg:px-6 pb-4 space-y-5">
          {/* Search */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search announcements..."
              compact
              aria-label="Search announcements"
            />
          </motion.div>

          {/* Create announcement – visible to collective staff + admin */}
          {canCreate && (
            <motion.button
              type="button"
              onClick={() => navigate('/announcements/create')}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className={cn(
                'flex items-center gap-3 w-full p-4 rounded-2xl text-left',
                'bg-white/80 border border-secondary-50/60 shadow-sm',
                'hover:bg-white/95',
                'transition-colors duration-150 cursor-pointer',
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-primary-200/60 flex items-center justify-center shrink-0">
                <Megaphone size={18} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-semibold text-primary-800">
                  Create announcement
                </p>
                <p className="text-xs text-primary-400 mt-0.5">
                  Post an update to your collective or all members
                </p>
              </div>
              <ChevronRight size={18} className="text-primary-300 shrink-0" />
            </motion.button>
          )}

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton variant="card" />
              <Skeleton variant="card" />
              <Skeleton variant="card" />
            </div>
          ) : isEmpty ? (
            <EmptyState
              illustration="empty"
              title="No announcements"
              description="Check back later for updates from the Co-Exist team"
              action={{ label: 'Go Home', to: '/' }}
            />
          ) : (
            <PullToRefresh onRefresh={handleRefresh}>
              <motion.div
                variants={shouldReduceMotion ? undefined : stagger}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {/* Pinned section */}
                {filteredPinned.length > 0 && (
                  <div className="space-y-3">
                    {filteredPinned.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        onRead={() => markRead.mutate(a.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Regular */}
                {filteredRegular.length > 0 && (
                  <div className="space-y-3">
                    {filteredPinned.length > 0 && (
                      <motion.h2
                        variants={fadeUp}
                        className="text-xs font-semibold text-primary-400 uppercase tracking-wider px-1 pt-2"
                      >
                        Recent
                      </motion.h2>
                    )}
                    {filteredRegular.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        onRead={() => markRead.mutate(a.id)}
                      />
                    ))}
                  </div>
                )}

                {searchQuery && filteredPinned.length === 0 && filteredRegular.length === 0 && (
                  <EmptyState
                    illustration="search"
                    title="No results"
                    description={`No announcements matching "${searchQuery}"`}
                  />
                )}
              </motion.div>
            </PullToRefresh>
          )}
        </div>
      </div>
    </Page>
  )
}
