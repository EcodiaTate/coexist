import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Users,
  CalendarDays,
  Clock,
  CalendarCheck,
  Plus,
  Megaphone,
  Eye,
  TreePine,
  ChevronRight,
  Bell,
  BarChart3,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Send,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Avatar } from '@/components/avatar'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */

function useLeaderDashboard(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-dashboard', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective')

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      // Fetch in parallel
      const [
        membersRes,
        upcomingEventsRes,
        monthEventsRes,
        monthHoursRes,
        recentActivityRes,
      ] = await Promise.all([
        // Active members count
        supabase
          .from('collective_members')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId),
        // Upcoming events
        supabase
          .from('events' as any)
          .select('id, title, start_date, location_name, cover_image_url')
          .eq('collective_id', collectiveId)
          .gte('start_date', now.toISOString())
          .order('start_date', { ascending: true })
          .limit(5),
        // Events this month
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId)
          .gte('start_date', startOfMonth),
        // Hours this month (from impact logs)
        supabase
          .from('impact_logs' as any)
          .select('volunteer_hours')
          .eq('collective_id', collectiveId)
          .gte('created_at', startOfMonth),
        // Recent activity - new members + check-ins
        supabase
          .from('collective_members' as any)
          .select('id, user_id, created_at, profiles(display_name, avatar_url)')
          .eq('collective_id', collectiveId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const totalHours = ((monthHoursRes.data ?? []) as any[]).reduce(
        (sum: number, row: any) => sum + (row.volunteer_hours ?? 0),
        0,
      )

      return {
        activeMembers: membersRes.count ?? 0,
        upcomingEvents: (upcomingEventsRes.data ?? []) as any[],
        eventsThisMonth: monthEventsRes.count ?? 0,
        hoursThisMonth: Math.round(totalHours),
        recentMembers: (recentActivityRes.data ?? []) as any[],
      }
    },
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

function useEngagementScores(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-engagement', collectiveId],
    queryFn: async () => {
      if (!collectiveId) throw new Error('No collective')

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      // Members with recent event attendance
      const { data: activeMembers } = await supabase
        .from('event_registrations')
        .select('user_id')
        .eq('status', 'checked_in' as any)
        .gte('created_at', thirtyDaysAgo)

      const activeUserIds = new Set((activeMembers ?? []).map((r) => r.user_id))

      const { data: allMembers } = await supabase
        .from('collective_members')
        .select('user_id, profiles(display_name, avatar_url)')
        .eq('collective_id', collectiveId)

      const members = allMembers ?? []
      const active = members.filter((m) => activeUserIds.has(m.user_id))
      const atRisk = members.filter((m) => !activeUserIds.has(m.user_id))

      return { active, atRisk, total: members.length }
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

function useEventInviteStats(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-invite-stats', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return { acceptanceRate: 0 }

      const { count: totalInvites } = await supabase
        .from('event_registrations' as any)
        .select('id', { count: 'exact', head: true })
        .eq('collective_id', collectiveId)

      const { count: accepted } = await supabase
        .from('event_registrations' as any)
        .select('id', { count: 'exact', head: true })
        .eq('collective_id', collectiveId)
        .in('status', ['registered', 'checked_in'])

      const rate = totalInvites ? Math.round(((accepted ?? 0) / totalInvites) * 100) : 0
      return { acceptanceRate: rate }
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Pending items hook                                                 */
/* ------------------------------------------------------------------ */

function usePendingItems(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-pending', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return []

      // Events that have passed but have no impact log
      const { data: pastEvents } = await supabase
        .from('events' as any)
        .select('id, title, start_date')
        .eq('collective_id', collectiveId)
        .lt('start_date', new Date().toISOString())
        .order('start_date', { ascending: false })
        .limit(10)

      const events = (pastEvents ?? []) as any[]
      if (!events.length) return []

      const { data: loggedEvents } = await supabase
        .from('impact_logs' as any)
        .select('event_id')
        .in(
          'event_id',
          events.map((e: any) => e.id),
        )

      const loggedIds = new Set(((loggedEvents ?? []) as any[]).map((l: any) => l.event_id))
      return events
        .filter((e: any) => !loggedIds.has(e.id))
        .map((e: any) => ({
          id: e.id,
          type: 'impact_not_logged' as const,
          message: `Impact not logged for "${e.title}"`,
          date: e.start_date,
        }))
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Calendar                                                           */
/* ------------------------------------------------------------------ */

function useEventCalendar(collectiveId: string | undefined, month: Date) {
  return useQuery({
    queryKey: ['leader-calendar', collectiveId, month.toISOString()],
    queryFn: async () => {
      if (!collectiveId) return []

      const start = new Date(month.getFullYear(), month.getMonth(), 1)
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0)

      const { data } = await supabase
        .from('events' as any)
        .select('id, title, start_date')
        .eq('collective_id', collectiveId)
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())

      return (data ?? []) as any[]
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

function MiniCalendar({
  collectiveId,
}: {
  collectiveId: string | undefined
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data: events = [] } = useEventCalendar(collectiveId, currentMonth)

  const eventDays = useMemo(
    () => new Set(events.map((e) => new Date(e.start_date).getDate())),
    [events],
  )

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1
    if (day < 1 || day > daysInMonth) return null
    return day
  })

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  return (
    <div className="bg-white rounded-xl border border-primary-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-semibold text-primary-800">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month - 1))}
            className="flex items-center justify-center min-h-11 min-w-11 rounded-xl hover:bg-primary-50 text-primary-400 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
            aria-label="Previous month"
          >
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month + 1))}
            className="flex items-center justify-center min-h-11 min-w-11 rounded-xl hover:bg-primary-50 text-primary-400 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-primary-400 font-medium py-1">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          if (!day) return <div key={i} />

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
          const hasEvent = eventDays.has(day)

          return (
            <div
              key={i}
              className={cn(
                'relative py-1 rounded text-xs',
                isToday && 'bg-primary-100 font-bold text-primary-400',
                !isToday && 'text-primary-800',
              )}
            >
              {day}
              {hasEvent && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Leader Dashboard Page                                              */
/* ------------------------------------------------------------------ */

export default function LeaderDashboardPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { collectiveRoles } = useAuth()

  // Get user's primary collective where they are leader
  const collectiveId = useMemo(() => {
    const membership = collectiveRoles.find(
      (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
    )
    return membership?.collective_id
  }, [collectiveRoles])

  const { data, isLoading } = useLeaderDashboard(collectiveId)
  const { data: collectiveDetail } = useCollective(collectiveId)
  const collectiveSlug = collectiveDetail?.slug ?? collectiveId
  const { data: engagement } = useEngagementScores(collectiveId)
  const { data: pendingItems = [] } = usePendingItems(collectiveId)
  const { data: inviteStats } = useEventInviteStats(collectiveId)

  if (isLoading) {
    return (
      <Page header={<Header title="Leader Dashboard" back />}>
        <div className="py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
          </div>
          <Skeleton variant="card" />
          <Skeleton variant="list-item" count={3} />
        </div>
      </Page>
    )
  }

  if (!collectiveId) {
    return (
      <Page header={<Header title="Leader Dashboard" back />}>
        <EmptyState
          illustration="empty"
          title="No collective found"
          description="You need to be a leader, co-leader, or assist-leader of a collective to access this dashboard."
          action={{ label: 'Explore Collectives', to: '/collectives' }}
        />
      </Page>
    )
  }

  const stagger = shouldReduceMotion ? {} : { transition: { staggerChildren: 0.05 } }
  const fadeUp = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }

  return (
    <Page header={<Header title="Leader Dashboard" back />}>
      <motion.div
        className="py-4 space-y-6 pb-8"
        initial="initial"
        animate="animate"
        variants={{ animate: stagger }}
      >
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            value={data?.activeMembers ?? 0}
            label="Active Members"
            icon={<Users size={20} />}
          />
          <StatCard
            value={data?.upcomingEvents?.length ?? 0}
            label="Upcoming Events"
            icon={<CalendarDays size={20} />}
          />
          <StatCard
            value={data?.hoursThisMonth ?? 0}
            label="Hours This Month"
            icon={<Clock size={20} />}
          />
          <StatCard
            value={data?.eventsThisMonth ?? 0}
            label="Events This Month"
            icon={<CalendarCheck size={20} />}
          />
        </div>

        {/* Quick actions */}
        <motion.div {...fadeUp}>
          <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Create Event', icon: <Plus size={18} />, to: '/events/create' },
              { label: 'Send Announcement', icon: <Megaphone size={18} />, to: '/announcements/create' },
              { label: 'View Members', icon: <Users size={18} />, to: `/collectives/${collectiveSlug}/manage` },
              { label: 'Log Impact', icon: <TreePine size={18} />, to: '/impact' },
              { label: 'Invite to Collective', icon: <Send size={18} />, to: `/collectives/${collectiveSlug}` },
              { label: 'View Reports', icon: <BarChart3 size={18} />, to: '/admin/reports' },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl',
                  'bg-white border border-primary-100 shadow-sm',
                  'text-sm font-medium text-primary-800',
                  'hover:bg-primary-50 hover:text-primary-400 hover:border-primary-200',
                  'transition-colors duration-150',
                )}
              >
                <span className="flex items-center justify-center text-primary-500">
                  {action.icon}
                </span>
                {action.label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Notification centre - pending items */}
        {pendingItems.length > 0 && (
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-3 flex items-center gap-2">
              <Bell size={18} className="text-primary-400" />
              Needs Attention
              <span className="ml-auto text-xs font-normal bg-accent-100 text-primary-800 px-2 py-0.5 rounded-full">
                {pendingItems.length}
              </span>
            </h2>
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/events/${item.id}/impact`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    'bg-warning-50 border border-warning-200',
                    'hover:bg-warning-100 transition-colors duration-150',
                  )}
                >
                  <AlertTriangle size={16} className="text-warning-600 shrink-0" />
                  <span className="text-sm text-warning-900 flex-1">{item.message}</span>
                  <ChevronRight size={16} className="text-warning-400 shrink-0" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upcoming events */}
        <motion.div {...fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-base font-semibold text-primary-800">
              Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-xs text-primary-400 font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
            <div className="space-y-2">
              {data.upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl',
                    'bg-white border border-primary-100 shadow-sm',
                    'hover:shadow-md transition-shadow duration-150',
                  )}
                >
                  {event.cover_image_url ? (
                    <img
                      src={event.cover_image_url}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                      <CalendarDays size={20} className="text-primary-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-primary-800 truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      {new Date(event.start_date).toLocaleDateString('en-AU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    {event.location_name && (
                      <p className="text-xs text-primary-400 truncate">{event.location_name}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-primary-300 shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white text-center">
              <p className="text-sm text-primary-400">No upcoming events</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-2"
                onClick={() => navigate('/events/create')}
                icon={<Plus size={14} />}
              >
                Create Event
              </Button>
            </div>
          )}
        </motion.div>

        {/* Event calendar */}
        <motion.div {...fadeUp}>
          <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
            Event Calendar
          </h2>
          <MiniCalendar collectiveId={collectiveId} />
        </motion.div>

        {/* Member engagement */}
        {engagement && (
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
              Member Engagement
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-success-50 border border-success-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 size={16} className="text-success-600" />
                  <span className="text-xs font-medium text-success-700">Active</span>
                </div>
                <p className="font-heading text-2xl font-bold text-success-900">
                  {engagement.active.length}
                </p>
                <p className="text-xs text-success-600 mt-0.5">
                  Attended event in last 30 days
                </p>
              </div>
              <div className="p-4 rounded-xl bg-warning-50 border border-warning-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle size={16} className="text-warning-600" />
                  <span className="text-xs font-medium text-warning-700">At Risk</span>
                </div>
                <p className="font-heading text-2xl font-bold text-warning-900">
                  {engagement.atRisk.length}
                </p>
                <p className="text-xs text-warning-600 mt-0.5">
                  Inactive 30+ days
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent members */}
        <motion.div {...fadeUp}>
          <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
            Recent Members
          </h2>
          {data?.recentMembers && data.recentMembers.length > 0 ? (
            <div className="space-y-2">
              {data.recentMembers.map((member) => {
                const profile = (member as any).profiles
                return (
                  <Link
                    key={member.id}
                    to={`/profile/${member.user_id}`}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl',
                      'bg-white border border-primary-100',
                      'hover:bg-primary-50 transition-colors duration-150',
                    )}
                  >
                    <Avatar
                      src={profile?.avatar_url}
                      name={profile?.display_name ?? ''}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary-800 truncate">
                        {profile?.display_name ?? 'Unknown'}
                      </p>
                      <p className="text-xs text-primary-400">
                        <UserPlus size={12} className="inline mr-1" />
                        Joined{' '}
                        {new Date(member.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-primary-400 p-3">No recent members</p>
          )}
        </motion.div>

        {/* Invite stats */}
        {inviteStats && (
          <motion.div {...fadeUp}>
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
              Event Invite Stats
            </h2>
            <div className="p-4 rounded-xl bg-white border border-primary-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-primary-400">Acceptance Rate</span>
                <span className="font-heading text-lg font-bold text-primary-400">
                  {inviteStats.acceptanceRate}%
                </span>
              </div>
              <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${inviteStats.acceptanceRate}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Charity impact - link to reports */}
        <motion.div {...fadeUp}>
          <Link
            to="/admin/reports"
            className={cn(
              'flex items-center gap-3 p-4 rounded-xl',
              'bg-gradient-to-r from-white to-white',
              'border border-primary-100',
              'hover:shadow-md transition-shadow duration-150',
            )}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100">
              <BarChart3 size={20} className="text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold text-primary-800">
                Charity Impact Reporting
              </p>
              <p className="text-xs text-primary-400 mt-0.5">
                Generate impact reports for your collective
              </p>
            </div>
            <ChevronRight size={16} className="text-primary-400 shrink-0" />
          </Link>
        </motion.div>
      </motion.div>
    </Page>
  )
}
