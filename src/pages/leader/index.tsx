import { useState, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Users,
    CalendarDays,
    Clock,
    CalendarCheck,
    Plus,
    Megaphone,
    TreePine,
    ChevronRight,
    ChevronLeft,
    Bell,
    BarChart3,
    UserPlus,
    CheckCircle2,
    AlertTriangle,
    Send,
    TrendingUp,
    MapPin,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { EmptyState } from '@/components/empty-state'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCollective } from '@/hooks/use-collective'
import { useLeaderHeader, useLeaderContext, useIsLeaderLayout } from '@/components/leader-layout'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { supabase } from '@/lib/supabase'
import { PullToRefresh } from '@/components/pull-to-refresh'

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

      const [
        membersRes,
        upcomingEventsRes,
        monthEventsRes,
        monthHoursRes,
        recentActivityRes,
      ] = await Promise.all([
        supabase
          .from('collective_members')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId),
        supabase
          .from('events' as any)
          .select('id, title, date_start, address, cover_image_url')
          .eq('collective_id', collectiveId)
          .gte('date_start', now.toISOString())
          .order('date_start', { ascending: true })
          .limit(5),
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId)
          .gte('date_start', startOfMonth),
        supabase
          .from('event_impact')
          .select('hours_total, events!inner(collective_id)')
          .eq('events.collective_id' as any, collectiveId)
          .gte('logged_at', startOfMonth),
        supabase
          .from('collective_members' as any)
          .select('id, user_id, created_at, profiles(display_name, avatar_url)')
          .eq('collective_id', collectiveId)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      const totalHours = ((monthHoursRes.data ?? []) as any[]).reduce(
        (sum: number, row: any) => sum + (row.hours_total ?? 0),
        0,
      )

      const { data: allEventIds } = await supabase
        .from('events')
        .select('id')
        .eq('collective_id', collectiveId)
        .lt('date_start', now.toISOString())

      let attendanceRate = 0
      let surveyResponseCount = 0
      const eventIds = (allEventIds ?? []).map((e) => e.id)

      if (eventIds.length > 0) {
        const { count: totalReg } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .in('status', ['registered', 'attended'])

        const { count: totalAttended } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)
          .eq('status', 'attended')

        if (totalReg && totalReg > 0) {
          attendanceRate = Math.round(((totalAttended ?? 0) / totalReg) * 100)
        }

        const { count: surveyCount } = await (supabase as any)
          .from('post_event_survey_responses')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds)

        surveyResponseCount = surveyCount ?? 0
      }

      return {
        activeMembers: membersRes.count ?? 0,
        upcomingEvents: (upcomingEventsRes.data ?? []) as any[],
        eventsThisMonth: monthEventsRes.count ?? 0,
        hoursThisMonth: Math.round(totalHours),
        recentMembers: (recentActivityRes.data ?? []) as any[],
        attendanceRate,
        surveyResponseCount,
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

      const { data: recentEvents } = await supabase
        .from('events' as any)
        .select('id')
        .eq('collective_id', collectiveId)
        .gte('date_start', thirtyDaysAgo)

      const recentEventIds = (recentEvents ?? []).map((e: any) => e.id)

      let activeUserIds = new Set<string>()
      if (recentEventIds.length > 0) {
        const { data: activeMembers } = await supabase
          .from('event_registrations')
          .select('user_id')
          .in('event_id', recentEventIds)
          .in('status', ['attended', 'registered'])

        activeUserIds = new Set((activeMembers ?? []).map((r) => r.user_id))
      }

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

      const { data: pastEvents } = await supabase
        .from('events' as any)
        .select('id, title, date_start')
        .eq('collective_id', collectiveId)
        .lt('date_start', new Date().toISOString())
        .order('date_start', { ascending: false })
        .limit(10)

      const events = (pastEvents ?? []) as any[]
      if (!events.length) return []

      const { data: loggedEvents } = await supabase
        .from('event_impact')
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
          date: e.date_start,
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
        .select('id, title, date_start')
        .eq('collective_id', collectiveId)
        .gte('date_start', start.toISOString())
        .lte('date_start', end.toISOString())

      return (data ?? []) as any[]
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

function MiniCalendar({ collectiveId }: { collectiveId: string | undefined }) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data: events = [] } = useEventCalendar(collectiveId, currentMonth)

  const eventDays = useMemo(
    () => new Set(events.map((e) => new Date(e.date_start).getDate())),
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
    <div className="rounded-2xl bg-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-bold text-white/90">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month - 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 active:scale-95 transition-[background-color,transform] duration-150 cursor-pointer select-none"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month + 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.08] text-white/70 hover:bg-white/15 active:scale-95 transition-[background-color,transform] duration-150 cursor-pointer select-none"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[11px] font-semibold text-white/40 uppercase tracking-wider pb-2">
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
                'relative flex items-center justify-center w-8 h-8 mx-auto rounded-lg text-xs transition-colors',
                hasEvent && 'bg-white/20 text-white font-bold',
                isToday && !hasEvent && 'ring-2 ring-white/30 text-white font-semibold',
                isToday && hasEvent && 'bg-white/25 text-white font-bold ring-2 ring-white/30',
                !isToday && !hasEvent && 'text-white/60 font-medium',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionHeader({
  children,
  action,
  icon,
}: {
  children: React.ReactNode
  action?: { label: string; to: string }
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-white/50 uppercase tracking-widest">
        {icon && <span className="text-white/50">{icon}</span>}
        {children}
      </h2>
      {action && (
        <Link
          to={action.to}
          className="text-xs text-white/50 font-semibold hover:text-white/70 transition-colors"
        >
          {action.label}
        </Link>
      )}
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
  const isInLeaderLayout = useIsLeaderLayout()
  const leaderCtx = useLeaderContext()
  const queryClient = useQueryClient()

  const collectiveId = leaderCtx.collectiveId ?? useMemo(() => {
    const membership = collectiveRoles.find(
      (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
    )
    return membership?.collective_id
  }, [collectiveRoles])

  const { data, isLoading } = useLeaderDashboard(collectiveId)

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['leader-dashboard', collectiveId] })
  }, [queryClient, collectiveId])
  const showLoading = useDelayedLoading(isLoading)
  const { data: collectiveDetail } = useCollective(collectiveId)
  const collectiveSlug = leaderCtx.collectiveSlug ?? collectiveDetail?.slug ?? collectiveId
  const { data: engagement } = useEngagementScores(collectiveId)
  const { data: pendingItems = [] } = usePendingItems(collectiveId)
  const { data: inviteStats } = useEventInviteStats(collectiveId)

  // Stable ref so useLeaderHeader doesn't re-fire on every render
  const fullBleedOpts = useRef({ fullBleed: true as const }).current
  useLeaderHeader('Dashboard', fullBleedOpts)

  // Stable Wrapper - useMemo keeps the same component identity across renders
  const Wrapper = useMemo(() => {
    if (isInLeaderLayout) {
      return ({ children }: { children: React.ReactNode }) => <>{children}</>
    }
    return ({ children }: { children: React.ReactNode }) => <Page header={<Header title="Leader Dashboard" back />}>{children}</Page>
  }, [isInLeaderLayout])

  if (showLoading) {
    return (
      <Wrapper>
        <div className="relative min-h-dvh overflow-x-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary-500 via-secondary-700 to-primary-900" />
          <div className="absolute -left-[10%] -top-[10%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full bg-white/[0.06]" />
          <div className="absolute -right-[18%] bottom-[2%] w-[65vw] h-[65vw] max-w-[650px] max-h-[650px] rounded-full border border-white/[0.08]" />

          <div className="relative z-10 px-6 space-y-6 pb-20" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 3.5rem)' }}>
            <div className="flex flex-col items-center pb-2 space-y-2 animate-pulse">
              <div className="h-3 w-28 rounded-full bg-white/[0.06]" />
              <div className="h-8 w-48 rounded-xl bg-white/[0.08]" />
            </div>

            <div className="rounded-2xl bg-white/[0.06] overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-y divide-white/[0.06]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-5 flex flex-col items-center gap-2 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06]" />
                    <div className="h-8 w-14 rounded-lg bg-white/[0.05]" />
                    <div className="h-2.5 w-20 rounded-full bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.05] p-4 animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="w-10 h-10 rounded-lg bg-white/[0.06]" />
                  <div className="h-2 w-12 rounded-full bg-white/[0.04]" />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="w-14 h-14 rounded-xl bg-white/[0.06] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-white/[0.05]" />
                    <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Wrapper>
    )
  }

  if (!collectiveId) {
    return (
      <Wrapper>
        <EmptyState
          illustration="empty"
          title="No collective found"
          description="You need to be a leader, co-leader, or assist-leader of a collective to access this dashboard."
          action={{ label: 'Explore Collectives', to: '/collectives' }}
        />
      </Wrapper>
    )
  }

  const quickActions = [
    { label: 'Create Event', icon: <Plus size={20} />, to: '/leader/events/create', bg: 'bg-success-600', text: 'text-white' },
    { label: 'Announcement', icon: <Megaphone size={20} />, to: '/leader/announcements', bg: 'bg-secondary-500', text: 'text-white' },
    { label: 'Members', icon: <Users size={20} />, to: '/leader/members', bg: 'bg-primary-500', text: 'text-white' },
    { label: 'Log Impact', icon: <TreePine size={20} />, to: '/leader/impact', bg: 'bg-bark-500', text: 'text-white' },
    { label: 'Invite', icon: <Send size={20} />, to: '/leader/invite', bg: 'bg-sky-600', text: 'text-white' },
    { label: 'Reports', icon: <BarChart3 size={20} />, to: '/leader/reports', bg: 'bg-plum-500', text: 'text-white' },
  ]

  return (
    <Wrapper>
      <PullToRefresh
        onRefresh={handleRefresh}
        dark
        className="min-h-dvh"
        background={
          <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-500 via-secondary-700 to-primary-900" />
            <div className="absolute -left-[10%] -top-[10%] w-[50vw] h-[50vw] max-w-[450px] max-h-[450px] rounded-full bg-white/[0.06] animate-[breathe_16s_ease-in-out_infinite]" />
            <div className="absolute -right-[18%] bottom-[2%] w-[65vw] h-[65vw] max-w-[650px] max-h-[650px] rounded-full border border-white/[0.08] animate-[breathe_20s_ease-in-out_infinite]" />
            <div className="absolute -right-[12%] bottom-[8%] w-[45vw] h-[45vw] max-w-[450px] max-h-[450px] rounded-full border border-white/[0.06] animate-[breathe_20s_ease-in-out_0.5s_infinite]" />
            <div className="absolute -right-[5%] -top-[12%] w-[40vw] h-[40vw] max-w-[380px] max-h-[380px] rounded-full border border-white/[0.05] animate-[breathe_18s_ease-in-out_2s_infinite]" />
            <div className="absolute right-[5%] top-[40%] w-[80px] h-[80px] rounded-full bg-white/[0.04]" />
            <div className="absolute left-[20%] top-[15%] w-2 h-2 rounded-full bg-white/30 animate-[float_4s_ease-in-out_infinite]" />
            <div className="absolute right-[22%] top-[25%] w-1.5 h-1.5 rounded-full bg-white/25 animate-[floatDown_5s_ease-in-out_2s_infinite]" />
            <div className="absolute left-[45%] bottom-[18%] w-2 h-2 rounded-full bg-white/20 animate-[float_6s_ease-in-out_3s_infinite]" />
          </div>
        }
      >
        {/* ── Content ── */}
        <motion.div
          className="relative z-10 px-6 space-y-6 pb-20"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 3.5rem)' }}
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── Hero title ── */}
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className="flex flex-col items-center justify-center text-center pb-2"
          >
            <p className="text-xs font-semibold text-white/40 uppercase tracking-[0.2em]">
              Leader Dashboard
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2">
              {(collectiveDetail?.name ?? 'Your Collective').replace(/\s+Collective$/i, '')}
            </h1>
          </motion.div>

          {/* ── Hero stats ── */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <div className="rounded-2xl bg-white/[0.06] overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-y divide-white/[0.06]">
                <div className="flex flex-col items-center text-center py-5 px-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] text-white/70 mb-2.5">
                    <Users size={20} />
                  </span>
                  <p className="text-3xl font-bold text-white tabular-nums leading-none">
                    {data?.activeMembers ?? 0}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-white/45 uppercase tracking-wider">Active Members</p>
                </div>
                <div className="flex flex-col items-center text-center py-5 px-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] text-white/70 mb-2.5">
                    <CalendarDays size={20} />
                  </span>
                  <p className="text-3xl font-bold text-white tabular-nums leading-none">
                    {data?.upcomingEvents?.length ?? 0}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-white/45 uppercase tracking-wider">Upcoming Events</p>
                </div>
                <div className="flex flex-col items-center text-center py-5 px-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] text-white/70 mb-2.5">
                    <Clock size={20} />
                  </span>
                  <p className="text-3xl font-bold text-white tabular-nums leading-none">
                    {data?.hoursThisMonth ?? 0}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-white/45 uppercase tracking-wider">Hours This Month</p>
                </div>
                <div className="flex flex-col items-center text-center py-5 px-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] text-white/70 mb-2.5">
                    <CalendarCheck size={20} />
                  </span>
                  <p className="text-3xl font-bold text-white tabular-nums leading-none">
                    {data?.eventsThisMonth ?? 0}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-white/45 uppercase tracking-wider">Events This Month</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Attendance & survey ── */}
          {((data?.attendanceRate ?? 0) > 0 || (data?.surveyResponseCount ?? 0) > 0) && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <div className="rounded-2xl bg-white/[0.06] overflow-hidden">
                <div className={cn(
                  'grid divide-x divide-white/[0.06]',
                  (data?.attendanceRate ?? 0) > 0 && (data?.surveyResponseCount ?? 0) > 0
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1',
                )}>
                  {(data?.attendanceRate ?? 0) > 0 && (
                    <div className="p-4 pb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center">
                          <CheckCircle2 size={14} className="text-success-300" />
                        </div>
                        <span className="text-xs font-semibold text-white/60">Attendance</span>
                      </div>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {data?.attendanceRate}%
                      </p>
                      <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-success-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${data?.attendanceRate}%` }}
                          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                  {(data?.surveyResponseCount ?? 0) > 0 && (
                    <div className="p-4 pb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.08] flex items-center justify-center">
                          <Send size={14} className="text-white/70" />
                        </div>
                        <span className="text-xs font-semibold text-white/60">Surveys</span>
                      </div>
                      <p className="text-2xl font-bold text-white tabular-nums">
                        {data?.surveyResponseCount}
                      </p>
                      <p className="mt-1 text-[11px] text-white/40">responses collected</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Quick actions ── */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader>Quick Actions</SectionHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex flex-col items-center gap-2 rounded-xl bg-white/[0.06] p-3 hover:bg-white/[0.12] active:scale-[0.96] transition-[background-color,transform] duration-150"
                >
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg transition-transform group-hover:scale-105',
                    action.bg, action.text,
                  )}>
                    {action.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-white/70 text-center leading-tight">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ── Needs attention ── */}
          {pendingItems.length > 0 && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <SectionHeader icon={<Bell size={14} />}>
                Needs Attention
              </SectionHeader>
              <div className="rounded-2xl bg-warning-500/20 overflow-hidden">
                {pendingItems.map((item, idx) => (
                  <Link
                    key={item.id}
                    to={`/events/${item.id}/impact`}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3.5',
                      'hover:bg-warning-400/10 transition-colors duration-150',
                      idx > 0 && 'border-t border-warning-400/10',
                    )}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning-400/20 shrink-0">
                      <AlertTriangle size={14} className="text-warning-300" />
                    </div>
                    <span className="text-sm text-white/90 flex-1 font-medium">{item.message}</span>
                    <ChevronRight size={14} className="text-warning-300/60 shrink-0" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Upcoming events ── */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader action={{ label: 'View all', to: '/leader/events' }}>
              Upcoming Events
            </SectionHeader>
            {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {data.upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.06] hover:bg-white/[0.10] active:scale-[0.99] transition-[background-color,transform] duration-150"
                  >
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-white/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm font-bold text-white truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-white/50 mt-0.5 font-medium">
                        {new Date(event.date_start).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      {event.address && (
                        <p className="text-[11px] text-white/35 truncate mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {event.address}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-white/25 shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white/[0.06] text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/[0.08] flex items-center justify-center mx-auto mb-3">
                  <CalendarDays size={24} className="text-white/50" />
                </div>
                <p className="text-sm font-medium text-white/60 mb-3">No upcoming events</p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/leader/events/create')}
                  icon={<Plus size={14} />}
                >
                  Create Event
                </Button>
              </div>
            )}
          </motion.div>

          {/* ── Calendar ── */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader icon={<CalendarCheck size={14} />}>
              Event Calendar
            </SectionHeader>
            <MiniCalendar collectiveId={collectiveId} />
          </motion.div>

          {/* ── Member engagement ── */}
          {engagement && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <SectionHeader>Member Engagement</SectionHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-success-500/15 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-success-400/20 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-success-300" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white leading-none tabular-nums">
                    {engagement.active.length}
                  </p>
                  <p className="text-xs font-semibold text-success-300 mt-1.5">Active</p>
                  <p className="text-[11px] text-white/35 mt-0.5">Last 30 days</p>
                </div>
                <div className="rounded-2xl bg-warning-500/15 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-warning-400/20 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-warning-300" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-white leading-none tabular-nums">
                    {engagement.atRisk.length}
                  </p>
                  <p className="text-xs font-semibold text-warning-300 mt-1.5">At Risk</p>
                  <p className="text-[11px] text-white/35 mt-0.5">Inactive 30+ days</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Recent members ── */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <SectionHeader icon={<UserPlus size={14} />}>
              New Members
            </SectionHeader>
            {data?.recentMembers && data.recentMembers.length > 0 ? (
              <div className="rounded-2xl bg-white/[0.06] overflow-hidden">
                {data.recentMembers.map((member, idx) => {
                  const profile = (member as any).profiles
                  return (
                    <Link
                      key={member.id}
                      to={`/profile/${member.user_id}`}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        'hover:bg-white/[0.04] transition-colors duration-150',
                        idx > 0 && 'border-t border-white/[0.06]',
                      )}
                    >
                      <Avatar
                        src={profile?.avatar_url}
                        name={profile?.display_name ?? ''}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {profile?.display_name ?? 'Unknown'}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          Joined{' '}
                          {new Date(member.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-white/25 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-white/40 bg-white/[0.06] rounded-2xl p-4">No recent members</p>
            )}
          </motion.div>

          {/* ── Invite acceptance ── */}
          {inviteStats && inviteStats.acceptanceRate > 0 && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <SectionHeader>Invite Acceptance</SectionHeader>
              <div className="rounded-2xl bg-white/[0.06] p-5">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Rate</p>
                    <p className="text-3xl font-bold text-white tabular-nums leading-none mt-1">
                      {inviteStats.acceptanceRate}%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                    <TrendingUp size={18} className="text-white/70" />
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary-300 to-primary-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${inviteStats.acceptanceRate}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Reports link ── */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <Link
              to="/leader/reports"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.10] hover:bg-white/[0.16] active:scale-[0.99] transition-[background-color,transform] duration-150"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.08]">
                <BarChart3 size={22} className="text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-bold text-white">
                  Impact Reports
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Generate reports for your collective
                </p>
              </div>
              <ChevronRight size={16} className="text-white/25 shrink-0" />
            </Link>
          </motion.div>
        </motion.div>
      </PullToRefresh>
    </Wrapper>
  )
}
