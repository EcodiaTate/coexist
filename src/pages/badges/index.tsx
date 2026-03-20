import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Award, Lock, Calendar, Users, Share2, X } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { TabBar } from '@/components/tab-bar'
import { Modal } from '@/components/modal'
import { Button } from '@/components/button'
import { ProgressBar } from '@/components/progress-bar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { useBadgesWithStatus, useBadgeDetail } from '@/hooks/use-badges'
import type { BadgeWithStatus } from '@/hooks/use-badges'

const BADGE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'first_steps', label: 'First Steps' },
  { id: 'activity_milestones', label: 'Milestones' },
  { id: 'streaks', label: 'Streaks' },
  { id: 'special', label: 'Special' },
]

function BadgeSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4 py-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton variant="avatar" className="w-16 h-16" />
          <Skeleton variant="text" className="w-16 h-3" />
        </div>
      ))}
    </div>
  )
}

function BadgeCard({
  badge,
  onClick,
}: {
  badge: BadgeWithStatus
  onClick: () => void
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.button
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl p-3 transition-colors',
        badge.earned
          ? 'hover:bg-primary-50'
          : 'opacity-50 grayscale hover:bg-primary-50',
      )}
      aria-label={`${badge.name}${badge.earned ? ' - earned' : ' - locked'}`}
    >
      <div
        className={cn(
          'relative w-16 h-16 rounded-full flex items-center justify-center',
          badge.earned
            ? 'bg-gradient-to-br from-primary-100 to-primary-200 shadow-sm'
            : 'bg-white',
        )}
      >
        {badge.icon_url ? (
          <img
            src={badge.icon_url}
            alt=""
            className={cn('w-10 h-10', !badge.earned && 'opacity-40')}
          />
        ) : (
          <Award
            size={24}
            className={badge.earned ? 'text-primary-500' : 'text-primary-300'}
          />
        )}
        {!badge.earned && (
          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-white">
            <Lock size={10} className="text-primary-400" />
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-[11px] font-medium text-center line-clamp-2 leading-tight',
          badge.earned ? 'text-primary-800' : 'text-primary-400',
        )}
      >
        {badge.name}
      </span>
    </motion.button>
  )
}

function BadgeDetailModal({
  badgeId,
  open,
  onClose,
}: {
  badgeId: string | null
  open: boolean
  onClose: () => void
}) {
  const { data: detail } = useBadgeDetail(badgeId ?? '')
  const shouldReduceMotion = useReducedMotion()

  if (!detail) return null

  const earnedDate = (detail as any).earnedAt
    ? new Date((detail as any).earnedAt).toLocaleDateString('en-AU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  const handleShare = async () => {
    const text = `I earned the "${detail.name}" badge on Co-Exist!`
    if (navigator.share) {
      await navigator.share({ title: detail.name, text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={detail.name} size="sm">
      <div className="flex flex-col items-center text-center">
        {/* Badge Icon */}
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0.8, rotateY: 180 }}
          animate={{ scale: 1, rotateY: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-md mb-4"
        >
          {detail.icon_url ? (
            <img src={detail.icon_url} alt="" className="w-16 h-16" />
          ) : (
            <Award size={40} className="text-primary-500" />
          )}
        </motion.div>

        {/* Description */}
        {detail.description && (
          <p className="text-sm text-primary-400 leading-relaxed mb-4">
            {detail.description}
          </p>
        )}

        {/* Category */}
        {detail.category && (
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-400 mb-3">
            {detail.category.replace('_', ' ')}
          </span>
        )}

        {/* Earned date */}
        {earnedDate && (
          <div className="flex items-center gap-1.5 text-sm text-primary-400 mb-3">
            <Calendar size={14} />
            <span>Earned {earnedDate}</span>
          </div>
        )}

        {/* Rarity */}
        <div className="flex items-center gap-1.5 text-sm text-primary-400 mb-4">
          <Users size={14} />
          <span>{detail.totalEarners} members have earned this</span>
        </div>

        {/* Points value */}
        {detail.points_value > 0 && (
          <p className="text-sm font-semibold text-primary-400 mb-4">
            +{detail.points_value} points
          </p>
        )}

        {/* Share */}
        <Button
          variant="secondary"
          size="sm"
          icon={<Share2 size={16} />}
          onClick={handleShare}
        >
          Share Badge
        </Button>
      </div>
    </Modal>
  )
}

export default function BadgesPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState('all')
  const { data: badges, isLoading } = useBadgesWithStatus()

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['badges'] })
  }, [queryClient])

  const selectedBadgeId = searchParams.get('badge')
  const setSelectedBadge = (id: string | null) => {
    if (id) {
      setSearchParams({ badge: id })
    } else {
      setSearchParams({})
    }
  }

  if (isLoading) {
    return (
      <Page header={<Header title="Badges" back />}>
        <BadgeSkeleton />
      </Page>
    )
  }

  const filteredBadges =
    activeCategory === 'all'
      ? badges
      : badges?.filter((b) => b.category === activeCategory)

  const earnedCount = badges?.filter((b) => b.earned).length ?? 0
  const totalCount = badges?.length ?? 0

  return (
    <Page header={<Header title="Badges" back />}>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="pb-8">
        {/* Progress header */}
        <div className="mt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary-800">
              {earnedCount} of {totalCount} earned
            </span>
            <span className="text-xs text-primary-400">
              {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <ProgressBar
            value={totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}
            size="sm"
            color="bg-primary-500"
          />
        </div>

        {/* Category tabs */}
        <TabBar
          tabs={BADGE_CATEGORIES}
          activeTab={activeCategory}
          onChange={setActiveCategory}
          className="mb-4"
        />

        {/* Badge grid */}
        {filteredBadges && filteredBadges.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {filteredBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                onClick={() => setSelectedBadge(badge.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            illustration="empty"
            title="No badges in this category"
            description="Attend events and complete challenges to unlock badges"
            action={{ label: 'Find Events', to: '/explore' }}
            className="min-h-[200px]"
          />
        )}
      </div>
      </PullToRefresh>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        badgeId={selectedBadgeId}
        open={!!selectedBadgeId}
        onClose={() => setSelectedBadge(null)}
      />
    </Page>
  )
}
