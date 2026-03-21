import { useState } from 'react'
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
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 sm:p-6',
        gradient,
      )}
    >
      {/* Decorative background circle */}
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/[0.06]" />
      <div className="absolute -right-4 -bottom-12 w-24 h-24 rounded-full bg-white/[0.04]" />

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

  const variantStyles = {
    primary: 'bg-white/[0.20] backdrop-blur-md text-white',
    dark: 'bg-white/[0.14] backdrop-blur-md text-white',
    accent: 'bg-white/[0.22] backdrop-blur-md text-white',
    default: 'bg-white/[0.18] backdrop-blur-md text-white',
  }

  const valueColor = {
    primary: 'text-white',
    dark: 'text-white',
    accent: 'text-white',
    default: 'text-white',
  }

  const labelColor = {
    primary: 'text-white/60',
    dark: 'text-white/50',
    accent: 'text-white/60',
    default: 'text-white/50',
  }

  const iconBg = {
    primary: 'bg-white/15',
    dark: 'bg-white/10',
    accent: 'bg-white/15',
    default: 'bg-white/10',
  }

  const subColor = {
    primary: 'text-success-300',
    dark: 'text-success-300',
    accent: 'text-white/80',
    default: 'text-success-300',
  }

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: reducedMotion ? 0 : delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={cn(
        'relative overflow-hidden rounded-2xl p-5 sm:p-6',
        variantStyles[variant],
      )}
      aria-label={`${label}: ${value}`}
    >
      {/* Subtle decorative elements */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/[0.05]" />
      <div className="absolute -left-3 -bottom-6 w-16 h-16 rounded-full bg-white/[0.03]" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              iconBg[variant],
              'text-white/80',
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
          {sub && (
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5 bg-white/10 text-success-300">
              <ArrowUpRight size={12} />
              {sub}
            </span>
          )}
        </div>

        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className={cn(
            'text-3xl sm:text-4xl font-bold tracking-tight tabular-nums',
            valueColor[variant],
          )}
        >
          {display.toLocaleString()}
        </p>
        <p className={cn('mt-1 text-sm font-medium', labelColor[variant])}>
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
      className={cn(
        'flex items-center gap-3 rounded-xl px-4 py-3.5',
        'bg-white/[0.18] backdrop-blur-md',
        'active:scale-[0.98] transition-transform duration-150',
      )}
      aria-label={`${label}: ${value}`}
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-white/10" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className="text-xl sm:text-2xl font-bold text-white tabular-nums"
        >
          {display.toLocaleString()}
        </p>
        <p className="text-xs text-white/50 font-medium truncate">{label}</p>
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
  useAdminHeader('Dashboard')

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-700 via-primary-800/95 to-primary-900" />
        <div className="relative z-10 p-6 space-y-6 pt-[280px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl opacity-20" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl opacity-20" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-56 rounded-2xl opacity-20" />
            <Skeleton className="h-56 rounded-2xl opacity-20" />
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
    <div className="relative min-h-screen overflow-hidden">
      {/* ── Full-page branded background ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-600 via-secondary-700 to-primary-950" />

      {/* ── Bold geometric shapes — clean, no blur ── */}
      {/* Giant top-right circle */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -right-[15%] -top-[10%] w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full border border-white/[0.07]"
      />
      {/* Inner concentric ring */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -right-[10%] -top-[5%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full border border-white/[0.05]"
      />
      {/* Bottom-left large arc */}
      <motion.div
        animate={{ scale: [1, 1.04, 1], y: [0, -10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute -left-[20%] bottom-[5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-white/[0.06]"
      />
      {/* Solid semi-transparent circle — hero accent */}
      <motion.div
        animate={{ scale: [1, 1.06, 1], opacity: [0.06, 0.10, 0.06] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[5%] top-[8%] w-[300px] h-[300px] rounded-full bg-white/[0.06]"
      />
      {/* Small solid circle mid-left */}
      <motion.div
        animate={{ y: [0, 15, 0], opacity: [0.08, 0.14, 0.08] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute left-[8%] top-[45%] w-[180px] h-[180px] rounded-full bg-white/[0.05]"
      />
      {/* Tiny accent dots */}
      <motion.div
        animate={{ y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[18%] top-[22%] w-2 h-2 rounded-full bg-white/30"
      />
      <motion.div
        animate={{ y: [0, 6, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
        className="absolute right-[25%] top-[65%] w-1.5 h-1.5 rounded-full bg-white/25"
      />
      <motion.div
        animate={{ y: [0, -5, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute left-[55%] bottom-[20%] w-2 h-2 rounded-full bg-white/20"
      />

      {/* Content */}
      <div className="relative z-10">
        {/* ── Hero — wordmark area ── */}
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center min-h-[240px] sm:min-h-[320px] lg:min-h-[380px] pt-10"
        >
          <div className="flex flex-col items-center text-center px-6">
            <motion.img
              src="/logos/white-wordmark.webp"
              alt="Co-Exist"
              initial={rm ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="h-24 sm:h-32 lg:h-40 w-auto object-contain"
            />
            <motion.p
              initial={rm ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="mt-4 text-sm sm:text-base text-white/30 font-medium tracking-widest uppercase"
            >
              National Dashboard
            </motion.p>
          </div>
        </motion.div>

        {/* ── Period filter bar ── */}
        <div className="px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white/50">
            {dateRangeOptions.find((o) => o.value === dateRange)?.label}
          </p>
          <Dropdown
            options={dateRangeOptions}
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRange)}
            className="w-40"
          />
        </div>

        {/* ── Body ── */}
        <div className="px-6 sm:px-8 space-y-10 sm:space-y-14 pb-20">

        {/* ── Primary stats grid ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          <HeroStatCard
            value={data?.totalMembers ?? 0}
            label="Members"
            icon={<Users size={20} />}
            sub={data?.periodMembers ? `+${data.periodMembers}` : undefined}
            variant="primary"
            reducedMotion={rm}
            delay={0.05}
          />
          <HeroStatCard
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            icon={<MapPin size={20} />}
            variant="dark"
            reducedMotion={rm}
            delay={0.1}
          />
          <HeroStatCard
            value={data?.totalEvents ?? 0}
            label="Events Run"
            icon={<CalendarDays size={20} />}
            sub={data?.periodEvents ? `+${data.periodEvents}` : undefined}
            variant="accent"
            reducedMotion={rm}
            delay={0.15}
          />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {impactItems.map((item, i) => (
              <ImpactPill
                key={item.label}
                value={item.value}
                label={item.label}
                icon={item.icon}
                color={item.color}
                reducedMotion={rm}
                delay={0.3 + i * 0.04}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Period highlight strip ── */}
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className={cn(
            'rounded-2xl overflow-hidden',
            'bg-white/[0.15] backdrop-blur-md',
            'p-4 sm:p-5',
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-white/60" />
            <h3 className="font-heading text-sm font-semibold text-white/80">
              {dateRangeOptions.find((o) => o.value === dateRange)?.label} at a Glance
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {(data?.periodMembers ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/40 font-medium mt-0.5">New Members</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                {(data?.periodEvents ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-white/40 font-medium mt-0.5">Events</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-success-300 tabular-nums">
                {(data?.attendanceRate ?? 0)}%
              </p>
              <p className="text-xs text-white/40 font-medium mt-0.5">Attendance</p>
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
            'relative overflow-hidden rounded-2xl',
            'bg-white/[0.15] backdrop-blur-md',
            'p-6 sm:p-8',
          )}
        >
          <div className="absolute right-0 bottom-0 w-48 h-48 rounded-full bg-white/[0.03] translate-x-1/4 translate-y-1/4" />
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

        </div>{/* end body wrapper */}
      </div>{/* end content z-10 */}
    </div>
  )
}
