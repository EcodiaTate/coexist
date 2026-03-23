import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
    TreePine,
    Clock,
    Calendar,
    Trash2,
    Sprout,
    GraduationCap,
    Users,
    Share2,
    Flame,
    ArrowLeft,
    ArrowRight,
    Globe,
} from 'lucide-react'
import { Page } from '@/components/page'
import { CountUp } from '@/components/count-up'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'
import { useImpactStats, useMonthlyActivity, useImpactByCategory, useStreak } from '@/hooks/use-impact'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/* ─── category meta ─── */
const CATEGORY_COLORS: Record<string, string> = {
  shore_cleanup: '#5ea198',
  tree_planting: '#748b50',
  land_regeneration: '#47867d',
  nature_walk: '#869e62',
  camp_out: '#4a7a5e',
  retreat: '#9677ad',
  film_screening: '#b89565',
  marine_restoration: '#396c65',
  workshop: '#a07d4f',
}

const CATEGORY_LABELS: Record<string, string> = {
  shore_cleanup: 'Shore Cleanup',
  tree_planting: 'Tree Planting',
  land_regeneration: 'Land Regeneration',
  nature_walk: 'Nature Walks',
  camp_out: 'Camp Out',
  retreat: 'Retreats',
  film_screening: 'Film Screening',
  marine_restoration: 'Marine Restoration',
  workshop: 'Workshop',
}

/* ─── animation ─── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

/* ─── decorative shapes ─── */
function DecoShapes({ reduced }: { reduced: boolean }) {
  return (
    <>
      <motion.div
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full border-[3px] border-moss-200/35 pointer-events-none"
        animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[40%] -left-12 w-40 h-40 rounded-full border-[3px] border-moss-200/35 pointer-events-none"
        animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <div className="absolute bottom-24 -left-10 w-48 h-48 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sprout-100/26 to-transparent pointer-events-none" />
      <div className="absolute -top-10 right-8 w-56 h-56 rounded-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-moss-100/17 to-transparent pointer-events-none" />
      <motion.div
        className="absolute top-28 right-10 w-3 h-3 rounded-full bg-moss-300/30 pointer-events-none"
        animate={reduced ? undefined : { y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[55%] right-[20%] w-2 h-2 rounded-full bg-sprout-300/25 pointer-events-none"
        animate={reduced ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
      />
      <motion.div
        className="absolute bottom-48 left-[15%] w-2.5 h-2.5 rounded-full bg-moss-300/30 pointer-events-none"
        animate={reduced ? undefined : { y: [0, -10, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
    </>
  )
}

/* ─── skeleton ─── */
function ImpactSkeleton() {
  return (
    <div className="space-y-10 pt-8 pb-10 px-5">
      <div className="h-52 rounded-3xl bg-primary-100/40 animate-pulse" />
      <div className="grid grid-cols-2 gap-5">
        <div className="h-32 rounded-3xl bg-primary-100/30 animate-pulse" />
        <div className="h-32 rounded-3xl bg-primary-100/30 animate-pulse" />
        <div className="h-32 rounded-3xl bg-primary-100/30 animate-pulse" />
        <div className="h-32 rounded-3xl bg-primary-100/30 animate-pulse" />
      </div>
      <div className="h-48 rounded-3xl bg-primary-100/30 animate-pulse" />
    </div>
  )
}

/* ─── stat card configs ─── */
const STAT_CONFIGS: Record<string, { gradient: string; iconBg: string; iconColor: string }> = {
  events: {
    gradient: 'from-primary-100/90 to-primary-200/50',
    iconBg: 'bg-primary-600',
    iconColor: 'text-white',
  },
  hours: {
    gradient: 'from-bark-100/90 to-bark-200/50',
    iconBg: 'bg-bark-600',
    iconColor: 'text-white',
  },
  rubbish: {
    gradient: 'from-moss-100/90 to-moss-200/50',
    iconBg: 'bg-moss-600',
    iconColor: 'text-white',
  },
  cleanups: {
    gradient: 'from-sky-100/90 to-sky-200/50',
    iconBg: 'bg-sky-600',
    iconColor: 'text-white',
  },
  weeds: {
    gradient: 'from-plum-100/90 to-plum-200/50',
    iconBg: 'bg-plum-600',
    iconColor: 'text-white',
  },
  collectives: {
    gradient: 'from-sprout-100/90 to-sprout-200/50',
    iconBg: 'bg-sprout-600',
    iconColor: 'text-white',
  },
  leaders: {
    gradient: 'from-bark-100/90 to-bark-200/50',
    iconBg: 'bg-bark-600',
    iconColor: 'text-white',
  },
}

/* ─── big stat block ─── */
function BigStat({
  value,
  label,
  icon,
  config,
  suffix,
}: {
  value: number
  label: string
  icon: React.ReactNode
  config: string
  suffix?: string
}) {
  const style = STAT_CONFIGS[config] ?? STAT_CONFIGS.events

  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'relative flex flex-col items-center justify-center text-center rounded-3xl p-6 pb-8 min-h-[150px]',
        'bg-gradient-to-br',
        `${style.gradient}`,
      )}
    >
      <svg className="absolute top-1 right-3 w-16 h-12 opacity-[0.3] pointer-events-none" viewBox="0 0 64 48" fill="none">
        <ellipse cx="32" cy="12" rx="32" ry="18" fill="white" />
      </svg>

      <div className={cn(
        'mb-4 flex items-center justify-center w-11 h-11 rounded-2xl shadow-md',
        style.iconBg,
      )} aria-hidden="true">
        <span className={style.iconColor}>{icon}</span>
      </div>
      <div className="relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)' }} />
        <p className="relative font-heading text-4xl font-extrabold text-primary-900 tabular-nums leading-none">
          <CountUp end={value} />{suffix && <span className="text-lg">{suffix}</span>}
        </p>
      </div>
      <p className="relative text-[11px] uppercase tracking-[0.15em] text-primary-600 font-bold mt-2.5">
        {label}
      </p>
    </motion.div>
  )
}

/* ─── activity sparkline ─── */
function ActivitySparkline({ data }: { data: { month: string; count: number }[] }) {
  const shouldReduceMotion = useReducedMotion()
  if (data.length === 0) return null

  const recent = data.slice(-12)
  const maxCount = Math.max(...recent.map((d) => d.count), 1)

  return (
    <div className="flex items-end gap-[6px] h-32">
      {recent.map((item, i) => {
        const height = Math.max((item.count / maxCount) * 100, 6)
        const label = new Date(item.month + '-01').toLocaleDateString('en-AU', { month: 'short' })
        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 100, damping: 16, delay: i * 0.04 }
              }
              className="w-full rounded-xl bg-gradient-to-t from-primary-700 via-primary-500 to-primary-300 min-h-[6px] shadow-sm"
            />
            <span className="text-[11px] text-primary-500 font-bold">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── ring chart ─── */
function ImpactRing({ data }: { data: { category: string; count: number }[] }) {
  const shouldReduceMotion = useReducedMotion()
  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)
  let cumulative = 0
  const radius = 44
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex items-center gap-8">
      <div className="relative w-40 h-40 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="11" className="stroke-primary-100/50" />
          {data.map((item) => {
            const pct = item.count / total
            const dashLen = pct * circumference
            const offset = -(cumulative / total) * circumference
            cumulative += item.count
            return (
              <motion.circle
                key={item.category}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                stroke={CATEGORY_COLORS[item.category] ?? '#869e62'}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={offset}
                initial={shouldReduceMotion ? {} : { opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.15 }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-heading text-3xl font-extrabold text-primary-900 leading-none">
              <CountUp end={total} />
            </p>
            <p className="text-[11px] text-primary-500 uppercase tracking-widest mt-1 font-bold">events</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3.5">
        {data.slice(0, 5).map((item) => {
          const pct = Math.round((item.count / total) * 100)
          return (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-700 font-bold">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="text-xs text-primary-500 font-bold tabular-nums">{pct}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-primary-100/50 overflow-hidden">
                <motion.div
                  className="h-full rounded-full shadow-sm"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#869e62' }}
                  initial={shouldReduceMotion ? { width: `${pct}%` } : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── section heading ─── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.18em] text-primary-600 font-extrabold mb-5 flex items-center gap-2">
      <span className="h-0.5 w-4 rounded-full bg-primary-400/50" />
      {children}
    </p>
  )
}

/* ─── main page ─── */
export default function ImpactDashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { data: stats, isLoading: statsLoading } = useImpactStats()
  const showLoading = useDelayedLoading(statsLoading)
  const { data: monthly } = useMonthlyActivity()
  const { data: byCategory } = useImpactByCategory()
  const { data: streak } = useStreak()

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['impact'] })
  }, [queryClient])

  if (showLoading) {
    return (
      <Page swipeBack noBackground className="!px-0 bg-white">
        <div className="relative min-h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-moss-50/60 via-white to-sprout-50/20" />
          <div className="relative z-10 px-4 lg:px-6 pt-[var(--safe-top)]">
            <div className="h-14 flex items-center">
              <button type="button" onClick={() => navigate(-1)} className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-primary-800 hover:bg-primary-50/80 cursor-pointer select-none transition-colors duration-150" aria-label="Go back"><ArrowLeft size={22} /></button>
            </div>
            <ImpactSkeleton />
          </div>
        </div>
      </Page>
    )
  }
  if (statsLoading) return null

  if (!stats) {
    return (
      <Page swipeBack noBackground className="!px-0 bg-white">
        <div className="relative min-h-full">
          <div className="absolute inset-0 bg-gradient-to-b from-moss-50/60 via-white to-sprout-50/20" />
          <div className="relative z-10 px-4 lg:px-6 pt-[var(--safe-top)]">
            <div className="h-14 flex items-center">
              <button type="button" onClick={() => navigate(-1)} className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-primary-800 hover:bg-primary-50/80 cursor-pointer select-none transition-colors duration-150" aria-label="Go back"><ArrowLeft size={22} /></button>
            </div>
            <EmptyState
              illustration="empty"
              title="No impact data yet"
              description="Attend your first event to start tracking your conservation impact"
              action={{ label: 'Find Events', to: '/events' }}
            />
          </div>
        </div>
      </Page>
    )
  }

  const handleShare = async () => {
    const parts: string[] = []
    if (stats.eventsAttended > 0) parts.push(`${stats.eventsAttended} events attended`)
    if (stats.volunteerHours > 0) parts.push(`${stats.volunteerHours} volunteer hours`)
    if (stats.treesPlanted > 0) parts.push(`${stats.treesPlanted} trees planted`)
    if (stats.invasiveWeedsPulled > 0) parts.push(`${stats.invasiveWeedsPulled} invasive weeds pulled`)
    if (stats.rubbishCollectedTonnes > 0) parts.push(`${stats.rubbishCollectedTonnes}t rubbish collected`)
    if (stats.cleanupSites > 0) parts.push(`${stats.cleanupSites} cleanup sites`)
    if (stats.leadersEmpowered > 0) parts.push(`${stats.leadersEmpowered} leaders empowered`)
    const text = `My Co-Exist Impact: ${parts.join(', ')}! Join at coexistaus.org`
    if (navigator.share) {
      await navigator.share({ title: 'My Co-Exist Impact', text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <Page swipeBack noBackground className="!px-0 bg-white">
      <PullToRefresh
        onRefresh={handleRefresh}
        background={
          <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-moss-50/60 via-white to-sprout-50/20" />
            <DecoShapes reduced={!!shouldReduceMotion} />
          </div>
        }
      >
        <div className="relative min-h-full">
          {/* ─── Back button ─── */}
          <div className="relative z-10 px-4 lg:px-6 pt-[var(--safe-top)]">
            <div className="h-14 flex items-center">
              <button type="button" onClick={() => navigate(-1)} className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-primary-800 hover:bg-primary-50/80 cursor-pointer select-none transition-colors duration-150" aria-label="Go back"><ArrowLeft size={22} /></button>
            </div>
          </div>

          {/* ─── Content ─── */}
          <div className="relative z-10 px-4 lg:px-6 pb-4 space-y-5">

            {/* ─── Hero: Community Events ─── */}
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="show"
            >
              <motion.div
                variants={fadeUp}
                className="relative rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-7 shadow-2xl overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

                <div className="relative">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/20">
                      <TreePine size={20} strokeWidth={2.5} className="text-white" />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 font-bold">
                      Your Conservation Footprint
                    </p>
                  </div>

                  <div className="flex items-baseline gap-6">
                    <div>
                      <span className="font-heading text-6xl font-extrabold text-white tabular-nums leading-none tracking-tight">
                        <CountUp end={stats.eventsAttended} />
                      </span>
                      <p className="text-base text-white/70 font-semibold mt-2">event attendances</p>
                    </div>
                    <div className="border-l border-white/15 pl-6">
                      <span className="font-heading text-4xl font-extrabold text-white tabular-nums leading-none tracking-tight">
                        <CountUp end={stats.volunteerHours} />
                      </span>
                      <p className="text-sm text-white/60 font-semibold mt-1">volunteer hours</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* ─── Core Stats Grid: Canonical Metrics ─── */}
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 gap-4"
            >
              {/* Land Restoration */}
              <BigStat
                value={stats.treesPlanted}
                label="Trees Planted"
                icon={<TreePine size={20} strokeWidth={2.5} />}
                config="events"
              />
              <BigStat
                value={stats.invasiveWeedsPulled}
                label="Weeds Pulled"
                icon={<Sprout size={20} strokeWidth={2.5} />}
                config="weeds"
              />

              {/* Cleanup Sites */}
              <BigStat
                value={stats.rubbishCollectedTonnes}
                label="Rubbish (tonnes)"
                icon={<Trash2 size={20} strokeWidth={2.5} />}
                config="rubbish"
                suffix="t"
              />
              <BigStat
                value={stats.cleanupSites}
                label="Cleanup Sites"
                icon={<Trash2 size={20} strokeWidth={2.5} />}
                config="cleanups"
              />

              {/* Organisational */}
              <BigStat
                value={stats.collectivesCount}
                label="Collectives"
                icon={<Users size={20} strokeWidth={2.5} />}
                config="collectives"
              />
              <BigStat
                value={stats.leadersEmpowered}
                label="Leaders Empowered"
                icon={<GraduationCap size={20} strokeWidth={2.5} />}
                config="leaders"
              />
            </motion.div>

            {/* ─── Streak ─── */}
            {streak && (streak.currentWeeks > 0 || streak.currentMonths > 0) && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 22 }}
                className="flex items-center gap-5 rounded-3xl bg-gradient-to-r from-warning-100/80 via-warning-50 to-coral-100/60 bg-white shadow-sm border border-moss-50/60 p-6"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-warning-500 to-coral-500 shadow-lg shadow-warning-200/50">
                  <Flame size={26} strokeWidth={2.5} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-warning-700 font-extrabold mb-2.5">
                    Active Streak
                  </p>
                  <div className="flex items-baseline gap-4">
                    <p className="font-heading text-3xl font-extrabold text-primary-900 tabular-nums">
                      <CountUp end={streak.currentWeeks} />
                      <span className="text-sm font-bold text-primary-500 ml-1">wks</span>
                    </p>
                    <span className="w-0.5 h-7 bg-primary-300/50 rounded-full" />
                    <p className="font-heading text-3xl font-extrabold text-primary-900 tabular-nums">
                      <CountUp end={streak.currentMonths} />
                      <span className="text-sm font-bold text-primary-500 ml-1">mos</span>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Monthly Activity ─── */}
            {monthly && monthly.length > 0 && (
              <motion.section
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 22 }}
              >
                <SectionHeading>Monthly Activity</SectionHeading>
                <div className="rounded-3xl bg-white shadow-sm border border-moss-50/60 p-6">
                  <ActivitySparkline data={monthly} />
                </div>
              </motion.section>
            )}

            {/* ─── Category Breakdown ─── */}
            {byCategory && byCategory.length > 0 && (
              <motion.section
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 22 }}
              >
                <SectionHeading>Impact Breakdown</SectionHeading>
                <div className="rounded-3xl bg-white shadow-sm border border-moss-50/60 p-6">
                  <ImpactRing data={byCategory} />
                </div>
              </motion.section>
            )}

            {/* ─── National Impact CTA ─── */}
            <motion.button
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 22 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/impact/national')}
              className="w-full flex items-center gap-5 rounded-3xl bg-gradient-to-r from-primary-600 to-primary-700 shadow-xl shadow-primary-300/30 p-6 min-h-11 text-left active:scale-[0.97] transition-all duration-150 hover:shadow-2xl cursor-pointer select-none overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/4" />
              <div className="relative flex items-center justify-center w-13 h-13 rounded-2xl bg-white/20">
                <Globe size={24} strokeWidth={2.5} className="text-white" />
              </div>
              <div className="relative flex-1 min-w-0">
                <p className="font-heading text-base font-bold text-white">National Impact</p>
                <p className="text-sm text-white/60 font-medium mt-1">
                  See how the whole community is making a difference
                </p>
              </div>
              <ArrowRight size={20} strokeWidth={2.5} className="text-white/50 shrink-0 relative" />
            </motion.button>

            {/* ─── Comparison ─── */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
              className="rounded-3xl bg-white shadow-sm border border-moss-50/60 bg-gradient-to-br from-bark-100/60 to-bark-200/40 p-6"
            >
              <p className="text-sm text-primary-700 font-semibold leading-relaxed">
                {stats.treesPlanted > 10
                  ? `You've planted ${Math.round(stats.treesPlanted / 3)}x more trees than the average Co-Exist member. Keep it up!`
                  : 'Keep attending events to grow your impact and see how you compare!'}
              </p>
            </motion.div>

            {/* ─── Share Button ─── */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 22 }}
              className="pb-8"
            >
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<Share2 size={18} />}
                onClick={handleShare}
              >
                Share My Impact
              </Button>
            </motion.div>

          </div>
        </div>
      </PullToRefresh>
    </Page>
  )
}
