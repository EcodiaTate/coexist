import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Plus,
    Pin,
    Clock
} from 'lucide-react'
import { useLeaderHeader } from '@/components/leader-layout'
import { Avatar } from '@/components/avatar'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import {
    useAnnouncements,
    type AnnouncementWithAuthor,
} from '@/hooks/use-announcements'
import { useQueryClient } from '@tanstack/react-query'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
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
/*  Decorative background                                              */
/* ------------------------------------------------------------------ */

function FullBleedBackground({ rm }: { rm: boolean }) {
  return (
    <>
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/50 via-white to-primary-50/20" />

      {/* Large ring - top right */}
      <motion.div
        initial={rm ? {} : { scale: 0.7, opacity: 0 }}
        animate={{ scale: [1, 1.03, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.2, ease: 'easeOut' } }}
        className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-secondary-200/30"
      />
      {/* Concentric inner ring */}
      <motion.div
        initial={rm ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], opacity: 1 }}
        transition={{ scale: { duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.5, delay: 0.3, ease: 'easeOut' } }}
        className="absolute -right-4 -top-4 w-[220px] h-[220px] rounded-full border border-secondary-200/25"
      />
      {/* Filled glow - bottom left */}
      <motion.div
        initial={rm ? {} : { scale: 0.6, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }, opacity: { duration: 1.5, delay: 0.5, ease: 'easeOut' } }}
        className="absolute -left-20 bottom-[8%] w-[280px] h-[280px] rounded-full bg-secondary-100/25 blur-2xl"
      />
      {/* Small ring - mid left */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute top-[42%] -left-6 w-[90px] h-[90px] rounded-full border border-primary-100/20"
      />
      {/* Warm glow - center right */}
      <div className="absolute top-[20%] -right-8 w-[200px] h-[200px] rounded-full bg-secondary-100/25 blur-3xl" />
      {/* Small filled circle - bottom right */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease: 'easeOut' }}
        className="absolute bottom-[15%] right-[10%] w-[60px] h-[60px] rounded-full bg-primary-100/20"
      />
      {/* Floating dots */}
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, -6, 0] }}
        transition={{ opacity: { duration: 1, delay: 0.8 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
        className="absolute top-[28%] left-[15%] w-2 h-2 rounded-full bg-secondary-300/25"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, 5, 0] }}
        transition={{ opacity: { duration: 1, delay: 1.2 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 } }}
        className="absolute top-[55%] right-[20%] w-1.5 h-1.5 rounded-full bg-primary-300/20"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, -4, 0] }}
        transition={{ opacity: { duration: 1, delay: 1.5 }, y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
        className="absolute top-[70%] left-[25%] w-1.5 h-1.5 rounded-full bg-secondary-300/25"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderAnnouncementsPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const queryClient = useQueryClient()
  const { data: announcements, isLoading } = useAnnouncements()

  useLeaderHeader('Announcements', { fullBleed: true })

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/50 via-white to-primary-50/20" />
        <div className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-secondary-200/30" />
        <div className="absolute -left-20 bottom-[10%] w-[280px] h-[280px] rounded-full bg-secondary-100/25 blur-2xl" />
        <div className="relative z-10 px-6 pt-12 space-y-6">
          <div className="flex flex-col items-center gap-2 pt-4 pb-2">
            <div className="h-3 w-20 rounded-full bg-secondary-200/40 animate-pulse" />
            <div className="h-8 w-48 rounded-lg bg-secondary-200/30 animate-pulse" />
          </div>
          <div className="flex justify-center">
            <div className="h-10 w-44 rounded-xl bg-white/80 shadow-sm animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-white shadow-sm animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* Empty state */
  if (!announcements || announcements.length === 0) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <FullBleedBackground rm={rm} />
        <div className="relative z-10 px-6 pt-12">
          <EmptyState
            illustration="empty"
            title="No announcements"
            description="Share updates, reminders, and news with your collective."
            action={{ label: 'Create Announcement', to: '/announcements/create' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <FullBleedBackground rm={rm} />

      <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['announcements'] })}>
        <motion.div
          className="relative z-10 px-6 pt-4 space-y-5 pb-20"
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero title ── */}
          <motion.div variants={rm ? undefined : fadeUp} className="flex flex-col items-center gap-1 pt-6 pb-2">
            <span className="text-xs font-medium tracking-widest uppercase text-secondary-400">
              Communicate
            </span>
            <h1 className="text-2xl font-heading font-bold text-primary-900 tracking-tight">
              Announcements
            </h1>
          </motion.div>

          {/* ── CTA button ── */}
          <motion.div variants={rm ? undefined : fadeUp} className="flex justify-center">
            <button
              onClick={() => navigate('/announcements/create')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-600 text-white text-sm font-semibold shadow-md shadow-secondary-500/20 hover:shadow-lg hover:shadow-secondary-500/30 active:scale-[0.97] transition-all duration-150"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Announcement
            </button>
          </motion.div>

          {/* ── Announcement cards ── */}
          {announcements.map((a: AnnouncementWithAuthor) => (
            <motion.div
              key={a.id}
              variants={rm ? undefined : fadeUp}
              className={cn(
                'rounded-2xl bg-white shadow-sm border border-secondary-50/60 p-4',
                'hover:shadow-md transition-shadow duration-150',
                a.is_pinned && 'ring-1 ring-moss-200 bg-moss-50/30',
              )}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-2.5">
                <Avatar
                  src={a.author?.avatar_url}
                  name={a.author?.display_name ?? ''}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-800 truncate">
                    {a.author?.display_name ?? 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-primary-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(a.created_at)}
                    </span>
                    {a.is_pinned && (
                      <span className="text-[10px] font-semibold text-moss-600 flex items-center gap-0.5">
                        <Pin size={10} />
                        Pinned
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Title */}
              {a.title && (
                <p className="font-heading text-sm font-bold text-primary-800 mb-1.5">
                  {a.title}
                </p>
              )}

              {/* Body */}
              <p className="text-sm text-primary-600 leading-relaxed line-clamp-4">
                {a.content}
              </p>

              {/* Image */}
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt=""
                  className="w-full h-40 object-cover rounded-xl mt-3"
                />
              )}
            </motion.div>
          ))}
        </motion.div>
      </PullToRefresh>
    </div>
  )
}
