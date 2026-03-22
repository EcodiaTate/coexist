import { useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ChevronRight,
  Calendar,
  Users,
  TreePine,
  Megaphone,
  Target,
  Sparkles,
  Heart,
  MessageCircle,
  Clock,
  Award,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import {
  getGreeting,
  useLatestAnnouncement,
  useMyCollective,
  useImpactStats,
  useActiveChallenge,
  useTrendingCollectives,
  useMyUpcomingEvents,
  useRecentPosts,
  useHomeTierProgress,
} from '@/hooks/use-home-feed'
import {
  Page,
  PullToRefresh,
  Badge,
  ProgressBar,
  Button,
} from '@/components'
import { cn } from '@/lib/cn'
import { ProximityCheckInBanner } from '@/components/proximity-check-in-banner'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

/* ------------------------------------------------------------------ */
/*  Section wrapper                                                    */
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-sm font-bold text-white/50 uppercase tracking-widest">
          {title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="flex items-center gap-0.5 text-xs font-semibold text-white/40 hover:text-white/60 transition-colors"
          >
            {action.label}
            <ChevronRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Horizontal scroll                                                  */
/* ------------------------------------------------------------------ */

function HScroll({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative -mx-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black/20 to-transparent" />
      <div
        className={cn(
          'flex gap-3 overflow-x-auto px-6 pb-1',
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

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

/* ------------------------------------------------------------------ */
/*  Home page                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const announcement = useLatestAnnouncement()
  const myCollective = useMyCollective()
  const impact = useImpactStats()
  const challenge = useActiveChallenge()
  const trending = useTrendingCollectives()
  const myEvents = useMyUpcomingEvents()
  const recentPosts = useRecentPosts()
  const tierProgress = useHomeTierProgress()

  const initialLoading = announcement.isLoading || myCollective.isLoading || myEvents.isLoading || impact.isLoading
  const showLoading = useDelayedLoading(initialLoading)

  const firstName = profile?.display_name?.split(' ')[0]
  const eventsAttended = impact.data?.events_attended ?? 0
  const isNewUser = eventsAttended === 0 && !myCollective.data

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['home'] })
  }, [queryClient])

  return (
    <Page noBackground className="!px-0 bg-primary-950">
      <PullToRefresh onRefresh={handleRefresh} dark>
        <div className="relative min-h-full bg-primary-950">
          {/* ── Background — sticky keeps it viewport-pinned, negative margin collapses it ── */}
          <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary-600 via-secondary-700 to-primary-950" />

            {/* ── Background geometric shapes ── */}
            <motion.div
              initial={rm ? {} : { scale: 0.6, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1], opacity: 1 }}
              transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.5, ease: 'easeOut' } }}
              className="absolute -right-[12%] -top-[8%] w-[60vw] h-[60vw] max-w-[550px] max-h-[550px] rounded-full bg-white/[0.06]"
            />
            <motion.div
              initial={rm ? {} : { scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.8, delay: 0.3, ease: 'easeOut' } }}
              className="absolute -left-[18%] bottom-[8%] w-[70vw] h-[70vw] max-w-[680px] max-h-[680px] rounded-full border border-white/[0.07]"
            />
            <motion.div
              initial={rm ? {} : { scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.07, 1], opacity: 1 }}
              transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }, opacity: { duration: 1.8, delay: 0.5, ease: 'easeOut' } }}
              className="absolute -left-[12%] bottom-[14%] w-[50vw] h-[50vw] max-w-[480px] max-h-[480px] rounded-full border border-white/[0.05]"
            />
            <motion.div
              initial={rm ? {} : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="absolute left-[6%] top-[35%] w-[90px] h-[90px] rounded-full bg-white/[0.04]"
            />
            {/* Floating dots */}
            <motion.div
              initial={rm ? {} : { opacity: 0 }}
              animate={{ y: [0, -7, 0], opacity: [0.3, 0.55, 0.3] }}
              transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.8, delay: 1 } }}
              className="absolute left-[15%] top-[20%] w-2 h-2 rounded-full bg-white/30"
            />
            <motion.div
              initial={rm ? {} : { opacity: 0 }}
              animate={{ y: [0, 5, 0], opacity: [0.2, 0.4, 0.2] }}
              transition={{ y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }, opacity: { duration: 0.8, delay: 1.5 } }}
              className="absolute right-[10%] bottom-[30%] w-1.5 h-1.5 rounded-full bg-white/25"
            />
          </div>

          {/* ── Content ── */}
          <div className="relative z-10">
            {/* Hero greeting */}
            <div className="relative w-full flex flex-col">
              <div style={{ paddingTop: 'var(--safe-top)' }} />

              <div className="flex flex-col items-center justify-start px-6 text-center pt-[18svh] pb-4 min-h-[70svh] lg:min-h-0 lg:pt-16 lg:pb-8 -mb-8 lg:mb-0">
                <motion.img
                  src="/logos/white-wordmark.webp"
                  alt="Co-Exist"
                  initial={rm ? {} : { opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="h-16 sm:h-20 w-auto object-contain mb-8 lg:mb-4"
                />
                <motion.p
                  initial={rm ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="font-heading text-xl sm:text-2xl lg:text-3xl font-bold text-white"
                >
                  {getGreeting(firstName)}
                </motion.p>
              </div>
            </div>

            {/* Body sections */}
            <motion.div
              className="px-6 space-y-10 pb-24 -mt-32 lg:mt-0"
              initial="hidden"
              animate="visible"
              variants={rm ? undefined : stagger}
            >
              {/* Proximity check-in banner */}
              <ProximityCheckInBanner />

              {/* Announcement banner */}
              {announcement.isLoading && showLoading ? (
                <div className="rounded-2xl bg-white/[0.06] p-4 animate-pulse flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 rounded-full bg-white/[0.05]" />
                    <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
                  </div>
                </div>
              ) : announcement.data ? (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <div
                    className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    onClick={() => navigate('/announcements')}
                    role="button"
                    tabIndex={0}
                    aria-label={`Announcement: ${announcement.data.title}`}
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/[0.08] text-white/60 shrink-0">
                      <Megaphone size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {announcement.data.title}
                      </p>
                      <p className="text-xs text-white/35 truncate">
                        {announcement.data.content}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-white/25 shrink-0" />
                  </div>
                </motion.div>
              ) : null}

              {/* Your Collective */}
              <motion.div variants={rm ? undefined : fadeUp}>
                {myCollective.isLoading && showLoading ? (
                  <div className="rounded-2xl bg-white/[0.06] p-6 animate-pulse space-y-4">
                    <div className="h-3 w-24 rounded-full bg-white/[0.05]" />
                    <div className="h-7 w-48 rounded-xl bg-white/[0.06]" />
                    <div className="flex gap-5">
                      <div className="h-4 w-16 rounded-full bg-white/[0.04]" />
                      <div className="h-4 w-24 rounded-full bg-white/[0.04]" />
                    </div>
                  </div>
                ) : myCollective.data ? (
                  <div
                    className="relative rounded-2xl bg-white/[0.06] p-7 sm:p-9 overflow-hidden active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    onClick={() => navigate(`/collectives/${myCollective.data!.slug}`)}
                    role="button"
                    tabIndex={0}
                    aria-label={myCollective.data.name}
                  >
                    <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/[0.04]" />
                    <div className="absolute -left-8 -bottom-10 w-32 h-32 rounded-full bg-white/[0.03]" />

                    <div className="relative z-10">
                      <p className="text-[11px] font-semibold text-white/35 uppercase tracking-widest">
                        Your Collective
                      </p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3 truncate">
                        {myCollective.data.name.replace(/\s*Collective$/i, '')}
                      </h2>

                      <div className="flex items-center gap-5 mt-6 text-sm text-white/45">
                        <span className="flex items-center gap-1.5">
                          <Users size={15} aria-hidden="true" />
                          {myCollective.data.member_count}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={15} aria-hidden="true" />
                          {myCollective.data.events_this_month} this month
                        </span>
                      </div>

                      {myCollective.data.next_event && (
                        <div className="mt-6 pt-6 border-t border-white/[0.06]">
                          <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest">
                            Next up
                          </p>
                          <p className="mt-2 text-lg font-bold text-white">
                            {myCollective.data.next_event.title}
                          </p>
                          <p className="mt-1 text-sm text-white/35">
                            {formatEventDate(myCollective.data.next_event.date_start)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : !myCollective.isLoading ? (
                  <div
                    className="relative rounded-2xl bg-white/[0.06] p-7 sm:p-9 overflow-hidden active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    onClick={() => navigate('/explore')}
                    role="button"
                    tabIndex={0}
                    aria-label="Find your collective"
                  >
                    <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/[0.03]" />
                    <div className="relative z-10">
                      <p className="text-[11px] font-semibold text-white/25 uppercase tracking-widest">
                        Get started
                      </p>
                      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-3">
                        Find your collective
                      </h2>
                      <p className="mt-3 text-sm text-white/35 max-w-xs">
                        Join a local group and start making an impact
                      </p>
                      <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60">
                        Explore
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>

              {/* Your Upcoming Events */}
              {myEvents.isLoading && showLoading ? (
                <div className="space-y-3">
                  <div className="h-3 w-36 rounded-full bg-white/[0.04] animate-pulse" />
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-2xl bg-white/[0.06] p-4 animate-pulse flex gap-4" style={{ animationDelay: `${i * 80}ms` }}>
                      <div className="w-14 h-14 rounded-xl bg-white/[0.05] shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 w-3/4 rounded-full bg-white/[0.05]" />
                        <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : myEvents.data && myEvents.data.length > 0 ? (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <Section
                    title="Your Upcoming Events"
                    action={{ label: 'All events', to: '/events' }}
                  >
                    <div className="space-y-2">
                      {myEvents.data.map((event) => {
                        const days = daysUntil(event.date_start)
                        const isToday = days === 0
                        const isTomorrow = days === 1
                        const isSoon = days <= 3

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              'flex items-center gap-4 rounded-2xl p-4',
                              'active:scale-[0.98] transition-all duration-150 cursor-pointer',
                              isToday
                                ? 'bg-success-500/15 ring-1 ring-success-400/25'
                                : 'bg-white/[0.06]',
                            )}
                            onClick={() => navigate(`/events/${event.id}`)}
                            role="button"
                            tabIndex={0}
                            aria-label={event.title}
                          >
                            {/* Date block */}
                            <div className={cn(
                              'flex flex-col items-center justify-center w-14 h-14 rounded-xl shrink-0',
                              isToday ? 'bg-success-500/25' : isSoon ? 'bg-warning-500/15' : 'bg-white/[0.08]',
                            )}>
                              <span className={cn(
                                'text-[10px] font-bold uppercase tracking-wider',
                                isToday ? 'text-success-300' : isTomorrow ? 'text-warning-300' : 'text-white/40',
                              )}>
                                {isToday ? 'Today' : isTomorrow ? 'Tmrw' : new Date(event.date_start).toLocaleDateString('en-AU', { weekday: 'short' })}
                              </span>
                              <span className={cn(
                                'text-lg font-bold leading-none',
                                isToday ? 'text-success-200' : 'text-white',
                              )}>
                                {new Date(event.date_start).getDate()}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white truncate">
                                {event.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-white/35">
                                <span className="flex items-center gap-1">
                                  <Clock size={11} aria-hidden="true" />
                                  {new Date(event.date_start).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
                                </span>
                                {event.collectives && (
                                  <span className="truncate">
                                    {event.collectives.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            {event.registration_status === 'waitlisted' && (
                              <Badge variant="default" size="sm">Waitlisted</Badge>
                            )}

                            <ChevronRight size={16} className="text-white/20 shrink-0" />
                          </div>
                        )
                      })}
                    </div>
                  </Section>
                </motion.div>
              ) : !isNewUser && !myEvents.isLoading ? (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <Section title="Your Upcoming Events">
                    <div
                      className="rounded-2xl bg-white/[0.06] p-6 text-center cursor-pointer active:scale-[0.98] transition-all duration-150"
                      onClick={() => navigate('/explore?tab=events')}
                      role="button"
                      tabIndex={0}
                    >
                      <Calendar size={24} className="mx-auto text-white/25 mb-2" />
                      <p className="text-sm text-white/45 font-medium">No events coming up</p>
                      <p className="text-xs text-white/25 mt-1">Find your next one</p>
                    </div>
                  </Section>
                </motion.div>
              ) : null}

              {/* Points & Tier Progress */}
              {tierProgress.data && (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <div
                    className="rounded-2xl bg-white/[0.06] p-6 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    onClick={() => navigate('/points')}
                    role="button"
                    tabIndex={0}
                    aria-label="Your points and tier"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/15 shrink-0">
                          <Award size={20} className="text-amber-300" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {tierProgress.data.tier}
                          </p>
                          <p className="text-xs text-white/35">
                            {tierProgress.data.points.toLocaleString()} pts
                          </p>
                        </div>
                      </div>
                      {tierProgress.data.nextTier && (
                        <span className="text-xs text-white/25">
                          {tierProgress.data.pointsToNext.toLocaleString()} to {tierProgress.data.nextTier}
                        </span>
                      )}
                    </div>
                    {tierProgress.data.nextTier && (
                      <ProgressBar
                        value={tierProgress.data.progress}
                        size="sm"
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Community Posts */}
              {recentPosts.data && recentPosts.data.length > 0 && (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <Section
                    title="From Your Community"
                    action={{ label: 'See all', to: '/community' }}
                  >
                    <div className="space-y-2">
                      {recentPosts.data.map((post) => (
                        <div
                          key={post.id}
                          className="rounded-2xl bg-white/[0.06] p-5 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                          onClick={() => navigate('/community')}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/[0.08] shrink-0 overflow-hidden">
                              {post.author?.avatar_url ? (
                                <img
                                  src={post.author.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">
                                  {post.author?.display_name?.[0]?.toUpperCase() ?? '?'}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-white truncate">
                                  {post.author?.display_name ?? 'Member'}
                                </p>
                                <span className="text-[10px] text-white/25 shrink-0">
                                  {formatRelativeTime(post.created_at)}
                                </span>
                              </div>
                              {post.content && (
                                <p className="mt-1 text-sm text-white/50 line-clamp-2">
                                  {post.content}
                                </p>
                              )}
                              {post.images && post.images.length > 0 && !post.content && (
                                <p className="mt-1 text-sm text-white/35 italic">Shared a photo</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3 pl-11">
                            <span className="flex items-center gap-1 text-xs text-white/25">
                              <Heart size={12} />
                              {post.like_count}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-white/25">
                              <MessageCircle size={12} />
                              {post.comment_count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </motion.div>
              )}

              {/* Your Impact */}
              {impact.data && (impact.data.events_attended > 0 || impact.data.trees_planted > 0) && (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <Link
                    to="/impact"
                    className="flex items-center gap-4 rounded-2xl bg-white/[0.06] p-5 active:scale-[0.98] transition-all duration-150"
                  >
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-success-500/15 shrink-0">
                      <TreePine size={20} className="text-success-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-sm font-semibold text-white">
                        Your Impact
                      </p>
                      <p className="text-xs text-white/35 mt-0.5">
                        {impact.data.trees_planted} trees · {impact.data.events_attended} events · {impact.data.hours_volunteered}h volunteered
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-white/25 shrink-0" />
                  </Link>
                </motion.div>
              )}

              {/* National Challenge */}
              {challenge.isLoading && showLoading ? (
                <div className="rounded-2xl bg-white/[0.06] p-5 animate-pulse space-y-3">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded-full bg-white/[0.05]" />
                      <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.05]" />
                </div>
              ) : challenge.data ? (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <Section title="National Challenge">
                    <div className="rounded-2xl bg-white/[0.06] p-6">
                      <div className="flex items-start gap-4">
                        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.08] text-white/60 shrink-0">
                          <Target size={22} />
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-heading text-base font-bold text-white">
                            {challenge.data.title}
                          </p>
                          {challenge.data.description && (
                            <p className="mt-0.5 text-xs text-white/35 line-clamp-2">
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
                    </div>
                  </Section>
                </motion.div>
              ) : null}

              {/* Trending Collectives */}
              {!myCollective.data && !myCollective.isLoading && (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <Section
                    title="Trending Collectives"
                    action={{ label: 'View all', to: '/explore' }}
                  >
                    {trending.isLoading && showLoading ? (
                      <HScroll>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="shrink-0 w-44 h-28 rounded-2xl bg-white/[0.06] animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                        ))}
                      </HScroll>
                    ) : trending.data && trending.data.length > 0 ? (
                      <HScroll>
                        {trending.data.map((c) => (
                          <div
                            key={c.id}
                            className="shrink-0 w-44 snap-start rounded-2xl bg-white/[0.06] p-4 active:scale-[0.97] transition-all duration-150 cursor-pointer"
                            onClick={() => navigate(`/collectives/${c.slug}`)}
                            role="button"
                            tabIndex={0}
                            aria-label={c.name}
                          >
                            <p className="font-heading text-sm font-semibold text-white truncate">
                              {c.name}
                            </p>
                            <p className="mt-0.5 text-xs text-white/35">
                              {c.region ?? c.state}
                            </p>
                            <p className="mt-3 text-xs text-white/45 font-medium">
                              {c.member_count} members
                            </p>
                          </div>
                        ))}
                      </HScroll>
                    ) : null}
                  </Section>
                </motion.div>
              )}

              {/* New user welcome */}
              {isNewUser && !impact.isLoading && (
                <motion.div variants={rm ? undefined : fadeUp}>
                  <div className="rounded-2xl bg-white/[0.08] p-10 text-center">
                    <span className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-white/[0.08] text-white/60 mb-5">
                      <Sparkles size={30} />
                    </span>
                    <h3 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                      Welcome to Co-Exist!
                    </h3>
                    <p className="mt-3 text-base text-white/35 max-w-xs mx-auto">
                      Join a collective, find your first event, and start making a difference.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 max-w-[240px] mx-auto">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => navigate('/explore')}
                      >
                        Find a Collective
                      </Button>
                      <button
                        type="button"
                        onClick={() => navigate('/explore?tab=events')}
                        className="h-11 rounded-2xl bg-white/[0.08] text-sm font-semibold text-white/70 hover:bg-white/[0.12] active:scale-[0.97] transition-all duration-150 cursor-pointer"
                      >
                        Explore Events
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </PullToRefresh>
    </Page>
  )
}
