import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  TreePine,
  Clock,
  Calendar,
  Trash2,
  Waves,
  Sprout,
  Bird,
  Share2,
  Flame,
  ArrowRight,
  Globe,
  Leaf,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { CountUp } from '@/components/count-up'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'
import { useImpactStats, useMonthlyActivity, useImpactByCategory, useStreak } from '@/hooks/use-impact'

/* ─── category meta ─── */
const CATEGORY_COLORS: Record<string, string> = {
  tree_planting: '#4ade80',
  beach_cleanup: '#60a5fa',
  habitat_restoration: '#34d399',
  nature_walk: '#a3e635',
  education: '#a78bfa',
  wildlife_survey: '#fbbf24',
  seed_collecting: '#2dd4bf',
  weed_removal: '#fb923c',
  waterway_cleanup: '#22d3ee',
  community_garden: '#f472b6',
  other: '#879e62',
}

const CATEGORY_LABELS: Record<string, string> = {
  tree_planting: 'Tree Planting',
  beach_cleanup: 'Beach Cleanup',
  habitat_restoration: 'Habitat Restoration',
  nature_walk: 'Nature Walks',
  education: 'Education',
  wildlife_survey: 'Wildlife Surveys',
  seed_collecting: 'Seed Collecting',
  weed_removal: 'Weed Removal',
  waterway_cleanup: 'Waterway Cleanup',
  community_garden: 'Community Gardens',
  other: 'Other',
}

/* ─── animation orchestration ─── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 22 } },
}

/* ─── skeleton ─── */
function ImpactSkeleton() {
  return (
    <div className="space-y-8 px-5 pt-8 pb-10">
      <div className="h-44 rounded-3xl bg-primary-100/60 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-2xl bg-primary-100/40 animate-pulse" />
        <div className="h-24 rounded-2xl bg-primary-100/40 animate-pulse" />
        <div className="h-24 rounded-2xl bg-primary-100/40 animate-pulse" />
      </div>
      <div className="h-48 rounded-3xl bg-primary-100/40 animate-pulse" />
      <div className="h-40 rounded-3xl bg-primary-100/40 animate-pulse" />
    </div>
  )
}

/* ─── hero stat pill ─── */
function HeroStat({
  value,
  label,
  icon,
  large,
}: {
  value: number
  label: string
  icon: React.ReactNode
  large?: boolean
}) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col items-center text-center gap-1">
      <span className="text-white/60" aria-hidden="true">{icon}</span>
      <p
        className={cn(
          'font-heading font-bold text-white tabular-nums leading-none',
          large ? 'text-4xl' : 'text-2xl',
        )}
      >
        <CountUp end={value} />
      </p>
      <p className="text-[11px] text-white/70 uppercase tracking-widest font-medium">{label}</p>
    </motion.div>
  )
}

/* ─── mini metric ─── */
function MiniMetric({
  value,
  label,
  icon,
}: {
  value: number
  label: string
  icon: React.ReactNode
}) {
  return (
    <motion.div
      variants={scaleIn}
      className="flex flex-col items-center gap-2 rounded-2xl bg-white/80 backdrop-blur-sm border border-primary-100/80 p-4"
    >
      <span className="text-primary-400" aria-hidden="true">{icon}</span>
      <p className="font-heading text-xl font-bold text-primary-800 tabular-nums">
        <CountUp end={value} />
      </p>
      <p className="text-[10px] text-primary-400/80 uppercase tracking-wider font-medium leading-tight text-center">
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
    <div className="flex items-end gap-[5px] h-24">
      {recent.map((item, i) => {
        const height = Math.max((item.count / maxCount) * 100, 6)
        const label = new Date(item.month + '-01').toLocaleDateString('en-AU', { month: 'short' })
        return (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-1.5">
            <motion.div
              initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 1 }}
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 120, damping: 16, delay: i * 0.04 }
              }
              className="w-full rounded-full bg-gradient-to-t from-primary-500 to-primary-300 min-h-[4px]"
            />
            <span className="text-[9px] text-primary-400/70 font-medium">{label}</span>
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
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-primary-100/60" />
          {/* Segments */}
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
                strokeWidth="8"
                strokeLinecap="round"
                stroke={CATEGORY_COLORS[item.category] ?? '#879e62'}
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
            <p className="font-heading text-2xl font-bold text-primary-800 leading-none">
              <CountUp end={total} />
            </p>
            <p className="text-[10px] text-primary-400/70 uppercase tracking-wider mt-0.5">events</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {data.slice(0, 5).map((item) => {
          const pct = Math.round((item.count / total) * 100)
          return (
            <div key={item.category} className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-600 font-medium">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="text-xs text-primary-400 tabular-nums">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-primary-100/60 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#879e62' }}
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

/* ─── main page ─── */
export default function ImpactDashboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { data: stats, isLoading: statsLoading } = useImpactStats()
  const { data: monthly } = useMonthlyActivity()
  const { data: byCategory } = useImpactByCategory()
  const { data: streak } = useStreak()

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['impact'] })
  }, [queryClient])

  if (statsLoading) {
    return (
      <Page header={<Header title="My Impact" back />}>
        <ImpactSkeleton />
      </Page>
    )
  }

  if (!stats) {
    return (
      <Page header={<Header title="My Impact" back />}>
        <EmptyState
          illustration="empty"
          title="No impact data yet"
          description="Attend your first event to start tracking your conservation impact"
          action={{ label: 'Find Events', to: '/explore' }}
        />
      </Page>
    )
  }

  const handleShare = async () => {
    const text = `My Co-Exist Impact: ${stats.treesPlanted} trees planted, ${stats.eventsAttended} events attended, ${stats.hoursVolunteered} hours volunteered! 🌱`
    if (navigator.share) {
      await navigator.share({ title: 'My Co-Exist Impact', text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  const hasExtras = stats.coastlineCleanedM > 0 || stats.nativePlants > 0 || stats.wildlifeSightings > 0

  return (
    <Page
      header={
        <Header
          title="My Impact"
          back
          rightActions={
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 rounded-full text-primary-400 hover:bg-primary-50 active:scale-95 transition-all"
              aria-label="Share impact"
            >
              <Share2 size={20} />
            </button>
          }
        />
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="pb-10">

          {/* ─── Hero Section ─── */}
          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="show"
            className="relative overflow-hidden mx-4 mt-4 rounded-3xl bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-800 p-6 pb-7"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/[0.04] -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/[0.03] translate-y-1/3 -translate-x-1/4" />
            <Leaf
              size={80}
              className="absolute -bottom-2 -right-2 text-white/[0.04] rotate-12"
              strokeWidth={1}
              aria-hidden="true"
            />

            <motion.p
              variants={fadeUp}
              className="text-[11px] uppercase tracking-[0.2em] text-white/50 font-medium mb-6"
            >
              Your Conservation Footprint
            </motion.p>

            {/* Primary hero stat */}
            <motion.div variants={fadeUp} className="flex items-baseline gap-2 mb-8">
              <span className="font-heading text-6xl font-bold text-white tabular-nums leading-none">
                <CountUp end={stats.treesPlanted} />
              </span>
              <span className="text-lg text-white/50 font-medium">trees planted</span>
            </motion.div>

            {/* Secondary stats row */}
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="show"
              className="grid grid-cols-3 gap-4"
            >
              <HeroStat
                value={stats.hoursVolunteered}
                label="Hours"
                icon={<Clock size={16} />}
              />
              <HeroStat
                value={stats.eventsAttended}
                label="Events"
                icon={<Calendar size={16} />}
              />
              <HeroStat
                value={stats.rubbishCollectedKg}
                label="kg Rubbish"
                icon={<Trash2 size={16} />}
              />
            </motion.div>
          </motion.div>

          {/* ─── Extra Stats ─── */}
          {hasExtras && (
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="show"
              className="px-4 mt-4 grid grid-cols-3 gap-3"
            >
              {stats.coastlineCleanedM > 0 && (
                <MiniMetric value={stats.coastlineCleanedM} label="Coastline (m)" icon={<Waves size={18} />} />
              )}
              {stats.nativePlants > 0 && (
                <MiniMetric value={stats.nativePlants} label="Native Plants" icon={<Sprout size={18} />} />
              )}
              {stats.wildlifeSightings > 0 && (
                <MiniMetric value={stats.wildlifeSightings} label="Wildlife" icon={<Bird size={18} />} />
              )}
            </motion.div>
          )}

          {/* ─── Streak ─── */}
          {streak && (streak.currentWeeks > 0 || streak.currentMonths > 0) && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 22 }}
              className="mx-4 mt-6 flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary-50 to-white border border-primary-100/60 p-5"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100/60">
                <Flame size={22} className="text-primary-500" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] uppercase tracking-widest text-primary-400/70 font-medium mb-1">
                  Active Streak
                </p>
                <div className="flex items-baseline gap-3">
                  <p className="font-heading text-2xl font-bold text-primary-800 tabular-nums">
                    <CountUp end={streak.currentWeeks} />
                    <span className="text-sm font-medium text-primary-400 ml-1">wks</span>
                  </p>
                  <span className="w-px h-5 bg-primary-200" />
                  <p className="font-heading text-2xl font-bold text-primary-800 tabular-nums">
                    <CountUp end={streak.currentMonths} />
                    <span className="text-sm font-medium text-primary-400 ml-1">mos</span>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Monthly Activity ─── */}
          {monthly && monthly.length > 0 && (
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 22 }}
              className="mx-4 mt-8"
            >
              <p className="text-[11px] uppercase tracking-[0.15em] text-primary-400/60 font-medium mb-3">
                Monthly Activity
              </p>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-primary-100/60 shadow-sm p-5">
                <ActivitySparkline data={monthly} />
              </div>
            </motion.section>
          )}

          {/* ─── Category Breakdown ─── */}
          {byCategory && byCategory.length > 0 && (
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 22 }}
              className="mx-4 mt-8"
            >
              <p className="text-[11px] uppercase tracking-[0.15em] text-primary-400/60 font-medium mb-3">
                Impact Breakdown
              </p>
              <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-primary-100/60 shadow-sm p-5">
                <ImpactRing data={byCategory} />
              </div>
            </motion.section>
          )}

          {/* ─── National CTA ─── */}
          <motion.button
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 22 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/impact/national')}
            className="mx-4 mt-8 w-[calc(100%-2rem)] flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary-100/60 to-primary-50/40 border border-primary-200/50 p-5 text-left transition-shadow hover:shadow-md active:shadow-sm"
          >
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-400/10">
              <Globe size={20} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold text-primary-800">National Impact</p>
              <p className="text-xs text-primary-400/80 mt-0.5">
                See how the whole community is making a difference
              </p>
            </div>
            <ArrowRight size={18} className="text-primary-300 shrink-0" />
          </motion.button>

          {/* ─── Comparison ─── */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
            className="mx-4 mt-6 rounded-2xl bg-primary-50/50 border border-primary-100/40 p-5"
          >
            <p className="text-sm text-primary-600 font-medium leading-relaxed">
              {stats.treesPlanted > 10
                ? `You've planted ${Math.round(stats.treesPlanted / 3)}x more trees than the average Co-Exist member. Keep it up!`
                : 'Keep attending events to grow your impact and see how you compare!'}
            </p>
          </motion.div>

          {/* ─── Share Button ─── */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, type: 'spring', stiffness: 200, damping: 22 }}
            className="mx-4 mt-8"
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
      </PullToRefresh>
    </Page>
  )
}
