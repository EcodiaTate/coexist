import { Fragment, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Users,
    MapPin,
    CalendarDays,
    TreePine,
    TrendingUp,
    Clock,
    Waves,
    Leaf,
    Eye,
    UserCheck,
    ClipboardCheck,
    ArrowUpRight,
    Globe,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Skeleton } from '@/components/skeleton'
import { Dropdown } from '@/components/dropdown'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useCountUp } from '@/components/stat-card'

/* ------------------------------------------------------------------ */
/*  Date range helpers                                                 */
/* ------------------------------------------------------------------ */

type DateRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

function getDateRangeStart(range: DateRange): string | null {
  const now = new Date()
  switch (range) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    case 'quarter':
      return new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString()
    case 'year':
      return new Date(now.getFullYear(), 0, 1).toISOString()
    case 'all':
      return null
  }
}

const dateRangeOptions = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
]

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */

function useAdminOverview(dateRange: DateRange) {
  const rangeStart = getDateRangeStart(dateRange)

  return useQuery({
    queryKey: ['admin-overview', dateRange],
    queryFn: async () => {
      const [
        totalMembersRes,
        totalCollectivesRes,
        totalEventsRes,
        totalImpactRes,
        periodMembersRes,
        periodEventsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }).lt('date_start', new Date().toISOString()),
        (() => {
          let q = supabase.from('event_impact').select('trees_planted, hours_total, rubbish_kg, coastline_cleaned_m, area_restored_sqm, native_plants, wildlife_sightings')
          if (rangeStart) q = q.gte('logged_at', rangeStart)
          return q
        })(),
        rangeStart
          ? supabase
              .from('profiles')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', rangeStart)
          : Promise.resolve({ count: 0 }),
        rangeStart
          ? supabase
              .from('events')
              .select('id', { count: 'exact', head: true })
              .gte('created_at', rangeStart)
              .lt('date_start', new Date().toISOString())
          : Promise.resolve({ count: 0 }),
      ])

      const impact = (totalImpactRes.data ?? []) as any[]
      const totalTrees = impact.reduce((s: number, r: any) => s + (r.trees_planted ?? 0), 0)
      const totalHours = impact.reduce((s: number, r: any) => s + (r.hours_total ?? 0), 0)
      const totalRubbish = impact.reduce((s: number, r: any) => s + (r.rubbish_kg ?? 0), 0)
      const totalCoastline = impact.reduce((s: number, r: any) => s + (r.coastline_cleaned_m ?? 0), 0)
      const totalArea = impact.reduce((s: number, r: any) => s + (r.area_restored_sqm ?? 0), 0)
      const totalNativePlants = impact.reduce((s: number, r: any) => s + (r.native_plants ?? 0), 0)
      const totalWildlife = impact.reduce((s: number, r: any) => s + (r.wildlife_sightings ?? 0), 0)

      const { count: totalRegistered } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .in('status', ['registered', 'attended'])
      const { count: totalAttended } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'attended')
      const attendanceRate = totalRegistered && totalRegistered > 0
        ? Math.round(((totalAttended ?? 0) / totalRegistered) * 100)
        : 0

      const { count: surveyResponses } = await (supabase as any)
        .from('post_event_survey_responses')
        .select('id', { count: 'exact', head: true })

      return {
        totalMembers: totalMembersRes.count ?? 0,
        totalCollectives: totalCollectivesRes.count ?? 0,
        totalEvents: totalEventsRes.count ?? 0,
        totalTrees,
        totalHours: Math.round(totalHours),
        totalRubbish: Math.round(totalRubbish),
        totalCoastline: Math.round(totalCoastline),
        totalArea: Math.round(totalArea),
        totalNativePlants,
        totalWildlife,
        attendanceRate,
        surveyResponses: surveyResponses ?? 0,
        periodMembers: periodMembersRes.count ?? 0,
        periodEvents: periodEventsRes.count ?? 0,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useTrendData() {
  return useQuery({
    queryKey: ['admin-trends'],
    queryFn: async () => {
      const months: { month: string; members: number; events: number }[] = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        const monthLabel = start.toLocaleDateString('en-AU', {
          month: 'short',
          year: '2-digit',
        })

        const [membersRes, eventsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .gte('date_start', start.toISOString())
            .lte('date_start', new Date(Math.min(end.getTime(), now.getTime())).toISOString()),
        ])

        months.push({
          month: monthLabel,
          members: membersRes.count ?? 0,
          events: eventsRes.count ?? 0,
        })
      }

      return months
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Cinematic bar chart                                                */
/* ------------------------------------------------------------------ */

function TrendChart({
  data,
  dataKey,
  label,
  gradient,
  icon,
}: {
  data: { month: string; [key: string]: any }[]
  dataKey: string
  label: string
  gradient: string
  icon: React.ReactNode
}) {
  const shouldReduceMotion = useReducedMotion()
  const values = data.map((d) => d[dataKey] as number)
  const max = Math.max(...values, 1)
  const mean = values.reduce((a, b) => a + b, 0) / values.length || 1
  const scale = max > 0 ? Math.max(max, mean * 1.65) : 1
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative rounded-2xl p-5 sm:p-6"
    >
      {/* SVG light glare */}
      <svg className="absolute top-2 left-6 w-28 h-16 opacity-[0.06] pointer-events-none" viewBox="0 0 112 64" fill="none">
        <ellipse cx="56" cy="16" rx="56" ry="28" fill="white" />
      </svg>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/15 text-white/90">
              {icon}
            </span>
            <div>
              <h3 className="font-heading text-sm font-semibold text-white/90">{label}</h3>
              <p className="text-xs text-white/50 mt-0.5">{total.toLocaleString()} total</p>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-1.5 sm:gap-2 h-28 sm:h-36">
          {data.map((d, i) => {
            const val = d[dataKey] as number
            const height = val > 0 ? Math.max((val / scale) * 100, 6) : 0
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-[10px] sm:text-xs font-medium text-white/70 tabular-nums">
                  {val > 0 ? val : ''}
                </span>
                <motion.div
                  className="w-full rounded-lg bg-white/25 backdrop-blur-sm min-h-0"
                  initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{ minHeight: height > 0 ? 4 : 0 }}
                />
                <span className="text-[10px] sm:text-[11px] text-white/50 font-medium">{d.month}</span>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero stat card - rich surfaces                                     */
/* ------------------------------------------------------------------ */

function HeroStatCard({
  value,
  label,
  icon,
  sub,
  variant = 'default',
  reducedMotion,
  delay = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  sub?: string
  variant?: 'primary' | 'dark' | 'accent' | 'default'
  reducedMotion: boolean
  delay?: number
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.8,
        delay: reducedMotion ? 0 : 1.5 + delay * 3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="relative rounded-2xl p-5 sm:p-6 pb-7"
      aria-label={`${label}: ${value}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white/80" aria-hidden="true">
          {icon}
        </span>
        {sub && (
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5 bg-white/10 text-success-300">
            <ArrowUpRight size={12} />
            {sub}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 50%)' }} />
        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className="relative text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-white"
        >
          {display.toLocaleString()}
        </p>
        <p className="relative mt-1 text-sm font-medium text-white/55">
          {label}
        </p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact pill - compact, colourful                                   */
/* ------------------------------------------------------------------ */

function ImpactPill({
  value,
  label,
  icon,
  color,
  reducedMotion,
  delay = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  color: string
  reducedMotion: boolean
  delay?: number
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: reducedMotion ? 0 : delay }}
      className="relative flex items-center gap-3 rounded-xl px-4 py-4 active:scale-[0.98] transition-transform duration-150"
      aria-label={`${label}: ${value}`}
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-white/10" aria-hidden="true">
        {icon}
      </span>
      <div className="relative min-w-0">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-28 h-28 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 50%)' }} />
        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className="relative text-xl sm:text-2xl font-bold text-white tabular-nums"
        >
          {display.toLocaleString()}
        </p>
        <p className="relative text-xs text-white/50 font-medium truncate">{label}</p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Admin Dashboard Page                                               */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const { data, isLoading } = useAdminOverview(dateRange)
  const { data: trends } = useTrendData()

  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  // No actions passed — the period filter lives inside the hero now
  useAdminHeader('Dashboard', { fullBleed: true })

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-600 via-secondary-700 to-primary-950" />
        {/* Filled circle top-left */}
        <div className="absolute -left-[8%] -top-[8%] w-[45vw] h-[45vw] max-w-[420px] max-h-[420px] rounded-full bg-white/[0.06]" />
        {/* Ring top-right */}
        <div className="absolute -right-[15%] -top-[10%] w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full border border-white/[0.08]" />

        <div className="relative z-10">
          {/* Hero wordmark area */}
          <div className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] lg:min-h-[380px] pt-10">
            <div className="h-24 sm:h-32 lg:h-40 w-48 sm:w-64 lg:w-80 rounded-2xl bg-white/[0.06] animate-pulse" />
            <div className="mt-4 h-4 w-40 rounded-full bg-white/[0.05] animate-pulse" />
          </div>

          {/* Filter bar */}
          <div className="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
            <div className="h-4 w-24 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-9 w-36 rounded-xl bg-white/[0.06] animate-pulse" />
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 space-y-10 sm:space-y-14 pb-20">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.08] p-5 sm:p-6 space-y-3 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                  <div className="w-9 h-9 rounded-xl bg-white/[0.08]" />
                  <div className="h-8 w-16 rounded-lg bg-white/[0.06]" />
                  <div className="h-3 w-20 rounded-full bg-white/[0.05]" />
                </div>
              ))}
            </div>

            {/* Impact section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-44 rounded-full bg-white/[0.06] animate-pulse" />
                <div className="h-3 w-20 rounded-full bg-white/[0.04] animate-pulse" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.08] px-4 py-3.5 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="w-10 h-10 rounded-xl bg-white/[0.08] shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-12 rounded-lg bg-white/[0.06]" />
                      <div className="h-3 w-20 rounded-full bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Period highlight */}
            <div className="rounded-2xl bg-white/[0.08] p-5 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 rounded bg-white/[0.08]" />
                <div className="h-4 w-36 rounded-full bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="h-8 w-14 rounded-lg bg-white/[0.06] mx-auto" />
                    <div className="h-3 w-20 rounded-full bg-white/[0.04] mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Trend charts */}
            <div className="space-y-4">
              <div className="h-5 w-32 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.08] p-5 sm:p-6 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
                    <div className="flex items-center gap-2.5 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.08]" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-28 rounded-full bg-white/[0.06]" />
                        <div className="h-3 w-16 rounded-full bg-white/[0.04]" />
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-28 sm:h-36">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                          <div className="w-full rounded-lg bg-white/[0.08]" style={{ height: `${20 + Math.random() * 60}%` }} />
                          <div className="h-2.5 w-6 rounded-full bg-white/[0.05]" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Build impact items (only show non-zero)
  const impactItems: {
    value: number
    label: string
    icon: React.ReactNode
    color: string
  }[] = [
    {
      value: data?.totalTrees ?? 0,
      label: 'Trees Planted',
      icon: <TreePine size={20} className="text-success-300" />,
      color: 'bg-white/10',
    },
    {
      value: data?.totalRubbish ?? 0,
      label: 'Rubbish (kg)',
      icon: <span className="text-lg text-white/70" aria-hidden="true">&#9851;</span>,
      color: 'bg-white/10',
    },
    ...(data?.totalCoastline ?? 0) > 0
      ? [{
          value: data?.totalCoastline ?? 0,
          label: 'Coastline (m)',
          icon: <Waves size={20} className="text-sky-300" />,
          color: 'bg-white/10',
        }]
      : [],
    ...(data?.totalArea ?? 0) > 0
      ? [{
          value: data?.totalArea ?? 0,
          label: 'Area (sqm)',
          icon: <Globe size={20} className="text-white/70" />,
          color: 'bg-white/10',
        }]
      : [],
    ...(data?.totalNativePlants ?? 0) > 0
      ? [{
          value: data?.totalNativePlants ?? 0,
          label: 'Native Plants',
          icon: <Leaf size={20} className="text-success-300" />,
          color: 'bg-white/10',
        }]
      : [],
    ...(data?.totalWildlife ?? 0) > 0
      ? [{
          value: data?.totalWildlife ?? 0,
          label: 'Wildlife Sightings',
          icon: <Eye size={20} className="text-warning-300" />,
          color: 'bg-white/10',
        }]
      : [],
    {
      value: data?.attendanceRate ?? 0,
      label: 'Attendance %',
      icon: <UserCheck size={20} className="text-success-300" />,
      color: 'bg-white/10',
    },
    {
      value: data?.surveyResponses ?? 0,
      label: 'Survey Responses',
      icon: <ClipboardCheck size={20} className="text-sky-300" />,
      color: 'bg-white/10',
    },
  ]

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* ── Full-page branded background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-600 via-secondary-700 to-primary-950" />

      {/* ── Bold geometric shapes ── */}
      {/* Big filled circle — top-left hero accent */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{ scale: { duration: 16, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.2, ease: 'easeOut' } }}
        className="absolute -left-[8%] -top-[8%] w-[45vw] h-[45vw] max-w-[420px] max-h-[420px] rounded-full bg-white/[0.06]"
      />
      {/* Large ring — top-right */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.5, delay: 0.3, ease: 'easeOut' } }}
        className="absolute -right-[15%] -top-[10%] w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full border border-white/[0.08]"
      />
      {/* Inner concentric ring */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.08, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.5, delay: 0.5, ease: 'easeOut' } }}
        className="absolute -right-[10%] -top-[5%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full border border-white/[0.06]"
      />
      {/* Bottom-left arc */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }, opacity: { duration: 2, delay: 0.8, ease: 'easeOut' } }}
        className="absolute -left-[20%] bottom-[5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-white/[0.07]"
      />
      {/* Small filled accent — bottom-right */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, delay: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute right-[8%] bottom-[12%] w-[100px] h-[100px] rounded-full bg-white/[0.04]"
      />
      {/* Tiny accent dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.8, delay: 1.5 } }}
        className="absolute left-[18%] top-[22%] w-2 h-2 rounded-full bg-white/30"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ y: [0, 6, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ y: { duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }, opacity: { duration: 0.8, delay: 1.8 } }}
        className="absolute right-[25%] top-[65%] w-1.5 h-1.5 rounded-full bg-white/25"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ y: [0, -5, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }, opacity: { duration: 0.8, delay: 2 } }}
        className="absolute left-[55%] bottom-[20%] w-2 h-2 rounded-full bg-white/20"
      />

      {/* Content */}
      <div className="relative z-10">
        {/* ── Hero — wordmark area ── */}
        <motion.div
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] lg:min-h-[380px] pt-10"
        >
          <div className="flex flex-col items-center text-center px-6">
            <motion.img
              src="/logos/white-wordmark.webp"
              alt="Co-Exist"
              initial={rm ? {} : { opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-24 sm:h-32 lg:h-40 w-auto object-contain"
            />
            <motion.p
              initial={rm ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
              className="mt-4 text-sm sm:text-base text-white/30 font-medium tracking-widest uppercase"
            >
              National Dashboard
            </motion.p>
          </div>
        </motion.div>

        {/* ── Period filter bar ── */}
        <motion.div
          initial={rm ? {} : { opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.1, ease: 'easeOut' }}
          className="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3"
        >
          <p className="text-sm font-medium text-white/50">
            {dateRangeOptions.find((o) => o.value === dateRange)?.label}
          </p>
          <Dropdown
            options={dateRangeOptions}
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRange)}
            className="w-40"
          />
        </motion.div>

        {/* ── Body ── */}
        <motion.div
          initial={rm ? {} : { opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="px-6 sm:px-8 space-y-10 sm:space-y-14 pb-20"
        >

        {/* ── Primary stats ── */}
        <div className="grid grid-cols-[1fr_1px_1fr] lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_1fr] gap-y-3">
          <HeroStatCard
            value={data?.totalMembers ?? 0}
            label="Members"
            icon={<Users size={20} />}
            sub={data?.periodMembers ? `+${data.periodMembers}` : undefined}
            variant="primary"
            reducedMotion={rm}
            delay={0.05}
          />
          <div className="bg-white/[0.1] self-stretch my-4" />
          <HeroStatCard
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            icon={<MapPin size={20} />}
            variant="dark"
            reducedMotion={rm}
            delay={0.1}
          />
          <div className="hidden lg:block bg-white/[0.1] self-stretch my-4" />
          <HeroStatCard
            value={data?.totalEvents ?? 0}
            label="Events Run"
            icon={<CalendarDays size={20} />}
            sub={data?.periodEvents ? `+${data.periodEvents}` : undefined}
            variant="accent"
            reducedMotion={rm}
            delay={0.15}
          />
          <div className="bg-white/[0.1] self-stretch my-4" />
          <HeroStatCard
            value={data?.totalHours ?? 0}
            label="Volunteer Hours"
            icon={<Clock size={20} />}
            variant="default"
            reducedMotion={rm}
            delay={0.2}
          />
        </div>

        {/* ── Impact metrics grid ── */}
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <h2 className="font-heading text-base sm:text-lg font-bold text-white/80">
              Environmental Impact
            </h2>
            <span className="text-xs text-white/40 font-medium">
              {dateRangeOptions.find((o) => o.value === dateRange)?.label}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_1px_1fr] lg:grid-cols-[1fr_1px_1fr_1px_1fr_1px_1fr] gap-y-2">
            {impactItems.map((item, i) => (
              <Fragment key={item.label}>
                {i > 0 && i % 2 !== 0 && <div className="bg-white/[0.1] self-stretch my-3 sm:block" />}
                {i > 0 && i % 2 === 0 && <div className="hidden lg:block bg-white/[0.1] self-stretch my-3" />}
                <ImpactPill
                  value={item.value}
                  label={item.label}
                  icon={item.icon}
                  color={item.color}
                  reducedMotion={rm}
                  delay={0.3 + i * 0.04}
                />
              </Fragment>
            ))}
          </div>
        </motion.div>

        {/* ── Period highlight strip ── */}
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="relative rounded-2xl p-4 sm:p-5 pb-7"
        >
          {/* SVG glare */}
          <svg className="absolute bottom-0 left-4 w-24 h-16 opacity-[0.05] pointer-events-none" viewBox="0 0 96 64" fill="none">
            <ellipse cx="48" cy="48" rx="48" ry="24" fill="white" />
          </svg>

          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-white/60" />
            <h3 className="font-heading text-sm font-semibold text-white/80">
              {dateRangeOptions.find((o) => o.value === dateRange)?.label} at a Glance
            </h3>
          </div>
          <div className="flex items-center">
            <div className="relative flex-1 py-3 text-center">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 50%)' }} />
              <p className="relative text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {(data?.periodMembers ?? 0).toLocaleString()}
              </p>
              <p className="relative text-xs text-white/40 font-medium mt-0.5">New Members</p>
            </div>
            <div className="w-px self-stretch bg-white/[0.1] shrink-0" />
            <div className="relative flex-1 py-3 text-center">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 50%)' }} />
              <p className="relative text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {(data?.periodEvents ?? 0).toLocaleString()}
              </p>
              <p className="relative text-xs text-white/40 font-medium mt-0.5">Events</p>
            </div>
            <div className="w-px self-stretch bg-white/[0.1] shrink-0" />
            <div className="relative flex-1 py-3 text-center">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 50%)' }} />
              <p className="relative text-2xl sm:text-3xl font-bold text-success-300 tabular-nums">
                {(data?.attendanceRate ?? 0)}%
              </p>
              <p className="relative text-xs text-white/40 font-medium mt-0.5">Attendance</p>
            </div>
          </div>
        </motion.div>

        {/* ── Trend charts ── */}
        {trends && trends.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 sm:mb-5">
              <h2 className="font-heading text-base sm:text-lg font-bold text-white/80">
                Growth Trends
              </h2>
              <span className="text-xs text-white/40 font-medium">Last 6 months</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <TrendChart
                data={trends}
                dataKey="members"
                label="Member Growth"
                gradient="bg-white/[0.15] backdrop-blur-md"
                icon={<Users size={16} />}
              />
              <TrendChart
                data={trends}
                dataKey="events"
                label="Event Frequency"
                gradient="bg-white/[0.15] backdrop-blur-md"
                icon={<CalendarDays size={16} />}
              />
            </div>
          </div>
        )}

        {/* ── Geographic placeholder ── */}
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className={cn(
            'relative rounded-2xl',
            'p-6 sm:p-8',
          )}
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 text-white/70">
                <Globe size={18} />
              </span>
              <div>
                <h3 className="font-heading text-sm font-semibold text-white/80">
                  Geographic Activity
                </h3>
                <p className="text-xs text-white/40">Collective distribution across Australia</p>
              </div>
            </div>
            <div className="h-52 sm:h-64 rounded-xl bg-white/[0.05] flex items-center justify-center">
              <p className="text-sm text-white/30 text-center px-4">
                Connect to Mapbox for live geographic heat map
              </p>
            </div>
          </div>
        </motion.div>

        </motion.div>{/* end body wrapper */}
      </div>{/* end content z-10 */}
    </div>
  )
}
