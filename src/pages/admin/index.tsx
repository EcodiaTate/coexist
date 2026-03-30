import { useState, useRef } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import {
    Users,
    MapPin,
    CalendarDays,
    TreePine, Clock,
    Leaf,
    Eye,
    ArrowUpRight,
    Globe,
    TrendingUp,
    ChevronRight,
    Trash2,
    BarChart3,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Dropdown } from '@/components/dropdown'
import { useCountUp } from '@/components/stat-card'
import { cn } from '@/lib/cn'
import { Link } from 'react-router-dom'
import {
    useAdminOverview,
    useTrendData,
    type TrendMonth,
    type DateRange,
    dateRangeOptions,
} from '@/hooks/use-admin-dashboard'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const } },
}

const statFadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}


/* ------------------------------------------------------------------ */
/*  Section heading (light mode - matching leader/home style)          */
/* ------------------------------------------------------------------ */

function SectionHeader({
  children,
  action,
  icon,
  sub,
}: {
  children: React.ReactNode
  action?: { label: string; to: string }
  icon?: React.ReactNode
  sub?: string
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">
          {icon && <span className="text-primary-400">{icon}</span>}
          {children}
        </h2>
        {sub && <span className="text-xs text-primary-300 font-medium">{sub}</span>}
      </div>
      {action && (
        <Link
          to={action.to}
          className="flex items-center gap-0.5 text-xs text-primary-500 font-semibold hover:text-primary-700 transition-[colors,transform] duration-150 active:scale-[0.97]"
        >
          {action.label}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bar chart (light theme)                                            */
/* ------------------------------------------------------------------ */

function TrendChart({
  data,
  dataKey,
  label,
  icon,
  color,
  barColor,
}: {
  data: TrendMonth[]
  dataKey: string
  label: string
  icon: React.ReactNode
  color: string
  barColor: string
}) {
  const shouldReduceMotion = useReducedMotion()
  const values = data.map((d) => d[dataKey as keyof TrendMonth] as number)
  const max = Math.max(...values, 1)
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-white shadow-md border border-primary-100/50 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex items-center justify-center w-9 h-9 rounded-lg', color)}>
            {icon}
          </span>
          <div>
            <h3 className="font-heading text-sm font-semibold text-primary-800">{label}</h3>
            <p className="text-xs text-primary-400 mt-0.5">{total.toLocaleString()} total</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 sm:gap-2 h-28 sm:h-36">
        {data.map((d, i) => {
          const val = d[dataKey as keyof TrendMonth] as number
          const height = val > 0 ? Math.max((val / max) * 100, 6) : 0
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-medium text-primary-500 tabular-nums">
                {val > 0 ? val : ''}
              </span>
              <div className="relative w-full flex-1">
                <motion.div
                  className={cn('absolute bottom-0 left-0 right-0 rounded-md', barColor)}
                  initial={shouldReduceMotion ? { height: `${height}%` } : { height: '0%' }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
                  style={{ minHeight: height > 0 ? 4 : 0 }}
                />
              </div>
              <span className="text-[11px] sm:text-[11px] text-primary-300 font-medium">{d.month}</span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero stat (count-up, used in the hero gradient cards)              */
/* ------------------------------------------------------------------ */

function HeroStatCard({
  value,
  label,
  icon,
  sub,
  bg,
  reducedMotion,
  delay = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  sub?: string
  bg: string
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
      className={cn('rounded-2xl p-3 sm:p-4 text-center shadow-lg flex flex-col items-center justify-center', bg)}
      aria-label={`${label}: ${value}`}
    >
      <span className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white mx-auto mb-2" aria-hidden="true">
        {icon}
      </span>
      <p
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight tabular-nums text-white leading-none"
      >
        {display.toLocaleString()}
      </p>
      <p className="mt-1 sm:mt-1.5 text-[9px] sm:text-[11px] font-semibold text-white/50 tracking-wider uppercase">{label}</p>
      {sub && (
        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold mt-1.5 text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
          <ArrowUpRight size={10} />
          {sub}
        </span>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact stat (light theme, like leader ImpactMini)                  */
/* ------------------------------------------------------------------ */

function ImpactStat({
  value,
  label,
  icon,
  color,
  inView,
  index = 0,
}: {
  value: number
  label: string
  icon: React.ReactNode
  color: string
  inView: boolean
  index?: number
}) {
  const rm = useReducedMotion()
  const display = useCountUp(value, 1200, inView && !rm)

  return (
    <motion.div
      className="flex items-center gap-3 rounded-xl bg-white/15 p-3.5"
      variants={rm ? undefined : statFadeUp}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      custom={index}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-heading text-lg font-extrabold text-white tabular-nums leading-tight">
          {value > 0 ? display.toLocaleString() : '-'}
        </p>
        <p className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">{label}</p>
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
  const showLoading = useDelayedLoading(isLoading)
  const { data: trends } = useTrendData()

  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion

  const impactRef = useRef<HTMLDivElement>(null)
  const impactInView = useInView(impactRef, { once: true, margin: '-60px' })

  useAdminHeader('Dashboard', { fullBleed: true })

  if (showLoading) {
    return (
      <div className="relative min-h-dvh overflow-x-hidden bg-white">
        {/* Hero skeleton */}
        <div className="relative h-[280px] bg-gradient-to-br from-primary-200 via-moss-200 to-primary-300 animate-pulse" />

        <div className="relative z-10 px-6 -mt-6 space-y-6 pb-20">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-primary-50 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>

          {/* Impact section */}
          <div className="space-y-3">
            <div className="h-4 w-36 rounded-full bg-primary-100 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-primary-50 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          </div>

          {/* Trend charts */}
          <div className="space-y-3">
            <div className="h-4 w-28 rounded-full bg-primary-100 animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-primary-50 animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
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
      icon: <TreePine size={16} className="text-white" />,
      color: 'bg-gradient-to-br from-moss-500 to-moss-600',
    },
    {
      value: data?.totalHours ?? 0,
      label: 'Est. Vol. Hours',
      icon: <Clock size={16} className="text-white" />,
      color: 'bg-gradient-to-br from-bark-500 to-bark-600',
    },
    {
      value: data?.totalRubbish ?? 0,
      label: 'Rubbish (kg)',
      icon: <Trash2 size={16} className="text-white" />,
      color: 'bg-gradient-to-br from-sky-500 to-sky-600',
    },
    ...(data?.totalArea ?? 0) > 0
      ? [{
          value: data?.totalArea ?? 0,
          label: 'Area (sqm)',
          icon: <Globe size={16} className="text-white" />,
          color: 'bg-gradient-to-br from-primary-500 to-primary-600',
        }]
      : [],
    ...(data?.totalNativePlants ?? 0) > 0
      ? [{
          value: data?.totalNativePlants ?? 0,
          label: 'Native Plants',
          icon: <Leaf size={16} className="text-white" />,
          color: 'bg-gradient-to-br from-sprout-500 to-sprout-600',
        }]
      : [],
    ...(data?.totalWildlife ?? 0) > 0
      ? [{
          value: data?.totalWildlife ?? 0,
          label: 'Wildlife Sightings',
          icon: <Eye size={16} className="text-white" />,
          color: 'bg-gradient-to-br from-warning-500 to-warning-600',
        }]
      : [],
  ]

  return (
    <div className="relative min-h-dvh bg-white">
      {/* ── Hero with gradient + wordmark + wave ── */}
      <div className="relative">
        <div className="relative w-full overflow-hidden" style={{ minHeight: '280px' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-600 via-primary-800 to-primary-950" />

          {/* Decorative shapes */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/[0.07]" />
          <div className="absolute -right-4 top-2 w-36 h-36 rounded-full border border-white/[0.10]" />
          <div className="absolute -left-10 bottom-4 w-40 h-40 rounded-full bg-white/[0.05]" />
          <div className="absolute left-[30%] top-[20%] w-20 h-20 rounded-full border border-white/[0.08]" />

          {/* Hero text */}
          <motion.div
            className="relative z-[2] flex flex-col items-center text-center px-6"
            style={{ paddingTop: '2.5rem', paddingBottom: '7rem' }}
            initial={rm ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
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
              className="mt-3 text-xs sm:text-sm text-white/30 font-medium tracking-widest uppercase"
            >
              National Dashboard
            </motion.p>
          </motion.div>
        </div>

        {/* Wave transition */}
        <div className="absolute bottom-0 left-0 right-0 z-[3]">
          <svg
            viewBox="0 0 1440 70"
            preserveAspectRatio="none"
            className="w-full h-7 sm:h-10 block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,25
                 C60,22 100,18 140,20
                 C180,22 200,15 220,18
                 L228,8 L234,5 L240,10
                 C280,18 340,24 400,20
                 C440,16 470,22 510,25
                 C560,28 600,20 640,22
                 C670,24 690,18 710,20
                 L718,10 L722,6 L728,12
                 C760,20 820,26 880,22
                 C920,18 950,24 990,26
                 C1020,28 1050,20 1080,18
                 C1100,16 1120,22 1140,24
                 L1148,12 L1153,7 L1158,9 L1165,16
                 C1200,22 1260,26 1320,22
                 C1360,18 1400,24 1440,22
                 L1440,70 L0,70 Z"
              className="fill-white"
            />
          </svg>
        </div>
      </div>

      {/* ── Content on white background ── */}
      <motion.div
        className="relative z-10 px-6 sm:px-8 -mt-1 space-y-8 pb-24"
        variants={rm ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* ── Period filter ── */}
        <motion.div variants={rm ? undefined : fadeUp} className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-primary-400 uppercase tracking-wider">
            {dateRangeOptions.find((o) => o.value === dateRange)?.label}
          </p>
          <Dropdown
            options={dateRangeOptions}
            value={dateRange}
            onChange={(v) => setDateRange(v as DateRange)}
            className="w-40"
          />
        </motion.div>

        {/* ── Primary stats (gradient cards like leader page) ── */}
        <motion.div variants={rm ? undefined : fadeUp}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <HeroStatCard
              value={data?.totalMembers ?? 0}
              label="Members"
              icon={<Users size={20} />}
              sub={data?.periodMembers ? `+${data.periodMembers}` : undefined}
              bg="bg-gradient-to-br from-primary-600 to-secondary-700 shadow-primary-700/30"
              reducedMotion={rm}
              delay={0}
            />
            <HeroStatCard
              value={data?.totalCollectives ?? 0}
              label="Collectives"
              icon={<MapPin size={20} />}
              bg="bg-gradient-to-br from-moss-500 to-moss-700 shadow-moss-600/30"
              reducedMotion={rm}
              delay={0.1}
            />
            <HeroStatCard
              value={data?.totalEvents ?? 0}
              label="Events Run"
              icon={<CalendarDays size={20} />}
              sub={data?.periodEvents ? `+${data.periodEvents}` : undefined}
              bg="bg-gradient-to-br from-sprout-500 to-primary-700 shadow-sprout-600/30"
              reducedMotion={rm}
              delay={0.2}
            />
            <HeroStatCard
              value={data?.totalHours ?? 0}
              label="Est. Vol. Hours"
              icon={<Clock size={20} />}
              bg="bg-gradient-to-br from-bark-500 to-bark-800 shadow-bark-600/30"
              reducedMotion={rm}
              delay={0.3}
            />
          </div>
        </motion.div>

        {/* ── Environmental Impact (rich branded section) ── */}
        <motion.div variants={rm ? undefined : fadeUp} ref={impactRef} className="-mx-6 sm:-mx-8">
          <div className="relative overflow-hidden" style={{ backgroundColor: '#869d61' }}>
            <div className="relative px-6 sm:px-8 pt-14 pb-16">
              <div className="flex items-center justify-between mb-1.5">
                <h2 className="font-heading text-xs font-bold text-white/90 uppercase tracking-[0.2em]">
                  Environmental Impact
                </h2>
                <span className="text-[11px] font-semibold text-white/50">
                  {dateRangeOptions.find((o) => o.value === dateRange)?.label}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-5">
                {impactItems.map((item, i) => (
                  <ImpactStat
                    key={item.label}
                    value={item.value}
                    label={item.label}
                    icon={item.icon}
                    color={item.color}
                    inView={impactInView}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Trend charts (light theme) ── */}
        {trends && trends.length > 0 && (
          <motion.div variants={rm ? undefined : fadeUp}>
            <SectionHeader icon={<BarChart3 size={14} />} sub="Last 6 months">
              Growth Trends
            </SectionHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <TrendChart
                data={trends}
                dataKey="members"
                label="Member Growth"
                icon={<TrendingUp size={16} className="text-white" />}
                color="bg-gradient-to-br from-primary-500 to-primary-600"
                barColor="bg-gradient-to-t from-primary-500 to-primary-300"
              />
              <TrendChart
                data={trends}
                dataKey="events"
                label="Event Frequency"
                icon={<CalendarDays size={16} className="text-white" />}
                color="bg-gradient-to-br from-moss-500 to-moss-600"
                barColor="bg-gradient-to-t from-moss-500 to-moss-300"
              />
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
