import { motion, useReducedMotion } from 'framer-motion'
import {
  TreePine,
  Clock,
  Trash2 as RubbishIcon,
  Waves,
  CalendarDays,
  Users,
  MapPin,
  Download,
  Share2,
  TrendingUp,
  Trophy,
  Ruler,
  Leaf,
  Eye,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { useAdminHeader, useIsAdminLayout } from '@/components/admin-layout'
import { CountUp } from '@/components/count-up'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { parseLocationPoint } from '@/lib/geo'
import { MapView } from '@/components'
import type { MapMarker } from '@/components'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

function useNationalImpact() {
  return useQuery({
    queryKey: ['national-impact'],
    queryFn: async () => {
      const [
        impactRes,
        eventsRes,
        membersRes,
        collectivesRes,
        eventsWithTypeRes,
      ] = await Promise.all([
        supabase.from('event_impact').select(
          'trees_planted, hours_total, rubbish_kg, coastline_cleaned_m, area_restored_sqm, native_plants, wildlife_sightings',
        ),
        supabase.from('events').select('id', { count: 'exact', head: true }).lt('date_start', new Date().toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('activity_type, collectives(state)').lt('date_start', new Date().toISOString()).limit(10000),
      ])

      const logs = (impactRes.data ?? []) as any[]
      const totalTrees = logs.reduce((s: number, r: any) => s + (r.trees_planted ?? 0), 0)
      const totalHours = logs.reduce((s: number, r: any) => s + (r.hours_total ?? 0), 0)
      const totalRubbish = logs.reduce((s: number, r: any) => s + (r.rubbish_kg ?? 0), 0)
      const totalCoastline = logs.reduce((s: number, r: any) => s + (r.coastline_cleaned_m ?? 0), 0)
      const totalArea = logs.reduce((s: number, r: any) => s + (r.area_restored_sqm ?? 0), 0)
      const totalNativePlants = logs.reduce((s: number, r: any) => s + (r.native_plants ?? 0), 0)
      const totalWildlife = logs.reduce((s: number, r: any) => s + (r.wildlife_sightings ?? 0), 0)

      const byActivity: Record<string, number> = {}
      for (const ev of (eventsWithTypeRes.data ?? []) as any[]) {
        const type = ev.activity_type ?? 'Other'
        byActivity[type] = (byActivity[type] ?? 0) + 1
      }

      const byState: Record<string, number> = {}
      for (const ev of (eventsWithTypeRes.data ?? []) as any[]) {
        const state = (ev.collectives as any)?.state ?? 'Unknown'
        byState[state] = (byState[state] ?? 0) + 1
      }

      return {
        totalTrees,
        totalHours: Math.round(totalHours),
        totalRubbish: Math.round(totalRubbish),
        totalCoastline: Math.round((totalCoastline / 1000) * 10) / 10, // m → km, 1 decimal
        totalArea: Math.round(totalArea),
        totalNativePlants,
        totalWildlife,
        totalEvents: eventsRes.count ?? 0,
        totalMembers: membersRes.count ?? 0,
        totalCollectives: collectivesRes.count ?? 0,
        byActivity: Object.entries(byActivity)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8),
        byState: Object.entries(byState)
          .sort(([, a], [, b]) => b - a),
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useTopCollectives() {
  return useQuery({
    queryKey: ['top-collectives'],
    queryFn: async () => {
      const { data: collectives } = await supabase
        .from('collectives')
        .select('id, name')

      if (!collectives?.length) return []

      const enriched = await Promise.all(
        collectives.map(async (c) => {
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('collective_id', c.id)

          return { ...c, eventCount: count ?? 0 }
        }),
      )

      return enriched.sort((a, b) => b.eventCount - a.eventCount).slice(0, 5)
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useEventMapPoints() {
  return useQuery({
    queryKey: ['national-event-points'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, location_point, activity_type')
        .not('location_point', 'is', null)
        .limit(200)
      return (data ?? [])
        .map((e): MapMarker | null => {
          const pos = parseLocationPoint(e.location_point)
          if (!pos) return null
          return { id: e.id, position: pos, variant: 'event', label: e.title }
        })
        .filter((m): m is MapMarker => m !== null)
    },
    staleTime: 10 * 60 * 1000,
  })
}

function useTrends() {
  return useQuery({
    queryKey: ['national-impact-trends'],
    queryFn: async () => {
      const months: { month: string; impact: number }[] = []
      const now = new Date()

      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

        const { data } = await supabase
          .from('event_impact')
          .select('hours_total')
          .gte('logged_at', start.toISOString())
          .lte('logged_at', end.toISOString())

        const hours = (data ?? []).reduce((s, r) => s + (r.hours_total ?? 0), 0)

        months.push({
          month: start.toLocaleDateString('en-AU', { month: 'short' }),
          impact: Math.round(hours),
        })
      }

      return months
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Section heading                                                    */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.18em] text-primary-600 font-extrabold mb-5 flex items-center gap-2">
      <span className="h-0.5 w-4 rounded-full bg-primary-400/50" />
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card configs                                                  */
/* ------------------------------------------------------------------ */

const STAT_STYLES: Record<string, { gradient: string; iconBg: string }> = {
  hours:       { gradient: 'from-primary-100/90 to-primary-200/50', iconBg: 'bg-primary-600' },
  rubbish:     { gradient: 'from-moss-100/90 to-moss-200/50', iconBg: 'bg-moss-600' },
  coastline:   { gradient: 'from-bark-100/90 to-bark-200/50', iconBg: 'bg-bark-600' },
  area:        { gradient: 'from-plum-100/90 to-plum-200/50', iconBg: 'bg-plum-600' },
  plants:      { gradient: 'from-moss-100/90 to-moss-200/50', iconBg: 'bg-moss-600' },
  wildlife:    { gradient: 'from-bark-100/90 to-bark-200/50', iconBg: 'bg-bark-600' },
  events:      { gradient: 'from-plum-100/90 to-plum-200/50', iconBg: 'bg-plum-600' },
  members:     { gradient: 'from-primary-50/90 to-primary-100/50', iconBg: 'bg-primary-600' },
  collectives: { gradient: 'from-bark-50/90 to-bark-100/50', iconBg: 'bg-bark-600' },
}

/* ------------------------------------------------------------------ */
/*  Big counter                                                        */
/* ------------------------------------------------------------------ */

function NationalStat({
  icon,
  value,
  suffix,
  label,
  style,
  delay,
}: {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  style: string
  delay: number
}) {
  const shouldReduceMotion = useReducedMotion()
  const cfg = STAT_STYLES[style] ?? STAT_STYLES.hours

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col items-center justify-center text-center rounded-3xl p-6 pb-8 min-h-[150px]',
        'bg-gradient-to-br',
        cfg.gradient,
      )}
    >
      {/* SVG glare */}
      <svg className="absolute top-1 left-4 w-14 h-10 opacity-[0.3] pointer-events-none" viewBox="0 0 56 40" fill="none">
        <ellipse cx="28" cy="10" rx="28" ry="16" fill="white" />
      </svg>

      <div className={cn('mb-4 flex items-center justify-center w-11 h-11 rounded-2xl shadow-md text-white', cfg.iconBg)} aria-hidden="true">
        {icon}
      </div>
      <div className="relative">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 50%)' }} />
        <div className="relative font-heading text-4xl font-extrabold text-primary-900 tabular-nums leading-none">
          <CountUp end={value} duration={2000} suffix={suffix} />
        </div>
      </div>
      <p className="relative text-[11px] uppercase tracking-[0.15em] text-primary-600 font-bold mt-2.5">{label}</p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity type colors                                               */
/* ------------------------------------------------------------------ */

const ACTIVITY_BAR_COLORS: Record<string, string> = {
  tree_planting: 'bg-primary-600',
  beach_cleanup: 'bg-sky-500',
  habitat_restoration: 'bg-moss-600',
  nature_walk: 'bg-primary-500',
  education: 'bg-plum-500',
  wildlife_survey: 'bg-bark-500',
  seed_collecting: 'bg-moss-500',
  weed_removal: 'bg-bark-400',
  waterway_cleanup: 'bg-sky-600',
  community_garden: 'bg-plum-400',
}

/* ------------------------------------------------------------------ */
/*  Podium medal colors                                                */
/* ------------------------------------------------------------------ */

const MEDAL_STYLES = [
  'bg-gradient-to-br from-warning-400 to-warning-600 text-white shadow-lg shadow-warning-200/50',
  'bg-gradient-to-br from-gray-300 to-gray-400 text-white shadow-md',
  'bg-gradient-to-br from-bark-300 to-bark-500 text-white shadow-md',
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NationalImpactPage() {
  const isAdmin = useIsAdminLayout()
  useAdminHeader('Impact')
  const shouldReduceMotion = useReducedMotion()
  const { data, isLoading } = useNationalImpact()
  const { data: topCollectives } = useTopCollectives()
  const { data: trends } = useTrends()
  const { data: eventMapPoints } = useEventMapPoints()

  if (isLoading) {
    const skeleton = (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-36 rounded-3xl bg-primary-100/30 animate-pulse" />
            <div className="h-36 rounded-3xl bg-primary-100/30 animate-pulse" />
            <div className="h-36 rounded-3xl bg-primary-100/30 animate-pulse" />
            <div className="h-36 rounded-3xl bg-primary-100/30 animate-pulse" />
          </div>
          <div className="h-64 rounded-3xl bg-primary-100/20 animate-pulse" />
        </div>
    )
    if (isAdmin) return skeleton
    return (
      <Page header={<Header title="National Impact" back />}>
        {skeleton}
      </Page>
    )
  }

  const exportPDF = () => {
    alert('PDF export will be generated via Edge Function with branded Co-Exist template')
  }

  const shareLink = () => {
    if (navigator.share) {
      const parts: string[] = []
      if (data?.totalTrees) parts.push(`${data.totalTrees.toLocaleString()} trees planted`)
      if (data?.totalHours) parts.push(`${data.totalHours.toLocaleString()} hours volunteered`)
      if (data?.totalRubbish) parts.push(`${data.totalRubbish.toLocaleString()}kg rubbish collected`)
      if (data?.totalCoastline) parts.push(`${data.totalCoastline}km coastline cleaned`)
      navigator.share({
        title: 'Co-Exist National Impact',
        text: parts.join(', ') + '!',
        url: window.location.href,
      })
    }
  }

  const content = (
      <motion.div
        className="pb-12"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >

        {/* ─── Hero headline ─── */}
        <motion.div
          variants={fadeUp}
          className="px-5 pt-6 pb-2"
        >
          <div className="relative rounded-3xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 p-7 shadow-2xl overflow-hidden">
            {/* Decorative bg elements */}
            <div className="absolute top-0 right-0 w-44 h-44 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/4" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm">
                  <TreePine size={20} strokeWidth={2.5} className="text-white" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60 font-bold">
                  Australia-Wide
                </p>
              </div>

              <p className="font-heading text-7xl font-extrabold text-white tabular-nums leading-none tracking-tight">
                <CountUp end={data?.totalTrees ?? 0} duration={2000} />
              </p>
              <p className="text-lg text-white/70 font-semibold mt-3">trees planted nationally</p>
            </div>
          </div>
        </motion.div>

        {/* ─── Stats Grid ─── */}
        <motion.div variants={fadeUp} className="px-5 mt-6 grid grid-cols-2 gap-4">
          <NationalStat
            icon={<Clock size={20} strokeWidth={2.5} />}
            value={data?.totalHours ?? 0}
            label="Hours Volunteered"
            style="hours"
            delay={0.05}
          />
          <NationalStat
            icon={<RubbishIcon size={20} strokeWidth={2.5} />}
            value={data?.totalRubbish ?? 0}
            suffix=" kg"
            label="Rubbish Collected"
            style="rubbish"
            delay={0.1}
          />
          <NationalStat
            icon={<Waves size={20} strokeWidth={2.5} />}
            value={data?.totalCoastline ?? 0}
            suffix=" km"
            label="Coastline Cleaned"
            style="coastline"
            delay={0.15}
          />
          {(data?.totalArea ?? 0) > 0 && (
            <NationalStat
              icon={<Ruler size={20} strokeWidth={2.5} />}
              value={data?.totalArea ?? 0}
              suffix=" sqm"
              label="Area Restored"
              style="area"
              delay={0.2}
            />
          )}
          {(data?.totalNativePlants ?? 0) > 0 && (
            <NationalStat
              icon={<Leaf size={20} strokeWidth={2.5} />}
              value={data?.totalNativePlants ?? 0}
              label="Native Plants"
              style="plants"
              delay={0.22}
            />
          )}
          {(data?.totalWildlife ?? 0) > 0 && (
            <NationalStat
              icon={<Eye size={20} strokeWidth={2.5} />}
              value={data?.totalWildlife ?? 0}
              label="Wildlife Sightings"
              style="wildlife"
              delay={0.25}
            />
          )}
          <NationalStat
            icon={<CalendarDays size={20} strokeWidth={2.5} />}
            value={data?.totalEvents ?? 0}
            label="Events Held"
            style="events"
            delay={0.28}
          />
          <NationalStat
            icon={<Users size={20} strokeWidth={2.5} />}
            value={data?.totalMembers ?? 0}
            label="Active Members"
            style="members"
            delay={0.25}
          />
          <NationalStat
            icon={<MapPin size={20} strokeWidth={2.5} />}
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            style="collectives"
            delay={0.3}
          />
        </motion.div>

        {/* ─── Geographic Activity Map ─── */}
        <motion.section
          variants={fadeUp}
          className="mx-5 mt-10"
        >
          <SectionHeading>Geographic Activity</SectionHeading>
          <div className="rounded-3xl bg-surface-2 shadow-lg shadow-sm p-5 overflow-hidden">
            <MapView
              center={{ lat: -28.0, lng: 134.0 }}
              zoom={4}
              markers={eventMapPoints ?? []}
              aria-label="National activity map showing event locations"
              className="h-72 rounded-2xl"
            />
          </div>
        </motion.section>

        {/* ─── Monthly Volunteer Hours Trend ─── */}
        {trends && trends.length > 0 && (
          <motion.section
            variants={fadeUp}
            className="mx-5 mt-10"
          >
            <SectionHeading>Monthly Volunteer Hours</SectionHeading>
            <div className="rounded-3xl bg-surface-2 shadow-lg shadow-sm p-6">
              <div className="flex items-end gap-4 h-36">
                {trends.map((t, i) => {
                  const max = Math.max(...trends.map((tr) => tr.impact), 1)
                  const height = (t.impact / max) * 100
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[10px] text-primary-600 tabular-nums font-bold">{t.impact}</span>
                      <motion.div
                        className="w-full rounded-xl bg-gradient-to-t from-primary-700 via-primary-500 to-primary-300 min-h-[6px] shadow-sm"
                        initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                      />
                      <span className="text-[10px] text-primary-500 font-bold">{t.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.section>
        )}

        {/* ─── Breakdown by Activity ─── */}
        {data?.byActivity && data.byActivity.length > 0 && (
          <motion.section
            variants={fadeUp}
            className="mx-5 mt-10"
          >
            <SectionHeading>By Activity Type</SectionHeading>
            <div className="rounded-3xl bg-surface-2 shadow-lg shadow-sm p-6 space-y-5">
              {data.byActivity.map(([type, count]) => {
                const total = data.byActivity.reduce((s, [, c]) => s + c, 0)
                const percent = total > 0 ? Math.round((count / total) * 100) : 0
                const barColor = ACTIVITY_BAR_COLORS[type] ?? 'bg-primary-500'
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-primary-800 font-bold capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-primary-500 tabular-nums text-xs font-bold">{count} ({percent}%)</span>
                    </div>
                    <div className="h-3 bg-primary-100/50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full shadow-sm', barColor)}
                        initial={shouldReduceMotion ? { width: `${percent}%` } : { width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* ─── Breakdown by State ─── */}
        {data?.byState && data.byState.length > 0 && (
          <motion.section
            variants={fadeUp}
            className="mx-5 mt-10"
          >
            <SectionHeading>By State / Region</SectionHeading>
            <div className="rounded-3xl bg-surface-2 shadow-lg shadow-sm p-6 space-y-1">
              {data.byState.map(([state, count], i) => {
                const maxCount = data.byState[0]?.[1] ?? 1
                const barWidth = Math.max((count / maxCount) * 100, 8)
                return (
                  <div
                    key={state}
                    className="flex items-center gap-4 py-3.5"
                  >
                    <span className="text-sm text-primary-800 font-bold w-16 shrink-0">{state}</span>
                    <div className="flex-1 h-3 bg-primary-100/50 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 shadow-sm"
                        initial={shouldReduceMotion ? { width: `${barWidth}%` } : { width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.5, delay: 0.3 + i * 0.05, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-sm font-extrabold text-primary-900 tabular-nums w-10 text-right shrink-0">
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* ─── Top Collectives ─── */}
        {topCollectives && topCollectives.length > 0 && (
          <motion.section
            variants={fadeUp}
            className="mx-5 mt-10"
          >
            <SectionHeading>
              <Trophy size={14} strokeWidth={2.5} className="text-warning-500" />
              Top Collectives
            </SectionHeading>
            <div className="rounded-3xl bg-surface-2 shadow-lg shadow-sm p-6 space-y-2">
              {topCollectives.map((c, i) => (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-4 py-3.5 rounded-2xl px-3 transition-all',
                    i === 0 && 'bg-gradient-to-r from-warning-50/80 to-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-xl text-sm font-extrabold shrink-0',
                      i < 3
                        ? MEDAL_STYLES[i]
                        : 'bg-primary-100 text-primary-600 shadow-sm',
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className="flex-1 min-w-0 text-sm font-bold text-primary-900 truncate">
                    {c.name}
                  </p>
                  <span className="text-xs text-primary-500 tabular-nums shrink-0 font-bold">
                    {c.eventCount} events
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ─── Export / Share ─── */}
        <motion.div variants={fadeUp} className="mx-5 mt-10 flex gap-3">
          <Button
            variant="primary"
            icon={<Download size={16} />}
            onClick={exportPDF}
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            icon={<Share2 size={16} />}
            onClick={shareLink}
          >
            Share
          </Button>
        </motion.div>
      </motion.div>
  )

  if (isAdmin) return content

  return (
    <Page
      header={
        <Header
          title="National Impact"
          back
        />
      }
    >
      {content}
    </Page>
  )
}
