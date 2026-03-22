import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  CalendarDays,
  Plus,
  MapPin,
  Users,
  Clock,
  ChevronRight,
  Search,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLeaderHeader, useLeaderContext } from '@/components/leader-layout'
import { Badge } from '@/components/badge'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import {
  ACTIVITY_TYPE_LABELS,
  formatEventDate,
} from '@/hooks/use-events'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

function useCollectiveEvents(collectiveId: string | undefined, filter: string) {
  return useQuery({
    queryKey: ['leader-events', collectiveId, filter],
    queryFn: async () => {
      if (!collectiveId) return []
      const now = new Date().toISOString()

      let q = supabase
        .from('events' as any)
        .select('id, title, date_start, date_end, address, cover_image_url, activity_type, status, event_registrations(count)')
        .eq('collective_id', collectiveId)
        .order('date_start', { ascending: filter === 'upcoming' })

      if (filter === 'upcoming') {
        q = q.gte('date_start', now)
      } else if (filter === 'past') {
        q = q.lt('date_start', now)
      } else if (filter === 'draft') {
        q = q.eq('status', 'draft')
      }

      const { data } = await q.limit(50)
      return (data ?? []) as any[]
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

function useEventStats(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-event-stats', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return { total: 0, upcoming: 0, past: 0, drafts: 0 }
      const now = new Date().toISOString()

      const [totalRes, upcomingRes, pastRes, draftRes] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId).gte('date_start', now),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId).lt('date_start', now),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId).eq('status', 'draft'),
      ])

      return {
        total: totalRes.count ?? 0,
        upcoming: upcomingRes.count ?? 0,
        past: pastRes.count ?? 0,
        drafts: draftRes.count ?? 0,
      }
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

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
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const statusStyles: Record<string, string> = {
  draft: 'bg-primary-100 text-primary-600',
  live: 'bg-success-100 text-success-700',
  cancelled: 'bg-error-100 text-error-700',
  completed: 'bg-primary-50 text-primary-400',
}

/* ------------------------------------------------------------------ */
/*  Activity badge mapping                                             */
/* ------------------------------------------------------------------ */

const activityToBadge: Record<string, 'tree-planting' | 'beach-cleanup' | 'habitat' | 'wildlife' | 'education' | 'monitoring' | 'restoration'> = {
  tree_planting: 'tree-planting',
  beach_cleanup: 'beach-cleanup',
  habitat_restoration: 'habitat',
  nature_walk: 'wildlife',
  education: 'education',
  wildlife_survey: 'wildlife',
  seed_collecting: 'tree-planting',
  weed_removal: 'restoration',
  waterway_cleanup: 'beach-cleanup',
  community_garden: 'restoration',
  other: 'education',
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const FILTERS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'draft', label: 'Drafts' },
  { id: 'all', label: 'All' },
] as const

export default function LeaderEventsPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { collectiveId } = useLeaderContext()
  const [filter, setFilter] = useState<string>('upcoming')

  useLeaderHeader('Events', { fullBleed: true })

  const { data: events, isLoading } = useCollectiveEvents(collectiveId, filter)
  const { data: stats } = useEventStats(collectiveId)

  /* Loading skeleton */
  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-b from-moss-50 via-white to-primary-50/30">
        {/* Decorative shapes */}
        <div className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-moss-200/40" />
        <div className="absolute -left-20 bottom-[10%] w-[280px] h-[280px] rounded-full bg-moss-100/30 blur-2xl" />
        <div className="relative z-10 px-6 pt-12 space-y-6">
          <div className="flex flex-col items-center gap-2 pt-4 pb-2">
            <div className="h-3 w-16 rounded-full bg-moss-200/40 animate-pulse" />
            <div className="h-8 w-40 rounded-lg bg-moss-200/30 animate-pulse" />
          </div>
          <div className="flex justify-center gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-24 rounded-2xl bg-white shadow-sm animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="h-10 rounded-xl bg-white/80 shadow-sm animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-white shadow-sm animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Bright airy background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-moss-50 via-white to-primary-50/30" />

      {/* ── Decorative geometric shapes — soft, nature-toned ── */}
      {/* Large ring — top right */}
      <motion.div
        initial={rm ? {} : { scale: 0.7, opacity: 0 }}
        animate={{ scale: [1, 1.03, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.2, ease: 'easeOut' } }}
        className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-moss-200/40"
      />
      {/* Concentric inner ring */}
      <motion.div
        initial={rm ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], opacity: 1 }}
        transition={{ scale: { duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.5, delay: 0.3, ease: 'easeOut' } }}
        className="absolute -right-4 -top-4 w-[220px] h-[220px] rounded-full border border-moss-200/25"
      />
      {/* Filled glow — bottom left */}
      <motion.div
        initial={rm ? {} : { scale: 0.6, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }, opacity: { duration: 1.5, delay: 0.5, ease: 'easeOut' } }}
        className="absolute -left-20 bottom-[8%] w-[280px] h-[280px] rounded-full bg-moss-100/40 blur-2xl"
      />
      {/* Small ring — mid left */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute top-[42%] -left-6 w-[90px] h-[90px] rounded-full border border-primary-200/35"
      />
      {/* Warm glow — center right */}
      <div className="absolute top-[20%] -right-8 w-[200px] h-[200px] rounded-full bg-moss-100/25 blur-3xl" />
      {/* Small filled circle — bottom right */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease: 'easeOut' }}
        className="absolute bottom-[15%] right-[10%] w-[60px] h-[60px] rounded-full bg-primary-100/30"
      />
      {/* Floating dots */}
      <motion.div
        animate={rm ? {} : { y: [0, -7, 0], opacity: [0.35, 0.6, 0.35] }}
        transition={{ y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } }}
        className="absolute left-[15%] top-[16%] w-2 h-2 rounded-full bg-moss-300/40"
      />
      <motion.div
        animate={rm ? {} : { y: [0, 5, 0], opacity: [0.25, 0.45, 0.25] }}
        transition={{ y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }, opacity: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 } }}
        className="absolute right-[14%] top-[35%] w-1.5 h-1.5 rounded-full bg-primary-300/30"
      />
      <motion.div
        animate={rm ? {} : { y: [0, -4, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }, opacity: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 } }}
        className="absolute left-[35%] bottom-[20%] w-2.5 h-2.5 rounded-full bg-moss-300/25"
      />

      {/* ── Content ── */}
      <motion.div
        className="relative z-10 px-6 pt-4 space-y-5 pb-20"
        variants={rm ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── Hero title ── */}
        <motion.div
          variants={rm ? undefined : fadeUp}
          className="flex flex-col items-center justify-center text-center pt-8 pb-2"
        >
          <p className="text-[10px] font-semibold text-moss-500 uppercase tracking-[0.2em]">
            Manage
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary-900 mt-1.5">
            Events
          </h1>
        </motion.div>

        {/* ── Stat pills ── */}
        <motion.div variants={rm ? undefined : fadeUp} className="flex justify-center gap-3">
          {[
            { value: stats?.upcoming ?? 0, label: 'Upcoming', color: 'text-moss-700' },
            { value: stats?.past ?? 0, label: 'Past', color: 'text-primary-600' },
            { value: stats?.drafts ?? 0, label: 'Drafts', color: 'text-primary-500' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center rounded-2xl bg-white shadow-sm border border-moss-100/50 px-5 py-3 min-w-[80px]">
              <span className={cn('font-heading text-2xl font-extrabold tabular-nums', s.color)}>{s.value}</span>
              <span className="text-[10px] font-semibold text-primary-400 uppercase tracking-wider mt-0.5">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Create event CTA ── */}
        <motion.div variants={rm ? undefined : fadeUp}>
          <button
            type="button"
            onClick={() => navigate('/leader/events/create')}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-moss-500 to-moss-600 py-3.5 text-sm font-bold text-white shadow-md shadow-moss-500/20 hover:shadow-lg hover:shadow-moss-500/30 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            <Plus size={18} strokeWidth={2.5} />
            Create New Event
          </button>
        </motion.div>

        {/* ── Filter bar ── */}
        <motion.div variants={rm ? undefined : fadeUp}>
          <div className="flex gap-1 rounded-xl bg-white shadow-sm border border-primary-50 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={cn(
                  'flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
                  filter === f.id
                    ? 'bg-moss-600 text-white shadow-sm'
                    : 'text-primary-500 hover:text-primary-700 hover:bg-primary-50',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Event list ── */}
        {!events || events.length === 0 ? (
          <motion.div
            variants={rm ? undefined : fadeUp}
            className="flex flex-col items-center justify-center text-center py-16 rounded-2xl bg-white shadow-sm border border-primary-50"
          >
            <div className="w-14 h-14 rounded-2xl bg-moss-50 flex items-center justify-center mb-4">
              <Search size={24} className="text-moss-400" />
            </div>
            <p className="font-heading text-base font-bold text-primary-800 mb-1">
              {filter === 'upcoming' ? 'No upcoming events' : 'No events found'}
            </p>
            <p className="text-xs text-primary-400 max-w-[240px]">
              Create your first conservation event and rally your collective.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {events.map((event: any, idx: number) => {
              const regCount = event.event_registrations?.[0]?.count ?? 0

              return (
                <motion.div
                  key={event.id}
                  variants={rm ? undefined : fadeUp}
                  custom={idx}
                >
                  <Link
                    to={`/events/${event.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm border border-primary-50/60 hover:shadow-md hover:border-moss-100 hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200"
                  >
                    {/* Cover thumbnail */}
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-moss-50 to-moss-100 flex items-center justify-center shrink-0">
                        <CalendarDays size={24} className="text-moss-400" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-heading text-sm font-bold text-primary-800 truncate">
                          {event.title}
                        </p>
                        {event.status && event.status !== 'live' && (
                          <span className={cn(
                            'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase shrink-0',
                            statusStyles[event.status] ?? statusStyles.draft,
                          )}>
                            {event.status}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-moss-600 font-medium flex items-center gap-1">
                        <Clock size={11} className="shrink-0" />
                        {formatEventDate(event.date_start)}
                      </p>
                      {event.address && (
                        <p className="text-[11px] text-primary-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="shrink-0" />
                          {event.address}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[11px] font-semibold text-primary-400 flex items-center gap-1">
                          <Users size={11} />
                          {regCount} registered
                        </span>
                        {event.activity_type && (
                          <Badge
                            variant="activity"
                            activity={activityToBadge[event.activity_type] ?? 'education'}
                            size="sm"
                          >
                            {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={16} className="text-primary-200 group-hover:text-moss-500 shrink-0 transition-colors" />
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
