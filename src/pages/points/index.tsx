import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Star, TrendingUp, Calendar } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Badge } from '@/components/badge'
import { CountUp } from '@/components/count-up'
import { ProgressBar } from '@/components/progress-bar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { usePointsBalance, usePointsHistory, getTierProgress, POINT_VALUES } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'

const tierLabels: Record<TierName, string> = {
  seedling: 'Seedling',
  sapling: 'Sapling',
  native: 'Native',
  canopy: 'Canopy',
  elder: 'Elder',
}

const REASON_LABELS: Record<string, string> = {
  event_attendance: 'Event Attendance',
  first_event: 'First Event Bonus',
  event_check_in_qr: 'QR Check-in',
  referral_first_event: 'Referral Reward',
  post_photo: 'Photo Post',
  complete_profile: 'Profile Complete',
  join_collective: 'Joined Collective',
  streak_bonus_week: 'Weekly Streak',
}

/* ------------------------------------------------------------------ */
/*  Decorative full-bleed background                                   */
/* ------------------------------------------------------------------ */

function FullBleedBackground({ rm }: { rm: boolean }) {
  return (
    <>
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-50/50 via-white to-primary-50/15" />

      {/* Large ring - top right */}
      <motion.div
        initial={rm ? {} : { scale: 0.7, opacity: 0 }}
        animate={{ scale: [1, 1.03, 1], opacity: 1 }}
        transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.2, ease: 'easeOut' } }}
        className="absolute -right-16 -top-16 w-[320px] h-[320px] rounded-full border-2 border-amber-200/35"
      />
      {/* Concentric inner ring */}
      <motion.div
        initial={rm ? {} : { scale: 0.5, opacity: 0 }}
        animate={{ scale: [1, 1.05, 1], opacity: 1 }}
        transition={{ scale: { duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.5, delay: 0.3, ease: 'easeOut' } }}
        className="absolute -right-4 -top-4 w-[220px] h-[220px] rounded-full border border-amber-200/35"
      />
      {/* Filled glow - bottom left */}
      <motion.div
        initial={rm ? {} : { scale: 0.6, opacity: 0 }}
        animate={{ scale: [1, 1.04, 1], opacity: 1 }}
        transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 1 }, opacity: { duration: 1.5, delay: 0.5, ease: 'easeOut' } }}
        className="absolute -left-20 bottom-[8%] w-[280px] h-[280px] rounded-full bg-amber-100/25 blur-2xl"
      />
      {/* Small ring - mid left */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute top-[42%] -left-6 w-[90px] h-[90px] rounded-full border border-amber-200/35"
      />
      {/* Warm glow - center right */}
      <div className="absolute top-[20%] -right-8 w-[200px] h-[200px] rounded-full bg-amber-100/25 blur-3xl" />
      {/* Small filled circle - bottom right */}
      <motion.div
        initial={rm ? {} : { scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1, ease: 'easeOut' }}
        className="absolute bottom-[15%] right-[10%] w-[60px] h-[60px] rounded-full bg-amber-100/25"
      />
      {/* Floating dots */}
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, -6, 0] }}
        transition={{ opacity: { duration: 1, delay: 0.8 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
        className="absolute top-[28%] left-[15%] w-2 h-2 rounded-full bg-amber-300/30"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, 5, 0] }}
        transition={{ opacity: { duration: 1, delay: 1.2 }, y: { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 } }}
        className="absolute top-[55%] right-[20%] w-1.5 h-1.5 rounded-full bg-amber-300/30"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, -4, 0] }}
        transition={{ opacity: { duration: 1, delay: 1.5 }, y: { duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 } }}
        className="absolute top-[70%] left-[25%] w-1.5 h-1.5 rounded-full bg-amber-300/30"
      />
      <motion.div
        initial={rm ? {} : { opacity: 0 }}
        animate={{ opacity: 1, y: [0, 4, 0] }}
        transition={{ opacity: { duration: 1, delay: 1.8 }, y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 } }}
        className="absolute top-[15%] left-[60%] w-1 h-1 rounded-full bg-amber-300/30"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function PointsSkeleton() {
  return (
    <div className="py-6 space-y-6">
      <Skeleton variant="stat-card" className="h-32" />
      <Skeleton variant="text" count={2} />
      <Skeleton variant="list-item" count={6} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PointsPage() {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const { data: balanceData, isLoading: balanceLoading } = usePointsBalance()
  const { data: history, isLoading: historyLoading } = usePointsHistory()

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['points'] })
  }, [queryClient])

  const isLoading = balanceLoading || historyLoading

  if (isLoading) {
    return (
      <Page header={<Header title="Points" back />}>
        <PointsSkeleton />
      </Page>
    )
  }

  const points = balanceData?.points ?? 0
  const tierProgress = getTierProgress(points)

  // Group history by date
  const groupedHistory = new Map<string, typeof history>()
  for (const entry of history ?? []) {
    const date = new Date(entry.created_at).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const group = groupedHistory.get(date) ?? []
    group.push(entry)
    groupedHistory.set(date, group)
  }

  return (
    <Page header={<Header title="Points" back />}>
      <div className="relative min-h-full overflow-hidden">
        {/* Decorative background */}
        <FullBleedBackground rm={!!shouldReduceMotion} />

        {/* Content */}
        <div className="relative z-10">
          <PullToRefresh onRefresh={handleRefresh}>
          <div className="pb-8">
            {/* Points balance hero */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-amber-200/40 shadow-md p-5 text-center"
            >
              <p className="text-sm font-medium text-primary-400 mb-1">Total Points</p>
              <p className="font-heading text-4xl font-bold text-primary-800">
                <CountUp end={points} />
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <Badge variant="tier" tier={tierProgress.tier}>
                  {tierLabels[tierProgress.tier]}
                </Badge>
                {tierProgress.nextTier && (
                  <span className="text-xs text-primary-400">
                    {tierProgress.pointsToNext} pts to {tierLabels[tierProgress.nextTier]}
                  </span>
                )}
              </div>
              <div className="mt-3 px-8">
                <ProgressBar
                  value={tierProgress.progress}
                  size="sm"
                  color="bg-primary-500"
                />
              </div>
            </motion.div>

            {/* Point values reference */}
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-6"
            >
              <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">
                How to Earn Points
              </h3>
              <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-amber-200/40 shadow-sm overflow-hidden">
                {Object.entries(POINT_VALUES).map(([key, value], i) => (
                  <div
                    key={key}
                    className={cn(
                      'flex items-center justify-between px-4 py-2.5',
                      i % 2 === 0 ? 'bg-white/60' : 'bg-amber-50/30',
                    )}
                  >
                    <span className="text-sm text-primary-600">
                      {REASON_LABELS[key] ?? key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-bold text-primary-500">+{value}</span>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Points history */}
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">
                Points History
              </h3>

              {history && history.length > 0 ? (
                <div className="space-y-4">
                  {Array.from(groupedHistory.entries()).map(([date, entries]) => (
                    <div key={date}>
                      <p className="text-xs font-medium text-primary-400 mb-2 flex items-center gap-1">
                        <Calendar size={12} />
                        {date}
                      </p>
                      <div className="rounded-xl bg-white/80 backdrop-blur-sm border border-amber-200/40 shadow-sm overflow-hidden">
                        {entries!.map((entry, i) => (
                          <div
                            key={entry.id}
                            className={cn(
                              'flex items-center justify-between px-4 py-3',
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center',
                                  entry.amount > 0 ? 'bg-success-50' : 'bg-error-50',
                                )}
                              >
                                {entry.amount > 0 ? (
                                  <TrendingUp size={14} className="text-success-500" />
                                ) : (
                                  <Star size={14} className="text-error-500" />
                                )}
                              </div>
                              <span className="text-sm text-primary-800">
                                {REASON_LABELS[entry.reason] ?? entry.reason.replace(/_/g, ' ')}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'text-sm font-bold tabular-nums',
                                entry.amount > 0 ? 'text-success-600' : 'text-error-600',
                              )}
                            >
                              {entry.amount > 0 ? '+' : ''}
                              {entry.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  illustration="empty"
                  title="No points yet"
                  description="Attend events, complete your profile, and invite friends to earn points"
                  action={{ label: 'Explore Events', to: '/explore' }}
                  className="min-h-[200px]"
                />
              )}
            </motion.section>
          </div>
          </PullToRefresh>
        </div>
      </div>
    </Page>
  )
}
