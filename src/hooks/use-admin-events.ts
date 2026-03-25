import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Admin events dashboard hook                                        */
/*                                                                     */
/*  Extracted from pages/admin/events.tsx for reuse + prefetch.        */
/* ------------------------------------------------------------------ */

export interface AdminEvent {
  id: string
  title: string
  date_start: string
  date_end: string | null
  address: string | null
  cover_image_url: string | null
  collective_id: string
  capacity: number | null
  activity_type: string | null
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  collectives: { name: string; region: string | null; state: string | null } | null
  registrationCount: number
}

export interface AdminEventsStats {
  total: number
  upcoming: number
  totalRegistrations: number
  upcomingRegistrations: number
  avgAttendance: number
  activeCollectives: number
  hottestEvent: AdminEvent | null
}

export interface AdminEventsData {
  all: AdminEvent[]
  upcoming: AdminEvent[]
  past: AdminEvent[]
  stats: AdminEventsStats
}

async function fetchAdminEventsData(): Promise<AdminEventsData> {
  const now = new Date().toISOString()

  const { data: events, error } = await supabase
    .from('events')
    .select(
      'id, title, date_start, date_end, address, cover_image_url, collective_id, capacity, activity_type, status, collectives(name, region, state)',
    )
    .order('date_start', { ascending: true })
    .limit(200)

  if (error) throw error

  const eventList = (events ?? []) as (Omit<AdminEvent, 'registrationCount'>)[]

  // Batch-fetch registration counts in one query instead of N
  const eventIds = eventList.map((e) => e.id)
  const regCounts = new Map<string, number>()
  if (eventIds.length > 0) {
    const { data: regRows } = await supabase
      .from('event_registrations')
      .select('event_id')
      .in('event_id', eventIds)

    for (const row of (regRows ?? []) as { event_id: string }[]) {
      regCounts.set(row.event_id, (regCounts.get(row.event_id) ?? 0) + 1)
    }
  }

  const enriched: AdminEvent[] = eventList.map((event) => ({
    ...event,
    registrationCount: regCounts.get(event.id) ?? 0,
  } as AdminEvent))

  const upcoming = enriched.filter((e) => e.date_start >= now && e.status !== 'cancelled')
  const past = enriched.filter((e) => e.date_start < now)

  const totalRegistrations = enriched.reduce((sum, e) => sum + e.registrationCount, 0)
  const upcomingRegistrations = upcoming.reduce((sum, e) => sum + e.registrationCount, 0)
  const avgAttendance =
    past.length > 0
      ? Math.round(past.reduce((sum, e) => sum + e.registrationCount, 0) / past.length)
      : 0

  const hottestEvent = upcoming.length > 0
    ? upcoming.reduce((a, b) => (a.registrationCount > b.registrationCount ? a : b))
    : null

  const activeCollectives = new Set(upcoming.map((e) => e.collective_id)).size

  return {
    all: enriched,
    upcoming,
    past,
    stats: {
      total: enriched.length,
      upcoming: upcoming.length,
      totalRegistrations,
      upcomingRegistrations,
      avgAttendance,
      activeCollectives,
      hottestEvent,
    },
  }
}

export function useAdminEventsData() {
  return useQuery({
    queryKey: ['admin-events-dashboard'],
    queryFn: fetchAdminEventsData,
    staleTime: 60 * 1000,
  })
}

export function prefetchAdminEventsData(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: ['admin-events-dashboard'],
    queryFn: fetchAdminEventsData,
    staleTime: 60 * 1000,
  })
}
