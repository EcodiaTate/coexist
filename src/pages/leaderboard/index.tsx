import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowLeft, Trophy, Medal, Crown, TreePine, Clock, Calendar, Star, Users, Flame } from 'lucide-react'
import { Page } from '@/components/page'
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

/* ─── animations ─── */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 26 } },
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6 pt-4 pb-8">
      <div className="h-36 rounded-3xl bg-warning-100/40 animate-pulse" />
      <div className="flex items-end justify-center gap-4">
        <div className="w-20 h-28 rounded-2xl bg-warning-100/30 animate-pulse" />
        <div className="w-24 h-36 rounded-2xl bg-warning-100/40 animate-pulse" />
        <div className="w-20 h-24 rounded-2xl bg-warning-100/30 animate-pulse" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 rounded-xl bg-warning-100/20 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function formatMetricValue(value: number, metric: Metric): string {
  if (metric === 'points') return `${value.toLocaleString()} pts`
  if (metric === 'trees') return `${value.toLocaleString()} trees`
  if (metric === 'events') return `${value} events`
  return `${value} hrs`
}

/* ─── Decorative background shapes ─── */

function BackgroundShapes({ reduced }: { reduced: boolean }) {
  return (
    <>
      {/* Multi-stop gradient — rich warm forest feel */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-200/55 via-warning-50/30 via-25% to-primary-100/20 to-60%" />
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-moss-50/15 to-warning-50/15" />

      {/* Concentrated hero glow — top center */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-gradient-to-b from-warning-200/30 via-secondary-200/20 to-transparent blur-[60px]" />

      {/* Warm accent — top right */}
      <div className="absolute -top-16 -right-16 w-[280px] h-[260px] rounded-full bg-gradient-to-bl from-warning-200/22 to-transparent blur-[50px]" />

      {reduced ? null : (
        <>
          {/* Large breathing ring — top right */}
          <motion.div
            className="absolute -top-24 -right-20 w-72 h-72 rounded-full border-[3px] border-warning-300/22"
            animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Concentric inner ring */}
          <motion.div
            className="absolute -top-8 -right-4 w-44 h-44 rounded-full border-2 border-secondary-200/18"
            animate={{ scale: [1, 1.04, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />

          {/* Left ring cluster */}
          <motion.div
            className="absolute top-[32%] -left-14 w-52 h-52 rounded-full border-[2.5px] border-moss-300/22"
            animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />

          {/* Bottom right ring */}
          <motion.div
            className="absolute bottom-[18%] right-2 w-32 h-32 rounded-full border-2 border-warning-300/18"
            animate={{ rotate: 360 }}
            transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
          />

          {/* Deep warm glows */}
          <motion.div
            className="absolute top-[40%] -left-10 w-56 h-56 rounded-full bg-moss-100/18 blur-[50px]"
            animate={{ scale: [1, 1.14, 1], opacity: [0.2, 0.38, 0.2] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          <motion.div
            className="absolute -bottom-16 left-1/3 w-64 h-64 rounded-full bg-warning-100/18 blur-[55px]"
            animate={{ scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />

          {/* Floating particles */}
          <motion.div className="absolute top-24 right-14 w-3 h-3 rounded-full bg-warning-400/18"
            animate={{ y: [-5, 5, -5], x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }} />
          <motion.div className="absolute top-[48%] left-8 w-2.5 h-2.5 rounded-full bg-moss-400/15"
            animate={{ y: [3, -5, 3] }} transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut', delay: 1.5 }} />
          <motion.div className="absolute bottom-[28%] right-[18%] w-2 h-2 rounded-full bg-secondary-400/15"
            animate={{ y: [-3, 4, -3], x: [0, -2, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }} />
          <motion.div className="absolute top-[62%] left-[22%] w-2 h-2 rounded-full bg-warning-300/12"
            animate={{ y: [2, -3, 2] }} transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 2.5 }} />
        </>
      )}
    </>
  )
}

/* ─── Podium card for top 3 ─── */

const PODIUM_CONFIG = [
  {
    height: 'h-20',
    gradient: 'from-warning-200 via-warning-100 to-warning-50',
    glow: 'shadow-lg shadow-warning-200/40',
    avatarSize: 'lg' as const,
    labelBg: 'bg-gradient-to-br from-warning-400 to-warning-600',
    rank: 1,
  },
  {
    height: 'h-14',
    gradient: 'from-primary-200/80 via-primary-100 to-surface-3',
    glow: 'shadow-md shadow-primary-200/30',
    avatarSize: 'md' as const,
    labelBg: 'bg-gradient-to-br from-primary-300 to-primary-500',
    rank: 2,
  },
  {
    height: 'h-12',
    gradient: 'from-bark-200/70 via-bark-100 to-bark-50',
    glow: 'shadow-md shadow-bark-200/30',
    avatarSize: 'md' as const,
    labelBg: 'bg-gradient-to-br from-bark-300 to-bark-500',
    rank: 3,
  },
]

export default function LeaderboardPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { user } = useAuth()
  const { data: collectives } = useProfileCollectives()

  const [view, setView] = useState<'individual' | 'collective'>('individual')
  const [period, setPeriod] = useState<TimePeriod>('month')
  const [metric, setMetric] = useState<Metric>('points')

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
    <Page noBackground className="!px-0">
      <div className="relative min-h-full">
        {/* ─── Animated decorative background ─── */}
        <BackgroundShapes reduced={!!shouldReduceMotion} />

        {/* ─── Content ─── */}
        <div className="relative z-10">
          <PullToRefresh onRefresh={handleRefresh}>
            <motion.div
              className="pb-10"
              variants={shouldReduceMotion ? undefined : stagger}
              initial="hidden"
              animate="visible"
            >
              {/* ─── Floating back button ─── */}
              <div className="pt-[var(--safe-top)] px-4">
                <motion.button
                  type="button"
                  onClick={() => navigate(-1)}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="flex items-center justify-center w-9 h-9 rounded-full text-primary-800 hover:bg-primary-50/80 cursor-pointer select-none transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                  aria-label="Go back"
                >
                  <ArrowLeft size={22} />
                </motion.button>
              </div>

              {/* ─── Hero banner ─── */}
              <motion.div variants={fadeUp} className="px-5 lg:px-6 pt-2 pb-2">
                <div className="relative rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-6 shadow-2xl overflow-hidden">
                  {/* Decorative circles */}
                  <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

                  <div className="relative flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm">
                      <Trophy size={24} strokeWidth={2.5} className="text-warning-400" />
                    </div>
                    <div>
                      <h2 className="font-heading text-xl font-bold text-white">Leaderboard</h2>
                      <p className="text-sm text-white/60 font-medium mt-0.5">
                        See who's leading the charge
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ─── Controls ─── */}
              <motion.div variants={fadeUp} className="px-5 lg:px-6">
                <div className="mt-4 mb-3 flex items-center gap-2 rounded-2xl bg-white/80 backdrop-blur-sm border border-primary-100/40 shadow-sm p-1.5">
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
                      'bg-white text-primary-700 shadow-sm border border-primary-100/30',
                      'focus:outline-none focus:ring-2 focus:ring-primary-300/50',
                      'cursor-pointer',
                    )}
                    aria-label="Time period"
                  >
                    {PERIOD_TABS.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-primary-100/40 shadow-sm p-1.5 mb-5">
                  <TabBar
                    tabs={METRIC_TABS}
                    activeTab={metric}
                    onChange={(id) => setMetric(id as Metric)}
                  />
                </div>
              </motion.div>

              {isLoading ? (
                <div className="px-5 lg:px-6"><LeaderboardSkeleton /></div>
              ) : view === 'individual' ? (
                <>
                  {/* ─── Your rank card ─── */}
                  {individualData?.userRank && (
                    <motion.div variants={fadeUp} className="px-5 lg:px-6 mb-5">
                      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary-100/90 to-primary-200/50 shadow-md p-4 border border-primary-100/40">
                        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-600 shadow-md">
                          <Flame size={20} strokeWidth={2.5} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.15em] text-primary-600 font-bold">Your Rank</p>
                          <p className="font-heading text-2xl font-extrabold text-primary-900 tabular-nums leading-none mt-1">
                            #{individualData.userRank}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-primary-500 font-medium">Keep going!</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* ─── Top 3 podium ─── */}
                  {individualData && individualData.entries.length >= 3 && (
                    <motion.div
                      variants={fadeUp}
                      className="flex items-end justify-center gap-3 mb-6 px-5 lg:px-6"
                    >
                      {/* Render order: 2nd, 1st, 3rd */}
                      {[1, 0, 2].map((idx) => {
                        const entry = individualData.entries[idx]
                        if (!entry) return null
                        const cfg = PODIUM_CONFIG[idx]
                        return (
                          <motion.button
                            key={entry.userId}
                            type="button"
                            onClick={() => navigate(`/profile/${entry.userId}`)}
                            whileTap={{ scale: 0.96 }}
                            className="flex flex-col items-center justify-end gap-1.5 cursor-pointer select-none"
                          >
                            {/* Avatar with glow */}
                            <div className={cn('relative', cfg.glow, 'rounded-full')}>
                              <Avatar
                                src={entry.avatarUrl}
                                name={entry.displayName}
                                size={cfg.avatarSize}
                                tier={entry.tier as TierName}
                              />
                              {/* Rank badge */}
                              <span className={cn(
                                'absolute -top-1 -right-1 w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-extrabold text-white shadow-md',
                                cfg.labelBg,
                              )}>
                                {cfg.rank}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-primary-800 truncate max-w-[80px]">
                              {entry.displayName}
                            </p>
                            <p className="text-[10px] font-bold text-primary-500 tabular-nums">
                              {formatMetricValue(entry.value, metric)}
                            </p>
                            {/* Podium bar */}
                            <div
                              className={cn(
                                'w-20 rounded-t-2xl bg-gradient-to-t',
                                cfg.height,
                                cfg.gradient,
                              )}
                            />
                          </motion.button>
                        )
                      })}
                    </motion.div>
                  )}

                  {/* ─── Full list ─── */}
                  {individualData && individualData.entries.length > 0 ? (
                    <div className="px-5 lg:px-6">
                      <div className="rounded-2xl bg-white shadow-sm border border-primary-100/40 overflow-hidden">
                        {individualData.entries.slice(3).map((entry, i) => (
                          <motion.button
                            key={entry.userId}
                            initial={shouldReduceMotion ? false : { opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => navigate(`/profile/${entry.userId}`)}
                            className={cn(
                              'w-full flex items-center gap-3 px-4 py-3 min-h-11',
                              'active:scale-[0.98] transition-all duration-150 cursor-pointer select-none',
                              'hover:bg-warning-50/40',
                              entry.userId === user?.id && 'bg-warning-50/50',
                              i > 0 && 'border-t border-primary-100/20',
                            )}
                          >
                            <span className="w-7 text-sm font-extrabold text-primary-400/70 tabular-nums text-center">
                              {entry.rank}
                            </span>
                            <Avatar
                              src={entry.avatarUrl}
                              name={entry.displayName}
                              size="sm"
                              tier={entry.tier as TierName}
                            />
                            <span className="flex-1 text-sm font-semibold text-primary-800 text-left truncate">
                              {entry.displayName}
                              {entry.userId === user?.id && (
                                <span className="text-xs text-primary-500 font-medium ml-1">(You)</span>
                              )}
                            </span>
                            <span className="text-sm font-bold text-primary-500 tabular-nums">
                              {formatMetricValue(entry.value, metric)}
                            </span>
                          </motion.button>
                        ))}
                      </div>
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
                /* ─── Collective leaderboard ─── */
                <div className="px-5 lg:px-6">
                  {collectiveData && collectiveData.length > 0 ? (
                    <div className="space-y-2.5">
                      {collectiveData.map((entry, i) => (
                        <motion.div
                          key={entry.collectiveId}
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 26 }}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl shadow-sm border border-primary-100/40 px-4 py-3.5',
                            i === 0
                              ? 'bg-gradient-to-r from-warning-50/80 to-white'
                              : 'bg-white',
                          )}
                        >
                          <span className="w-8 text-center">
                            {entry.rank <= 3 ? (
                              <span className={cn(
                                'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-extrabold text-white shadow-sm',
                                entry.rank === 1 && 'bg-gradient-to-br from-warning-400 to-warning-600',
                                entry.rank === 2 && 'bg-gradient-to-br from-primary-300 to-primary-500',
                                entry.rank === 3 && 'bg-gradient-to-br from-bark-300 to-bark-500',
                              )}>
                                {entry.rank}
                              </span>
                            ) : (
                              <span className="text-sm font-bold text-primary-400/70 tabular-nums">
                                {entry.rank}
                              </span>
                            )}
                          </span>
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-100 shrink-0">
                            {entry.coverImageUrl ? (
                              <img
                                src={entry.coverImageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 text-primary-400">
                                <TreePine size={16} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-primary-800 truncate">
                              {entry.name}
                            </p>
                            {entry.region && (
                              <p className="text-xs text-primary-400 mt-0.5">{entry.region}</p>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary-500 tabular-nums">
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
                  )}
                </div>
              )}
            </motion.div>
          </PullToRefresh>
        </div>
      </div>
    </Page>
  )
}
