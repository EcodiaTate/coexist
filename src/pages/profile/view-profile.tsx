import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MapPin,
  Instagram,
  Calendar,
  Clock,
  TreePine,
  Star,
  Users,
  Award,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { Chip } from '@/components/chip'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { CountUp } from '@/components/count-up'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import { MapView } from '@/components'
import { useProfile, useProfileCollectives, useProfileStats, useMutualConnections } from '@/hooks/use-profile'
import { useBadgesWithStatus } from '@/hooks/use-badges'
import { usePointsBalance, getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'

const tierLabels: Record<TierName, string> = {
  seedling: 'Seedling',
  sapling: 'Sapling',
  native: 'Native',
  canopy: 'Canopy',
  elder: 'Elder',
}

function ViewProfileSkeleton() {
  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col items-center gap-3">
        <Skeleton variant="avatar" className="h-24 w-24" />
        <Skeleton variant="title" className="w-40" />
        <Skeleton variant="text" className="w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>
    </div>
  )
}

export default function ViewProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { data: profile, isLoading } = useProfile(userId)
  const { data: collectives } = useProfileCollectives(userId)
  const { data: stats } = useProfileStats(userId)
  const { data: badges } = useBadgesWithStatus(userId)
  const { data: pointsData } = usePointsBalance(userId)
  const { data: mutualData } = useMutualConnections(userId ?? '')

  if (isLoading) {
    return (
      <Page header={<Header title="Profile" back />}>
        <ViewProfileSkeleton />
      </Page>
    )
  }

  if (!profile) {
    return (
      <Page header={<Header title="Profile" back />}>
        <EmptyState
          illustration="error"
          title="User not found"
          description="This profile doesn't exist or has been removed"
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  const points = pointsData?.points ?? profile.points ?? 0
  const tier = getTierFromPoints(points)
  const earnedBadges = badges?.filter((b) => b.earned) ?? []
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <Page header={<Header title={profile.display_name ?? 'Profile'} back />}>
      <div className="pb-8">
        {/* Profile Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-6 pb-4"
        >
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name ?? ''}
            size="xl"
            tier={tier}
          />

          <h2 className="mt-3 font-heading text-xl font-bold text-primary-800">
            {profile.display_name}
          </h2>
          {profile.pronouns && (
            <span className="text-sm text-primary-400">{profile.pronouns}</span>
          )}

          <div className="mt-2 flex items-center gap-2">
            <Badge variant="tier" tier={tier}>
              {tierLabels[tier]}
            </Badge>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary-400">
              <Star size={14} />
              <CountUp end={points} suffix=" pts" />
            </span>
          </div>

          {profile.bio && (
            <p className="mt-3 text-center text-sm text-primary-400 max-w-xs leading-relaxed">
              {profile.bio}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            {profile.location && (
              <span className="flex items-center gap-1 text-sm text-primary-400">
                <MapPin size={14} />
                {profile.location}
              </span>
            )}
            {profile.instagram_handle && (
              <a
                href={`https://instagram.com/${profile.instagram_handle.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-400 transition-colors"
              >
                <Instagram size={14} />
                {profile.instagram_handle.startsWith('@')
                  ? profile.instagram_handle
                  : `@${profile.instagram_handle}`}
              </a>
            )}
          </div>

          <p className="mt-2 text-xs text-primary-400">Member since {memberSince}</p>
        </motion.div>

        {/* Mutual Connections */}
        {mutualData && (mutualData.sharedCollectives.length > 0 || mutualData.sharedEventCount > 0) && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-2 rounded-xl bg-white border border-primary-100 px-4 py-3"
          >
            <div className="flex items-center gap-2 text-sm text-primary-400">
              <Users size={16} />
              <div>
                {mutualData.sharedCollectives.length > 0 && (
                  <p>
                    You&apos;re both in{' '}
                    <span className="font-semibold">
                      {mutualData.sharedCollectives.map((c) => c.name).join(', ')}
                    </span>
                  </p>
                )}
                {mutualData.sharedEventCount > 0 && (
                  <p>
                    You&apos;ve attended{' '}
                    <span className="font-semibold">{mutualData.sharedEventCount} events</span>{' '}
                    together
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 grid grid-cols-3 gap-3"
        >
          <StatCard
            value={stats?.eventsAttended ?? 0}
            label="Events"
            icon={<Calendar size={20} />}
          />
          <StatCard
            value={stats?.hoursVolunteered ?? 0}
            label="Hours"
            icon={<Clock size={20} />}
          />
          <StatCard
            value={stats?.treesPlanted ?? 0}
            label="Trees"
            icon={<TreePine size={20} />}
          />
        </motion.div>

        {/* Collectives */}
        {collectives && collectives.length > 0 && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6"
          >
            <h3 className="font-heading text-base font-semibold text-primary-800 mb-3">
              Collectives
            </h3>
            <div className="flex flex-wrap gap-2">
              {collectives.map((membership) => {
                const collective = membership.collectives as { name: string } | null
                return (
                  <Chip
                    key={membership.collective_id}
                    label={collective?.name ?? ''}
                    selected
                  />
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <h3 className="font-heading text-base font-semibold text-primary-800 mb-3">
              Badges
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {earnedBadges.slice(0, 8).map((badge) => (
                <div
                  key={badge.id}
                  className="flex flex-col items-center gap-1.5 p-2"
                >
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    {badge.icon_url ? (
                      <img src={badge.icon_url} alt="" className="w-8 h-8" />
                    ) : (
                      <Award size={20} className="text-primary-500" />
                    )}
                  </div>
                  <span className="text-[10px] font-medium text-primary-400 text-center line-clamp-2 leading-tight">
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-6"
          >
            <h3 className="font-heading text-base font-semibold text-primary-800 mb-3">
              Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Chip key={interest} label={interest} selected />
              ))}
            </div>
          </motion.section>
        )}

        {/* Location mini-map */}
        {(() => {
          const pos = parseLocationPoint(profile.location_point)
          if (!pos) return null
          return (
            <motion.section
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <h3 className="font-heading text-base font-semibold text-primary-800 mb-3">
                Location
              </h3>
              <MapView
                center={pos}
                zoom={12}
                markers={[{ id: userId ?? 'user', position: pos, variant: 'default', label: profile.location ?? undefined }]}
                interactive={false}
                aria-label={`${profile.display_name ?? 'User'} location`}
                className="h-40 rounded-2xl"
              />
            </motion.section>
          )
        })()}
      </div>
    </Page>
  )
}
