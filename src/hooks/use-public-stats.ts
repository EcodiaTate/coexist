import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PublicStats {
  volunteers: number
  collectives: number
  nativePlants: number
  events: number
}

const FALLBACK_STATS: PublicStats = {
  volunteers: 5500,
  collectives: 13,
  nativePlants: 35500,
  events: 850,
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: async (): Promise<PublicStats> => {
      const [profilesRes, collectivesRes, eventsRes, impactRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('events').select('id', { count: 'exact', head: true }).lt('date_start', new Date().toISOString()),
        supabase.from('event_impact').select('native_plants'),
      ])

      const totalNativePlants = (impactRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).native_plants) || 0),
        0,
      )

      return {
        volunteers: profilesRes.count ?? FALLBACK_STATS.volunteers,
        collectives: collectivesRes.count ?? FALLBACK_STATS.collectives,
        nativePlants: totalNativePlants || FALLBACK_STATS.nativePlants,
        events: eventsRes.count ?? FALLBACK_STATS.events,
      }
    },
    staleTime: 30 * 60 * 1000,
    placeholderData: FALLBACK_STATS,
  })
}
