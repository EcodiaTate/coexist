import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { IMPACT_SELECT_COLUMNS, sumMetric } from '@/lib/impact-metrics'
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
  treesPlanted: number | null
  rubbishKg: number | null
  invasiveWeedsPulled: number | null
  hoursTotal: number | null
  coastlineCleanedM: number | null
  nativePlants: number | null
  wildlifeSightings: number | null
  areaRestoredSqm: number | null
  customMetrics: Record<string, number>
  notes: string | null
  isLegacy: boolean
  attendance: number | null
}

export interface CollectiveBreakdown {
  collectiveId: string
  name: string
  eventCount: number
  trees: number
  rubbish: number
  weeds: number
  hours: number
  coastline: number
}

export interface YearSummary {
  year: number
  events: number
  trees: number
  rubbish: number
  weeds: number
}

export interface ImpactSummary {
  totalEvents: number
  totalTrees: number
  totalRubbish: number
  totalHours: number
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

/** Parse "Legacy import: N attendees" from notes */
function parseAttendance(notes: string | null): number | null {
  if (!notes) return null
  const m = notes.match(/Legacy import:\s*(\d+)\s*attendees/)
  return m ? parseInt(m[1]) : null
}

/* ------------------------------------------------------------------ */
/*  Main observations hook                                             */
/* ------------------------------------------------------------------ */

type RawRow = Record<string, unknown> & {
  events: {
    id: string
    title: string
    date_start: string
    collective_id: string
    activity_type: ActivityType
    created_by: string
    collectives: { name: string } | null
  }
}

export function useImpactObservations(filters: ObservationFilters) {
  return useQuery({
    queryKey: ['admin-impact-observations', filters],
    queryFn: async () => {
      const rangeStart = getDateRangeStart(filters.dateRange)

      let q = supabase
        .from('event_impact')
        .select(
          `${IMPACT_SELECT_COLUMNS}, notes, event_id, logged_by, events!inner(id, title, date_start, collective_id, activity_type, created_by, collectives(name))`,
        )
        .order('logged_at', { ascending: false })

      if (rangeStart) q = q.gte('logged_at', rangeStart)
      if (filters.collectiveId) q = q.eq('events.collective_id', filters.collectiveId)
      if (filters.activityType) q = q.eq('events.activity_type', filters.activityType)

      const { data, error } = await q
      if (error) throw error

      const rawRows = (data ?? []) as unknown as RawRow[]

      // Client-side search filter (title search)
      const filtered = filters.search
        ? rawRows.filter((r) =>
            r.events.title.toLowerCase().includes(filters.search!.toLowerCase()),
          )
        : rawRows

      // Transform rows
      const rows: EventImpactRow[] = filtered.map((r) => ({
        eventId: r.events.id,
        title: r.events.title,
        date: r.events.date_start,
        collectiveName: r.events.collectives?.name ?? 'Unknown',
        collectiveId: r.events.collective_id,
        activityType: r.events.activity_type,
        treesPlanted: r.trees_planted as number | null,
        rubbishKg: r.rubbish_kg as number | null,
        invasiveWeedsPulled: r.invasive_weeds_pulled as number | null,
        hoursTotal: r.hours_total as number | null,
        coastlineCleanedM: r.coastline_cleaned_m as number | null,
        nativePlants: r.native_plants as number | null,
        wildlifeSightings: r.wildlife_sightings as number | null,
        areaRestoredSqm: r.area_restored_sqm as number | null,
        customMetrics: (r.custom_metrics as Record<string, number>) ?? {},
        notes: r.notes as string | null,
        isLegacy:
          r.events.created_by === SEED_ADMIN ||
          ((r.notes as string) ?? '').startsWith('Legacy import'),
        attendance: parseAttendance(r.notes as string | null),
      }))

      // Summary stats
      const summary: ImpactSummary = {
        totalEvents: rows.length,
        totalTrees: sumMetric(filtered, 'trees_planted'),
        totalRubbish: Math.round(sumMetric(filtered, 'rubbish_kg') * 10) / 10,
        totalHours: Math.round(sumMetric(filtered, 'hours_total')),
      }

      // Collective breakdown
      const byCollective = new Map<string, CollectiveBreakdown>()
      for (const r of rows) {
        const existing = byCollective.get(r.collectiveId)
        if (existing) {
          existing.eventCount++
          existing.trees += r.treesPlanted ?? 0
          existing.rubbish += r.rubbishKg ?? 0
          existing.weeds += r.invasiveWeedsPulled ?? 0
          existing.hours += r.hoursTotal ?? 0
          existing.coastline += r.coastlineCleanedM ?? 0
        } else {
          byCollective.set(r.collectiveId, {
            collectiveId: r.collectiveId,
            name: r.collectiveName,
            eventCount: 1,
            trees: r.treesPlanted ?? 0,
            rubbish: r.rubbishKg ?? 0,
            weeds: r.invasiveWeedsPulled ?? 0,
            hours: r.hoursTotal ?? 0,
            coastline: r.coastlineCleanedM ?? 0,
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

export function useYearOverYear() {
  return useQuery({
    queryKey: ['admin-impact-yoy'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_impact')
        .select(`${IMPACT_SELECT_COLUMNS}, logged_at`)

      if (error) throw error

      const rows = (data ?? []) as unknown as Record<string, unknown>[]
      const byYear = new Map<number, Record<string, unknown>[]>()

      for (const r of rows) {
        const year = new Date(r.logged_at as string).getFullYear()
        const arr = byYear.get(year) ?? []
        arr.push(r)
        byYear.set(year, arr)
      }

      const summaries: YearSummary[] = [...byYear.entries()]
        .map(([year, yearRows]) => ({
          year,
          events: yearRows.length,
          trees: sumMetric(yearRows, 'trees_planted'),
          rubbish: Math.round(sumMetric(yearRows, 'rubbish_kg') * 10) / 10,
          weeds: sumMetric(yearRows, 'invasive_weeds_pulled'),
        }))
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
      // Get all completed events
      const { data: events, error: evError } = await supabase
        .from('events')
        .select('id')
        .eq('status', 'completed')

      if (evError) throw evError

      // Get all event_impact rows
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

      // Zero-metric events: all numeric columns are null or 0
      const zeroMetricEvents = (impacts ?? []).filter((i) => {
        const nums = [
          i.trees_planted, i.rubbish_kg, i.invasive_weeds_pulled,
          i.hours_total, i.coastline_cleaned_m, i.native_plants,
          i.wildlife_sightings, i.area_restored_sqm,
        ]
        return nums.every((n) => !n || n === 0)
      }).length

      // Legacy vs app
      const legacyCount = (impacts ?? []).filter(
        (i) =>
          i.logged_by === SEED_ADMIN ||
          ((i.notes as string) ?? '').startsWith('Legacy import'),
      ).length
      const appCount = (impacts ?? []).length - legacyCount

      return {
        eventsWithoutImpact,
        zeroMetricEvents,
        legacyCount,
        appCount,
      } satisfies DataQuality
    },
    staleTime: 5 * 60 * 1000,
  })
}
