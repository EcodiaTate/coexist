import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
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
  BarChart3,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { StatCard } from '@/components/stat-card'
import { CountUp } from '@/components/count-up'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { Button } from '@/components/button'
import { TabBar } from '@/components/tab-bar'
import { cn } from '@/lib/cn'
import { useImpactStats, useMonthlyActivity, useImpactByCategory, useStreak } from '@/hooks/use-impact'

const CATEGORY_COLORS: Record<string, string> = {
  tree_planting: 'bg-green-500',
  beach_cleanup: 'bg-blue-500',
  habitat_restoration: 'bg-emerald-500',
  nature_walk: 'bg-lime-500',
  education: 'bg-violet-500',
  wildlife_survey: 'bg-amber-500',
  seed_collecting: 'bg-teal-500',
  weed_removal: 'bg-orange-500',
  waterway_cleanup: 'bg-cyan-500',
  community_garden: 'bg-pink-500',
  other: 'bg-primary-400',
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

function ImpactSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </div>
  )
}

function ActivityChart({ data }: { data: { month: string; count: number }[] }) {
  const shouldReduceMotion = useReducedMotion()
  if (data.length === 0) return null

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const recentMonths = data.slice(-12)

  return (
    <div className="mt-2">
      <div className="flex items-end gap-1.5 h-32">
        {recentMonths.map((item, i) => {
          const height = (item.count / maxCount) * 100
          const monthLabel = new Date(item.month + '-01').toLocaleDateString('en-AU', {
            month: 'short',
          })
          return (
            <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-primary-400 font-medium">
                {item.count}
              </span>
              <motion.div
                initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0 }}
                animate={{ height: `${height}%` }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 100, damping: 15, delay: i * 0.03 }
                }
                className="w-full rounded-t-md bg-primary-400 min-h-[4px]"
              />
              <span className="text-[9px] text-primary-400">{monthLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DonutChart({ data }: { data: { category: string; count: number }[] }) {
  const shouldReduceMotion = useReducedMotion()
  if (data.length === 0) return null

  const total = data.reduce((sum, d) => sum + d.count, 0)
  let cumulativePercent = 0

  return (
    <div className="flex items-center gap-6">
      {/* SVG Donut */}
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {data.map((item) => {
            const percent = (item.count / total) * 100
            const offset = cumulativePercent
            cumulativePercent += percent
            const color = CATEGORY_COLORS[item.category] ?? 'bg-primary-400'
            // Extract color for SVG stroke
            const strokeClass = color.replace('bg-', 'text-')
            return (
              <motion.circle
                key={item.category}
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                className={strokeClass}
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={shouldReduceMotion ? -offset : -offset}
                initial={shouldReduceMotion ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-heading text-lg font-bold text-primary-800">{total}</p>
            <p className="text-[10px] text-primary-400">events</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1.5">
        {data.slice(0, 5).map((item) => (
          <div key={item.category} className="flex items-center gap-2">
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', CATEGORY_COLORS[item.category])} />
            <span className="text-xs text-primary-400 flex-1 truncate">
              {CATEGORY_LABELS[item.category] ?? item.category}
            </span>
            <span className="text-xs font-semibold text-primary-800 tabular-nums">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
    const text = `My Co-Exist Impact: ${stats.treesPlanted} trees planted, ${stats.eventsAttended} events attended, ${stats.hoursVolunteered} hours volunteered!`
    if (navigator.share) {
      await navigator.share({ title: 'My Co-Exist Impact', text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <Page
      header={
        <Header
          title="My Impact"
          back
          rightActions={
            <button
              onClick={handleShare}
              className="flex items-center justify-center w-9 h-9 rounded-full text-primary-400 hover:bg-primary-50 transition-colors"
              aria-label="Share impact"
            >
              <Share2 size={20} />
            </button>
          }
        />
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 pb-8">
        {/* Hero Stats */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          <StatCard
            value={stats.treesPlanted}
            label="Trees Planted"
            icon={<TreePine size={20} />}
          />
          <StatCard
            value={stats.hoursVolunteered}
            label="Hours Volunteered"
            icon={<Clock size={20} />}
          />
          <StatCard
            value={stats.eventsAttended}
            label="Events Attended"
            icon={<Calendar size={20} />}
          />
          <StatCard
            value={stats.rubbishCollectedKg}
            label="Rubbish (kg)"
            icon={<Trash2 size={20} />}
          />
        </motion.div>

        {/* Extra stats row */}
        {(stats.coastlineCleanedM > 0 || stats.nativePlants > 0 || stats.wildlifeSightings > 0) && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-3 grid grid-cols-3 gap-3"
          >
            {stats.coastlineCleanedM > 0 && (
              <StatCard
                value={stats.coastlineCleanedM}
                label="Coastline (m)"
                icon={<Waves size={18} />}
              />
            )}
            {stats.nativePlants > 0 && (
              <StatCard
                value={stats.nativePlants}
                label="Native Plants"
                icon={<Sprout size={18} />}
              />
            )}
            {stats.wildlifeSightings > 0 && (
              <StatCard
                value={stats.wildlifeSightings}
                label="Wildlife Sightings"
                icon={<Bird size={18} />}
              />
            )}
          </motion.div>
        )}

        {/* Streak Tracker */}
        {streak && (streak.currentWeeks > 0 || streak.currentMonths > 0) && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 rounded-xl bg-gradient-to-r from-white to-accent-100 border border-accent-200 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} className="text-primary-400" />
              <h3 className="font-heading text-sm font-semibold text-primary-800">
                Active Streak
              </h3>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="font-heading text-2xl font-bold text-primary-400">
                  <CountUp end={streak.currentWeeks} />
                </p>
                <p className="text-xs text-primary-400">weeks active</p>
              </div>
              <div>
                <p className="font-heading text-2xl font-bold text-primary-400">
                  <CountUp end={streak.currentMonths} />
                </p>
                <p className="text-xs text-primary-400">months active</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Chart */}
        {monthly && monthly.length > 0 && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={18} className="text-primary-400" />
              <h3 className="font-heading text-base font-semibold text-primary-800">
                Events Per Month
              </h3>
            </div>
            <div className="rounded-xl bg-white border border-primary-100 shadow-sm p-4">
              <ActivityChart data={monthly} />
            </div>
          </motion.section>
        )}

        {/* Impact by Category */}
        {byCategory && byCategory.length > 0 && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <h3 className="font-heading text-base font-semibold text-primary-800 mb-3">
              Impact by Category
            </h3>
            <div className="rounded-xl bg-white border border-primary-100 shadow-sm p-4">
              <DonutChart data={byCategory} />
            </div>
          </motion.section>
        )}

        {/* Comparison */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-6 rounded-xl bg-white border border-primary-100 p-4"
        >
          <p className="text-sm text-primary-400 font-medium">
            {stats.treesPlanted > 10
              ? `You've planted ${Math.round(stats.treesPlanted / 3)}x more trees than the average Co-Exist member!`
              : 'Keep attending events to grow your impact and see how you compare!'}
          </p>
        </motion.div>

        {/* Share Button */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
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
