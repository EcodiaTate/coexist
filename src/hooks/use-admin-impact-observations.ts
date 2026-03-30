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
  /** Estimated vol hours: attendance × event duration (hours). Null if no attendance. */
  estimatedVolHours: number | null
}

export interface CollectiveBreakdown {
  collectiveId: string
  name: string
  eventCount: number
  attendees: number
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
  attendees: number
  hours: number
}

export interface ImpactSummary {
  totalEvents: number
  totalTrees: number
  totalRubbish: number
  totalHours: number
  totalWeeds: number
  totalAttendees: number
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
    date_end: string | null
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
          `${IMPACT_SELECT_COLUMNS}, notes, event_id, logged_by, events!inner(id, title, date_start, date_end, collective_id, activity_type, created_by, collectives(name))`,
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
      const rows: EventImpactRow[] = filtered.map((r) => {
        const attendance = parseAttendance(r.notes as string | null)
        // Estimate event duration from date_start/date_end, default 3h
        const start = new Date(r.events.date_start).getTime()
        const end = r.events.date_end ? new Date(r.events.date_end).getTime() : 0
        const durationHrs = end > start ? (end - start) / 3_600_000 : 3
        const estimatedVolHours = attendance != null ? Math.round(attendance * durationHrs) : null

        return {
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
          attendance,
          estimatedVolHours,
        }
      })

      // Summary stats
      const totalLoggedHours = Math.round(sumMetric(filtered, 'hours_total'))
      const totalEstimatedHours = rows.reduce((s, r) => s + (r.estimatedVolHours ?? 0), 0)
      const totalAttendees = rows.reduce((s, r) => s + (r.attendance ?? 0), 0)

      const summary: ImpactSummary = {
        totalEvents: rows.length,
        totalTrees: sumMetric(filtered, 'trees_planted'),
        totalRubbish: Math.round(sumMetric(filtered, 'rubbish_kg') * 10) / 10,
        totalHours: totalLoggedHours || totalEstimatedHours,
        totalWeeds: sumMetric(filtered, 'invasive_weeds_pulled'),
        totalAttendees,
      }

      // Collective breakdown
      const byCollective = new Map<string, CollectiveBreakdown>()
      for (const r of rows) {
        const estHours = r.estimatedVolHours ?? 0
        const existing = byCollective.get(r.collectiveId)
        if (existing) {
          existing.eventCount++
          existing.attendees += r.attendance ?? 0
          existing.trees += r.treesPlanted ?? 0
          existing.rubbish += r.rubbishKg ?? 0
          existing.weeds += r.invasiveWeedsPulled ?? 0
          existing.hours += r.hoursTotal ?? estHours
          existing.coastline += r.coastlineCleanedM ?? 0
        } else {
          byCollective.set(r.collectiveId, {
            collectiveId: r.collectiveId,
            name: r.collectiveName,
            eventCount: 1,
            attendees: r.attendance ?? 0,
            trees: r.treesPlanted ?? 0,
            rubbish: r.rubbishKg ?? 0,
            weeds: r.invasiveWeedsPulled ?? 0,
            hours: r.hoursTotal ?? estHours,
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
        .select(`${IMPACT_SELECT_COLUMNS}, notes, logged_at, events(date_start, date_end)`)

      if (error) throw error

      const rows = (data ?? []) as unknown as (Record<string, unknown> & {
        events: { date_start: string; date_end: string | null } | null
      })[]
      const byYear = new Map<number, typeof rows>()

      for (const r of rows) {
        const year = new Date(r.logged_at as string).getFullYear()
        const arr = byYear.get(year) ?? []
        arr.push(r)
        byYear.set(year, arr)
      }

      const summaries: YearSummary[] = [...byYear.entries()]
        .map(([year, yearRows]) => {
          let attendees = 0
          let hours = 0
          for (const r of yearRows) {
            const att = parseAttendance(r.notes as string | null) ?? 0
            attendees += att
            const start = r.events ? new Date(r.events.date_start).getTime() : 0
            const end = r.events?.date_end ? new Date(r.events.date_end).getTime() : 0
            const dur = end > start ? (end - start) / 3_600_000 : 3
            hours += Math.round(att * dur)
          }

          return {
            year,
            events: yearRows.length,
            trees: sumMetric(yearRows as Record<string, unknown>[], 'trees_planted'),
            rubbish: Math.round(sumMetric(yearRows as Record<string, unknown>[], 'rubbish_kg') * 10) / 10,
            weeds: sumMetric(yearRows as Record<string, unknown>[], 'invasive_weeds_pulled'),
            attendees,
            hours,
          }
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
