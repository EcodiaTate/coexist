import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Trophy, Medal, Crown, TreePine, Clock, Calendar, Star, Users } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { TabBar } from '@/components/tab-bar'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useIndividualLeaderboard, useCollectiveLeaderboard } from '@/hooks/use-leaderboard'
import { useProfileCollectives } from '@/hooks/use-profile'
import type { TierName } from '@/hooks/use-points'

type TimePeriod = 'week' | 'month' | 'quarter' | 'year' | 'all-time'
type Metric = 'points' | 'trees' | 'events' | 'hours'

const PERIOD_TABS = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
  { id: 'all-time', label: 'All Time' },
]

const METRIC_TABS = [
  { id: 'points', label: 'Points', icon: <Star size={14} /> },
  { id: 'trees', label: 'Trees', icon: <TreePine size={14} /> },
  { id: 'events', label: 'Events', icon: <Calendar size={14} /> },
  { id: 'hours', label: 'Hours', icon: <Clock size={14} /> },
]

const MEDAL_ICONS = [
  <Crown size={18} className="text-warning-500" />,
  <Medal size={18} className="text-primary-400" />,
  <Medal size={18} className="text-warning-700" />,
]

function LeaderboardSkeleton() {
  return (
    <div className="py-4">
      <Skeleton variant="list-item" count={10} />
    </div>
  )
}

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === 'points') return `${value.toLocaleString()} pts`
  if (metric === 'trees') return `${value.toLocaleString()} trees`
  if (metric === 'events') return `${value} events`
  return `${value} hrs`
}

export default function LeaderboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { user } = useAuth()
  const { data: collectives } = useProfileCollectives()

  const [view, setView] = useState<'individual' | 'collective'>('individual')
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [metric, setMetric] = useState<Metric>('points')

  // Use the first collective the user belongs to, or null for global
  const firstCollectiveId = collectives?.[0]?.collective_id ?? null

  const { data: individualData, isLoading: individualLoading } =
    useIndividualLeaderboard(firstCollectiveId, period, metric)
  const { data: collectiveData, isLoading: collectiveLoading } =
    useCollectiveLeaderboard(period, metric)

  const isLoading = view === 'individual' ? individualLoading : collectiveLoading

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
  }, [queryClient])

  return (
    <Page header={<Header title="Leaderboard" back />}>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-8">
        {/* View + Period row */}
        <div className="mt-4 mb-3 flex items-center gap-2">
          <TabBar
            tabs={[
              { id: 'individual', label: 'Individual' },
              { id: 'collective', label: 'Collectives' },
            ]}
            activeTab={view}
            onChange={(id) => setView(id as 'individual' | 'collective')}
            className="flex-1"
          />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as TimePeriod)}
            className={cn(
              'h-9 px-3 rounded-xl text-sm font-medium',
              'bg-surface-0 border border-primary-200 text-primary-700',
              'focus:outline-none focus:ring-2 focus:ring-primary-400',
              'cursor-pointer',
            )}
            aria-label="Time period"
          >
            {PERIOD_TABS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Metric filter */}
        <TabBar
          tabs={METRIC_TABS}
          activeTab={metric}
          onChange={(id) => setMetric(id as Metric)}
          className="mb-4"
        />

        {isLoading ? (
          <LeaderboardSkeleton />
        ) : view === 'individual' ? (
          <>
            {/* User's rank */}
            {individualData?.userRank && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl bg-surface-0 shadow-sm px-4 py-3 text-center"
              >
                <p className="text-sm text-primary-400">
                  Your rank:{' '}
                  <span className="font-heading text-lg font-bold">
                    #{individualData.userRank}
                  </span>
                </p>
              </motion.div>
            )}

            {/* Top 3 podium */}
            {individualData && individualData.entries.length >= 3 && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end justify-center gap-3 mb-6"
              >
                {[1, 0, 2].map((idx) => {
                  const entry = individualData.entries[idx]
                  if (!entry) return null
                  const isFirst = idx === 0
                  return (
                    <button
                      key={entry.userId}
                      type="button"
                      onClick={() => navigate(`/profile/${entry.userId}`)}
                      className="flex flex-col items-center justify-center gap-1 min-h-11 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
                    >
                      <div className="relative">
                        <Avatar
                          src={entry.avatarUrl}
                          name={entry.displayName}
                          size={isFirst ? 'lg' : 'md'}
                          tier={entry.tier as TierName}
                        />
                        <span className="absolute -top-1 -right-1">
                          {MEDAL_ICONS[entry.rank - 1]}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-primary-800 truncate max-w-[80px]">
                        {entry.displayName}
                      </p>
                      <p className="text-[10px] font-bold text-primary-400">
                        {formatMetricValue(entry.value, metric)}
                      </p>
                      <div
                        className={cn(
                          'w-16 rounded-t-lg',
                          isFirst
                            ? 'h-16 bg-warning-100'
                            : entry.rank === 2
                              ? 'h-12 bg-surface-2'
                              : 'h-10 bg-warning-50',
                        )}
                      />
                    </button>
                  )
                })}
              </motion.div>
            )}

            {/* Full list */}
            {individualData && individualData.entries.length > 0 ? (
              <div className="space-y-1">
                {individualData.entries.slice(3).map((entry, i) => (
                  <motion.button
                    key={entry.userId}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/profile/${entry.userId}`)}
                    className={cn(
                      'w-full flex items-center justify-center gap-3 rounded-xl px-3 py-2.5 min-h-11 active:scale-[0.97] transition-all duration-150 hover:bg-primary-50 cursor-pointer select-none',
                      entry.userId === user?.id && 'bg-surface-0 shadow-sm',
                    )}
                  >
                    <span className="w-8 text-sm font-bold text-primary-400 tabular-nums text-center">
                      {entry.rank}
                    </span>
                    <Avatar
                      src={entry.avatarUrl}
                      name={entry.displayName}
                      size="sm"
                      tier={entry.tier as TierName}
                    />
                    <span className="flex-1 text-sm font-medium text-primary-800 text-left truncate">
                      {entry.displayName}
                      {entry.userId === user?.id && (
                        <span className="text-xs text-primary-500 ml-1">(You)</span>
                      )}
                    </span>
                    <span className="text-sm font-semibold text-primary-400 tabular-nums">
                      {formatMetricValue(entry.value, metric)}
                    </span>
                  </motion.button>
                ))}
              </div>
            ) : (
              <EmptyState
                illustration="empty"
                title="Leaderboard is empty"
                description="Attend events and earn points to climb the ranks"
                action={{ label: 'Find Events', to: '/explore' }}
                className="min-h-[200px]"
              />
            )}
          </>
        ) : (
          /* Collective leaderboard */
          collectiveData && collectiveData.length > 0 ? (
            <div className="space-y-2">
              {collectiveData.map((entry, i) => (
                <motion.div
                  key={entry.collectiveId}
                  initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-3 rounded-xl bg-surface-0 shadow-sm px-4 py-3"
                >
                  <span className="w-8 text-center">
                    {entry.rank <= 3 ? (
                      MEDAL_ICONS[entry.rank - 1]
                    ) : (
                      <span className="text-sm font-bold text-primary-400 tabular-nums">
                        {entry.rank}
                      </span>
                    )}
                  </span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-primary-100 shrink-0">
                    {entry.coverImageUrl ? (
                      <img
                        src={entry.coverImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary-400">
                        <TreePine size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">
                      {entry.name}
                    </p>
                    {entry.region && (
                      <p className="text-xs text-primary-400">{entry.region}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-primary-400 tabular-nums">
                    {formatMetricValue(entry.value, metric)}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              illustration="empty"
              title="No collective rankings yet"
              description="Collectives will appear once they start logging impact from events"
              action={{ label: 'Explore Collectives', to: '/collectives' }}
              className="min-h-[200px]"
            />
          )
        )}
      </div>
      </PullToRefresh>
    </Page>
  )
}
