import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Pin, Megaphone, AlertTriangle, Plus } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
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
import { useState } from 'react'

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
        'rounded-2xl shadow-md overflow-hidden cursor-pointer',
        'transition-colors duration-150',
        isUrgent
          ? 'bg-gradient-to-br from-white to-accent-100 border border-accent-200'
          : 'bg-surface-0',
        isUnread && !isUrgent && 'ring-2 ring-primary-200',
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
        <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-primary-100/60">
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
  const { isStaff } = useAuth()
  const shouldReduceMotion = useReducedMotion()
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
    <Page
      header={
        <Header
          title="Announcements"
          back
          rightActions={
            isStaff ? (
              <button
                type="button"
                onClick={() => navigate('/announcements/create')}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-full',
                  'bg-primary-800 text-white',
                  'cursor-pointer select-none',
                  'hover:bg-primary-950 transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
                )}
                aria-label="Create announcement"
              >
                <Plus size={20} />
              </button>
            ) : undefined
          }
        />
      }
    >
      {/* Search */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pt-3 pb-2"
      >
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search announcements..."
          compact
          aria-label="Search announcements"
        />
      </motion.div>

      {isLoading ? (
        <div className="py-4 space-y-4">
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
            className="py-4 space-y-4"
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
    </Page>
  )
}
