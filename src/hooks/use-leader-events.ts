import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Leader events page hooks                                           */
/*                                                                     */
/*  Extracted from pages/leader/events.tsx for reuse + prefetch.       */
/* ------------------------------------------------------------------ */

/* ── Collective events list ── */

async function fetchLeaderCollectiveEvents(collectiveId: string, filter: string) {
  const now = new Date().toISOString()

  let q = supabase
    .from('events' as any)
    .select('id, title, date_start, date_end, address, cover_image_url, activity_type, status, event_registrations(count)')
    .eq('collective_id', collectiveId)
    .order('date_start', { ascending: filter === 'upcoming' })

  if (filter === 'upcoming') {
    q = q.gte('date_start', now)
  } else if (filter === 'past') {
    q = q.lt('date_start', now)
  } else if (filter === 'draft') {
    q = q.eq('status', 'draft')
  }

  const { data } = await q.limit(50)
  return (data ?? []) as any[]
}

export function useLeaderCollectiveEvents(collectiveId: string | undefined, filter: string) {
  return useQuery({
    queryKey: ['leader-events', collectiveId, filter],
    queryFn: () => fetchLeaderCollectiveEvents(collectiveId!, filter),
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

export function prefetchLeaderCollectiveEvents(queryClient: QueryClient, collectiveId: string) {
  return queryClient.prefetchQuery({
    queryKey: ['leader-events', collectiveId, 'upcoming'],
    queryFn: () => fetchLeaderCollectiveEvents(collectiveId, 'upcoming'),
    staleTime: 2 * 60 * 1000,
  })
}

/* ── Event stats ── */

export interface LeaderEventStats {
  total: number
  upcoming: number
  past: number
  drafts: number
}

async function fetchEventStats(collectiveId: string): Promise<LeaderEventStats> {
  const now = new Date().toISOString()

  const [totalRes, upcomingRes, pastRes, draftRes] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId).gte('date_start', now),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId).lt('date_start', now),
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('collective_id', collectiveId).eq('status', 'draft'),
  ])

  return {
    total: totalRes.count ?? 0,
    upcoming: upcomingRes.count ?? 0,
    past: pastRes.count ?? 0,
    drafts: draftRes.count ?? 0,
  }
}

export function useLeaderEventStats(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['leader-event-stats', collectiveId],
    queryFn: () => fetchEventStats(collectiveId!),
    enabled: !!collectiveId,
    staleTime: 2 * 60 * 1000,
  })
}

export function prefetchLeaderEventStats(queryClient: QueryClient, collectiveId: string) {
  return queryClient.prefetchQuery({
    queryKey: ['leader-event-stats', collectiveId],
    queryFn: () => fetchEventStats(collectiveId),
    staleTime: 2 * 60 * 1000,
  })
}
