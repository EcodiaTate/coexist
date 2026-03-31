import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IMPACT_SELECT_COLUMNS, sumMetric, isBuiltinMetric } from '@/lib/impact-metrics'
import type { ImpactMetricDef } from '@/lib/impact-metrics'
import { getDateRangeStart, type DateRange } from '@/hooks/use-admin-dashboard'
import type { Database } from '@/types/database.types'

type ActivityType = Database['public']['Enums']['activity_type']

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ObservationFilters {
  dateRange: DateRange
  collectiveId?: string
  activityType?: ActivityType
  search?: string
}

export interface EventImpactRow {
  eventId: string
  title: string
  date: string
  collectiveName: string
  collectiveId: string
  activityType: ActivityType
  /** All metric values keyed by metric def key (builtin + custom) */
  metrics: Record<string, number | null>
  notes: string | null
  isLegacy: boolean
  attendance: number | null
  estimatedVolHours: number | null
}

export interface CollectiveBreakdown {
  collectiveId: string
  name: string
  eventCount: number
  attendees: number
  /** Aggregated metric totals keyed by metric def key */
  metrics: Record<string, number>
  estimatedHours: number
}

export interface YearSummary {
  year: number
  events: number
  attendees: number
  estimatedHours: number
  /** Aggregated metric totals keyed by metric def key */
  metrics: Record<string, number>
}

export interface ImpactSummary {
  totalEvents: number
  totalAttendees: number
  totalEstimatedHours: number
  /** Aggregated metric totals keyed by metric def key */
  metrics: Record<string, number>
}

export interface DataQuality {
  eventsWithoutImpact: number
  zeroMetricEvents: number
  legacyCount: number
  appCount: number
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEED_ADMIN = 'a0000000-0000-0000-0000-000000000001'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseAttendance(notes: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/Legacy import:\s*(\d+)\s*attendees/)
  return m ? parseInt(m[1]) : null
}

/** Extract a single metric value from a raw impact row */
function getMetricValue(row: Record<string, unknown>, key: string): number | null {
  if (isBuiltinMetric(key)) {
    const v = row[key]
    return v != null ? Number(v) || 0 : null
  }
  // Custom metric — inside custom_metrics jsonb
  const cm = row.custom_metrics as Record<string, unknown> | null
  const v = cm?.[key]
  return v != null ? Number(v) || 0 : null
}

/* ------------------------------------------------------------------ */
/*  Main observations hook                                             */
/* ------------------------------------------------------------------ */

type RawRow = Record<string, unknown> & {
  events: {
    id: string
    title: string
    date_start: string
    date_end: string | null
    collective_id: string
    activity_type: ActivityType
    created_by: string
    collectives: { name: string } | null
  }
}

/**
 * Fetches event_impact rows and aggregates them using the provided metric defs.
 * Pass activeDefs from useImpactMetricDefs() so the hook aggregates both
 * builtin and custom metrics dynamically.
 */
export function useImpactObservations(filters: ObservationFilters, metricDefs: ImpactMetricDef[]) {
  return useQuery({
    queryKey: ['admin-impact-observations', filters, metricDefs.map((d) => d.key)],
    queryFn: async () => {
      const rangeStart = getDateRangeStart(filters.dateRange)

      let q = supabase
        .from('event_impact')
        .select(
          `${IMPACT_SELECT_COLUMNS}, event_id, events!inner(id, title, date_start, date_end, collective_id, activity_type, created_by, collectives(name))`,
        )
        .order('logged_at', { ascending: false })

      if (rangeStart) q = q.gte('logged_at', rangeStart)
      if (filters.collectiveId) q = q.eq('events.collective_id', filters.collectiveId)
      if (filters.activityType) q = q.eq('events.activity_type', filters.activityType)

      const { data, error } = await q
      if (error) throw error

      const rawRows = (data ?? []) as unknown as RawRow[]

      const filtered = filters.search
        ? rawRows.filter((r) =>
            r.events.title.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : rawRows

      const metricKeys = metricDefs.map((d) => d.key)

      // Transform rows
      const rows: EventImpactRow[] = filtered.map((r) => {
        const attendance = parseAttendance(r.notes as string | null)
        const estimatedVolHours = Number(r.hours_total) || null

        const metrics: Record<string, number | null> = {}
        for (const key of metricKeys) {
          metrics[key] = getMetricValue(r, key)
        }

        return {
          eventId: r.events.id,
          title: r.events.title,
          date: r.events.date_start,
          collectiveName: r.events.collectives?.name ?? 'Unknown',
          collectiveId: r.events.collective_id,
          activityType: r.events.activity_type,
          metrics,
          notes: r.notes as string | null,
          isLegacy:
            r.events.created_by === SEED_ADMIN ||
            ((r.notes as string) ?? '').startsWith('Legacy import'),
          attendance,
          estimatedVolHours,
        }
      })

      // Summary — aggregate all active metrics
      const summaryMetrics: Record<string, number> = {}
      for (const key of metricKeys) {
        summaryMetrics[key] = sumMetric(filtered, key)
      }

      const totalAttendees = rows.reduce((s, r) => s + (r.attendance ?? 0), 0)
      const totalEstimatedHours = Math.round(sumMetric(filtered as unknown as Record<string, unknown>[], 'hours_total'))

      const summary: ImpactSummary = {
        totalEvents: rows.length,
        totalAttendees,
        totalEstimatedHours,
        metrics: summaryMetrics,
      }

      // Collective breakdown
      const byCollective = new Map<string, CollectiveBreakdown>()
      for (const r of rows) {
        const existing = byCollective.get(r.collectiveId)
        if (existing) {
          existing.eventCount++
          existing.attendees += r.attendance ?? 0
          existing.estimatedHours += r.estimatedVolHours ?? 0
          for (const key of metricKeys) {
            existing.metrics[key] = (existing.metrics[key] ?? 0) + (r.metrics[key] ?? 0)
          }
        } else {
          const metrics: Record<string, number> = {}
          for (const key of metricKeys) {
            metrics[key] = r.metrics[key] ?? 0
          }
          byCollective.set(r.collectiveId, {
            collectiveId: r.collectiveId,
            name: r.collectiveName,
            eventCount: 1,
            attendees: r.attendance ?? 0,
            metrics,
            estimatedHours: r.estimatedVolHours ?? 0,
          })
        }
      }
      const collectiveBreakdown = [...byCollective.values()].sort(
        (a, b) => b.eventCount - a.eventCount,
      )

      return { rows, summary, collectiveBreakdown }
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Year-over-year summary                                             */
/* ------------------------------------------------------------------ */

export function useYearOverYear(metricDefs: ImpactMetricDef[]) {
  return useQuery({
    queryKey: ['admin-impact-yoy', metricDefs.map((d) => d.key)],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_impact')
        .select(`${IMPACT_SELECT_COLUMNS}, logged_at, events(date_start, date_end)`)

      if (error) throw error

      const metricKeys = metricDefs.map((d) => d.key)

      type Row = Record<string, unknown> & {
        events: { date_start: string; date_end: string | null } | null
      }
      const rows = (data ?? []) as unknown as Row[]
      const byYear = new Map<number, Row[]>()

      for (const r of rows) {
        const year = new Date(r.logged_at as string).getFullYear()
        const arr = byYear.get(year) ?? []
        arr.push(r)
        byYear.set(year, arr)
      }

      const summaries: YearSummary[] = [...byYear.entries()]
        .map(([year, yearRows]) => {
          let attendees = 0
          for (const r of yearRows) {
            const att = parseAttendance(r.notes as string | null) ?? 0
            attendees += att
          }

          const metrics: Record<string, number> = {}
          for (const key of metricKeys) {
            metrics[key] = sumMetric(yearRows as Record<string, unknown>[], key)
          }

          const hours = Math.round(sumMetric(yearRows as Record<string, unknown>[], 'hours_total'))

          return { year, events: yearRows.length, attendees, estimatedHours: hours, metrics }
        })
        .sort((a, b) => a.year - b.year)

      return summaries
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Data quality                                                       */
/* ------------------------------------------------------------------ */

export function useImpactDataQuality() {
  return useQuery({
    queryKey: ['admin-impact-data-quality'],
    queryFn: async () => {
      const { data: events, error: evError } = await supabase
        .from('events')
        .select('id')
        .eq('status', 'completed')

      if (evError) throw evError

      const { data: impacts, error: impError } = await supabase
        .from('event_impact')
        .select(
          'event_id, trees_planted, rubbish_kg, invasive_weeds_pulled, hours_total, coastline_cleaned_m, native_plants, wildlife_sightings, area_restored_sqm, notes, logged_by',
        )

      if (impError) throw impError

      const impactEventIds = new Set((impacts ?? []).map((i) => i.event_id))
      const eventsWithoutImpact = (events ?? []).filter(
        (e) => !impactEventIds.has(e.id),
      ).length

      const zeroMetricEvents = (impacts ?? []).filter((i) => {
        const nums = [
          i.trees_planted, i.rubbish_kg, i.invasive_weeds_pulled,
          i.hours_total, i.coastline_cleaned_m, i.native_plants,
          i.wildlife_sightings, i.area_restored_sqm,
        ]
        return nums.every((n) => !n || n === 0)
      }).length

      const legacyCount = (impacts ?? []).filter(
        (i) =>
          i.logged_by === SEED_ADMIN ||
          ((i.notes as string) ?? '').startsWith('Legacy import'),
      ).length
      const appCount = (impacts ?? []).length - legacyCount

      return { eventsWithoutImpact, zeroMetricEvents, legacyCount, appCount } satisfies DataQuality
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Events missing impact (gap analysis for admin)                     */
/* ------------------------------------------------------------------ */

export interface EventMissingImpact {
  id: string
  title: string
  activity_type: string
  date_end: string
  collective_id: string
  collective_name: string | null
  days_since: number
}

/**
 * Returns completed/published events from the last 30 days that have
 * no event_impact row. Gives admins a clear list of "who hasn't logged".
 */
export function useEventsMissingImpact() {
  return useQuery({
    queryKey: ['admin-events-missing-impact'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: events, error } = await supabase
        .from('events')
        .select('id, title, activity_type, date_end, date_start, status, collective_id, collectives(name)')
        .in('status', ['completed', 'published'])
        .gte('date_start', thirtyDaysAgo.toISOString())
        .lte('date_start', new Date().toISOString())
        .order('date_start', { ascending: false })

      if (error) throw error

      // Filter to events that have actually ended
      const now = new Date()
      const ended = (events ?? []).filter((e) => {
        const end = new Date(e.date_end ?? e.date_start)
        return end <= now
      })
      if (ended.length === 0) return []

      const eventIds = ended.map((e) => e.id)
      const { data: impacts } = await supabase
        .from('event_impact')
        .select('event_id')
        .in('event_id', eventIds)

      const loggedIds = new Set((impacts ?? []).map((i) => i.event_id))

      return ended
        .filter((e) => !loggedIds.has(e.id))
        .map((e) => {
          const endDate = new Date(e.date_end ?? e.date_start)
          return {
            id: e.id,
            title: e.title,
            activity_type: e.activity_type,
            date_end: e.date_end ?? e.date_start,
            collective_id: e.collective_id,
            collective_name: (e.collectives as unknown as { name: string } | null)?.name ?? null,
            days_since: Math.floor((now.getTime() - endDate.getTime()) / 86400000),
          }
        }) as EventMissingImpact[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
