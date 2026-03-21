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
    primary: 'bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 text-white',
    dark: 'bg-gradient-to-br from-primary-900 via-primary-950 to-neutral-900 text-white',
    accent: 'bg-gradient-to-br from-accent-500 via-accent-600 to-primary-700 text-white',
    default: 'bg-white text-primary-800',
  }

  const valueColor = {
    primary: 'text-white',
    dark: 'text-white',
    accent: 'text-white',
    default: 'text-primary-800',
  }

  const labelColor = {
    primary: 'text-white/70',
    dark: 'text-white/60',
    accent: 'text-white/70',
    default: 'text-primary-400',
  }

  const iconBg = {
    primary: 'bg-white/15',
    dark: 'bg-white/10',
    accent: 'bg-white/15',
    default: 'bg-primary-50',
  }

  const subColor = {
    primary: 'text-success-300',
    dark: 'text-success-300',
    accent: 'text-white/80',
    default: 'text-accent-600',
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
        'shadow-md',
        variantStyles[variant],
      )}
      aria-label={`${label}: ${value}`}
    >
      {/* Subtle decorative elements */}
      {variant !== 'default' && (
        <>
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/[0.05]" />
          <div className="absolute -left-3 -bottom-6 w-16 h-16 rounded-full bg-white/[0.03]" />
        </>
      )}
      {variant === 'default' && (
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-primary-50/60" />
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-xl',
              iconBg[variant],
              variant === 'default' ? 'text-primary-500' : 'text-white/80',
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
          {sub && (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5',
              variant === 'default'
                ? 'bg-success-50 text-success-700'
                : 'bg-white/10 text-success-300',
            )}>
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
        'bg-white shadow-sm',
        'active:scale-[0.98] transition-transform duration-150',
      )}
      aria-label={`${label}: ${value}`}
    >
      <span className={cn(
        'flex items-center justify-center w-10 h-10 rounded-xl shrink-0',
        color,
      )} aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className="text-xl sm:text-2xl font-bold text-primary-800 tabular-nums"
        >
          {display.toLocaleString()}
        </p>
        <p className="text-xs text-primary-400 font-medium truncate">{label}</p>
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
      <div className="-m-6">
        <Skeleton className="h-[220px] sm:h-[280px] lg:h-[320px]" />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
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
      icon: <TreePine size={20} className="text-success-700" />,
      color: 'bg-success-50',
    },
    {
      value: data?.totalRubbish ?? 0,
      label: 'Rubbish (kg)',
      icon: <span className="text-lg text-primary-700" aria-hidden="true">&#9851;</span>,
      color: 'bg-primary-50',
    },
    ...(data?.totalCoastline ?? 0) > 0
      ? [{
          value: data?.totalCoastline ?? 0,
          label: 'Coastline (m)',
          icon: <Waves size={20} className="text-info-600" />,
          color: 'bg-info-50',
        }]
      : [],
    ...(data?.totalArea ?? 0) > 0
      ? [{
          value: data?.totalArea ?? 0,
          label: 'Area (sqm)',
          icon: <Globe size={20} className="text-primary-600" />,
          color: 'bg-primary-50',
        }]
      : [],
    ...(data?.totalNativePlants ?? 0) > 0
      ? [{
          value: data?.totalNativePlants ?? 0,
          label: 'Native Plants',
          icon: <Leaf size={20} className="text-success-600" />,
          color: 'bg-success-50',
        }]
      : [],
    ...(data?.totalWildlife ?? 0) > 0
      ? [{
          value: data?.totalWildlife ?? 0,
          label: 'Wildlife Sightings',
          icon: <Eye size={20} className="text-warning-600" />,
          color: 'bg-warning-50',
        }]
      : [],
    {
      value: data?.attendanceRate ?? 0,
      label: 'Attendance %',
      icon: <UserCheck size={20} className="text-success-600" />,
      color: 'bg-success-50',
    },
    {
      value: data?.surveyResponses ?? 0,
      label: 'Survey Responses',
      icon: <ClipboardCheck size={20} className="text-info-600" />,
      color: 'bg-info-50',
    },
  ]

  return (
    <div>
      {/* ── Hero — full bleed, tall, cinematic ── */}
      <motion.div
        initial={rm ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={cn(
          'relative overflow-hidden -m-6 mb-0',
          'bg-primary-950',
          'flex flex-col items-center justify-center',
          'min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]',
        )}
      >
        {/* Layered gradient background — brighter, more life */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700/90 via-primary-800 to-primary-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--color-primary-500)/0.25,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_110%,var(--color-accent-500)/0.12,transparent)]" />

        {/* Floating shapes with staggered entrance */}
        <motion.div
          initial={rm ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.2 }}
          className="absolute -right-20 -top-20 w-[400px] h-[400px] rounded-full border border-white/[0.03]"
        />
        <motion.div
          initial={rm ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4 }}
          className="absolute -right-32 -top-32 w-[600px] h-[600px] rounded-full border border-white/[0.02]"
        />
        <motion.div
          initial={rm ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute left-[10%] bottom-[15%] w-2 h-2 rounded-full bg-primary-400/25"
        />
        <motion.div
          initial={rm ? {} : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute right-[20%] top-[25%] w-1.5 h-1.5 rounded-full bg-success-400/20"
        />
        <motion.div
          initial={rm ? {} : { y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="absolute left-0 bottom-0 w-60 h-60 rounded-full bg-primary-500/[0.04] translate-y-1/2 -translate-x-1/4"
        />

        {/* Thin horizontal accent line */}
        <motion.div
          initial={rm ? {} : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-400/20 to-transparent"
        />

        {/* Centered wordmark + subtitle */}
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <motion.img
            src="/logos/white-wordmark.webp"
            alt="Co-Exist"
            initial={rm ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="h-20 sm:h-28 lg:h-36 w-auto object-contain"
          />
          <motion.p
            initial={rm ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="mt-3 text-sm sm:text-base text-white/35 font-medium tracking-wide"
          >
            National Dashboard
          </motion.p>
        </div>
      </motion.div>

      {/* ── Period filter bar — below hero ── */}
      <div className={cn(
        '-mx-6 px-6 sm:px-8 py-3 sm:py-4',
        'bg-primary-50/80 border-b border-primary-100/60',
        'flex items-center justify-between gap-3',
      )}>
        <p className="text-sm font-medium text-primary-600">
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
      <div className="px-6 sm:px-8 -mx-6 space-y-6 sm:space-y-8 pt-6 sm:pt-8 pb-2">

      {/* ── Primary stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <h2 className="font-heading text-base sm:text-lg font-bold text-primary-800">
            Environmental Impact
          </h2>
          <span className="text-xs text-primary-400 font-medium">
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
          'bg-gradient-to-r from-primary-50 via-white to-accent-50',
          'border border-primary-100/60',
          'p-4 sm:p-5',
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-primary-500" />
          <h3 className="font-heading text-sm font-semibold text-primary-800">
            {dateRangeOptions.find((o) => o.value === dateRange)?.label} at a Glance
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-primary-800 tabular-nums">
              {(data?.periodMembers ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-primary-400 font-medium mt-0.5">New Members</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-accent-700 tabular-nums">
              {(data?.periodEvents ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-primary-400 font-medium mt-0.5">Events</p>
          </div>
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold text-success-700 tabular-nums">
              {(data?.attendanceRate ?? 0)}%
            </p>
            <p className="text-xs text-primary-400 font-medium mt-0.5">Attendance</p>
          </div>
        </div>
      </motion.div>

      {/* ── Trend charts ── */}
      {trends && trends.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <h2 className="font-heading text-base sm:text-lg font-bold text-primary-800">
              Growth Trends
            </h2>
            <span className="text-xs text-primary-400 font-medium">Last 6 months</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <TrendChart
              data={trends}
              dataKey="members"
              label="Member Growth"
              gradient="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950"
              icon={<Users size={16} />}
            />
            <TrendChart
              data={trends}
              dataKey="events"
              label="Event Frequency"
              gradient="bg-gradient-to-br from-accent-600 via-accent-700 to-primary-800"
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
          'bg-gradient-to-br from-primary-50 via-white to-primary-100/40',
          'border border-primary-100/60',
          'p-6 sm:p-8',
        )}
      >
        <div className="absolute right-0 bottom-0 w-48 h-48 rounded-full bg-primary-200/20 translate-x-1/4 translate-y-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-100 text-primary-600">
              <Globe size={18} />
            </span>
            <div>
              <h3 className="font-heading text-sm font-semibold text-primary-800">
                Geographic Activity
              </h3>
              <p className="text-xs text-primary-400">Collective distribution across Australia</p>
            </div>
          </div>
          <div className="h-52 sm:h-64 rounded-xl bg-primary-100/40 flex items-center justify-center">
            <p className="text-sm text-primary-400 text-center px-4">
              Connect to Mapbox for live geographic heat map
            </p>
          </div>
        </div>
      </motion.div>

      </div>{/* end body wrapper */}
    </div>
  )
}
