import { useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Bell,
  ChevronRight,
  Calendar,
  Users,
  TreePine,
  Megaphone,
  Target,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import {
  getGreeting,
  useLatestAnnouncement,
  useFeaturedEvents,
  useUpcomingNearby,
  useMyCollective,
  useImpactStats,
  useActiveChallenge,
  useTrendingCollectives,
  useSuggestedConnections,
  ACTIVITY_TYPE_LABELS,
} from '@/hooks/use-home-feed'
import {
  Page,
  PullToRefresh,
  Card,
  Avatar,
  Badge,
  ProgressBar,
  Skeleton,
  EmptyState,
  Button,
  SeasonalParticles,
  EasterEgg,
} from '@/components'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Section wrapper  title is padded, children are full-bleed         */
/* ------------------------------------------------------------------ */

function Section({
  title,
  action,
  children,
  className,
}: {
  title: string
  action?: { label: string; to: string }
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn(className)} aria-label={title}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-lg font-semibold text-primary-800">
          {title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="flex items-center gap-0.5 text-sm font-medium text-primary-400"
          >
            {action.label}
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Horizontal scroll  edge-to-edge with inset padding for items      */
/* ------------------------------------------------------------------ */

function HScroll({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative -mx-4 lg:-mx-6">
      {/* Subtle fade on right edge only  left edge uses padding so first item is fully visible */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 lg:w-8 bg-gradient-to-l from-white to-transparent" />
      <div
        className={cn(
          'flex gap-3 overflow-x-auto px-4 lg:px-6 pb-1',
          'scrollbar-none snap-x snap-proximity',
          'scroll-smooth',
          className,
        )}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {children}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatActivityType(type: string): string {
  return ACTIVITY_TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
}

/* ------------------------------------------------------------------ */
/*  Badge activity key mapping                                         */
/* ------------------------------------------------------------------ */

type BadgeActivity =
  | 'tree-planting'
  | 'beach-cleanup'
  | 'habitat'
  | 'wildlife'
  | 'education'
  | 'fundraising'
  | 'monitoring'
  | 'restoration'

const activityTypeToBadge: Record<string, BadgeActivity> = {
  tree_planting: 'tree-planting',
  beach_cleanup: 'beach-cleanup',
  habitat_restoration: 'habitat',
  nature_walk: 'wildlife',
  education: 'education',
  wildlife_survey: 'wildlife',
  seed_collecting: 'tree-planting',
  weed_removal: 'restoration',
  waterway_cleanup: 'beach-cleanup',
  community_garden: 'habitat',
  other: 'restoration',
}

/* ------------------------------------------------------------------ */
/*  Home page                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  // All data hooks
  const announcement = useLatestAnnouncement()
  const featured = useFeaturedEvents()
  const upcoming = useUpcomingNearby()
  const myCollective = useMyCollective()
  const impact = useImpactStats()
  const challenge = useActiveChallenge()
  const trending = useTrendingCollectives()
  const suggestions = useSuggestedConnections()

  const firstName = profile?.display_name?.split(' ')[0]
  const eventsAttended = impact.data?.events_attended ?? 0
  const isNewUser = eventsAttended === 0 && !myCollective.data
  const isActiveUser = eventsAttended >= 5
  const isPowerUser = eventsAttended >= 20

  // Pull-to-refresh: invalidate all home queries
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['home'] })
  }, [queryClient])

  return (
    <Page
      header={
        <header
          className={cn(
            'sticky top-0 z-40',
            'flex items-center justify-end h-14 px-4',
            'bg-white/90 backdrop-blur-sm',
          )}
          style={{ paddingTop: 'var(--safe-top)' }}
        >
          <button
            type="button"
            onClick={() => navigate('/notifications')}
            className={cn(
              'flex items-center justify-center min-h-11 min-w-11 rounded-full',
              'text-primary-400 hover:bg-primary-50',
              'active:scale-[0.97] transition-all duration-150',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            )}
            aria-label="Notifications"
          >
            <Bell size={22} />
          </button>
        </header>
      }
    >
      {/* Seasonal ambient particles */}
      <SeasonalParticles count={6} />

      <PullToRefresh onRefresh={handleRefresh}>
        <motion.div
          className="space-y-6 pb-6"
          initial="hidden"
          animate="visible"
          variants={shouldReduceMotion ? undefined : stagger}
        >
          {/* 1. Greeting */}
          <motion.div
            className="pt-4"
            variants={shouldReduceMotion ? undefined : fadeUp}
          >
            <EasterEgg>
              <p className="font-heading text-2xl font-bold text-primary-800">
                {getGreeting(firstName)}
              </p>
            </EasterEgg>
            <p className="mt-0.5 text-sm text-primary-400">
              Here&apos;s what&apos;s happening in your world
            </p>
          </motion.div>

          {/* 2. Announcement banner */}
          {announcement.isLoading ? (
            <Skeleton variant="card" className="h-16" />
          ) : announcement.data ? (
            <motion.div
              variants={shouldReduceMotion ? undefined : fadeUp}
            >
              <Card.Root
                variant="announcement"
                onClick={() => navigate('/announcements')}
                aria-label={`Announcement: ${announcement.data.title}`}
              >
                <Card.Content className="flex items-center gap-3 py-3 bg-primary-50/60">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-200/60 text-primary-600 shrink-0">
                    <Megaphone size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">
                      {announcement.data.title}
                    </p>
                    <p className="text-xs text-primary-400 truncate">
                      {announcement.data.content}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-primary-400 shrink-0"
                  />
                </Card.Content>
              </Card.Root>
            </motion.div>
          ) : null}

          {/* 3. Your Collective  hero position */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            {myCollective.isLoading ? (
              <Skeleton variant="card" className="h-40" />
            ) : myCollective.data ? (
              <div
                className="rounded-2xl bg-gradient-to-br from-primary-800 to-primary-950 p-5 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                onClick={() =>
                  navigate(`/collectives/${myCollective.data!.slug}`)
                }
                role="button"
                tabIndex={0}
                aria-label={myCollective.data.name}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-400/20 text-primary-200 shrink-0">
                    <Users size={22} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary-300 uppercase tracking-wider">
                      Your Collective
                    </p>
                    <h2 className="font-heading text-xl font-bold text-white truncate">
                      {myCollective.data.name}
                    </h2>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-primary-300 shrink-0"
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-primary-200">
                  <span className="flex items-center gap-1.5">
                    <Users size={14} aria-hidden="true" />
                    {myCollective.data.member_count} members
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={14} aria-hidden="true" />
                    {myCollective.data.events_this_month} events this month
                  </span>
                </div>
                {myCollective.data.next_event && (
                  <div className="mt-4 pt-3 border-t border-primary-500/20">
                    <p className="text-xs font-medium text-primary-300 uppercase tracking-wider">
                      Next event
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-white">
                      {myCollective.data.next_event.title}
                    </p>
                    <p className="text-xs text-primary-300">
                      {formatEventDate(
                        myCollective.data.next_event.date_start,
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 p-5 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                onClick={() => navigate('/explore')}
                role="button"
                tabIndex={0}
                aria-label="Find your collective"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-400/20 text-primary-200 shrink-0">
                    <Users size={24} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-lg font-bold text-white">
                      Find your collective
                    </p>
                    <p className="text-sm text-primary-200">
                      Join a local group and start making an impact
                    </p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-primary-300 shrink-0"
                  />
                </div>
              </div>
            )}
          </motion.div>

          {/* 4. Hero - featured event carousel (full-bleed) */}
          {featured.isLoading ? (
            <Skeleton variant="image" />
          ) : featured.data && featured.data.length > 0 ? (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <HScroll>
                {featured.data.map((event) => (
                  <Card.Root
                    key={event.id}
                    variant="event"
                    onClick={() => navigate(`/events/${event.id}`)}
                    className="shrink-0 w-[85vw] max-w-[340px] snap-start"
                    aria-label={event.title}
                  >
                    <div className="relative">
                      <Card.Image
                        src={
                          event.cover_image_url ??
                          '/img/placeholder-event.jpg'
                        }
                        alt={event.title}
                        aspectRatio="16/9"
                      />
                      <Card.Badge position="top-left">
                        <Badge
                          variant="activity"
                          activity={
                            activityTypeToBadge[event.activity_type] ??
                            'restoration'
                          }
                          size="sm"
                        >
                          {formatActivityType(event.activity_type)}
                        </Badge>
                      </Card.Badge>
                    </div>
                    <Card.Content className="bg-primary-50/40">
                      <Card.Title>{event.title}</Card.Title>
                      <Card.Meta>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} aria-hidden="true" />
                          {formatEventDate(event.date_start)}
                        </span>
                        {event.collectives && (
                          <span className="ml-2">
                            {event.collectives.name}
                          </span>
                        )}
                      </Card.Meta>
                    </Card.Content>
                  </Card.Root>
                ))}
              </HScroll>
            </motion.div>
          ) : null}

          {/* 5. Upcoming near you  horizontal scroll, edge-to-edge */}
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
            <Section
              title="Upcoming near you"
              action={{ label: 'See all', to: '/explore' }}
            >
              {upcoming.isLoading ? (
                <HScroll>
                  {[1, 2, 3].map((i) => (
                    <Card.Skeleton
                      key={i}
                      className="shrink-0 w-56 snap-start"
                    />
                  ))}
                </HScroll>
              ) : upcoming.data && upcoming.data.length > 0 ? (
                <HScroll>
                  {upcoming.data.map((event) => (
                    <Card.Root
                      key={event.id}
                      variant="event"
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="shrink-0 w-56 snap-start"
                      aria-label={event.title}
                    >
                      <Card.Image
                        src={
                          event.cover_image_url ??
                          '/img/placeholder-event.jpg'
                        }
                        alt={event.title}
                        aspectRatio="4/3"
                      />
                      <Card.Content className="p-3 bg-primary-50/30">
                        <Card.Title className="text-sm">
                          {event.title}
                        </Card.Title>
                        <Card.Meta className="text-xs">
                          {formatEventDate(event.date_start)}
                        </Card.Meta>
                      </Card.Content>
                    </Card.Root>
                  ))}
                </HScroll>
              ) : (
                <EmptyState
                  illustration="empty"
                  title="No upcoming events"
                  description="Check back soon or explore collectives near you"
                  action={{ label: 'Explore', to: '/explore' }}
                  className="min-h-[180px] py-6"
                />
              )}
            </Section>
          </motion.div>

          {/* 6. Your Impact  compact CTA linking to full dashboard */}
          {impact.data && (impact.data.events_attended > 0 || impact.data.trees_planted > 0) && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <Link
                to="/impact"
                className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary-100 to-primary-50 shadow-sm p-5 active:scale-[0.98] transition-all duration-150"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary-400/15 shrink-0">
                  <TreePine size={22} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm font-semibold text-primary-800">
                    Your Impact
                  </p>
                  <p className="text-xs text-primary-500 mt-0.5">
                    {impact.data.trees_planted} trees · {impact.data.events_attended} events · {impact.data.hours_volunteered}h volunteered
                  </p>
                </div>
                <ChevronRight size={18} className="text-primary-400 shrink-0" />
              </Link>
            </motion.div>
          )}

          {/* 7. National Challenge (active users: 5+ events) */}
          {!isActiveUser ? null : challenge.isLoading ? (
            <Skeleton variant="card" className="h-32" />
          ) : challenge.data ? (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <Section title="National Challenge">
                <Card.Root variant="stat" aria-label={challenge.data.title}>
                    <Card.Content className="bg-primary-50/50">
                      <div className="flex items-start gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-200/60 text-primary-600 shrink-0">
                          <Target size={20} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <Card.Title className="text-base">
                            {challenge.data.title}
                          </Card.Title>
                          {challenge.data.description && (
                            <p className="mt-0.5 text-xs text-primary-400 line-clamp-2">
                              {challenge.data.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-4">
                        <ProgressBar
                          value={
                            (challenge.data.total_progress /
                              challenge.data.goal_value) *
                            100
                          }
                          size="md"
                          label={`${challenge.data.total_progress.toLocaleString()} / ${challenge.data.goal_value.toLocaleString()} ${challenge.data.goal_type}`}
                          showLabel
                        />
                      </div>
                    </Card.Content>
                  </Card.Root>
              </Section>
            </motion.div>
          ) : null}

          {/* 8. Trending Collectives  horizontal scroll (for users not in a collective) */}
          {!myCollective.data && !myCollective.isLoading && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <Section
                title="Trending Collectives"
                action={{ label: 'View all', to: '/explore' }}
              >
                {trending.isLoading ? (
                  <HScroll>
                    {[1, 2, 3].map((i) => (
                      <Skeleton
                        key={i}
                        variant="card"
                        className="shrink-0 w-44 h-28"
                      />
                    ))}
                  </HScroll>
                ) : trending.data && trending.data.length > 0 ? (
                  <HScroll>
                    {trending.data.map((c) => (
                      <Card.Root
                        key={c.id}
                        variant="collective"
                        onClick={() => navigate(`/collectives/${c.slug}`)}
                        className="shrink-0 w-44 snap-start"
                        aria-label={c.name}
                      >
                        <Card.Content className="p-3 bg-primary-50/40">
                          <p className="font-heading text-sm font-semibold text-primary-800 truncate">
                            {c.name}
                          </p>
                          <p className="mt-0.5 text-xs text-primary-400">
                            {c.region ?? c.state}
                          </p>
                          <p className="mt-2 text-xs text-primary-500 font-medium">
                            {c.member_count} members
                          </p>
                        </Card.Content>
                      </Card.Root>
                    ))}
                  </HScroll>
                ) : null}
              </Section>
            </motion.div>
          )}

          {/* 9. People you may know  horizontal scroll */}
          {suggestions.data && suggestions.data.length > 0 && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <Section title="People you may know">
                <HScroll>
                  {suggestions.data.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => navigate(`/profile/${person.id}`)}
                      className="flex flex-col items-center justify-center gap-1.5 shrink-0 w-16 min-h-11 snap-start active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
                    >
                      <Avatar
                        src={person.avatar_url}
                        name={person.display_name ?? '?'}
                        size="lg"
                      />
                      <span className="text-xs text-primary-400 truncate w-full text-center">
                        {person.display_name?.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </HScroll>
              </Section>
            </motion.div>
          )}

          {/* 10. Leaderboard teaser (active users: 5+ events) */}
          {isActiveUser && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <Section
                title="Leaderboard"
                action={{ label: 'View full', to: '/leaderboard' }}
              >
                <Card.Root
                  variant="stat"
                  onClick={() => navigate('/leaderboard')}
                  aria-label="View leaderboard"
                >
                  <Card.Content className="flex items-center gap-3 bg-primary-50/40">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-200/50 text-primary-600 shrink-0">
                      <Trophy size={20} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-800">
                        See where you rank
                      </p>
                      <p className="text-xs text-primary-400">
                        {eventsAttended} events attended · keep climbing!
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-primary-400 shrink-0" />
                  </Card.Content>
                </Card.Root>
              </Section>
            </motion.div>
          )}

          {/* 12. Referral & Leadership (power users: 20+ events) */}
          {isPowerUser && (
            <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
              <Section title="Grow the movement">
                <div className="space-y-2">
                  <Card.Root
                    variant="stat"
                    onClick={() => navigate('/referral')}
                    aria-label="Invite friends"
                  >
                    <Card.Content className="flex items-center gap-3 bg-primary-100/50">
                      <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-200/60 text-primary-600 shrink-0">
                        <Users size={20} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-800">
                          Invite friends
                        </p>
                        <p className="text-xs text-primary-400">
                          Share your referral link and earn bonus points
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-primary-400 shrink-0" />
                    </Card.Content>
                  </Card.Root>
                </div>
              </Section>
            </motion.div>
          )}

          {/* 13. New user empty state with guided CTAs */}
          {isNewUser && !impact.isLoading && (
            <motion.div
              variants={shouldReduceMotion ? undefined : fadeUp}
            >
              <Card.Root variant="stat">
                <Card.Content className="text-center py-6 bg-gradient-to-b from-primary-50 to-primary-100/40">
                  <span className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-primary-200/60 text-primary-600 mb-3">
                    <Sparkles size={24} />
                  </span>
                  <h3 className="font-heading text-lg font-semibold text-primary-800">
                    Welcome to Co-Exist!
                  </h3>
                  <p className="mt-1 text-sm text-primary-400 max-w-xs mx-auto">
                    Join a collective, find your first event, and start making a
                    difference.
                  </p>
                  <div className="mt-4 flex flex-col gap-2 max-w-[200px] mx-auto">
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => navigate('/explore')}
                    >
                      Find a Collective
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => navigate('/explore?tab=events')}
                    >
                      Explore Events
                    </Button>
                  </div>
                </Card.Content>
              </Card.Root>
            </motion.div>
          )}
        </motion.div>
      </PullToRefresh>
    </Page>
  )
}
