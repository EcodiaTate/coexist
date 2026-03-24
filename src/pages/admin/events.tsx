import { useState, useMemo } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  CalendarDays,
  MapPin,
  Users,
  ChevronRight,
  Clock,
  Flame,
  Pencil,
  ClipboardList,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow } from '@/components/admin-hero-stat'
import { SearchBar } from '@/components/search-bar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/cn'
import { useAdminEventsData, type AdminEvent } from '@/hooks/use-admin-events'

interface CollectiveGroup {
  collectiveId: string
  collectiveName: string
  region: string | null
  state: string | null
  events: AdminEvent[]
  totalRegistrations: number
}

type StatusFilter = 'upcoming' | 'past' | 'all' | 'draft' | 'cancelled'

/* ------------------------------------------------------------------ */
/*  Activity type styling                                              */
/* ------------------------------------------------------------------ */

const activityColors: Record<string, string> = {
  shore_cleanup: 'bg-sky-100 text-sky-700',
  tree_planting: 'bg-sprout-100 text-sprout-700',
  land_regeneration: 'bg-moss-100 text-moss-700',
  nature_walk: 'bg-bark-100 text-bark-700',
  camp_out: 'bg-moss-100 text-moss-700',
  retreat: 'bg-plum-100 text-plum-700',
  film_screening: 'bg-coral-100 text-coral-700',
  marine_restoration: 'bg-primary-100 text-primary-700',
  workshop: 'bg-bark-100 text-bark-700',
}

function activityLabel(type: string | null): string {
  if (!type) return 'Event'
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

const statusBadgeStyles: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-primary-100 text-primary-600' },
  published: { label: 'Live', className: 'bg-success-100 text-success-700' },
  cancelled: { label: 'Cancelled', className: 'bg-error-100 text-error-700' },
  completed: { label: 'Completed', className: 'bg-info-100 text-info-700' },
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function groupByCollective(events: AdminEvent[]): CollectiveGroup[] {
  const map = new Map<string, CollectiveGroup>()

  for (const event of events) {
    const key = event.collective_id
    if (!map.has(key)) {
      map.set(key, {
        collectiveId: key,
        collectiveName: event.collectives?.name ?? 'Unknown',
        region: event.collectives?.region ?? null,
        state: event.collectives?.state ?? null,
        events: [],
        totalRegistrations: 0,
      })
    }
    const group = map.get(key)!
    group.events.push(event)
    group.totalRegistrations += event.registrationCount
  }

  // Sort by nearest upcoming event first
  return Array.from(map.values()).sort((a, b) => {
    const aNext = a.events[0]?.date_start ?? ''
    const bNext = b.events[0]?.date_start ?? ''
    return aNext.localeCompare(bNext)
  })
}

/* ------------------------------------------------------------------ */
/*  Countdown badge                                                    */
/* ------------------------------------------------------------------ */

function CountdownBadge({ dateStr }: { dateStr: string }) {
  const days = daysUntil(dateStr)

  if (days < 0) return null
  if (days === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-success-100 text-success-700 animate-pulse">
        <Flame size={10} /> Today
      </span>
    )
  }
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning-100 text-warning-700">
        <Clock size={10} /> {days}d away
      </span>
    )
  }
  if (days <= 14) {
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-50 text-primary-500">
        {days}d away
      </span>
    )
  }
  return null
}

/* ------------------------------------------------------------------ */
/*  Event card                                                         */
/* ------------------------------------------------------------------ */

function EventCard({ event, index }: { event: AdminEvent; index: number }) {
  const shouldReduceMotion = useReducedMotion()
  const isPast = new Date(event.date_start) < new Date()
  const actColor = activityColors[event.activity_type ?? ''] ?? 'bg-primary-50 text-primary-600'

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.25, ease: 'easeOut' }}
    >
      <Link
        to={`/events/${event.id}`}
        className={cn(
          'block rounded-2xl overflow-hidden',
          'bg-white shadow-sm',
          'hover:shadow-md active:scale-[0.99] transition-[color,background-color,box-shadow,transform] duration-150',
          isPast && 'opacity-60',
        )}
      >
        {/* Image header */}
        <div className="relative h-28 bg-gradient-to-br from-primary-50 to-primary-100">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarDays size={32} className="text-primary-300" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 to-transparent" />

          {/* Badges overlapping image bottom */}
          <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
            <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full ', actColor)}>
              {activityLabel(event.activity_type)}
            </span>
            <CountdownBadge dateStr={event.date_start} />
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="font-heading text-sm font-semibold text-primary-800 truncate flex-1">
              {event.title}
            </h4>
            {event.status !== 'published' && (() => {
              const badge = statusBadgeStyles[event.status]
              return badge ? (
                <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0', badge.className)}>
                  {badge.label}
                </span>
              ) : null
            })()}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-primary-400">
            <span className="flex items-center gap-1">
              <CalendarDays size={11} />
              {formatDate(event.date_start)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {formatTime(event.date_start)}
            </span>
          </div>

          {event.address && (
            <p className="flex items-center gap-1 mt-1 text-xs text-primary-400 truncate">
              <MapPin size={11} className="shrink-0" />
              {event.address}
            </p>
          )}

          {/* Registration count + quick actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary-600">
              <Users size={12} />
              <span>{event.registrationCount} registered{event.capacity ? ` / ${event.capacity}` : ''}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Link
                to={`/events/${event.id}/day`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary-100 text-primary-400 hover:text-primary-600 active:scale-[0.93] transition-[colors,transform] cursor-pointer"
                title="Event Day"
              >
                <ClipboardList size={13} />
              </Link>
              <Link
                to={`/events/${event.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-primary-100 text-primary-400 hover:text-primary-600 active:scale-[0.93] transition-[colors,transform] cursor-pointer"
                title="Edit Event"
              >
                <Pencil size={13} />
              </Link>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Collective section                                                 */
/* ------------------------------------------------------------------ */

function CollectiveSection({ group, startIndex }: { group: CollectiveGroup; startIndex: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <MapPin size={14} className="text-primary-600" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-primary-800">
              {group.collectiveName}
            </h3>
            {(group.region || group.state) && (
              <p className="text-[11px] text-primary-400">
                {[group.region, group.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-primary-400">
          <Users size={12} />
          <span className="tabular-nums font-medium">{group.totalRegistrations} total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.events.map((event, i) => (
          <EventCard key={event.id} event={event} index={startIndex + i} />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hottest event spotlight                                            */
/* ------------------------------------------------------------------ */

function HottestEventSpotlight({ event }: { event: AdminEvent }) {
  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'block rounded-2xl overflow-hidden',
        'bg-gradient-to-br from-primary-200 to-primary-300/80',
        'shadow-sm',
        'shadow-md hover:shadow-lg active:scale-[0.99] transition-[shadow,transform] duration-150',
      )}
    >
      <div className="flex items-center gap-4 p-5">
        {/* Image */}
        <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-primary-300">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarDays size={28} className="text-primary-500" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary-500 mb-1 block">
            Biggest Event
          </span>
          <h3 className="font-heading text-lg font-bold text-primary-900 truncate">
            {event.title}
          </h3>
          <p className="text-sm text-primary-600 mt-0.5">
            {event.collectives?.name} &middot; {formatDate(event.date_start)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-800 bg-white/60 rounded-full px-3 py-1">
              <Users size={14} />
              {event.registrationCount} registered
            </span>
            {event.capacity && (
              <span className="text-xs font-medium text-primary-500">
                of {event.capacity}
              </span>
            )}
          </div>
        </div>

        <ChevronRight size={20} className="text-primary-500 shrink-0" />
      </div>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Past events table-style list                                       */
/* ------------------------------------------------------------------ */

function PastEventRow({ event, index }: { event: AdminEvent; index: number }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.15), duration: 0.2 }}
    >
      <Link
        to={`/events/${event.id}`}
        className={cn(
          'flex items-center gap-3 p-3 rounded-xl',
          'bg-white/60',
          'hover:bg-white hover:shadow-sm active:scale-[0.99] transition-[color,background-color,box-shadow,transform] duration-150',
        )}
      >
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt=""
            className="w-10 h-10 rounded-lg object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <CalendarDays size={16} className="text-primary-300" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-700 truncate">{event.title}</p>
          <p className="text-xs text-primary-400">
            {event.collectives?.name} &middot; {formatDate(event.date_start)}
          </p>
        </div>

        {event.status !== 'published' && (() => {
          const badge = statusBadgeStyles[event.status]
          return badge ? (
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0', badge.className)}>
              {badge.label}
            </span>
          ) : null
        })()}

        <div className="flex items-center gap-1 text-xs text-primary-400 shrink-0 tabular-nums">
          <Users size={12} />
          {event.registrationCount}
        </div>

        <ChevronRight size={14} className="text-primary-200 shrink-0" />
      </Link>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Admin Events Page                                                  */
/* ------------------------------------------------------------------ */

export default function AdminEventsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('upcoming')

  const { data, isLoading, isError } = useAdminEventsData()
  const showLoading = useDelayedLoading(isLoading)

  const heroStats = useMemo(() => (
    <AdminHeroStatRow>
      <AdminHeroStat value={data?.stats?.upcoming ?? 0} label="Upcoming" icon={<Flame size={18} />} color="warning" delay={0} reducedMotion={false} />
      <AdminHeroStat value={data?.stats?.total ?? 0} label="Total Events" icon={<CalendarDays size={18} />} color="primary" delay={1} reducedMotion={false} />
      <AdminHeroStat value={data?.stats?.totalRegistrations ?? 0} label="Registrations" icon={<ClipboardList size={18} />} color="sprout" delay={2} reducedMotion={false} />
      <AdminHeroStat value={data?.stats?.activeCollectives ?? 0} label="Active Collectives" icon={<MapPin size={18} />} color="moss" delay={3} reducedMotion={false} />
    </AdminHeroStatRow>
  ), [data?.stats])

  useAdminHeader('Events', { heroContent: heroStats })

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    if (!data) return []

    let events: AdminEvent[]
    switch (statusFilter) {
      case 'upcoming':
        events = data.upcoming
        break
      case 'past':
        events = [...data.past].reverse() // most recent first
        break
      case 'draft':
        events = data.all.filter((e) => e.status === 'draft')
        break
      case 'cancelled':
        events = data.all.filter((e) => e.status === 'cancelled')
        break
      default:
        events = data.all
        break
    }

    if (search) {
      const q = search.toLowerCase()
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.collectives?.name?.toLowerCase().includes(q) ||
          e.address?.toLowerCase().includes(q),
      )
    }

    return events
  }, [data, statusFilter, search])

  const collectiveGroups = useMemo(
    () => (statusFilter === 'upcoming' ? groupByCollective(filteredEvents) : []),
    [filteredEvents, statusFilter],
  )

  const shouldReduceMotion2 = useReducedMotion()
  const rm = !!shouldReduceMotion2

  const { stagger, fadeUp } = adminVariants(rm)

  if (showLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton variant="stat-card" />
          <Skeleton variant="stat-card" />
          <Skeleton variant="stat-card" />
          <Skeleton variant="stat-card" />
        </div>
        <Skeleton variant="card" />
        <Skeleton variant="list-item" count={6} />
      </div>
    )
  }
  if (isError) {
    return (
      <EmptyState
        illustration="empty"
        title="Failed to load events"
        description="Something went wrong. Please try again."
      />
    )
  }

  const stats = data?.stats

  return (
    <div>
        <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
          {/* ── Hottest event spotlight ── */}
          {stats?.hottestEvent && stats.hottestEvent.registrationCount > 0 && (
            <motion.div variants={fadeUp}><HottestEventSpotlight event={stats.hottestEvent} /></motion.div>
          )}

          {/* ── Filters ── */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Event name, collective, location..."
              compact
              className="flex-1"
            />

            <div className="flex items-center gap-2">
              {/* Status toggle */}
              <div className="flex items-center gap-0.5 rounded-xl shadow-sm bg-white p-0.5">
                {(['upcoming', 'past', 'draft', 'cancelled', 'all'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize',
                      'active:scale-[0.95] transition-[colors,transform] duration-150 cursor-pointer select-none',
                      statusFilter === s
                        ? 'bg-primary-100 text-primary-800'
                        : 'text-primary-400 hover:text-primary-600',
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>

            </div>
          </motion.div>

          {/* ── Event list ── */}
          <motion.div variants={fadeUp}>
          {!filteredEvents.length ? (
            <EmptyState
              illustration="empty"
              title="No events found"
              description={
                search
                  ? 'Try a different search term'
                  : statusFilter === 'upcoming'
                    ? 'No upcoming events scheduled'
                    : statusFilter === 'draft'
                      ? 'No draft events'
                      : statusFilter === 'cancelled'
                        ? 'No cancelled events'
                        : 'No events found'
              }
            />
          ) : statusFilter === 'upcoming' ? (
            /* Grouped by collective */
            <div className="space-y-8">
              {collectiveGroups.map((group) => {
                const idx = collectiveGroups
                  .slice(0, collectiveGroups.indexOf(group))
                  .reduce((sum, g) => sum + g.events.length, 0)
                return (
                  <CollectiveSection
                    key={group.collectiveId}
                    group={group}
                    startIndex={idx}
                  />
                )
              })}
            </div>
          ) : statusFilter === 'past' ? (
            /* Past events - compact rows */
            <div className="space-y-1.5">
              {filteredEvents.map((event, i) => (
                <PastEventRow key={event.id} event={event} index={i} />
              ))}
            </div>
          ) : (
            /* All / ungrouped - card grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredEvents.map((event, i) => (
                <EventCard key={event.id} event={event} index={i} />
              ))}
            </div>
          )}

          </motion.div>

          {/* ── Summary footer ── */}
          <motion.div variants={fadeUp} className="text-center py-4">
            <p className="text-xs text-primary-300">
              {stats?.total ?? 0} total events &middot; {stats?.totalRegistrations ?? 0} total registrations
            </p>
          </motion.div>
        </motion.div>
    </div>
  )
}
