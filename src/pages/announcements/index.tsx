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
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
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

function DecorativeBackground() {
  const r = useReducedMotion()

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Multi-stop gradient - warm olive-moss canopy */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/60 via-primary-100/35 via-25% to-moss-50/20 to-60%" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-sprout-50/15 to-bark-50/15" />

      {/* Concentrated hero glow - top center */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-primary-300/30 via-primary-200/20 to-transparent blur-[60px]" />

      {/* Warm accent - top right */}
      <div className="absolute -top-16 -right-16 w-[300px] h-[280px] rounded-full bg-gradient-to-bl from-bark-200/20 to-transparent blur-[50px]" />

      {/* Large breathing ring - top right */}
      <motion.div
        className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-secondary-300/22"
        animate={r ? {} : { scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
      />
      {/* Concentric inner ring */}
      <motion.div
        className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-bark-200/18"
        animate={r ? {} : { scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
      />

      {/* Medium ring - left side */}
      <motion.div
        className="absolute top-[32%] -left-14 w-52 h-52 rounded-full border-[2.5px] border-moss-300/22"
        animate={r ? {} : { scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-[42%] -left-4 w-28 h-28 rounded-full border-[1.5px] border-bark-200/15"
        animate={r ? {} : { rotate: -360 }}
        transition={{ repeat: Infinity, duration: 50, ease: 'linear' }}
      />

      {/* Bottom right ring */}
      <motion.div
        className="absolute bottom-[16%] right-2 w-36 h-36 rounded-full border-2 border-secondary-200/18"
        animate={r ? {} : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 55, ease: 'linear' }}
      />

      {/* Deep warm glow - mid left */}
      <motion.div
        className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-sprout-100/20 blur-[50px]"
        animate={r ? {} : { scale: [1, 1.14, 1], opacity: [0.22, 0.4, 0.22] }}
        transition={{ repeat: Infinity, duration: 9, ease: 'easeInOut', delay: 1 }}
      />

      {/* Bottom gradient pool */}
      <motion.div
        className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-bark-100/18 blur-[55px]"
        animate={r ? {} : { scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ repeat: Infinity, duration: 11, ease: 'easeInOut', delay: 3 }}
      />

      {/* Floating particles */}
      <motion.div className="absolute top-24 right-14 w-3 h-3 rounded-full bg-primary-400/18"
        animate={r ? {} : { y: [-5, 5, -5], x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} />
      <motion.div className="absolute top-[48%] left-8 w-2.5 h-2.5 rounded-full bg-bark-400/15"
        animate={r ? {} : { y: [3, -5, 3] }} transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 1.5 }} />
      <motion.div className="absolute bottom-[28%] right-[18%] w-2 h-2 rounded-full bg-sprout-400/15"
        animate={r ? {} : { y: [-3, 4, -3], x: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }} />
      <motion.div className="absolute top-[62%] left-[22%] w-2 h-2 rounded-full bg-secondary-400/12"
        animate={r ? {} : { y: [2, -3, 2] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 2.5 }} />
      <motion.div className="absolute top-[35%] right-[28%] w-1.5 h-1.5 rounded-full bg-moss-300/15"
        animate={r ? {} : { y: [-2, 3, -2], x: [1, -1, 1] }} transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 3.5 }} />
    </div>
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
        'rounded-[20px] overflow-hidden cursor-pointer',
        'transition-all duration-200 active:scale-[0.98]',
        'bg-gradient-to-br from-[#eef2e8] via-[#ebefe5] to-[#e6eadf]',
        'border border-primary-200/35',
        'shadow-[0_4px_20px_-4px_rgba(61,77,51,0.12),0_1px_4px_rgba(61,77,51,0.05)]',
        announcement.is_pinned && 'ring-2 ring-primary-400/50 shadow-[0_6px_28px_-4px_rgba(61,77,51,0.18)]',
        isUrgent && 'bg-gradient-to-br from-warning-100/70 via-warning-50/50 to-[#eef2e8] border-warning-200/40 ring-2 ring-warning-300/40',
        isUnread && !isUrgent && !announcement.is_pinned && 'shadow-[0_6px_24px_-4px_rgba(61,77,51,0.16)]',
        !isUnread && 'opacity-85',
      )}
      role="article"
      aria-label={announcement.title}
    >
      {/* Pinned / Urgent badge */}
      {(announcement.is_pinned || isUrgent) && (
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-0">
          {announcement.is_pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 bg-primary-100/60 px-2.5 py-0.5 rounded-full border border-primary-200/30">
              <Pin size={11} aria-hidden="true" />
              Pinned
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning-700 bg-warning-100/60 px-2.5 py-0.5 rounded-full border border-warning-200/30">
              <AlertTriangle size={11} aria-hidden="true" />
              Urgent
            </span>
          )}
        </div>
      )}

      {/* Image */}
      {announcement.image_url && (
        <div className="mx-4 mt-3.5 rounded-2xl overflow-hidden shadow-sm ring-1 ring-primary-200/20">
          <img
            src={announcement.image_url}
            alt=""
            loading="lazy"
            className="w-full aspect-[16/9] object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="px-4 pt-3.5 pb-4">
        <h3 className={cn(
          'font-heading font-bold text-base leading-tight text-secondary-900',
        )}>
          {announcement.title}
        </h3>

        <p className={cn(
          'mt-2 text-sm leading-relaxed line-clamp-4',
          isUrgent ? 'text-secondary-700' : 'text-primary-500',
        )}>
          {announcement.content}
        </p>

        {/* Author + timestamp */}
        <div className="flex items-center gap-2.5 mt-3.5 pt-3 border-t border-primary-200/20">
          <Avatar
            src={announcement.author?.avatar_url}
            name={announcement.author?.display_name ?? 'Staff'}
            size="xs"
          />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold text-secondary-800">
              {announcement.author?.display_name ?? 'Co-Exist Team'}
            </span>
            {announcement.author?.role && (
              <span className="text-[11px] text-primary-500 ml-1.5 font-medium">
                {roleLabel(announcement.author.role)}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-primary-400 shrink-0">
            {formatDate(announcement.created_at)}
          </span>
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 shadow-sm shadow-primary-300/40" aria-hidden="true" />
            <span className="text-[11px] font-bold text-primary-600">New</span>
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
  const showLoading = useDelayedLoading(isLoading)
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
        <DecorativeBackground />

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
          {/* Title */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-2.5 pt-2"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-500 to-bark-600 shadow-sm shadow-secondary-400/25">
              <Megaphone size={15} className="text-white" />
            </div>
            <h1 className="font-heading text-[22px] font-bold text-secondary-900 tracking-tight">
              Announcements
            </h1>
          </motion.div>

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
                'flex items-center gap-3.5 w-full p-4 rounded-[20px] text-left',
                'bg-gradient-to-br from-[#eef2e8] via-[#ebefe5] to-[#e6eadf]',
                'border border-primary-200/35',
                'shadow-[0_4px_20px_-4px_rgba(61,77,51,0.12),0_1px_4px_rgba(61,77,51,0.05)]',
                'hover:shadow-[0_8px_32px_-6px_rgba(61,77,51,0.16)] hover:ring-1 hover:ring-primary-300/40',
                'transition-all duration-200 cursor-pointer active:scale-[0.97]',
              )}
            >
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-700 flex items-center justify-center shrink-0 shadow-md shadow-primary-400/25">
                <Megaphone size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-bold text-secondary-900">
                  Create announcement
                </p>
                <p className="text-xs text-primary-500 mt-0.5 font-medium">
                  Post an update to your collective or all members
                </p>
              </div>
              <ChevronRight size={18} strokeWidth={2.5} className="text-primary-400 shrink-0" />
            </motion.button>
          )}

          {showLoading ? (
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
                      <motion.div variants={fadeUp} className="flex items-center gap-2 px-1 pt-3 pb-1">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200/40 to-transparent" />
                        <span className="text-[11px] font-bold text-primary-500 uppercase tracking-[0.12em]">
                          Recent
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200/40 to-transparent" />
                      </motion.div>
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
