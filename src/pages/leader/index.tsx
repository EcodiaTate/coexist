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
  ChevronLeft,
  Bell,
  BarChart3,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  Send,
  TrendingUp,
  Sparkles,
  MapPin,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/skeleton'
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
          .select('id, title, date_start, address, cover_image_url')
          .eq('collective_id', collectiveId)
          .gte('date_start', now.toISOString())
          .order('date_start', { ascending: true })
          .limit(5),
        // Events this month
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('collective_id', collectiveId)
          .gte('date_start', startOfMonth),
        // Hours this month (from event impact via events)
        supabase
          .from('event_impact')
          .select('hours_total, events!inner(collective_id)')
          .eq('events.collective_id' as any, collectiveId)
          .gte('logged_at', startOfMonth),
        // Recent activity - new members + check-ins
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

      // Attendance rate: checked-in / registered across all events
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

        // Survey responses count
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

      // Get the collective's events from the last 30 days
      const { data: recentEvents } = await supabase
        .from('events' as any)
        .select('id')
        .eq('collective_id', collectiveId)
        .gte('date_start', thirtyDaysAgo)

      const recentEventIds = (recentEvents ?? []).map((e: any) => e.id)

      // Members who attended OR registered for any of those events
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

      // Events that have passed but have no impact log
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

function MiniCalendar({
  collectiveId,
}: {
  collectiveId: string | undefined
}) {
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
    <div className="rounded-2xl bg-white/[0.18] backdrop-blur-md p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-bold text-white/90">
          {monthNames[month]} {year}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month - 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 active:scale-95 transition-all duration-150 cursor-pointer select-none"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(year, month + 1))}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:bg-white/15 active:scale-95 transition-all duration-150 cursor-pointer select-none"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-[10px] font-semibold text-white/40 uppercase tracking-wider pb-2">
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
                hasEvent && 'bg-white/25 text-white font-bold',
                isToday && !hasEvent && 'ring-2 ring-white/30 text-white font-semibold',
                isToday && hasEvent && 'bg-white/30 text-white font-bold ring-2 ring-white/30',
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
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
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
      <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-white/60 uppercase tracking-wide">
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
/*  Hero stat card (big, colorful)                                     */
/* ------------------------------------------------------------------ */

function HeroStat({
  value,
  label,
  icon,
  gradient,
}: {
  value: number | string
  label: string
  icon: React.ReactNode
  gradient: string
}) {
  return (
    <div className={cn('rounded-2xl p-4 relative overflow-hidden', gradient)}>
      <div className="absolute top-3 right-3 opacity-15">
        <span className="[&>svg]:w-10 [&>svg]:h-10">{icon}</span>
      </div>
      <p className="font-heading text-3xl font-extrabold text-white tabular-nums leading-none">
        {value}
      </p>
      <p className="mt-1.5 text-xs font-semibold text-white/80">{label}</p>
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

  // Get user's primary collective where they are leader
  const collectiveId = leaderCtx.collectiveId ?? useMemo(() => {
    const membership = collectiveRoles.find(
      (m) => ['leader', 'co_leader', 'assist_leader'].includes(m.role),
    )
    return membership?.collective_id
  }, [collectiveRoles])

  const { data, isLoading } = useLeaderDashboard(collectiveId)
  const { data: collectiveDetail } = useCollective(collectiveId)
  const collectiveSlug = leaderCtx.collectiveSlug ?? collectiveDetail?.slug ?? collectiveId
  const { data: engagement } = useEngagementScores(collectiveId)
  const { data: pendingItems = [] } = usePendingItems(collectiveId)
  const { data: inviteStats } = useEventInviteStats(collectiveId)

  useLeaderHeader('Dashboard')

  // Wrapper: when inside leader layout, no Page/Header needed
  const Wrapper = isInLeaderLayout
    ? ({ children }: { children: React.ReactNode }) => <>{children}</>
    : ({ children }: { children: React.ReactNode }) => <Page header={<Header title="Leader Dashboard" back />}>{children}</Page>

  if (isLoading) {
    return (
      <Wrapper>
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
    { label: 'Create Event', icon: <Plus size={20} />, to: '/leader/events/create', bg: 'bg-primary-500', text: 'text-white' },
    { label: 'Announcement', icon: <Megaphone size={20} />, to: '/leader/announcements', bg: 'bg-secondary-600', text: 'text-white' },
    { label: 'Members', icon: <Users size={20} />, to: '/leader/members', bg: 'bg-primary-500', text: 'text-white' },
    { label: 'Log Impact', icon: <TreePine size={20} />, to: '/leader/impact', bg: 'bg-bark-500', text: 'text-white' },
    { label: 'Invite', icon: <Send size={20} />, to: '/leader/invite', bg: 'bg-sky-500', text: 'text-white' },
    { label: 'Reports', icon: <BarChart3 size={20} />, to: '/leader/reports', bg: 'bg-plum-500', text: 'text-white' },
  ]

  return (
    <Wrapper>
      {/* ── Full-page branded background ── */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Layered background — Co-Exist olive green palette */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500 via-secondary-700 to-primary-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_70%_-15%,var(--color-primary-400)/0.35,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_10%_110%,var(--color-accent-400)/0.20,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_40%,var(--color-primary-500)/0.12,transparent_70%)]" />

        {/* ── Big glowing orbs ── */}
        {/* Top-left warm glow */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], x: [0, 20, 0], y: [0, -12, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -left-28 -top-28 w-[550px] h-[550px] rounded-full bg-primary-400/25 blur-3xl"
        />
        {/* Right mid orb */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], x: [0, -15, 0], y: [0, 18, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute -right-32 top-[35%] w-[450px] h-[450px] rounded-full bg-accent-500/18 blur-3xl"
        />
        {/* Bottom glow */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.18, 0.3, 0.18] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute right-[10%] -bottom-20 w-[600px] h-[350px] rounded-full bg-primary-500/20 blur-3xl"
        />
        {/* Small success accent */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.12, 0.25, 0.12] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute right-[20%] top-[8%] w-[200px] h-[200px] rounded-full bg-success-500/15 blur-2xl"
        />
        {/* Center-left accent */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], y: [0, -12, 0] }}
          transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute left-[10%] top-[60%] w-[280px] h-[280px] rounded-full bg-primary-300/15 blur-2xl"
        />

        {/* ── Floating leaf SVGs ── */}
        <motion.svg
          animate={{ y: [0, -10, 0], rotate: [0, 10, 0], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-[10%] top-[12%] w-14 h-14 text-white/15"
          viewBox="0 0 24 24" fill="currentColor"
        >
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.75.75 1.76 1.16 2.84 1.16 3.5 0 7-3.13 7-5.95 0-1.56-.79-2.97-2-3.97A7.84 7.84 0 0017 8z" />
        </motion.svg>
        <motion.svg
          animate={{ y: [0, 12, 0], rotate: [0, -15, 0], opacity: [0.06, 0.13, 0.06] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute left-[15%] top-[50%] w-20 h-20 text-white/10"
          viewBox="0 0 24 24" fill="currentColor"
        >
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.75.75 1.76 1.16 2.84 1.16 3.5 0 7-3.13 7-5.95 0-1.56-.79-2.97-2-3.97A7.84 7.84 0 0017 8z" />
        </motion.svg>
        <motion.svg
          animate={{ y: [0, -7, 0], rotate: [0, 12, 0], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          className="absolute right-[35%] bottom-[10%] w-16 h-16 text-white/8"
          viewBox="0 0 24 24" fill="currentColor"
        >
          <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.71c.75.75 1.76 1.16 2.84 1.16 3.5 0 7-3.13 7-5.95 0-1.56-.79-2.97-2-3.97A7.84 7.84 0 0017 8z" />
        </motion.svg>

        {/* ── Floating particles ── */}
        <motion.div
          animate={{ y: [0, -10, 0], x: [0, 5, 0], opacity: [0.25, 0.55, 0.25] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute right-[15%] top-[20%] w-2 h-2 rounded-full bg-white/30"
        />
        <motion.div
          animate={{ y: [0, 8, 0], x: [0, -4, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute left-[10%] top-[30%] w-1.5 h-1.5 rounded-full bg-white/25"
        />
        <motion.div
          animate={{ y: [0, -6, 0], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute right-[30%] top-[55%] w-2.5 h-2.5 rounded-full bg-primary-200/35"
        />
        <motion.div
          animate={{ y: [0, 7, 0], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 3.5 }}
          className="absolute left-[22%] bottom-[18%] w-2 h-2 rounded-full bg-white/20"
        />
        <motion.div
          animate={{ y: [0, -5, 0], x: [0, 3, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          className="absolute left-[55%] top-[5%] w-1.5 h-1.5 rounded-full bg-success-300/30"
        />
        <motion.div
          animate={{ y: [0, 10, 0], x: [0, -5, 0], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute right-[5%] bottom-[40%] w-3 h-3 rounded-full bg-primary-200/20"
        />

        {/* Content */}
        <motion.div
          className="relative z-10 px-6 py-6 space-y-6 pb-12"
          variants={shouldReduceMotion ? undefined : stagger}
          initial="hidden"
          animate="visible"
        >
          {/* ── Full-screen hero title ── */}
          <motion.div
            variants={shouldReduceMotion ? undefined : fadeUp}
            className="flex flex-col items-center justify-center text-center h-dvh -mt-6 -mb-6"
          >
            <p className="text-xs font-semibold text-white/50 uppercase tracking-[0.2em]">
              Collective Dashboard
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2 drop-shadow-md">
              {collectiveDetail?.name ?? 'Your Collective'}
            </h1>
          </motion.div>

          {/* ── Hero stats ── */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
            <HeroStat
              value={data?.activeMembers ?? 0}
              label="Active Members"
              icon={<Users />}
              gradient="bg-white/[0.20] backdrop-blur-md"
            />
            <HeroStat
              value={data?.upcomingEvents?.length ?? 0}
              label="Upcoming Events"
              icon={<CalendarDays />}
              gradient="bg-white/[0.20] backdrop-blur-md"
            />
            <HeroStat
              value={data?.hoursThisMonth ?? 0}
              label="Hours This Month"
              icon={<Clock />}
              gradient="bg-white/[0.20] backdrop-blur-md"
            />
            <HeroStat
              value={data?.eventsThisMonth ?? 0}
              label="Events This Month"
              icon={<CalendarCheck />}
              gradient="bg-white/[0.20] backdrop-blur-md"
            />
          </motion.div>

          {/* ── Attendance & survey row ── */}
          {((data?.attendanceRate ?? 0) > 0 || (data?.surveyResponseCount ?? 0) > 0) && (
            <motion.div variants={fadeUp} className="flex gap-3">
              {(data?.attendanceRate ?? 0) > 0 && (
                <div className="flex-1 rounded-2xl bg-white/[0.18] backdrop-blur-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-success-300" />
                    </div>
                    <span className="text-xs font-semibold text-white/70">Attendance</span>
                  </div>
                  <p className="font-heading text-2xl font-extrabold text-white tabular-nums">
                    {data?.attendanceRate}%
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
                <div className="flex-1 rounded-2xl bg-white/[0.18] backdrop-blur-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                      <Send size={16} className="text-white/80" />
                    </div>
                    <span className="text-xs font-semibold text-white/70">Surveys</span>
                  </div>
                  <p className="font-heading text-2xl font-extrabold text-white tabular-nums">
                    {data?.surveyResponseCount}
                  </p>
                  <p className="mt-1 text-[11px] text-white/50">responses collected</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Quick actions ── */}
          <motion.div variants={fadeUp}>
            <SectionHeader>Quick Actions</SectionHeader>
            <div className="grid grid-cols-3 gap-2.5">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex flex-col items-center gap-2 rounded-2xl bg-white/[0.18] backdrop-blur-md p-4 hover:bg-white/[0.25] active:scale-[0.97] transition-all duration-150"
                >
                  <div className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-xl transition-transform group-hover:scale-105',
                    'bg-white/20 text-white',
                  )}>
                    {action.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-white/80 text-center leading-tight">
                    {action.label}
                  </span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* ── Needs attention ── */}
          {pendingItems.length > 0 && (
            <motion.div variants={fadeUp}>
              <SectionHeader icon={<Bell size={14} />}>
                Needs Attention
              </SectionHeader>
              <div className="rounded-2xl bg-warning-500/25 backdrop-blur-md overflow-hidden">
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
          <motion.div variants={fadeUp}>
            <SectionHeader action={{ label: 'View all', to: '/leader/events' }}>
              Upcoming Events
            </SectionHeader>
            {data?.upcomingEvents && data.upcomingEvents.length > 0 ? (
              <div className="space-y-2.5">
                {data.upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.18] backdrop-blur-md hover:bg-white/[0.25] active:scale-[0.99] transition-all duration-150"
                  >
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="w-14 h-14 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <CalendarDays size={22} className="text-white/60" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm font-bold text-white truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-white/60 mt-0.5 font-medium">
                        {new Date(event.date_start).toLocaleDateString('en-AU', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      {event.address && (
                        <p className="text-[11px] text-white/40 truncate mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {event.address}
                        </p>
                      )}
                    </div>
                    <ChevronRight size={16} className="text-white/30 shrink-0" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-white/[0.18] backdrop-blur-md text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays size={24} className="text-white/60" />
                </div>
                <p className="text-sm font-medium text-white/70 mb-3">No upcoming events</p>
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
          <motion.div variants={fadeUp}>
            <SectionHeader icon={<CalendarCheck size={14} />}>
              Event Calendar
            </SectionHeader>
            <MiniCalendar collectiveId={collectiveId} />
          </motion.div>

          {/* ── Member engagement ── */}
          {engagement && (
            <motion.div variants={fadeUp}>
              <SectionHeader>
                Member Engagement
              </SectionHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-success-500/25 backdrop-blur-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-success-400/20 flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-success-300" />
                    </div>
                  </div>
                  <p className="font-heading text-3xl font-extrabold text-white leading-none">
                    {engagement.active.length}
                  </p>
                  <p className="text-xs font-semibold text-success-300 mt-1.5">Active</p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Last 30 days
                  </p>
                </div>
                <div className="rounded-2xl bg-warning-500/25 backdrop-blur-md p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-warning-400/20 flex items-center justify-center">
                      <AlertTriangle size={14} className="text-warning-300" />
                    </div>
                  </div>
                  <p className="font-heading text-3xl font-extrabold text-white leading-none">
                    {engagement.atRisk.length}
                  </p>
                  <p className="text-xs font-semibold text-warning-300 mt-1.5">At Risk</p>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Inactive 30+ days
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Recent members ── */}
          <motion.div variants={fadeUp}>
            <SectionHeader icon={<UserPlus size={14} />}>
              New Members
            </SectionHeader>
            {data?.recentMembers && data.recentMembers.length > 0 ? (
              <div className="rounded-2xl bg-white/[0.18] backdrop-blur-md overflow-hidden">
                {data.recentMembers.map((member, idx) => {
                  const profile = (member as any).profiles
                  return (
                    <Link
                      key={member.id}
                      to={`/profile/${member.user_id}`}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        'hover:bg-white/[0.06] transition-colors duration-150',
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
                        <p className="text-[11px] text-white/50 mt-0.5">
                          Joined{' '}
                          {new Date(member.created_at).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-white/30 shrink-0" />
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-white/50 bg-white/[0.18] backdrop-blur-md rounded-2xl p-4">No recent members</p>
            )}
          </motion.div>

          {/* ── Invite acceptance ── */}
          {inviteStats && inviteStats.acceptanceRate > 0 && (
            <motion.div variants={fadeUp}>
              <SectionHeader>Invite Acceptance</SectionHeader>
              <div className="rounded-2xl bg-white/[0.18] backdrop-blur-md p-5">
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Rate</p>
                    <p className="font-heading text-3xl font-extrabold text-white tabular-nums leading-none mt-1">
                      {inviteStats.acceptanceRate}%
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                    <TrendingUp size={18} className="text-white/80" />
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
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
          <motion.div variants={fadeUp}>
            <Link
              to="/leader/reports"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.20] backdrop-blur-md hover:bg-white/[0.28] active:scale-[0.99] transition-all duration-150"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/15">
                <BarChart3 size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm font-bold text-white">
                  Impact Reports
                </p>
                <p className="text-xs text-white/50 mt-0.5">
                  Generate reports for your collective
                </p>
              </div>
              <ChevronRight size={16} className="text-white/30 shrink-0" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </Wrapper>
  )
}
