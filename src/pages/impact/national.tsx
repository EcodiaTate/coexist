import { useState } from 'react'
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
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { CountUp } from '@/components/count-up'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { Dropdown } from '@/components/dropdown'
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
      ] = await Promise.all([
        supabase.from('impact_logs' as any).select(
          'trees_planted, volunteer_hours, rubbish_kg, coastline_km, activity_type, state',
        ),
        supabase.from('events').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }),
      ])

      const logs = (impactRes.data ?? []) as any[]
      const totalTrees = logs.reduce((s: number, r: any) => s + (r.trees_planted ?? 0), 0)
      const totalHours = logs.reduce((s: number, r: any) => s + (r.volunteer_hours ?? 0), 0)
      const totalRubbish = logs.reduce((s: number, r: any) => s + (r.rubbish_kg ?? 0), 0)
      const totalCoastline = logs.reduce((s: number, r: any) => s + (r.coastline_km ?? 0), 0)

      // Breakdown by activity type
      const byActivity: Record<string, number> = {}
      for (const log of logs as any[]) {
        const type = (log as any).activity_type ?? 'Other'
        byActivity[type] = (byActivity[type] ?? 0) + 1
      }

      // Breakdown by state
      const byState: Record<string, number> = {}
      for (const log of logs as any[]) {
        const state = (log as any).state ?? 'Unknown'
        byState[state] = (byState[state] ?? 0) + 1
      }

      return {
        totalTrees,
        totalHours: Math.round(totalHours),
        totalRubbish: Math.round(totalRubbish),
        totalCoastline: Math.round(totalCoastline * 10) / 10,
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
          .from('impact_logs' as any)
          .select('volunteer_hours')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())

        const hours = ((data ?? []) as any[]).reduce((s: number, r: any) => s + (r.volunteer_hours ?? 0), 0)

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
/*  Counter card                                                       */
/* ------------------------------------------------------------------ */

function ImpactCounter({
  icon,
  value,
  suffix,
  label,
  color,
  delay,
}: {
  icon: React.ReactNode
  value: number
  suffix?: string
  label: string
  color: string
  delay: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'p-5 rounded-2xl text-center',
        color,
      )}
    >
      <div className="flex items-center justify-center mb-2" aria-hidden="true">
        {icon}
      </div>
      <div className="font-heading text-3xl sm:text-4xl font-bold text-primary-800">
        <CountUp end={value} duration={2000} suffix={suffix} />
      </div>
      <p className="text-sm text-primary-400 mt-1">{label}</p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function NationalImpactPage() {
  const shouldReduceMotion = useReducedMotion()
  const { data, isLoading } = useNationalImpact()
  const { data: topCollectives } = useTopCollectives()
  const { data: trends } = useTrends()
  const { data: eventMapPoints } = useEventMapPoints()

  if (isLoading) {
    return (
      <Page header={<Header title="National Impact" back />}>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
          </div>
          <Skeleton variant="card" />
        </div>
      </Page>
    )
  }

  const exportPDF = () => {
    // In production: call edge function to generate branded PDF
    alert('PDF export will be generated via Edge Function with branded Co-Exist template')
  }

  const shareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Co-Exist National Impact',
        text: `${data?.totalTrees.toLocaleString()} trees planted, ${data?.totalHours.toLocaleString()} hours volunteered!`,
        url: window.location.href,
      })
    }
  }

  return (
    <Page
      header={
        <Header
          title="National Impact"
          back
          rightActions={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={shareLink}
                className="p-1.5 rounded-full text-primary-400 hover:bg-primary-50 cursor-pointer"
                aria-label="Share"
              >
                <Share2 size={18} />
              </button>
            </div>
          }
        />
      }
    >
      <div className="p-4 space-y-6 pb-8">
        {/* Big animated counters */}
        <div className="grid grid-cols-2 gap-3">
          <ImpactCounter
            icon={<TreePine size={28} className="text-green-600" />}
            value={data?.totalTrees ?? 0}
            label="Trees Planted"
            color="bg-green-50 border border-green-200"
            delay={0}
          />
          <ImpactCounter
            icon={<Clock size={28} className="text-blue-600" />}
            value={data?.totalHours ?? 0}
            label="Hours Volunteered"
            color="bg-blue-50 border border-blue-200"
            delay={0.1}
          />
          <ImpactCounter
            icon={<RubbishIcon size={28} className="text-amber-600" />}
            value={data?.totalRubbish ?? 0}
            suffix=" kg"
            label="Rubbish Collected"
            color="bg-amber-50 border border-amber-200"
            delay={0.2}
          />
          <ImpactCounter
            icon={<Waves size={28} className="text-cyan-600" />}
            value={data?.totalCoastline ?? 0}
            suffix=" km"
            label="Coastline Cleaned"
            color="bg-cyan-50 border border-cyan-200"
            delay={0.3}
          />
          <ImpactCounter
            icon={<CalendarDays size={28} className="text-purple-600" />}
            value={data?.totalEvents ?? 0}
            label="Events Held"
            color="bg-purple-50 border border-purple-200"
            delay={0.4}
          />
          <ImpactCounter
            icon={<Users size={28} className="text-primary-400" />}
            value={data?.totalMembers ?? 0}
            label="Active Members"
            color="bg-white border border-primary-200"
            delay={0.5}
          />
          <ImpactCounter
            icon={<MapPin size={28} className="text-primary-400" />}
            value={data?.totalCollectives ?? 0}
            label="Collectives"
            color="bg-white border border-secondary-200"
            delay={0.6}
          />
        </div>

        {/* Geographic activity map */}
        <div className="bg-white rounded-2xl border border-primary-100 p-5">
          <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
            Geographic Activity
          </h2>
          <MapView
            center={{ lat: -28.0, lng: 134.0 }}
            zoom={4}
            markers={eventMapPoints ?? []}
            aria-label="National activity map showing event locations"
            className="h-64 rounded-xl"
          />
        </div>

        {/* Trends */}
        {trends && trends.length > 0 && (
          <div className="bg-white rounded-2xl border border-primary-100 p-5">
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-4">
              Monthly Volunteer Hours
            </h2>
            <div className="flex items-end gap-3 h-28">
              {trends.map((t, i) => {
                const max = Math.max(...trends.map((tr) => tr.impact), 1)
                const height = (t.impact / max) * 100
                return (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-primary-400 tabular-nums">{t.impact}</span>
                    <motion.div
                      className="w-full rounded-t-md bg-primary-400 min-h-[4px]"
                      initial={shouldReduceMotion ? { height: `${height}%` } : { height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                    />
                    <span className="text-[10px] text-primary-400">{t.month}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Breakdown by activity */}
        {data?.byActivity && data.byActivity.length > 0 && (
          <div className="bg-white rounded-2xl border border-primary-100 p-5">
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
              By Activity Type
            </h2>
            <div className="space-y-2">
              {data.byActivity.map(([type, count]) => {
                const total = data.byActivity.reduce((s, [, c]) => s + c, 0)
                const percent = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-primary-800 capitalize">{type}</span>
                      <span className="text-primary-400 tabular-nums">{count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-white rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-400 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Breakdown by state */}
        {data?.byState && data.byState.length > 0 && (
          <div className="bg-white rounded-2xl border border-primary-100 p-5">
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-3">
              By State / Region
            </h2>
            <div className="space-y-2">
              {data.byState.map(([state, count]) => (
                <div
                  key={state}
                  className="flex items-center justify-between py-1.5 border-b border-primary-100 last:border-0"
                >
                  <span className="text-sm text-primary-800">{state}</span>
                  <span className="text-sm font-medium text-primary-800 tabular-nums">
                    {count} events
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top collectives */}
        {topCollectives && topCollectives.length > 0 && (
          <div className="bg-white rounded-2xl border border-primary-100 p-5">
            <h2 className="font-heading text-base font-semibold text-primary-800 mb-3 flex items-center gap-2">
              <Trophy size={16} className="text-primary-400" />
              Top Performing Collectives
            </h2>
            <div className="space-y-2">
              {topCollectives.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 py-2"
                >
                  <span
                    className={cn(
                      'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                      i === 0
                        ? 'bg-accent-100 text-primary-800'
                        : 'bg-white text-primary-400',
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {c.name}
                    </p>
                  </div>
                  <span className="text-sm text-primary-400 tabular-nums">
                    {c.eventCount} events
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export */}
        <div className="flex gap-3">
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
        </div>
      </div>
    </Page>
  )
}
