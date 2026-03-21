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
/*  Big counter                                                        */
/* ------------------------------------------------------------------ */

function NationalStat({
  icon,
  value,
  suffix,
  label,
  bg,
  delay,
}: {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  bg: string
  delay: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-3xl p-6 min-h-[140px]',
        bg,
      )}
    >
      <div className="mb-3 opacity-50" aria-hidden="true">
        {icon}
      </div>
      <div className="font-heading text-4xl font-bold text-primary-800 tabular-nums leading-none">
        <CountUp end={value} duration={2000} suffix={suffix} />
      </div>
      <p className="text-[11px] uppercase tracking-[0.15em] text-primary-500 font-medium mt-2">{label}</p>
    </motion.div>
  )
}

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
          className="px-5 pt-8 pb-2"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium">
            Australia-Wide
          </p>
          <p className="font-heading text-7xl font-bold text-primary-800 tabular-nums leading-none tracking-tight mt-4">
            <CountUp end={data?.totalTrees ?? 0} duration={2000} />
          </p>
          <p className="text-base text-primary-400 font-medium mt-2">trees planted nationally</p>
        </motion.div>

        {/* ─── Divider ─── */}
        <div className="mx-5 h-px bg-primary-100/60 my-6" />

        {/* ─── Stats Grid ─── */}
        <motion.div variants={fadeUp} className="px-5 grid grid-cols-2 gap-4">
          <NationalStat
            icon={<Clock size={22} className="text-primary-500" />}
            value={data?.totalHours ?? 0}
            label="Hours Volunteered"
            bg="bg-primary-50/80"
            delay={0.05}
          />
          <NationalStat
            icon={<RubbishIcon size={22} className="text-primary-500" />}
            value={data?.totalRubbish ?? 0}
            suffix=" kg"
            label="Rubbish Collected"
            bg="bg-moss-50/80"
            delay={0.1}
          />
          <NationalStat
            icon={<Waves size={22} className="text-moss-500" />}
            value={data?.totalCoastline ?? 0}
            suffix=" km"
            label="Coastline Cleaned"
            bg="bg-bark-50/60"
            delay={0.15}
          />
          {(data?.totalArea ?? 0) > 0 && (
            <NationalStat
              icon={<Ruler size={22} className="text-plum-500" />}
              value={data?.totalArea ?? 0}
              suffix=" sqm"
              label="Area Restored"
              bg="bg-plum-50/60"
              delay={0.2}
            />
          )}
          {(data?.totalNativePlants ?? 0) > 0 && (
            <NationalStat
              icon={<Leaf size={22} className="text-moss-500" />}
              value={data?.totalNativePlants ?? 0}
              label="Native Plants"
              bg="bg-moss-50/80"
              delay={0.22}
            />
          )}
          {(data?.totalWildlife ?? 0) > 0 && (
            <NationalStat
              icon={<Eye size={22} className="text-bark-500" />}
              value={data?.totalWildlife ?? 0}
              label="Wildlife Sightings"
              bg="bg-bark-50/60"
              delay={0.25}
            />
          )}
          <NationalStat
            icon={<CalendarDays size={22} className="text-plum-500" />}
            value={data?.totalEvents ?? 0}
            label="Events Held"
            bg="bg-plum-50/60"
            delay={0.28}
          />
          <NationalStat
            icon={<Users size={22} className="text-primary-500" />}
            value={data?.totalMembers ?? 0}
            label="Active Members"
            bg="bg-white shadow-sm"
            delay={0.25}
          />
          <NationalStat
            icon={<MapPin size={22} className="text-bark-500" />}
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            bg="bg-white shadow-sm"
            delay={0.3}
          />
        </motion.div>

        {/* ─── Geographic Activity Map ─── */}
        <motion.section
          variants={fadeUp}
          className="mx-5 mt-10"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4">
            Geographic Activity
          </p>
          <div className="rounded-3xl bg-white shadow-sm p-5 overflow-hidden">
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4">
              Monthly Volunteer Hours
            </p>
            <div className="rounded-3xl bg-white shadow-sm p-6">
              <div className="flex items-end gap-4 h-32">
                {trends.map((t, i) => {
                  const max = Math.max(...trends.map((tr) => tr.impact), 1)
                  const height = (t.impact / max) * 100
                  return (
                    <div key={t.month} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-[10px] text-primary-400/60 tabular-nums font-medium">{t.impact}</span>
                      <motion.div
                        className="w-full rounded-full bg-gradient-to-t from-primary-600 to-primary-300 min-h-[4px]"
                        initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                      />
                      <span className="text-[10px] text-primary-400/60 font-medium">{t.month}</span>
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4">
              By Activity Type
            </p>
            <div className="rounded-3xl bg-white shadow-sm p-6 space-y-4">
              {data.byActivity.map(([type, count]) => {
                const total = data.byActivity.reduce((s, [, c]) => s + c, 0)
                const percent = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-primary-700 font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-primary-400/70 tabular-nums text-xs">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-primary-100/40 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary-400 rounded-full"
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
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4">
              By State / Region
            </p>
            <div className="rounded-3xl bg-white shadow-sm p-6 space-y-1">
              {data.byState.map(([state, count]) => (
                <div
                  key={state}
                  className="flex items-center justify-between py-3 "
                >
                  <span className="text-sm text-primary-700 font-medium">{state}</span>
                  <span className="text-sm font-bold text-primary-800 tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ─── Top Collectives ─── */}
        {topCollectives && topCollectives.length > 0 && (
          <motion.section
            variants={fadeUp}
            className="mx-5 mt-10"
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary-400/50 font-medium mb-4 flex items-center gap-2">
              <Trophy size={14} className="text-primary-400/50" />
              Top Collectives
            </p>
            <div className="rounded-3xl bg-white shadow-sm p-6 space-y-1">
              {topCollectives.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-4 py-3 "
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0',
                      i === 0
                        ? 'bg-bark-100 text-bark-700'
                        : 'bg-primary-50 text-primary-500',
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className="flex-1 min-w-0 text-sm font-medium text-primary-800 truncate">
                    {c.name}
                  </p>
                  <span className="text-xs text-primary-400/70 tabular-nums shrink-0">
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
          rightActions={
            <button
              type="button"
              onClick={shareLink}
              className="flex items-center justify-center min-h-11 min-w-11 rounded-full text-primary-400 hover:bg-primary-50 active:scale-[0.97] transition-all duration-150 cursor-pointer select-none"
              aria-label="Share"
            >
              <Share2 size={18} />
            </button>
          }
        />
      }
    >
      {content}
    </Page>
  )
}
