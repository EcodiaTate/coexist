import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event, Collective } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Location {
  lat: number
  lng: number
}

interface EventWithCollective extends Event {
  collectives: Pick<Collective, 'id' | 'name'> | null
}

/* ------------------------------------------------------------------ */
/*  Nearby events                                                      */
/* ------------------------------------------------------------------ */

export function useNearbyEvents(
  location: Location | null,
  radiusKm: number = 50,
  activityTypes?: string[],
) {
  return useQuery({
    queryKey: ['nearby', 'events', location, radiusKm, activityTypes],
    queryFn: async () => {
      const now = new Date().toISOString()
      let query = supabase
        .from('events')
        .select('*, collectives(id, name)')
        .eq('status', 'published')
        .or(`date_start.gte.${now},date_end.gte.${now}`)
        .order('date_start', { ascending: true })

      if (activityTypes?.length) {
        query = query.in('activity_type', activityTypes as any)
      }

      // If location available, PostGIS distance filter via RPC would be ideal.
      // Fallback: return all published events, sorted by date.
      const { data, error } = await query.limit(20)
      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Nearby collectives                                                 */
/* ------------------------------------------------------------------ */

export function useNearbyCollectives(
  location: Location | null,
  radiusKm: number = 100,
) {
  return useQuery({
    queryKey: ['nearby', 'collectives', location, radiusKm],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('*')
        .eq('is_active', true)
        .order('member_count', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as Collective[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  User location (browser geolocation)                                */
/* ------------------------------------------------------------------ */

export function useUserLocation() {
  return useQuery({
    queryKey: ['user-location'],
    queryFn: () =>
      new Promise<Location | null>((resolve) => {
        if (!navigator.geolocation) {
          resolve(null)
          return
        }
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 10000, maximumAge: 5 * 60 * 1000 },
        )
      }),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}

/* ------------------------------------------------------------------ */
/*  Australian states for filter                                       */
/* ------------------------------------------------------------------ */

export const AU_STATES = [
  { value: 'NSW', label: 'New South Wales' },
  { value: 'VIC', label: 'Victoria' },
  { value: 'QLD', label: 'Queensland' },
  { value: 'WA', label: 'Western Australia' },
  { value: 'SA', label: 'South Australia' },
  { value: 'TAS', label: 'Tasmania' },
  { value: 'ACT', label: 'Australian Capital Territory' },
  { value: 'NT', label: 'Northern Territory' },
] as const
