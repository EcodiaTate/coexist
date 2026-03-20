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

function PointsSkeleton() {
  return (
    <div className="py-6 space-y-6">
      <Skeleton variant="stat-card" className="h-32" />
      <Skeleton variant="text" count={2} />
      <Skeleton variant="list-item" count={6} />
    </div>
  )
}

export default function PointsPage() {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const { data: balanceData, isLoading: balanceLoading } = usePointsBalance()
  const { data: history, isLoading: historyLoading } = usePointsHistory()

  const isLoading = balanceLoading || historyLoading

  if (isLoading) {
    return (
      <Page header={<Header title="Points" back />}>
        <PointsSkeleton />
      </Page>
    )
  }

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['points'] })
  }, [queryClient])

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
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-8">
        {/* Points balance hero */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl bg-gradient-to-br from-white to-accent-100 shadow-md p-5 text-center"
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
          <div className="rounded-xl bg-white shadow-sm overflow-hidden">
            {Object.entries(POINT_VALUES).map(([key, value], i) => (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5',
                  i > 0 && 'bg-primary-50/30 even:bg-white',
                )}
              >
                <span className="text-sm text-primary-400">
                  {REASON_LABELS[key] ?? key.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-bold text-primary-400">+{value}</span>
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
                  <div className="rounded-xl bg-white shadow-sm overflow-hidden">
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
    </Page>
  )
}
