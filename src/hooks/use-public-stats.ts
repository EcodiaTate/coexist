import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PublicStats {
  volunteers: number
  collectives: number
  nativePlants: number
  events: number
}

// Baseline checkpoint — public stats use these as the floor, then add
// live counts on top for the metrics tracked in app_settings.
const BASELINE_VOLUNTEERS = 5500
const BASELINE_TREES = 35000
const BASELINE_EVENTS = 340
const BASELINE_DATE = '2026-01-01'

const FALLBACK_STATS: PublicStats = {
  volunteers: BASELINE_VOLUNTEERS,
  collectives: 14,
  nativePlants: BASELINE_TREES,
  events: 0,
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['public-stats'],
    queryFn: async (): Promise<PublicStats> => {
      const baselineDate = new Date(BASELINE_DATE).toISOString()

      const [profilesRes, collectivesRes, eventsRes, impactRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('collectives').select('id', { count: 'exact', head: true }).eq('is_active', true),
        // Only count events after the baseline date
        supabase.from('events').select('id', { count: 'exact', head: true })
          .lt('date_start', new Date().toISOString())
          .gte('date_start', baselineDate),
        // Only sum native_plants/trees from non-legacy impact rows (all 2026+ app data).
        supabase.from('event_impact').select('native_plants, trees_planted')
          .or('notes.is.null,notes.not.like.Legacy import:%'),
      ])

      const totalNativePlants = (impactRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).native_plants) || 0),
        0,
      )
      const postBaselineTrees = (impactRes.data ?? []).reduce(
        (sum, row) => sum + (Number((row as Record<string, unknown>).trees_planted) || 0),
        0,
      )

      return {
        // volunteers = live member count (all-time, since profiles are cumulative)
        volunteers: profilesRes.count ?? FALLBACK_STATS.volunteers,
        collectives: collectivesRes.count ?? FALLBACK_STATS.collectives,
        // trees: baseline + post-baseline trees_planted + native_plants logged
        nativePlants: BASELINE_TREES + postBaselineTrees + totalNativePlants || FALLBACK_STATS.nativePlants,
        events: BASELINE_EVENTS + (eventsRes.count ?? 0),
      }
    },
    staleTime: 30 * 60 * 1000,
    placeholderData: FALLBACK_STATS,
  })
}
