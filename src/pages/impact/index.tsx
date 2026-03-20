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
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { CountUp } from '@/components/count-up'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { Button } from '@/components/button'
import { cn } from '@/lib/cn'
import { useImpactStats, useMonthlyActivity, useImpactByCategory, useStreak } from '@/hooks/use-impact'

/* ─── category meta ─── */
const CATEGORY_COLORS: Record<string, string> = {
  tree_planting: '#748b50',
  beach_cleanup: '#5ea198',
  habitat_restoration: '#47867d',
  nature_walk: '#879e62',
  education: '#9677ad',
  wildlife_survey: '#b89565',
  seed_collecting: '#5ea198',
  weed_removal: '#a07d4f',
  waterway_cleanup: '#396c65',
  community_garden: '#664c7b',
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

/* ─── animation ─── */
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
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

/* ─── big stat block ─── */
function BigStat({
  value,
  label,
  icon,
  bg,
}: {
  value: number
  label: string
  icon: React.ReactNode
  bg: string
}) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-3xl p-6 min-h-[140px]',
        bg,
      )}
    >
      <span className="mb-3 opacity-60" aria-hidden="true">{icon}</span>
      <p className="font-heading text-4xl font-bold text-primary-800 tabular-nums leading-none">
        <CountUp end={value} />
      </p>
      <p className="text-[11px] uppercase tracking-[0.15em] text-primary-500 font-medium mt-2">
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
    <div className="flex items-end gap-[6px] h-28">
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
              className="w-full rounded-full bg-gradient-to-t from-primary-600 to-primary-300 min-h-[4px]"
            />
            <span className="text-[9px] text-primary-400/60 font-medium">{label}</span>
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
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="10" className="stroke-primary-100/40" />
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
                strokeWidth="10"
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
            <p className="font-heading text-3xl font-bold text-primary-800 leading-none">
              <CountUp end={total} />
            </p>
            <p className="text-[10px] text-primary-400/60 uppercase tracking-widest mt-1">events</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {data.slice(0, 5).map((item) => {
          const pct = Math.round((item.count / total) * 100)
          return (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-600 font-medium">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </span>
                <span className="text-xs text-primary-400 tabular-nums">{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-primary-100/40 overflow-hidden">
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
    const text = `My Co-Exist Impact: ${stats.treesPlanted} trees planted, ${stats.eventsAttended} events attended, ${stats.hoursVolunteered} hours volunteered! Join at coexistaus.org`
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
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
              aria-label="Share impact"
            >
              <Share2 size={20} />
            </button>
          }
        />
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="pb-12">

          {/* ─── Hero: Trees Planted ─── */}
          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="show"
            className="px-5 pt-8 pb-2"
          >
            <motion.p
              variants={fadeUp}
              className="text-[11px] uppercase tracking-[0.2em] text-primary-400/50 font-medium"
            >
              Your Conservation Footprint
            </motion.p>

            <motion.div variants={fadeUp} className="mt-6 mb-2">
              <span className="font-heading text-7xl font-bold text-primary-800 tabular-nums leading-none tracking-tight">
                <CountUp end={stats.treesPlanted} />
              </span>
              <p className="text-base text-primary-400 font-medium mt-2">trees planted</p>
            </motion.div>
          </motion.div>

          {/* ─── Divider ─── */}
          <div className="mx-5 h-px bg-primary-100/60 my-6" />

          {/* ─── Core Stats Grid ─── */}
          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="show"
            className="px-5 grid grid-cols-2 gap-4"
          >
            <BigStat
              value={stats.eventsAttended}
              label="Events"
              icon={<Calendar size={22} className="text-primary-500" />}
              bg="bg-primary-50/80"
            />
            <BigStat
              value={stats.hoursVolunteered}
              label="Hours"
              icon={<Clock size={22} className="text-primary-500" />}
              bg="bg-bark-50/80"
            />
            <BigStat
              value={stats.rubbishCollectedKg}
              label="kg Rubbish"
              icon={<Trash2 size={22} className="text-primary-500" />}
              bg="bg-moss-50/80"
            />
            {hasExtras ? (
              stats.coastlineCleanedM > 0 ? (
                <BigStat
                  value={stats.coastlineCleanedM}
                  label="Coastline (m)"
                  icon={<Waves size={22} className="text-moss-500" />}
                  bg="bg-primary-50/60"
                />
              ) : stats.nativePlants > 0 ? (
                <BigStat
                  value={stats.nativePlants}
                  label="Native Plants"
                  icon={<Sprout size={22} className="text-primary-500" />}
                  bg="bg-primary-50/60"
                />
              ) : (
                <BigStat
                  value={stats.wildlifeSightings}
                  label="Wildlife"
                  icon={<Bird size={22} className="text-bark-500" />}
                  bg="bg-bark-50/60"
                />
              )
            ) : (
              <BigStat
                value={0}
                label="Coastline (m)"
                icon={<Waves size={22} className="text-moss-400" />}
                bg="bg-moss-50/40"
              />
            )}
          </motion.div>

          {/* ─── Extra Stats (remaining ones not shown above) ─── */}
          {hasExtras && (
            <motion.div
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="show"
              className="px-5 mt-4 flex gap-4"
            >
              {stats.coastlineCleanedM > 0 && stats.nativePlants > 0 && (
                <motion.div variants={fadeUp} className="flex-1 flex flex-col items-center rounded-2xl bg-primary-50/50 p-5">
                  <Sprout size={18} className="text-primary-400 mb-2" />
                  <p className="font-heading text-2xl font-bold text-primary-800 tabular-nums"><CountUp end={stats.nativePlants} /></p>
                  <p className="text-[10px] uppercase tracking-widest text-primary-400/60 font-medium mt-1">Native Plants</p>
                </motion.div>
              )}
              {stats.wildlifeSightings > 0 && (stats.coastlineCleanedM > 0 || stats.nativePlants > 0) && (
                <motion.div variants={fadeUp} className="flex-1 flex flex-col items-center rounded-2xl bg-bark-50/50 p-5">
                  <Bird size={18} className="text-bark-400 mb-2" />
                  <p className="font-heading text-2xl font-bold text-primary-800 tabular-nums"><CountUp end={stats.wildlifeSightings} /></p>
                  <p className="text-[10px] uppercase tracking-widest text-primary-400/60 font-medium mt-1">Wildlife</p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ─── Streak ─── */}
          {streak && (streak.currentWeeks > 0 || streak.currentMonths > 0) && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 22 }}
              className="mx-5 mt-8 flex items-center gap-5 rounded-3xl bg-white shadow-sm p-6"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-50">
                <Flame size={24} className="text-primary-500" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-2">
                  Active Streak
                </p>
                <div className="flex items-baseline gap-4">
                  <p className="font-heading text-3xl font-bold text-primary-800 tabular-nums">
                    <CountUp end={streak.currentWeeks} />
                    <span className="text-sm font-medium text-primary-400 ml-1">wks</span>
                  </p>
                  <span className="w-px h-6 bg-primary-200/60" />
                  <p className="font-heading text-3xl font-bold text-primary-800 tabular-nums">
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
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 200, damping: 22 }}
              className="mx-5 mt-10"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4">
                Monthly Activity
              </p>
              <div className="rounded-3xl bg-white shadow-sm p-6">
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
              className="mx-5 mt-10"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4">
                Impact Breakdown
              </p>
              <div className="rounded-3xl bg-white shadow-sm p-6">
                <ImpactRing data={byCategory} />
              </div>
            </motion.section>
          )}

          {/* ─── National Impact CTA ─── */}
          <motion.button
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 22 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/impact/national')}
            className="mx-5 mt-10 w-[calc(100%-2.5rem)] flex items-center gap-5 rounded-3xl bg-primary-50/60 shadow-sm p-6 min-h-11 text-left active:scale-[0.97] transition-all duration-150 hover:shadow-md cursor-pointer select-none"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-400/10">
              <Globe size={22} className="text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-base font-semibold text-primary-800">National Impact</p>
              <p className="text-xs text-primary-400/70 mt-1">
                See how the whole community is making a difference
              </p>
            </div>
            <ArrowRight size={18} className="text-primary-300 shrink-0" />
          </motion.button>

          {/* ─── Comparison ─── */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 22 }}
            className="mx-5 mt-8 rounded-3xl bg-bark-50/40 shadow-sm p-6"
          >
            <p className="text-sm text-primary-600 font-medium leading-relaxed">
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
            className="mx-5 mt-10"
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
