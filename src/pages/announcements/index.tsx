import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, AnimatePresence, type Variants } from 'framer-motion'
import { ArrowLeft, Pin, Megaphone, AlertTriangle, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { Page } from '@/components/page'
import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
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
  visible: { transition: { staggerChildren: 0.05 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
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
/*  Get all images for an announcement                                 */
/* ------------------------------------------------------------------ */

function getImages(announcement: AnnouncementWithAuthor): string[] {
  const urls = (announcement as any).image_urls as string[] | undefined
  if (urls && urls.length > 0) return urls
  if (announcement.image_url) return [announcement.image_url]
  return []
}

/* ------------------------------------------------------------------ */
/*  Role label                                                         */
/* ------------------------------------------------------------------ */

function roleLabel(role: string | undefined) {
  switch (role) {
    case 'super_admin': return 'Super Admin'
    case 'national_admin': return 'Admin'
    case 'national_staff': return 'Staff'
    default: return ''
  }
}

/* ------------------------------------------------------------------ */
/*  Compact image thumbnail for cards                                  */
/* ------------------------------------------------------------------ */

function CardThumbnail({ images }: { images: string[] }) {
  if (images.length === 0) return null

  if (images.length === 1) {
    return (
      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/[0.04]">
        <img src={images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
      </div>
    )
  }

  // 2x2 mini grid for multiple images
  return (
    <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 grid grid-cols-2 gap-0.5 bg-primary-100 ring-1 ring-black/[0.04]">
      {images.slice(0, 4).map((src, i) => (
        <div key={i} className="relative overflow-hidden">
          <img src={src} alt="" loading="lazy" className="w-full h-full object-cover" />
          {i === 3 && images.length > 4 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">+{images.length - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Decorative background                                              */
/* ------------------------------------------------------------------ */

function DecorativeBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/60 via-white via-40% to-primary-50/20" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-200/20 via-primary-100/8 to-transparent" />
      {/* Ring cluster - top-right */}
      <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full border-[2.5px] border-primary-200/14" />
      <div className="absolute -top-8 -right-4 w-48 h-48 rounded-full border-[1.5px] border-primary-200/10" />
      {/* Ring - mid-left */}
      <div className="absolute top-[40%] -left-14 w-52 h-52 rounded-full border-[2px] border-primary-200/10" />
      {/* Accent orb - bottom-right */}
      <div className="absolute bottom-[15%] right-[8%] w-32 h-32 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-100/18 to-transparent" />
      {/* Small accents */}
      <div className="absolute top-[20%] left-[25%] w-10 h-10 rounded-full border border-primary-200/12" />
      <div className="absolute bottom-[30%] left-[15%] w-6 h-6 rounded-full bg-primary-100/20" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Full-screen announcement detail overlay                            */
/* ------------------------------------------------------------------ */

function AnnouncementDetail({
  announcement,
  onClose,
}: {
  announcement: AnnouncementWithAuthor
  onClose: () => void
}) {
  const images = getImages(announcement)
  const isUrgent = announcement.priority === 'urgent'
  const splashImage = images[0] ?? null
  const extraImages = images.slice(1)

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-white overflow-y-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back button – floats over splash image */}
      <div className="sticky top-0 z-20">
        <div className={cn(
          'flex items-center h-14 px-4 pt-[var(--safe-top)]',
          splashImage
            ? 'bg-transparent'
            : 'bg-white border-b border-primary-100/50',
        )}>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex items-center justify-center w-9 h-9 -ml-1 rounded-full',
              'cursor-pointer select-none transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
              splashImage
                ? 'bg-black/30 text-white hover:bg-black/50'
                : 'text-primary-700 hover:bg-primary-50',
            )}
            aria-label="Close"
          >
            <ArrowLeft size={20} />
          </button>
          {!splashImage && (
            <span className="ml-2 text-sm font-semibold text-primary-500">Announcement</span>
          )}
        </div>
      </div>

      {/* Splash / hero image – full bleed */}
      {splashImage && (
        <div className="-mt-14 relative">
          <img
            src={splashImage}
            alt=""
            className="w-full aspect-[16/9] lg:aspect-[21/9] object-cover"
          />
          {/* Gradient fade into white content area */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </div>
      )}

      <div className={cn(
        'px-5 lg:px-8 pb-20 max-w-3xl mx-auto overflow-hidden',
        splashImage ? '-mt-8 relative z-10' : 'pt-6',
      )}>
        {/* Badges */}
        {(announcement.is_pinned || isUrgent) && (
          <div className="flex items-center gap-2 mb-3">
            {announcement.is_pinned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                <Pin size={10} aria-hidden="true" />
                Pinned
              </span>
            )}
            {isUrgent && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-warning-700 bg-warning-50 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} aria-hidden="true" />
                Urgent
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-primary-900 leading-tight mb-4">
          {announcement.title}
        </h1>

        {/* Author + time – no role label */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-primary-100">
          <Avatar
            src={announcement.author?.avatar_url}
            name={announcement.author?.display_name ?? 'Staff'}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-primary-800">
              {announcement.author?.display_name ?? 'Co-Exist Team'}
            </span>
            <p className="text-xs text-primary-400 mt-0.5">
              {formatDate(announcement.created_at)}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="text-[15px] lg:text-base text-primary-700 leading-[1.8] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
          {announcement.content}
        </div>

        {/* Additional images (after content, below the splash) */}
        {extraImages.length > 0 && (
          <div className="mt-6 space-y-3">
            {extraImages.map((src, i) => (
              <div key={i} className="rounded-2xl overflow-hidden ring-1 ring-black/[0.04]">
                <img src={src} alt="" loading="lazy" className="w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Announcement card – compact white card                             */
/* ------------------------------------------------------------------ */

function AnnouncementCard({
  announcement,
  onRead,
  onOpen,
}: {
  announcement: AnnouncementWithAuthor
  onRead: () => void
  onOpen: () => void
}) {
  const isUrgent = announcement.priority === 'urgent'
  const isUnread = !announcement.is_read
  const images = getImages(announcement)

  const handleTap = () => {
    if (isUnread) onRead()
    onOpen()
  }

  return (
    <motion.article
      variants={fadeUp}
      onClick={handleTap}
      className={cn(
        'group rounded-2xl overflow-hidden cursor-pointer',
        'transition-all duration-200 active:scale-[0.985]',
        'bg-white',
        'border border-primary-100/80',
        'shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]',
        'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]',
        'hover:border-primary-200/60',
        isUrgent && 'border-warning-200/60 bg-gradient-to-r from-white to-warning-50/30',
        announcement.is_pinned && !isUrgent && 'border-primary-200/50 bg-gradient-to-r from-white to-primary-50/20',
        isUnread && 'border-l-[3px] border-l-primary-500',
      )}
      role="article"
      aria-label={announcement.title}
    >
      <div className="flex gap-3.5 p-3.5">
        {/* Left: Content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          {(announcement.is_pinned || isUrgent || isUnread) && (
            <div className="flex items-center gap-1.5 mb-1.5">
              {isUnread && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" aria-hidden="true" />
              )}
              {announcement.is_pinned && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-primary-500">
                  <Pin size={9} aria-hidden="true" />
                  Pinned
                </span>
              )}
              {isUrgent && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-warning-600">
                  <AlertTriangle size={9} aria-hidden="true" />
                  Urgent
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="font-heading font-bold text-sm leading-snug text-primary-900 line-clamp-2 group-hover:text-primary-700 transition-colors">
            {announcement.title}
          </h3>

          {/* Content preview */}
          <p className="mt-1 text-xs leading-relaxed text-primary-500 line-clamp-2">
            {announcement.content}
          </p>

          {/* Footer: author + time */}
          <div className="flex items-center gap-2 mt-2.5">
            <Avatar
              src={announcement.author?.avatar_url}
              name={announcement.author?.display_name ?? 'Staff'}
              size="xs"
            />
            <span className="text-[11px] font-semibold text-primary-700 truncate">
              {announcement.author?.display_name ?? 'Co-Exist Team'}
            </span>
            <span className="text-[10px] text-primary-300 shrink-0">
              {formatDate(announcement.created_at)}
            </span>
            {images.length > 1 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-300 shrink-0 ml-auto">
                <ImageIcon size={10} />
                {images.length}
              </span>
            )}
          </div>
        </div>

        {/* Right: Thumbnail */}
        <CardThumbnail images={images} />
      </div>
    </motion.article>
  )
}

/* ------------------------------------------------------------------ */
/*  Announcements page                                                 */
/* ------------------------------------------------------------------ */

export default function AnnouncementsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const { pinned, regular, isLoading, refetch } = useAnnouncements()
  const showLoading = useDelayedLoading(isLoading)
  const markRead = useMarkAnnouncementRead()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementWithAuthor | null>(null)

  const isEmpty = !isLoading && pinned.length === 0 && regular.length === 0

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

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
    <Page swipeBack noBackground className="!px-0 bg-surface-1">
      <div className="relative min-h-full">
        <DecorativeBackground />

        {/* Back button */}
        <div className="relative z-20 px-4 pt-[var(--safe-top)]">
          <div className="h-14 flex items-center">
            <motion.button
              type="button"
              onClick={() => navigate(-1)}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className={cn(
                'flex items-center justify-center',
                'w-9 h-9 -ml-1 rounded-full',
                'text-primary-700 hover:bg-primary-100/60',
                'cursor-pointer select-none',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              )}
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </motion.button>
          </div>
        </div>

        {/* Page content */}
        <div className="relative z-10 px-4 lg:px-6 pb-6 space-y-4">
          {/* Title */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex items-center gap-2.5"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-secondary-700 shadow-sm">
              <Megaphone size={14} className="text-white" />
            </div>
            <h1 className="font-heading text-xl font-bold text-primary-900 tracking-tight">
              Announcements
            </h1>
          </motion.div>

          {/* Search */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          >
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search announcements..."
              compact
              aria-label="Search announcements"
            />
          </motion.div>

          {/* Create announcement – admin only */}
          {isAdmin && (
            <motion.button
              type="button"
              onClick={() => navigate('/announcements/create')}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-left',
                'bg-white border border-primary-100/80',
                'shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
                'hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-primary-200/60',
                'transition-all duration-200 cursor-pointer active:scale-[0.98]',
              )}
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shrink-0 shadow-sm">
                <Megaphone size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-800">
                  New announcement
                </p>
                <p className="text-[11px] text-primary-400 mt-0.5">
                  Updates, invites, recaps, news
                </p>
              </div>
              <ChevronRight size={16} strokeWidth={2.5} className="text-primary-300 shrink-0" />
            </motion.button>
          )}

          {showLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[88px] rounded-2xl bg-white border border-primary-100/60 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
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
                className="space-y-2.5"
              >
                {/* Pinned section */}
                {filteredPinned.length > 0 && (
                  <div className="space-y-2">
                    {filteredPinned.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        onRead={() => markRead.mutate(a.id)}
                        onOpen={() => setSelectedAnnouncement(a)}
                      />
                    ))}
                  </div>
                )}

                {/* Divider */}
                {filteredPinned.length > 0 && filteredRegular.length > 0 && (
                  <motion.div variants={fadeUp} className="flex items-center gap-3 py-1.5">
                    <div className="h-px flex-1 bg-primary-100" />
                    <span className="text-[10px] font-bold text-primary-300 uppercase tracking-[0.15em]">
                      Recent
                    </span>
                    <div className="h-px flex-1 bg-primary-100" />
                  </motion.div>
                )}

                {/* Regular */}
                {filteredRegular.length > 0 && (
                  <div className="space-y-2">
                    {filteredRegular.map((a) => (
                      <AnnouncementCard
                        key={a.id}
                        announcement={a}
                        onRead={() => markRead.mutate(a.id)}
                        onOpen={() => setSelectedAnnouncement(a)}
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

      {/* Full-screen detail overlay */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <AnnouncementDetail
            announcement={selectedAnnouncement}
            onClose={() => setSelectedAnnouncement(null)}
          />
        )}
      </AnimatePresence>
    </Page>
  )
}
