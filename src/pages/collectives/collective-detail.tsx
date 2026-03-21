import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  MessageCircle,
  Share2,
  Users,
  CalendarDays,
  TreePine,
  Clock,
  Trash2,
  Waves,
  Ruler,
  Leaf,
  Eye,
  UserCheck,
  MapPin as MapPinIcon,
  ChevronRight,
  Settings,
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { MapView } from '@/components/map-view'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { WhatsNext } from '@/components/whats-next'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { parseLocationPoint } from '@/lib/geo'
import { useAuth } from '@/hooks/use-auth'
import {
  useCollective,
  useCollectiveLeaders,
  useCollectiveMembers,
  useCollectiveEvents,
  useCollectiveStats,
  useCollectiveMembership,
  useJoinCollective,
  useLeaveCollective,
} from '@/hooks/use-collective'
import { useCollectiveRole } from '@/hooks/use-collective-role'

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function CollectiveDetailSkeleton() {
  return (
    <div className="space-y-6 py-4">
      <Skeleton variant="image" />
      <Skeleton variant="title" />
      <Skeleton variant="text" count={3} />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CollectiveDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  // Fetch collective by slug (or UUID for backwards compat)
  const { data: collective, isLoading } = useCollective(slug)
  // Use the resolved ID for sub-queries that require a UUID
  const collectiveId = collective?.id
  const { data: leaders = [] } = useCollectiveLeaders(collectiveId)
  const { data: members = [] } = useCollectiveMembers(collectiveId)
  const { data: upcomingEvents = [] } = useCollectiveEvents(collectiveId, 'upcoming')
  const { data: pastEvents = [] } = useCollectiveEvents(collectiveId, 'past')
  const { data: stats } = useCollectiveStats(collectiveId)
  const { data: membership } = useCollectiveMembership(collectiveId)
  const { isLeader } = useCollectiveRole(collectiveId)

  const joinCollective = useJoinCollective()
  const leaveCollective = useLeaveCollective()

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [justJoined, setJustJoined] = useState(false)

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const isMember = !!membership

  const handleJoin = async () => {
    if (!collectiveId) return
    try {
      await joinCollective.mutateAsync(collectiveId)
      setJustJoined(true)
      toast.success("Welcome to the collective!")
    } catch {
      toast.error('Failed to join collective')
    }
  }

  const handleLeave = async () => {
    if (!collectiveId) return
    try {
      await leaveCollective.mutateAsync(collectiveId)
      toast.info("You've left the collective")
    } catch {
      toast.error('Failed to leave collective')
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/collectives/${slug}`
    if (navigator.share) {
      await navigator.share({ title: collective?.name, url })
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    }
  }

  if (isLoading) {
    return (
      <Page header={<Header title="Collective" back />}>
        <CollectiveDetailSkeleton />
      </Page>
    )
  }

  if (!collective) {
    return (
      <Page header={<Header title="Collective" back />}>
        <EmptyState
          illustration="error"
          title="Collective not found"
          description="This collective may have been removed or the link is incorrect"
          action={{ label: 'Explore Collectives', to: '/collectives' }}
        />
      </Page>
    )
  }

  return (
    <Page
      header={
        <Header
          title={collective.name}
          back
          rightActions={
            <div className="flex items-center gap-1">
              {isLeader && (
                <button
                  type="button"
                  onClick={() => navigate(`/collectives/${slug}/manage`)}
                  aria-label="Manage collective"
                  className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={handleShare}
                aria-label="Share collective"
                className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
              >
                <Share2 size={20} />
              </button>
            </div>
          }
        />
      }
      footer={
        <div className="flex gap-3">
          {isMember ? (
            <>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<MessageCircle size={20} />}
                onClick={() => navigate(`/chat/${collectiveId}`)}
              >
                Chat
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => setShowLeaveConfirm(true)}
                aria-label="Leave collective"
              >
                Leave
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Users size={20} />}
              loading={joinCollective.isPending}
              onClick={handleJoin}
            >
              Join this Collective
            </Button>
          )}
        </div>
      }
    >
      {/* Cover image hero — full-bleed (negate page padding) */}
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="relative aspect-[2.2/1] w-[calc(100%+2rem)] -mx-4 lg:w-[calc(100%+3rem)] lg:-mx-6 overflow-hidden bg-primary-100"
      >
        {collective.cover_image_url ? (
          <img
            src={collective.cover_image_url}
            alt={collective.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-200 to-primary-400">
            <TreePine size={56} className="text-primary-400/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="font-heading text-2xl font-bold text-white drop-shadow-sm">
            {collective.name}
          </h2>
          {collective.region && (
            <div className="mt-1 flex items-center gap-1 text-sm text-white/80">
              <MapPinIcon size={14} />
              <span>{collective.region}{collective.state ? `, ${collective.state}` : ''}</span>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="space-y-6 py-4">
        {/* Just-joined WhatsNext prompt */}
        {justJoined && (
          <motion.div variants={fadeUp}>
          <WhatsNext
            title="Welcome! Here's what to do next"
            suggestions={[
              {
                label: 'Say hello in chat',
                description: 'Introduce yourself to the group',
                icon: <MessageCircle size={18} />,
                to: `/chat/${collectiveId}`,
              },
              ...(upcomingEvents.length > 0
                ? [
                    {
                      label: 'Join an event',
                      description: `${upcomingEvents[0].title} is coming up`,
                      icon: <CalendarDays size={18} />,
                      to: `/events/${upcomingEvents[0].id}`,
                    },
                  ]
                : []),
              {
                label: 'Explore your collective',
                description: `${collective.member_count} members and counting`,
                icon: <Users size={18} />,
                onClick: () => setJustJoined(false),
              },
            ]}
          />
          </motion.div>
        )}

        {/* Description */}
        {collective.description && (
          <motion.div variants={fadeUp}>
            <p className="text-sm leading-relaxed text-primary-400">
              {collective.description}
            </p>
          </motion.div>
        )}

        {/* Leaders */}
        {leaders.length > 0 && (
          <motion.section variants={fadeUp} aria-label="Leaders">
            <h3 className="font-heading text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3">
              Leaders
            </h3>
            <div className="flex flex-wrap gap-3">
              {leaders.map((leader) => (
                <Link
                  key={leader.id}
                  to={`/profile/${leader.user_id}`}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 transition-colors duration-150 hover:bg-primary-50"
                >
                  <Avatar
                    src={leader.profiles?.avatar_url}
                    name={leader.profiles?.display_name}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-primary-800">
                      {leader.profiles?.display_name ?? 'Unknown'}
                    </p>
                    <p className="text-[11px] text-primary-400 font-semibold capitalize">
                      {leader.role.replace('_', ' ')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Stats */}
        {stats && (
          <motion.section variants={fadeUp} aria-label="Collective stats">
            <h3 className="font-heading text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3">
              Impact
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Events"
                value={stats.totalEvents}
                icon={<CalendarDays size={18} />}
              />
              <StatCard
                label="Vol. Hours"
                value={stats.totalHours}
                icon={<Clock size={18} />}
              />
              {stats.totalTreesPlanted > 0 && (
                <StatCard
                  label="Trees"
                  value={stats.totalTreesPlanted}
                  icon={<TreePine size={18} />}
                />
              )}
              {stats.totalRubbishKg > 0 && (
                <StatCard
                  label="Rubbish (kg)"
                  value={stats.totalRubbishKg}
                  icon={<Trash2 size={18} />}
                />
              )}
              {stats.totalCoastlineCleaned > 0 && (
                <StatCard
                  label="Coastline (m)"
                  value={stats.totalCoastlineCleaned}
                  icon={<Waves size={18} />}
                />
              )}
              {stats.totalAreaRestored > 0 && (
                <StatCard
                  label="Area (sqm)"
                  value={stats.totalAreaRestored}
                  icon={<Ruler size={18} />}
                />
              )}
              {stats.totalNativePlants > 0 && (
                <StatCard
                  label="Native Plants"
                  value={stats.totalNativePlants}
                  icon={<Leaf size={18} />}
                />
              )}
              {stats.totalWildlifeSightings > 0 && (
                <StatCard
                  label="Wildlife"
                  value={stats.totalWildlifeSightings}
                  icon={<Eye size={18} />}
                />
              )}
              {stats.attendanceRate > 0 && (
                <StatCard
                  label="Attendance"
                  value={`${Math.round(stats.attendanceRate * 100)}%`}
                  icon={<UserCheck size={18} />}
                />
              )}
            </div>
          </motion.section>
        )}

        {/* Member gallery */}
        <motion.section variants={fadeUp} aria-label="Members">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-semibold text-primary-400 uppercase tracking-wider">
              Members ({collective.member_count})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.slice(0, 24).map((member) => (
              <Link
                key={member.id}
                to={`/profile/${member.user_id}`}
                aria-label={member.profiles?.display_name ?? 'Member'}
              >
                <Avatar
                  src={member.profiles?.avatar_url}
                  name={member.profiles?.display_name}
                  size="sm"
                />
              </Link>
            ))}
            {members.length > 24 && (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-xs font-semibold text-primary-400">
                +{members.length - 24}
              </div>
            )}
          </div>
        </motion.section>

        {/* Upcoming events */}
        <motion.section variants={fadeUp} aria-label="Upcoming events">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading text-sm font-semibold text-primary-400 uppercase tracking-wider">
              Upcoming Events
            </h3>
            {upcomingEvents.length > 3 && (
              <Link
                to={`/events?collective=${collectiveId}`}
                className="text-xs font-semibold text-primary-400 hover:text-primary-400"
              >
                See all
              </Link>
            )}
          </div>
          {upcomingEvents.length === 0 ? (
            <EmptyState
              illustration="empty"
              title="No upcoming events"
              description={isLeader
                ? 'Create an event to get your collective moving'
                : 'Check back soon or ask your leader to create one'}
              action={isLeader
                ? { label: 'Create Event', to: '/events/create' }
                : undefined}
              className="min-h-[140px] py-4"
            />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 transition-colors duration-150 hover:bg-primary-50"
                >
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-primary-100 text-primary-400">
                    <span className="text-[10px] font-semibold uppercase">
                      {new Date(event.date_start).toLocaleDateString('en-AU', { month: 'short' })}
                    </span>
                    <span className="font-heading text-lg font-bold leading-tight">
                      {new Date(event.date_start).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {event.title}
                    </p>
                    {event.address && (
                      <p className="text-xs text-primary-400 truncate">{event.address}</p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-primary-300" />
                </Link>
              ))}
            </div>
          )}
        </motion.section>

        {/* Past events */}
        {pastEvents.length > 0 && (
          <motion.section variants={fadeUp} aria-label="Past events">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-sm font-semibold text-primary-400 uppercase tracking-wider">
                Past Events
              </h3>
            </div>
            <div className="space-y-2">
              {pastEvents.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 transition-colors duration-150 hover:bg-primary-50"
                >
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-white text-primary-400">
                    <span className="text-[10px] font-semibold uppercase">
                      {new Date(event.date_start).toLocaleDateString('en-AU', { month: 'short' })}
                    </span>
                    <span className="font-heading text-lg font-bold leading-tight">
                      {new Date(event.date_start).getDate()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {event.title}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-primary-300" />
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Map */}
        <motion.section variants={fadeUp} aria-label="Location">
          <h3 className="font-heading text-sm font-semibold text-primary-400 uppercase tracking-wider mb-3">
            Location
          </h3>
          {(() => {
            const pos = parseLocationPoint(collective.location_point)
            return (
              <MapView
                center={pos ?? undefined}
                zoom={pos ? 14 : 5}
                markers={pos ? [{ id: collective.id, position: pos, variant: 'collective', label: collective.name }] : undefined}
                interactive={false}
                aria-label={`${collective.name} location`}
                className="aspect-video rounded-2xl"
              />
            )
          })()}
        </motion.section>
      </motion.div>

      {/* Leave confirmation */}
      <ConfirmationSheet
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeave}
        title="Leave this collective?"
        description="You'll lose access to the group chat and won't see collective-specific events in your feed."
        confirmLabel="Leave Collective"
        variant="warning"
      />
    </Page>
  )
}
