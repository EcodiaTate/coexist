import { useCallback, useState, useRef, useEffect, useMemo, startTransition } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { useParallaxLayers } from '@/hooks/use-parallax-scroll'
import {
  ChevronRight,
  Calendar,
  Users,
  TreePine,
  Megaphone,
  Clock,
  Trash2,
  Sprout,
  GraduationCap,
  Globe,
  MapPin,
  Heart,
  ShoppingBag,
  QrCode,
  Search,
  Camera,
  CheckCircle2,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import {
  getGreeting,
  useMyCollective,
  useImpactStats,
  useMyUpcomingEvents,
  useCollectiveUpcomingEvents,
  useRecentUpdates,
} from '@/hooks/use-home-feed'
import { useNationalImpact, useCollectiveImpact } from '@/hooks/use-impact'
import type { CanonicalImpact } from '@/hooks/use-impact'
import { usePendingSurveys } from '@/hooks/use-auto-survey'
import {
  Page,
  PullToRefresh,
  Badge,
  Button,
  CheckInSheet,
} from '@/components'
import { prefetchEventDetail } from '@/hooks/use-events'
import { cn } from '@/lib/cn'
import { ProximityCheckInBanner } from '@/components/proximity-check-in-banner'

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
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
        <h2 className="font-heading text-sm font-bold text-primary-700/70 uppercase tracking-widest">
          {title}
        </h2>
        {action && (
          <Link
            to={action.to}
            className="flex items-center gap-0.5 text-xs font-semibold text-primary-600 hover:text-primary-800 active:scale-[0.97] transition-[colors,transform] duration-150"
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
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />
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

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
}

function daysUntil(iso: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function isEventHappeningNow(start: string, end: string | null): boolean {
  const now = Date.now()
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : s + 4 * 60 * 60 * 1000 // default 4h window
  return now >= s && now <= e
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

/* ------------------------------------------------------------------ */
/*  Parallax Hero (two-layer photo parallax, nature/conservation)      */
/* ------------------------------------------------------------------ */

function HomeHero({ rm }: { rm: boolean }) {
  const { bgRef, fgRef, textRef } = useParallaxLayers({ withScale: !rm })

  return (
    <div className="relative">
      <div className="relative w-full h-[110vw] min-h-[480px] sm:h-auto overflow-hidden">
        {/* Layer 0: Background landscape - slowest parallax */}
        <div
          ref={rm ? undefined : bgRef}
          className="h-full will-change-transform"
        >
          <img
            src="/img/home-hero-bg.png"
            alt="Australian conservation landscape"
            className="w-full h-full object-cover object-center sm:h-auto sm:object-fill block"
          />
        </div>

        {/* Layer 1: Foreground elements - medium parallax */}
        <div
          ref={rm ? undefined : fgRef}
          className="absolute bottom-0 inset-x-0 z-[3] flex justify-center will-change-transform"
        >
          <div className="w-[120%] -ml-[10%] sm:w-[70%] sm:ml-0">
            <img
              src="/img/home-hero-fg.png"
              alt="Co-Exist volunteers"
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Hero text - fastest parallax, recedes behind fg */}
        <div
          ref={rm ? undefined : textRef}
          className="absolute inset-x-0 top-[18%] sm:top-[7%] z-[2] flex flex-col items-center px-6 will-change-transform"
        >
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] text-white/80 mb-0.5 drop-shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
            Welcome to
          </span>
          <img
            src="/logos/white-wordmark.webp"
            alt="Co-Exist"
            className="h-24 sm:h-32 w-auto object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Safe area spacer at top */}
        <div
          className="absolute top-0 left-0 right-0 z-40"
          style={{ paddingTop: 'var(--safe-top, 0px)' }}
        />
      </div>

      {/* Wave transition - pinned to bottom of image */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="w-full h-7 sm:h-10 block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,25
               C60,22 100,18 140,20
               C180,22 200,15 220,18
               L228,8 L234,5 L240,10
               C280,18 340,24 400,20
               C440,16 470,22 510,25
               C560,28 600,20 640,22
               C670,24 690,18 710,20
               L718,10 L722,6 L728,12
               C760,20 820,26 880,22
               C920,18 950,24 990,26
               C1020,28 1050,20 1080,18
               C1100,16 1120,22 1140,24
               L1148,12 L1153,7 L1158,9 L1165,16
               C1200,22 1260,26 1320,22
               C1360,18 1400,24 1440,22
               L1440,70 L0,70 Z"
            className="fill-white"
          />
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Your Next Event - prominent card with "Tap to Sign In" or CTA      */
/* ------------------------------------------------------------------ */

function NextEventCard({
  events,
  isLoading,
  showLoading,
  rm,
}: {
  events: ReturnType<typeof useMyUpcomingEvents>['data']
  isLoading: boolean
  showLoading: boolean
  rm: boolean
}) {
  const navigate = useNavigate()
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkInEventId, setCheckInEventId] = useState('')
  const [checkInEventTitle, setCheckInEventTitle] = useState('')
  const [checkInCollective, setCheckInCollective] = useState('')

  if (isLoading && showLoading) {
    return (
      <div className="rounded-2xl bg-surface-1 shadow-md p-6 animate-pulse space-y-3">
        <div className="h-3 w-28 rounded-full bg-primary-100" />
        <div className="h-6 w-3/4 rounded-xl bg-primary-50" />
        <div className="h-4 w-1/2 rounded-full bg-primary-50" />
      </div>
    )
  }

  const nextEvent = events?.[0]

  if (!nextEvent) {
    return (
      <motion.div variants={rm ? undefined : fadeUp}>
        <Section title="Your Next Event">
          <div
            className="rounded-2xl bg-gradient-to-br from-primary-600 to-moss-600 shadow-lg p-6 text-center cursor-pointer active:scale-[0.98] transition-all duration-150"
            onClick={() => navigate('/events')}
            role="button"
            tabIndex={0}
          >
            <Search size={24} className="mx-auto text-white/60 mb-3" />
            <p className="text-sm text-white font-medium">No upcoming events</p>
            <p className="text-xs text-white/60 mt-1 mb-4">Discover what's happening near you</p>
            <Button
              variant="primary"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation()
                navigate('/events')
              }}
            >
              Find Events
            </Button>
          </div>
        </Section>
      </motion.div>
    )
  }

  const happeningNow = isEventHappeningNow(nextEvent.date_start, nextEvent.date_end)
  const days = daysUntil(nextEvent.date_start)
  const isToday = days === 0
  const isTomorrow = days === 1

  return (
    <motion.div variants={rm ? undefined : fadeUp}>
      <Section title="Your Next Event">
        <div
          className={cn(
            'relative rounded-2xl overflow-hidden',
            'active:scale-[0.98] transition-all duration-150 cursor-pointer',
            happeningNow
              ? 'bg-gradient-to-br from-primary-500 to-primary-700 ring-2 ring-primary-400/60 shadow-xl shadow-primary-500/30'
              : 'bg-gradient-to-br from-primary-600 to-primary-800 shadow-md',
          )}
          onClick={() => {
            navigate(`/events/${nextEvent.id}`)
          }}
          role="button"
          tabIndex={0}
          aria-label={nextEvent.title}
        >
          {/* Cover image */}
          {nextEvent.cover_image_url && (
            <div className="relative w-full h-32 sm:h-40">
              <img
                src={nextEvent.cover_image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          <div className="p-6">
          {/* Decorative circle */}
          {!nextEvent.cover_image_url && (
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-white/10" />
          )}

          {/* Status badge */}
          {happeningNow && (
            <div className="flex items-center gap-2 mb-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {nextEvent.registration_status === 'attended' ? 'You\'re at this event' : 'Happening Now'}
              </span>
            </div>
          )}

          <h3 className="font-heading text-xl sm:text-2xl font-bold text-white">
            {nextEvent.title}
          </h3>

          <div className="flex items-center gap-4 mt-3 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} aria-hidden="true" />
              {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatEventDate(nextEvent.date_start)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} aria-hidden="true" />
              {formatEventTime(nextEvent.date_start)}
            </span>
          </div>

          {nextEvent.collectives && (
            <p className="mt-2 text-xs text-white/50 flex items-center gap-1.5">
              <MapPin size={12} aria-hidden="true" />
              {nextEvent.collectives.name}
            </p>
          )}

          {/* CTA */}
          {nextEvent.registration_status === 'attended' && happeningNow ? (
            /* Checked in - prompt to share photos */
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15 text-white/90 text-xs font-bold">
                <CheckCircle2 size={14} className="text-sprout-300 shrink-0" />
                You're checked in!
              </div>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<Camera size={20} />}
                className="relative bg-white text-primary-700 hover:bg-white/90 font-bold text-base shadow-lg"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  navigate(`/chat/${nextEvent.collective_id}`)
                }}
              >
                Share Photos with Collective
              </Button>
            </div>
          ) : happeningNow ? (
            <div className="mt-5 relative">
              {/* Pulsing ring behind the button */}
              <div className="absolute inset-0 rounded-xl bg-white/20 animate-pulse" />
              <Button
                variant="primary"
                size="lg"
                fullWidth
                icon={<QrCode size={20} />}
                className="relative bg-white text-primary-700 hover:bg-white/90 font-bold text-base shadow-lg"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  setCheckInEventId(nextEvent.id)
                  setCheckInEventTitle(nextEvent.title)
                  setCheckInCollective(nextEvent.collectives?.name ?? '')
                  setCheckInOpen(true)
                }}
              >
                Tap to Sign In
              </Button>
            </div>
          ) : (
            <div className="mt-4 flex items-center text-sm font-semibold text-white/80">
              View details
              <ChevronRight size={16} className="ml-0.5" />
            </div>
          )}
          </div>
        </div>
      </Section>

      <CheckInSheet
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        eventId={checkInEventId}
        eventTitle={checkInEventTitle}
        collectiveName={checkInCollective}
        autoScan
      />
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Upcoming Events carousel                                           */
/* ------------------------------------------------------------------ */

function UpcomingEventsCarousel({ rm }: { rm: boolean }) {
  const navigate = useNavigate()
  const collectiveEvents = useCollectiveUpcomingEvents()

  if (collectiveEvents.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-36 rounded-full bg-primary-100 animate-pulse" />
        <div className="relative -mx-6">
          <div className="flex gap-3 px-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-56 h-32 rounded-2xl bg-surface-1 shadow-sm animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!collectiveEvents.data?.length) return null

  return (
    <motion.div variants={rm ? undefined : fadeUp}>
      <Section
        title="Upcoming Events"
        action={{ label: 'See All', to: '/events' }}
      >
        <HScroll>
          {collectiveEvents.data.map((event) => {
            const days = daysUntil(event.date_start)
            const isToday = days === 0
            const isTomorrow = days === 1
            const isSoon = days <= 3

            return (
              <div
                key={event.id}
                className="shrink-0 w-56 snap-start rounded-2xl bg-gradient-to-br from-primary-400 to-sprout-500 shadow-lg overflow-hidden active:scale-[0.97] transition-all duration-150 cursor-pointer"
                onClick={() => navigate(`/events/${event.id}`)}
                role="button"
                tabIndex={0}
                aria-label={event.title}
              >
                {/* Cover image */}
                {event.cover_image_url && (
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="w-full h-24 object-cover"
                  />
                )}
                <div className="p-4">
                {/* Date badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                    isToday ? 'bg-white/20 text-white'
                      : isTomorrow ? 'bg-white/20 text-white'
                      : isSoon ? 'bg-white/15 text-white/90'
                      : 'bg-white/10 text-white/70',
                  )}>
                    {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatEventDate(event.date_start)}
                  </span>
                </div>

                <p className="font-heading text-sm font-semibold text-white truncate">
                  {event.title}
                </p>

                <div className="flex items-center gap-2 mt-2 text-xs text-white/60">
                  <span className="flex items-center gap-1">
                    <Clock size={11} aria-hidden="true" />
                    {formatEventTime(event.date_start)}
                  </span>
                </div>

                {event.collectives && (
                  <p className="mt-1.5 text-[11px] text-white/40 truncate">
                    {event.collectives.name}
                  </p>
                )}
                </div>
              </div>
            )
          })}
        </HScroll>
      </Section>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Updates section (staff updates / community msgs)                   */
/* ------------------------------------------------------------------ */

function UpdatesSection({ rm }: { rm: boolean }) {
  const navigate = useNavigate()
  const updates = useRecentUpdates()

  if (updates.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-28 rounded-full bg-primary-100 animate-pulse" />
        <div className="relative -mx-6">
          <div className="flex gap-3 px-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-64 h-28 rounded-2xl bg-surface-1 shadow-sm animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!updates.data?.length) return null

  return (
    <motion.div variants={rm ? undefined : fadeUp}>
      <Section
        title="Updates"
        action={{ label: 'View all', to: '/updates' }}
      >
        <HScroll>
          {updates.data.map((item) => (
            <div
              key={item.id}
              className="shrink-0 w-64 snap-start rounded-2xl bg-gradient-to-br from-sprout-600 to-primary-700 shadow-lg overflow-hidden active:scale-[0.97] transition-all duration-150 cursor-pointer"
              onClick={() => navigate('/updates')}
              role="button"
              tabIndex={0}
              aria-label={item.title}
            >
              {/* Cover image */}
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt=""
                  className="w-full h-24 object-cover"
                />
              )}
              <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {item.is_pinned && (
                  <Badge variant="default" size="sm">Pinned</Badge>
                )}
                {item.priority === 'urgent' && (
                  <Badge variant="default" size="sm">Urgent</Badge>
                )}
                <span className="text-[10px] text-white/40 ml-auto">
                  {relativeTime(item.created_at)}
                </span>
              </div>

              <p className="font-heading text-sm font-semibold text-white line-clamp-2">
                {item.title}
              </p>

              {item.content && (
                <p className="mt-1 text-xs text-white/60 line-clamp-2">
                  {item.content}
                </p>
              )}

              {item.author && (
                <div className="flex items-center gap-2 mt-3">
                  {item.author.avatar_url ? (
                    <img
                      src={item.author.avatar_url}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <Megaphone size={10} className="text-white/70" />
                    </div>
                  )}
                  <span className="text-[11px] text-white/50 truncate">
                    {item.author.display_name}
                  </span>
                </div>
              )}
              </div>
            </div>
          ))}
        </HScroll>
      </Section>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Impact section with scope + time toggles                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Impact row components                                              */
/* ------------------------------------------------------------------ */

/* Animated count-up for numbers */
function useCountUp(target: number, active: boolean, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const rm = useReducedMotion()

  useEffect(() => {
    if (!active || target <= 0) { startTransition(() => setDisplay(target)); return }
    if (rm) { startTransition(() => setDisplay(target)); return }

    let raf: number
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      startTransition(() => setDisplay(Math.round(eased * target)))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration, rm])

  return display
}

const statFadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}

function ImpactStat({
  value,
  label,
  icon,
  color,
  inView,
  index = 0,
}: {
  value: number | string
  label: string
  icon: React.ReactNode
  color: string
  inView: boolean
  index?: number
}) {
  const isNum = typeof value === 'number'
  const counted = useCountUp(isNum ? value : 0, inView)
  const rm = useReducedMotion()

  const formatted = isNum
    ? (value > 0 ? counted.toLocaleString() : '-')
    : value

  return (
    <motion.div
      className="flex items-center gap-3.5"
      variants={rm ? undefined : statFadeUp}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      custom={index}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm', color)}>
        <span className="text-white">{icon}</span>
      </div>
      <div className="min-w-0">
        <span className="font-heading text-[22px] font-extrabold text-white tabular-nums leading-none block">
          {formatted}
        </span>
        <span className="text-[10px] text-white/70 font-semibold uppercase tracking-wider leading-tight mt-1 block">
          {label}
        </span>
      </div>
    </motion.div>
  )
}

function HomeImpactSection({
  collectiveId,
  rm,
}: {
  collectiveId: string | undefined
  rm: boolean
}) {
  const [scope, setScope] = useState<'national' | 'collective'>(collectiveId ? 'collective' : 'national')
  const [timeRange, setTimeRange] = useState<'all-time' | 'current-year'>('all-time')

  const national = useNationalImpact(timeRange)
  const collective = useCollectiveImpact(scope === 'collective' ? collectiveId : undefined, timeRange)

  const data: CanonicalImpact | null | undefined =
    scope === 'national' ? national.data : collective.data
  const isLoading = scope === 'national' ? national.isLoading : collective.isLoading

  const totalEvents = data?.eventsHeld ?? 0

  const sectionRef = useRef<HTMLDivElement>(null)
  const inView = useInView(sectionRef, { once: true, margin: '-60px' })

  return (
    <motion.div variants={rm ? undefined : fadeUp} className="-mx-6">
      <div ref={sectionRef} className="relative overflow-hidden" style={{ backgroundColor: '#869d61' }}>

        <div className="relative px-7 pt-16 pb-20">
          {/* Header */}
          <motion.div
            className="flex items-center justify-between mb-1.5"
            initial={rm ? undefined : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : undefined}
            transition={{ duration: 0.4 }}
          >
            <h2 className="font-heading text-xs font-bold text-white/90 uppercase tracking-[0.2em]">
              Our Impact
            </h2>
            <Link
              to="/profile"
              className="flex items-center gap-0.5 text-[11px] font-semibold text-white/70 hover:text-white active:scale-[0.97] transition-[colors,transform] duration-150"
            >
              My impact
              <ChevronRight size={13} />
            </Link>
          </motion.div>

          {/* Toggles */}
          <div className="flex items-center justify-between gap-2 mb-8">
            <div className="flex rounded-full bg-black/15 p-0.5">
              <button
                type="button"
                onClick={() => setScope('national')}
                className={cn(
                  'px-3.5 min-h-9 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95] cursor-pointer select-none',
                  scope === 'national'
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-white/70 hover:text-white',
                )}
              >
                <Globe size={11} className="inline mr-1 -mt-0.5" />
                National
              </button>
              {collectiveId && (
                <button
                  type="button"
                  onClick={() => setScope('collective')}
                  className={cn(
                    'px-3.5 min-h-9 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95] cursor-pointer select-none',
                    scope === 'collective'
                      ? 'bg-white text-primary-800 shadow-sm'
                      : 'text-white/70 hover:text-white',
                  )}
                >
                  <MapPin size={11} className="inline mr-1 -mt-0.5" />
                  Collective
                </button>
              )}
            </div>

            <div className="flex rounded-full bg-black/15 p-0.5">
              <button
                type="button"
                onClick={() => setTimeRange('all-time')}
                className={cn(
                  'px-3 min-h-9 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95] cursor-pointer select-none',
                  timeRange === 'all-time'
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-white/70 hover:text-white',
                )}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('current-year')}
                className={cn(
                  'px-3 min-h-9 rounded-full text-[11px] font-semibold transition-all duration-200 active:scale-[0.95] cursor-pointer select-none',
                  timeRange === 'current-year'
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-white/70 hover:text-white',
                )}
              >
                {new Date().getFullYear()}
              </button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-24 rounded-2xl bg-white/15 animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[72px] rounded-xl bg-white/10 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            </div>
          ) : data ? (
            <>
              {/* All stats in categorised rows */}
              <div className="space-y-3">
                {/* Events */}
                <motion.div
                  className="rounded-xl bg-white/10 p-4"
                  initial={rm ? undefined : { opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ delay: 0.05, duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.18em] mb-3 block">
                    Community Events
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <ImpactStat inView={inView} index={0} value={totalEvents} label="Events" icon={<Calendar size={16} />} color="bg-warning-500" />
                    <ImpactStat inView={inView} index={1} value={data.eventsAttended} label="Attendances" icon={<Users size={16} />} color="bg-warning-600" />
                    <ImpactStat inView={inView} index={2} value={data.volunteerHours} label="Vol. Hours" icon={<Clock size={16} />} color="bg-warning-700" />
                  </div>
                </motion.div>

                {/* Restoration */}
                <motion.div
                  className="rounded-xl bg-white/10 p-4"
                  initial={rm ? undefined : { opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.18em] mb-3 block">
                    Land Restoration
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <ImpactStat inView={inView} index={3} value={data.treesPlanted} label="Trees Planted" icon={<TreePine size={16} />} color="bg-sprout-500" />
                    <ImpactStat inView={inView} index={4} value={data.invasiveWeedsPulled} label="Weeds Pulled" icon={<Sprout size={16} />} color="bg-sprout-600" />
                  </div>
                </motion.div>

                {/* Cleanup */}
                <motion.div
                  className="rounded-xl bg-white/10 p-4"
                  initial={rm ? undefined : { opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.18em] mb-3 block">
                    Cleanup
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <ImpactStat inView={inView} index={5} value={data.rubbishCollectedTonnes > 0 ? `${data.rubbishCollectedTonnes}t` : '-'} label="Rubbish Collected" icon={<Trash2 size={16} />} color="bg-sky-500" />
                    <ImpactStat inView={inView} index={6} value={data.cleanupSites} label="Cleanup Sites" icon={<Trash2 size={16} />} color="bg-sky-600" />
                  </div>
                </motion.div>

                {/* Community */}
                <motion.div
                  className="rounded-xl bg-white/10 p-4"
                  initial={rm ? undefined : { opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
                >
                  <span className="text-[10px] font-bold text-white/70 uppercase tracking-[0.18em] mb-3 block">
                    Community
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <ImpactStat inView={inView} index={7} value={data.collectivesCount} label="Collectives" icon={<Users size={16} />} color="bg-moss-500" />
                    <ImpactStat inView={inView} index={8} value={data.leadersEmpowered} label="Leaders Empowered" icon={<GraduationCap size={16} />} color="bg-moss-600" />
                  </div>
                </motion.div>
              </div>
            </>
          ) : null}
        </div>

      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Donate + Shop CTA cards                                            */
/* ------------------------------------------------------------------ */

function CtaCards({ rm }: { rm: boolean }) {
  const navigate = useNavigate()

  return (
    <motion.div variants={rm ? undefined : fadeUp}>
      <div className="grid grid-cols-2 gap-3">
        {/* Donate */}
        <div
          className={cn(
            'relative rounded-2xl overflow-hidden p-5',
            'bg-gradient-to-br from-primary-500 to-primary-800',
            'shadow-lg',
            'active:scale-[0.97] transition-all duration-150 cursor-pointer',
          )}
          onClick={() => navigate('/donate')}
          role="button"
          tabIndex={0}
          aria-label="Donate"
        >
          <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-white/10" />
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white mb-3">
            <Heart size={20} />
          </span>
          <p className="font-heading text-base font-bold text-white">
            Donate
          </p>
          <p className="mt-1 text-xs text-white/70">
            Support young adults & conservation
          </p>
        </div>

        {/* Shop Merch */}
        <div
          className={cn(
            'relative rounded-2xl overflow-hidden p-5',
            'bg-gradient-to-br from-bark-500 to-bark-800',
            'shadow-lg',
            'active:scale-[0.97] transition-all duration-150 cursor-pointer',
          )}
          onClick={() => navigate('/shop')}
          role="button"
          tabIndex={0}
          aria-label="Shop Merch"
        >
          <div className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full bg-white/10" />
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 text-white mb-3">
            <ShoppingBag size={20} />
          </span>
          <p className="font-heading text-base font-bold text-white">
            Shop Merch
          </p>
          <p className="mt-1 text-xs text-white/70">
            Wear Co-Exist
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Home page                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const queryClient = useQueryClient()
  const { profile, user } = useAuth()

  const myCollective = useMyCollective()
  const myEvents = useMyUpcomingEvents()
  const impact = useImpactStats()
  const pendingSurveys = usePendingSurveys()
  const initialLoading = myCollective.isLoading || myEvents.isLoading || impact.isLoading
  const showLoading = useDelayedLoading(initialLoading)

  // Prefetch the "Your Next Event" detail page so tapping it is instant
  const nextEventId = myEvents.data?.[0]?.id
  useEffect(() => {
    if (nextEventId && user?.id) {
      prefetchEventDetail(queryClient, nextEventId, user.id)
    }
  }, [nextEventId, user?.id, queryClient])

  const firstName = profile?.display_name?.split(' ')[0]

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['home'] })
  }, [queryClient])

  return (
    <Page noBackground className="!px-0 bg-white">
      <PullToRefresh
        onRefresh={handleRefresh}
        className="min-h-full"
        background={
          <div className="pointer-events-none sticky top-0 h-[100dvh] -mb-[100dvh] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-surface-1 via-white to-primary-50/30" />
            <motion.div
              initial={rm ? {} : { scale: 0.6, opacity: 0 }}
              animate={{ scale: [1, 1.04, 1], opacity: 1 }}
              transition={{ scale: { duration: 18, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.5, ease: 'easeOut' } }}
              className="absolute -right-[12%] -top-[8%] w-[60vw] h-[60vw] max-w-[550px] max-h-[550px] rounded-full bg-primary-100/30"
            />
            <motion.div
              initial={rm ? {} : { scale: 0.5, opacity: 0 }}
              animate={{ scale: [1, 1.05, 1], opacity: 1 }}
              transition={{ scale: { duration: 20, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 1.8, delay: 0.3, ease: 'easeOut' } }}
              className="absolute -left-[18%] bottom-[8%] w-[70vw] h-[70vw] max-w-[680px] max-h-[680px] rounded-full border border-primary-200/30"
            />
            <motion.div
              initial={rm ? {} : { opacity: 0 }}
              animate={{ y: [0, -7, 0], opacity: [0.3, 0.55, 0.3] }}
              transition={{ y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }, opacity: { duration: 0.8, delay: 1 } }}
              className="absolute left-[15%] top-[20%] w-2 h-2 rounded-full bg-primary-300/30"
            />
          </div>
        }
      >
        {/* ── Content ── */}
        <div className="relative z-10">
          {/* 1. Parallax layered hero */}
          <HomeHero rm={rm} />

          {/* Greeting */}
          <div className="px-6 pt-6 mb-2">
            <motion.p
              initial={rm ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="font-heading text-xl sm:text-2xl font-bold text-primary-900"
            >
              {getGreeting(firstName)}
            </motion.p>
          </div>

          {/* Body sections */}
          <motion.div
            className="px-6 space-y-10 pb-24 mt-4"
            initial="hidden"
            animate="visible"
            variants={rm ? undefined : stagger}
          >
            {/* Proximity check-in banner */}
            <ProximityCheckInBanner />

            {/* Pending survey banners */}
            {pendingSurveys.data && pendingSurveys.data.length > 0 && (
              <motion.div variants={rm ? undefined : fadeUp} className="space-y-2">
                {pendingSurveys.data.map((survey) => (
                  <div
                    key={survey.event_id}
                    className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-bark-600 to-bark-700 shadow-lg p-4 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    onClick={() => navigate(`/events/${survey.event_id}/survey`)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Complete survey for ${survey.event_title}`}
                  >
                    <span className="flex items-center justify-center w-9 h-9 rounded-full bg-white/15 text-white shrink-0">
                      <Calendar size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        How was {survey.event_title}?
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        Share your feedback{survey.collective_name ? ` · ${survey.collective_name}` : ''}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-white/50 shrink-0" />
                  </div>
                ))}
              </motion.div>
            )}

            {/* 2. Your Next Event */}
            <NextEventCard
              events={myEvents.data}
              isLoading={myEvents.isLoading}
              showLoading={showLoading}
              rm={rm}
            />

            {/* 3. Upcoming Events carousel */}
            <UpcomingEventsCarousel rm={rm} />

            {/* 4. Updates section */}
            <UpdatesSection rm={rm} />

            {/* 5. Impact section */}
            <HomeImpactSection
              collectiveId={myCollective.data?.id}
              rm={rm}
            />

            {/* 6. Donate + Shop CTA cards */}
            <CtaCards rm={rm} />
          </motion.div>
        </div>
      </PullToRefresh>
    </Page>
  )
}
