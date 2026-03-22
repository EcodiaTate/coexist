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
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
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

function FullBleedBackground() {
  return (
    <>
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/50 via-white to-primary-50/20" />

      {/* Large ring - top right — CSS-only breathe */}
      <div className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-secondary-200/30 will-change-transform animate-[breathe_20s_ease-in-out_infinite]" />
      {/* Concentric inner ring */}
      <div className="absolute -right-4 -top-4 w-[220px] h-[220px] rounded-full border border-secondary-200/25 will-change-transform animate-[breathe_22s_ease-in-out_0.5s_infinite]" />
      {/* Filled glow - bottom left — static blur, CSS scale */}
      <div className="absolute -left-20 bottom-[8%] w-[280px] h-[280px] rounded-full bg-secondary-100/25 blur-2xl will-change-transform animate-[breathe_18s_ease-in-out_1s_infinite]" />
      {/* Small ring - mid left */}
      <div className="absolute top-[42%] -left-6 w-[90px] h-[90px] rounded-full border border-primary-100/20" />
      {/* Warm glow - center right */}
      <div className="absolute top-[20%] -right-8 w-[200px] h-[200px] rounded-full bg-secondary-100/25 blur-3xl" />
      {/* Small filled circle - bottom right */}
      <div className="absolute bottom-[15%] right-[10%] w-[60px] h-[60px] rounded-full bg-primary-100/20" />
      {/* Floating dots — CSS-only */}
      <div className="absolute top-[28%] left-[15%] w-2 h-2 rounded-full bg-secondary-300/25 will-change-transform animate-[float_5s_ease-in-out_infinite]" />
      <div className="absolute top-[55%] right-[20%] w-1.5 h-1.5 rounded-full bg-primary-300/20 will-change-transform animate-[floatDown_6s_ease-in-out_1s_infinite]" />
      <div className="absolute top-[70%] left-[25%] w-1.5 h-1.5 rounded-full bg-secondary-300/25 will-change-transform animate-[float_4.5s_ease-in-out_0.5s_infinite]" />
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
  const showLoading = useDelayedLoading(isLoading)

  useLeaderHeader('Announcements', { fullBleed: true })

  /* Loading skeleton */
  if (showLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/50 via-white to-primary-50/20" />
        <div className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-secondary-200/30" />
        <div className="absolute -left-20 bottom-[10%] w-[280px] h-[280px] rounded-full bg-secondary-100/25 blur-2xl" />
        <div className="relative z-10 px-6 pt-14 space-y-6">
          <div className="flex flex-col items-center gap-2 pb-2">
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
        <FullBleedBackground />
        <div className="relative z-10 px-6 pt-14">
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
      <FullBleedBackground />

      <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['announcements'] })}>
        <motion.div
          className="relative z-10 px-6 pt-14 space-y-5 pb-20"
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero title ── */}
          <motion.div variants={rm ? undefined : fadeUp} className="flex flex-col items-center gap-1 pb-2">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary-500 to-secondary-600 text-white text-sm font-semibold shadow-md shadow-secondary-500/20 hover:shadow-lg hover:shadow-secondary-500/30 active:scale-[0.97] transition-[box-shadow,transform] duration-150"
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
                'hover:shadow-md transition-shadow duration-200',
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
