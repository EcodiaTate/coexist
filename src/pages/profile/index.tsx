import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Settings,
  Share2,
  Edit3,
  MapPin,
  Instagram,
  Calendar,
  Clock,
  TreePine,
  Star,
  Trash2,
  Waves,
  Sprout,
  Bird,
  Ruler,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/badge'
import { Button } from '@/components/button'
import { Chip } from '@/components/chip'
import { StatCard } from '@/components/stat-card'
import { ProgressBar } from '@/components/progress-bar'
import { Card } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { CountUp } from '@/components/count-up'
import { cn } from '@/lib/cn'
import { OfflineIndicator } from '@/components/offline-indicator'
import { useAuth } from '@/hooks/use-auth'
import { useProfile, useProfileCollectives, useProfileStats } from '@/hooks/use-profile'
import { usePointsBalance, getTierProgress, getTierFromPoints } from '@/hooks/use-points'
import type { TierName } from '@/hooks/use-points'

const tierLabels: Record<TierName, string> = {
  seedling: 'Seedling',
  sapling: 'Sapling',
  native: 'Native',
  canopy: 'Canopy',
  elder: 'Elder',
}

function ProfileSkeleton() {
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
      <Skeleton variant="card" />
      <Skeleton variant="text" count={3} />
    </div>
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { user, profile: authProfile } = useAuth()
  const { data: profile, isLoading: profileLoading, dataUpdatedAt: profileUpdatedAt, isFetching: profileFetching } = useProfile()
  const { data: collectives, isLoading: collectivesLoading } = useProfileCollectives()
  const { data: stats, isLoading: statsLoading } = useProfileStats()
  const { data: pointsData } = usePointsBalance()


  const isLoading = profileLoading || collectivesLoading || statsLoading

  if (isLoading) {
    return (
      <Page header={<Header title="My Profile" />}>
        <ProfileSkeleton />
      </Page>
    )
  }

  if (!profile) {
    return (
      <Page header={<Header title="My Profile" />}>
        <EmptyState
          illustration="error"
          title="Profile not found"
          description="We couldn't load your profile. Try again later."
          action={{ label: 'Go Home', to: '/' }}
        />
      </Page>
    )
  }

  const points = pointsData?.points ?? profile.points ?? 0
  const tierProgress = getTierProgress(points)
  const tier = getTierFromPoints(points) as TierName
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  const handleShare = async () => {
    const shareData = {
      title: `${profile.display_name} on Co-Exist`,
      text: `Check out my conservation profile on Co-Exist!`,
      url: `${window.location.origin}/profile/${profile.id}`,
    }
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      await navigator.clipboard.writeText(shareData.url)
    }
  }

  return (
    <Page
      header={
        <Header
          title="My Profile"
          rightActions={
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center justify-center w-9 h-9 rounded-full text-primary-400 hover:bg-surface-3 transition-colors"
                aria-label="Settings"
              >
                <Settings size={20} />
              </button>
            </div>
          }
        />
      }
    >
      <div className="pb-8">
        <OfflineIndicator dataUpdatedAt={profileUpdatedAt} isFetching={profileFetching} className="mb-2" />
        {/* Profile Header */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center pt-6 pb-4"
        >
          <div className="relative">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name ?? ''}
              size="xl"
              tier={tier}
            />
            <button
              onClick={() => navigate('/profile/edit')}
              className="absolute -bottom-1 -right-1 flex items-center justify-center w-8 h-8 rounded-full bg-surface-0 shadow-md text-primary-400 hover:bg-surface-3 transition-colors"
              aria-label="Edit profile"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <h2 className="mt-3 font-heading text-xl font-bold text-primary-800">
            {profile.display_name}
          </h2>
          {profile.pronouns && (
            <span className="text-sm text-primary-400">{profile.pronouns}</span>
          )}

          {/* Tier + Points */}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="tier" tier={tier}>
              {tierLabels[tier]}
            </Badge>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary-400">
              <Star size={14} />
              <CountUp end={points} suffix=" pts" />
            </span>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="mt-3 text-center text-sm text-primary-400 max-w-xs leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Location + Instagram */}
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

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" icon={<Share2 size={16} />} onClick={handleShare}>
              Share
            </Button>
          </div>
        </motion.div>

        {/* Tier Progression */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-primary-800">Tier Progress</span>
            {tierProgress.nextTier && (
              <span className="text-xs text-primary-400">
                {tierProgress.pointsToNext} pts to {tierLabels[tierProgress.nextTier]}
              </span>
            )}
          </div>
          <ProgressBar
            value={tierProgress.progress}
            size="md"
            color="bg-primary-500"
            showLabel
            aria-label={`Tier progress: ${tierProgress.progress}%`}
          />
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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
          {(stats?.rubbishCollectedKg ?? 0) > 0 && (
            <StatCard
              value={stats?.rubbishCollectedKg ?? 0}
              label="kg Rubbish"
              icon={<Trash2 size={20} />}
            />
          )}
          {(stats?.coastlineCleanedM ?? 0) > 0 && (
            <StatCard
              value={stats?.coastlineCleanedM ?? 0}
              label="Coastline (m)"
              icon={<Waves size={20} />}
            />
          )}
          {(stats?.areaRestoredSqm ?? 0) > 0 && (
            <StatCard
              value={stats?.areaRestoredSqm ?? 0}
              label="Area (sqm)"
              icon={<Ruler size={20} />}
            />
          )}
          {(stats?.nativePlants ?? 0) > 0 && (
            <StatCard
              value={stats?.nativePlants ?? 0}
              label="Native Plants"
              icon={<Sprout size={20} />}
            />
          )}
          {(stats?.wildlifeSightings ?? 0) > 0 && (
            <StatCard
              value={stats?.wildlifeSightings ?? 0}
              label="Wildlife"
              icon={<Bird size={20} />}
            />
          )}
        </motion.div>

        {/* My Collectives */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-base font-semibold text-primary-800">
              My Collectives
            </h3>
          </div>
          {collectives && collectives.length > 0 ? (
            <div className="space-y-2">
              {collectives.map((membership) => {
                const collective = membership.collectives as {
                  id: string
                  name: string
                  slug: string
                  cover_image_url: string | null
                  region: string | null
                  member_count: number
                } | null
                if (!collective) return null
                return (
                  <Card
                    key={collective.id}
                    variant="collective"
                    onClick={() => navigate(`/collectives/${collective.slug}`)}
                    className="flex flex-row items-center gap-3 p-3"
                  >
                    <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-primary-100">
                      {collective.cover_image_url ? (
                        <img
                          src={collective.cover_image_url}
                          alt={collective.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-primary-400">
                          <TreePine size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-sm text-primary-800 truncate">
                        {collective.name}
                      </p>
                      <p className="text-xs text-primary-400">
                        {collective.region} · {collective.member_count} members
                      </p>
                    </div>
                    <Badge variant="tier" tier={membership.role === 'leader' ? 'elder' : 'seedling'} size="sm">
                      {membership.role.replace('_', ' ')}
                    </Badge>
                  </Card>
                )
              })}
            </div>
          ) : (
            <EmptyState
              illustration="wildlife"
              title="No collectives yet"
              description="Join a local collective to start your conservation journey"
              action={{ label: 'Explore Collectives', to: '/explore' }}
              className="min-h-[180px]"
            />
          )}
        </motion.section>


        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <motion.section
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
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

      </div>
    </Page>
  )
}
