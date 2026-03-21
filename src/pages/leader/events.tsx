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
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLeaderHeader, useLeaderContext } from '@/components/leader-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
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

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const statusStyles: Record<string, string> = {
  draft: 'bg-primary-100 text-primary-500',
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
  const { collectiveId } = useLeaderContext()
  const [filter, setFilter] = useState<string>('upcoming')

  useLeaderHeader('Events')

  const { data: events, isLoading } = useCollectiveEvents(collectiveId, filter)

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Toolbar: filters + create */}
      <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 shadow-sm">
        <div className="flex gap-1 flex-1 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none whitespace-nowrap',
                filter === f.id
                  ? 'bg-moss-600 text-white shadow-sm'
                  : 'text-primary-500 hover:bg-primary-50',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => navigate('/leader/events/create')}
          className="shrink-0"
        >
          Create
        </Button>
      </div>

      {/* Event grid */}
      {!events || events.length === 0 ? (
        <EmptyState
          illustration="empty"
          title={filter === 'upcoming' ? 'No upcoming events' : 'No events found'}
          description="Create your first conservation event and rally your collective."
          action={{ label: 'Create Event', to: '/leader/events/create' }}
        />
      ) : (
        <motion.div
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {events.map((event: any) => {
            const regCount = event.event_registrations?.[0]?.count ?? 0

            return (
              <motion.div key={event.id} variants={shouldReduceMotion ? undefined : fadeUp}>
                <Link
                  to={`/events/${event.id}`}
                  className={cn(
                    'group block rounded-2xl overflow-hidden',
                    'bg-white shadow-sm',
                    'hover:shadow-lg hover:-translate-y-0.5',
                    'transition-all duration-200',
                  )}
                >
                  {/* Cover image */}
                  <div className="relative h-32 bg-gradient-to-br from-moss-100 to-moss-200">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CalendarDays size={32} className="text-moss-300" />
                      </div>
                    )}

                    {/* Status pill */}
                    {event.status && event.status !== 'live' && (
                      <span className={cn(
                        'absolute top-2.5 right-2.5 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow-sm',
                        statusStyles[event.status] ?? statusStyles.draft,
                      )}>
                        {event.status}
                      </span>
                    )}

                    {/* Activity badge */}
                    {event.activity_type && (
                      <div className="absolute bottom-2.5 left-2.5">
                        <Badge
                          variant="activity"
                          activity={activityToBadge[event.activity_type] ?? 'education'}
                          size="sm"
                        >
                          {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-3.5">
                    <p className="font-heading text-sm font-bold text-primary-800 truncate mb-1">
                      {event.title}
                    </p>

                    <p className="text-xs text-moss-600 font-medium flex items-center gap-1 mb-0.5">
                      <Clock size={11} className="shrink-0" />
                      {formatEventDate(event.date_start)}
                    </p>

                    {event.address && (
                      <p className="text-[11px] text-primary-400 truncate flex items-center gap-1 mb-2">
                        <MapPin size={10} className="shrink-0" />
                        {event.address}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-primary-50">
                      <span className="text-[11px] font-semibold text-primary-400 flex items-center gap-1">
                        <Users size={11} />
                        {regCount} registered
                      </span>
                      <ChevronRight size={14} className="text-primary-200 group-hover:text-moss-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
