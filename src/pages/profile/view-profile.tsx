import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  MapPin,
  Instagram,
  Calendar,
  Clock,
  TreePine,
  Users,
  Trash2,
  Sprout,
  Bird,
  Ruler,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { Chip } from '@/components/chip'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { parseLocationPoint } from '@/lib/geo'
import { MapView } from '@/components'
import { useProfile, useProfileCollectives, useProfileStats, useMutualConnections } from '@/hooks/use-profile'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

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
  const showLoading = useDelayedLoading(isLoading)
  const { data: collectives } = useProfileCollectives(userId)
  const { data: stats } = useProfileStats(userId)
  const { data: mutualData } = useMutualConnections(userId ?? '')

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Profile" back />}>
        <ViewProfileSkeleton />
      </Page>
    )
  }
  if (!profile) {
    return (
      <Page swipeBack header={<Header title="Profile" back />}>
        <EmptyState
          illustration="error"
          title="User not found"
          description="This profile doesn't exist or has been removed"
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const memberSince = new Date(profile.created_at ?? Date.now()).toLocaleDateString('en-AU', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <Page swipeBack header={<Header title={profile.display_name ?? 'Profile'} back />}>
      <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="pb-8">
        {/* Profile Header */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col items-center pt-6 pb-4"
        >
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name ?? ''}
            size="xl"
          />

          <h2 className="mt-3 font-heading text-xl font-bold text-primary-800">
            {profile.display_name}
          </h2>
          {profile.pronouns && (
            <span className="text-sm text-primary-400">{profile.pronouns}</span>
          )}

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
            variants={fadeUp}
            className="mt-2 rounded-xl bg-surface-0 shadow-sm px-4 py-3"
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
          variants={fadeUp}
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

        {/* Collectives */}
        {collectives && collectives.length > 0 && (
          <motion.section
            variants={fadeUp}
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


        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <motion.section
            variants={fadeUp}
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
              variants={fadeUp}
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
      </motion.div>
    </Page>
  )
}
