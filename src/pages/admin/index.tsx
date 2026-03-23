import { useState } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Users,
    MapPin,
    CalendarDays,
    TreePine, Clock,
    Leaf,
    Eye,
    ArrowUpRight,
    Globe
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Dropdown } from '@/components/dropdown'
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
          let q = supabase.from('event_impact').select('trees_planted, hours_total, rubbish_kg, area_restored_sqm, native_plants, wildlife_sightings')
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
      const totalArea = impact.reduce((s: number, r: any) => s + (r.area_restored_sqm ?? 0), 0)
      const totalNativePlants = impact.reduce((s: number, r: any) => s + (r.native_plants ?? 0), 0)
      const totalWildlife = impact.reduce((s: number, r: any) => s + (r.wildlife_sightings ?? 0), 0)

      return {
        totalMembers: totalMembersRes.count ?? 0,
        totalCollectives: totalCollectivesRes.count ?? 0,
        totalEvents: totalEventsRes.count ?? 0,
        totalTrees,
        totalHours: Math.round(totalHours),
        totalRubbish: Math.round(totalRubbish),
        totalArea: Math.round(totalArea),
        totalNativePlants,
        totalWildlife,
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
/*  Bar chart                                                          */
/* ------------------------------------------------------------------ */

function TrendChart({
  data,
  dataKey,
  label,
  icon,
}: {
  data: { month: string; [key: string]: any }[]
  dataKey: string
  label: string
  gradient?: string
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
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-white/[0.06] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/80">
            {icon}
          </span>
          <div>
            <h3 className="font-heading text-sm font-semibold text-white/90">{label}</h3>
            <p className="text-xs text-white/40 mt-0.5">{total.toLocaleString()} total</p>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-1.5 sm:gap-2 h-28 sm:h-36">
        {data.map((d, i) => {
          const val = d[dataKey] as number
          const height = val > 0 ? Math.max((val / scale) * 100, 6) : 0
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-medium text-white/60 tabular-nums">
                {val > 0 ? val : ''}
              </span>
              <div className="w-full flex flex-col justify-end" style={{ height: `${height}%`, minHeight: height > 0 ? 4 : 0 }}>
                <motion.div
                  className="w-full rounded-md bg-white/20"
                  initial={shouldReduceMotion ? { scaleY: 1 } : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{ height: '100%', transformOrigin: 'bottom', willChange: 'transform' }}
                />
              </div>
              <span className="text-[11px] sm:text-[11px] text-white/40 font-medium">{d.month}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero stat card                                                     */
/* ------------------------------------------------------------------ */

function HeroStatCard({
  value,
  label,
  icon,
  sub,
  reducedMotion,
  delay = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  sub?: string
  variant?: string
  reducedMotion: boolean
  delay?: number
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: reducedMotion ? 0 : 0.2 + delay * 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="flex flex-col items-center text-center py-6 px-3"
      aria-label={`${label}: ${value}`}
    >
      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.08] text-white/70 mb-3" aria-hidden="true">
        {icon}
      </span>
      <p
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums text-white"
      >
        {display.toLocaleString()}
      </p>
      <p className="mt-1.5 text-xs font-medium text-white/45 tracking-wide uppercase">{label}</p>
      {sub && (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold mt-1.5 text-success-300">
          <ArrowUpRight size={10} />
          {sub}
        </span>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact metric item                                                 */
/* ------------------------------------------------------------------ */

function ImpactItem({
  value,
  label,
  icon,
  reducedMotion,
  delay = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  color?: string
  reducedMotion: boolean
  delay?: number
}) {
  const display = useCountUp(value, 1200, !reducedMotion)

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: reducedMotion ? 0 : delay }}
      className="flex items-center gap-3 py-3 px-4 rounded-xl bg-white/[0.05]"
      aria-label={`${label}: ${value}`}
    >
      <span className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-white/[0.08]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0">
        <p
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          className="text-lg font-bold text-white tabular-nums leading-tight"
        >
          {display.toLocaleString()}
        </p>
        <p className="text-[11px] text-white/40 font-medium">{label}</p>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-4">
      <h2 className="font-heading text-base font-bold text-white/80">{children}</h2>
      {sub && <span className="text-xs text-white/30 font-medium">{sub}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Admin Dashboard Page                                               */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month')
  const { data, isLoading } = useAdminOverview(dateRange)
  const showLoading = useDelayedLoading(isLoading)
  const { data: trends } = useTrendData()

  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  useAdminHeader('Dashboard', { fullBleed: true })

  if (showLoading) {
    return (
      <div className="relative min-h-dvh overflow-x-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-700 via-primary-800 to-primary-950" />

        <div className="relative z-10">
          {/* Hero wordmark area */}
          <div className="flex flex-col items-center justify-center min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 2.5rem)' }}>
            <div className="h-20 sm:h-28 lg:h-36 w-44 sm:w-56 lg:w-72 rounded-2xl bg-white/[0.06] animate-pulse" />
            <div className="mt-4 h-3 w-32 rounded-full bg-white/[0.04] animate-pulse" />
          </div>

          {/* Filter bar */}
          <div className="px-6 sm:px-8 py-4 flex items-center justify-between">
            <div className="h-3 w-20 rounded-full bg-white/[0.05] animate-pulse" />
            <div className="h-9 w-36 rounded-xl bg-white/[0.05] animate-pulse" />
          </div>

          {/* Body */}
          <div className="px-6 sm:px-8 space-y-8 pb-20">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.06] rounded-2xl overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-primary-800/80 p-6 space-y-3 animate-pulse" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="w-10 h-10 rounded-xl bg-white/[0.06] mx-auto" />
                  <div className="h-8 w-16 rounded-lg bg-white/[0.05] mx-auto" />
                  <div className="h-2.5 w-14 rounded-full bg-white/[0.04] mx-auto" />
                </div>
              ))}
            </div>

            {/* Impact section */}
            <div className="space-y-3">
              <div className="h-4 w-36 rounded-full bg-white/[0.05] animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.05] px-4 py-3.5 animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="w-9 h-9 rounded-lg bg-white/[0.06] shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-5 w-10 rounded bg-white/[0.05]" />
                      <div className="h-2.5 w-16 rounded-full bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend charts */}
            <div className="space-y-3">
              <div className="h-4 w-28 rounded-full bg-white/[0.05] animate-pulse" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white/[0.05] p-5 sm:p-6 animate-pulse" style={{ animationDelay: `${i * 150}ms` }}>
                    <div className="flex items-center gap-2.5 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.06]" />
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-24 rounded-full bg-white/[0.05]" />
                        <div className="h-2.5 w-14 rounded-full bg-white/[0.04]" />
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-28 sm:h-36">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <div key={j} className="flex-1 flex flex-col items-center gap-1.5 justify-end h-full">
                          <div className="w-full rounded-md bg-white/[0.06]" style={{ height: `${20 + Math.random() * 50}%` }} />
                          <div className="h-2 w-5 rounded-full bg-white/[0.04]" />
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
      icon: <TreePine size={18} className="text-success-300" />,
      color: 'bg-white/10',
    },
    {
      value: data?.totalRubbish ?? 0,
      label: 'Rubbish (kg)',
      icon: <span className="text-base text-white/60" aria-hidden="true">&#9851;</span>,
      color: 'bg-white/10',
    },
    ...(data?.totalArea ?? 0) > 0
      ? [{
          value: data?.totalArea ?? 0,
          label: 'Area (sqm)',
          icon: <Globe size={18} className="text-white/60" />,
          color: 'bg-white/10',
        }]
      : [],
    ...(data?.totalNativePlants ?? 0) > 0
      ? [{
          value: data?.totalNativePlants ?? 0,
          label: 'Native Plants',
          icon: <Leaf size={18} className="text-success-300" />,
          color: 'bg-white/10',
        }]
      : [],
    ...(data?.totalWildlife ?? 0) > 0
      ? [{
          value: data?.totalWildlife ?? 0,
          label: 'Wildlife Sightings',
          icon: <Eye size={18} className="text-warning-300" />,
          color: 'bg-white/10',
        }]
      : [],
  ]

  return (
    <div className="relative min-h-dvh">
      {/* ── Background - sticky keeps it viewport-pinned ── */}
      <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-700 via-primary-800 to-primary-950" />

        {/* ── Background geometric shapes (CSS-only animations) ── */}
        <style>{`
          @keyframes blob-breathe-1 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
          @keyframes blob-breathe-2 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
          @keyframes blob-breathe-3 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
          @keyframes blob-breathe-4 { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
          @keyframes blob-fade-in { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
          @keyframes blob-fade-in-2 { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
          @keyframes dot-float-1 { 0%,100% { transform: translateY(0); opacity: 0.3; } 50% { transform: translateY(-8px); opacity: 0.6; } }
          @keyframes dot-float-2 { 0%,100% { transform: translateY(0); opacity: 0.2; } 50% { transform: translateY(6px); opacity: 0.5; } }
          @keyframes dot-float-3 { 0%,100% { transform: translateY(0); opacity: 0.25; } 50% { transform: translateY(-5px); opacity: 0.5; } }
          @media (prefers-reduced-motion: reduce) {
            .admin-blob, .admin-dot { animation: none !important; }
          }
        `}</style>
        <div
          className="admin-blob absolute -left-[8%] -top-[8%] w-[45vw] h-[45vw] max-w-[420px] max-h-[420px] rounded-full bg-white/[0.06]"
          style={{ animation: 'blob-fade-in 1.2s ease-out forwards, blob-breathe-1 16s ease-in-out 1.2s infinite', willChange: 'transform, opacity' }}
        />
        <div
          className="admin-blob absolute -right-[15%] -top-[10%] w-[70vw] h-[70vw] max-w-[700px] max-h-[700px] rounded-full border border-white/[0.08]"
          style={{ animation: 'blob-fade-in-2 1.5s ease-out 0.3s forwards, blob-breathe-2 20s ease-in-out 1.8s infinite', opacity: 0, willChange: 'transform, opacity' }}
        />
        <div
          className="admin-blob absolute -right-[10%] -top-[5%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full border border-white/[0.06]"
          style={{ animation: 'blob-fade-in-2 1.5s ease-out 0.5s forwards, blob-breathe-3 20s ease-in-out 2s infinite', opacity: 0, willChange: 'transform, opacity' }}
        />
        <div
          className="admin-blob absolute -left-[20%] bottom-[5%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full border border-white/[0.07]"
          style={{ animation: 'blob-fade-in-2 2s ease-out 0.8s forwards, blob-breathe-4 18s ease-in-out 2.8s infinite', opacity: 0, willChange: 'transform, opacity' }}
        />
        <div
          className="admin-blob absolute right-[8%] bottom-[12%] w-[100px] h-[100px] rounded-full bg-white/[0.04]"
          style={{ animation: 'blob-fade-in-2 1.2s cubic-bezier(0.25,0.46,0.45,0.94) 1s forwards', opacity: 0 }}
        />
        {/* Accent dots (CSS-only float) */}
        <div
          className="admin-dot absolute left-[18%] top-[22%] w-2 h-2 rounded-full bg-white/30"
          style={{ animation: 'dot-float-1 4s ease-in-out 1.5s infinite', opacity: 0.3 }}
        />
        <div
          className="admin-dot absolute right-[25%] top-[65%] w-1.5 h-1.5 rounded-full bg-white/25"
          style={{ animation: 'dot-float-2 5s ease-in-out 1.8s infinite', opacity: 0.2 }}
        />
        <div
          className="admin-dot absolute left-[55%] bottom-[20%] w-2 h-2 rounded-full bg-white/20"
          style={{ animation: 'dot-float-3 6s ease-in-out 2s infinite', opacity: 0.25 }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10">
        {/* ── Hero ── */}
        <motion.div
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center min-h-[220px] sm:min-h-[280px] lg:min-h-[320px]" style={{ paddingTop: 'calc(var(--safe-top, 0px) + 2.5rem)' }}
        >
          <div className="flex flex-col items-center text-center px-6">
            <motion.img
              src="/logos/white-wordmark.webp"
              alt="Co-Exist"
              initial={rm ? {} : { opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="h-20 sm:h-28 lg:h-36 w-auto object-contain"
            />
            <motion.p
              initial={rm ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
              className="mt-3 text-xs sm:text-sm text-white/25 font-medium tracking-widest uppercase"
            >
              National Dashboard
            </motion.p>
          </div>
        </motion.div>

        {/* ── Period filter ── */}
        <motion.div
          initial={rm ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-3"
        >
          <p className="text-xs font-medium text-white/35">
            {dateRangeOptions.find((o) => o.value === dateRange)?.label}
          </p>
          <Dropdown
            options={dateRangeOptions}
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRange)}
            className="w-40"
            triggerClassName="bg-transparent border border-white/10 [&>span]:text-white/60 [&>svg]:text-white/30"
          />
        </motion.div>

        {/* ── Body ── */}
        <motion.div
          initial={rm ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="px-6 sm:px-8 space-y-8 sm:space-y-10 pb-20"
        >

        {/* ── Primary stats ── */}
        <div className="rounded-2xl bg-white/[0.06] overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-white/[0.06]">
            <HeroStatCard
              value={data?.totalMembers ?? 0}
              label="Members"
              icon={<Users size={20} />}
              sub={data?.periodMembers ? `+${data.periodMembers}` : undefined}
              variant="primary"
              reducedMotion={rm}
              delay={0}
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
              delay={0.2}
            />
            <HeroStatCard
              value={data?.totalHours ?? 0}
              label="Vol. Hours"
              icon={<Clock size={20} />}
              variant="default"
              reducedMotion={rm}
              delay={0.3}
            />
          </div>
        </div>

        {/* ── Environmental impact ── */}
        <motion.div
          initial={rm ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <SectionHeading sub={dateRangeOptions.find((o) => o.value === dateRange)?.label}>
            Environmental Impact
          </SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {impactItems.map((item, i) => (
              <ImpactItem
                key={item.label}
                value={item.value}
                label={item.label}
                icon={item.icon}
                color={item.color}
                reducedMotion={rm}
                delay={0.2 + i * 0.04}
              />
            ))}
          </div>
        </motion.div>

        {/* ── Trend charts ── */}
        {trends && trends.length > 0 && (
          <div>
            <SectionHeading sub="Last 6 months">Growth Trends</SectionHeading>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <TrendChart
                data={trends}
                dataKey="members"
                label="Member Growth"
                icon={<Users size={16} />}
              />
              <TrendChart
                data={trends}
                dataKey="events"
                label="Event Frequency"
                icon={<CalendarDays size={16} />}
              />
            </div>
          </div>
        )}

        </motion.div>{/* end body wrapper */}
      </div>{/* end content z-10 */}
    </div>
  )
}
