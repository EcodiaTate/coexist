import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { parseLocationPoint } from '@/lib/geo'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MapCollective {
  id: string
  slug: string
  name: string
  cover_image_url: string | null
  region: string | null
  state: string | null
  member_count: number | null
  description: string | null
  lat: number
  lng: number
  nextEvent: { title: string; date_start: string } | null
}

/* ------------------------------------------------------------------ */
/*  Fallback coordinates for collectives without location_point        */
/* ------------------------------------------------------------------ */

const SLUG_COORDS: Record<string, { lat: number; lng: number }> = {
  perth: { lat: -31.9505, lng: 115.8605 },
  adelaide: { lat: -34.9285, lng: 138.6007 },
  geelong: { lat: -38.1499, lng: 144.3617 },
  'mornington-peninsula': { lat: -38.2833, lng: 145.1667 },
  'melbourne-city': { lat: -37.8136, lng: 144.9631 },
  melbourne: { lat: -37.8136, lng: 144.9631 },
  hobart: { lat: -42.8821, lng: 147.3272 },
  sydney: { lat: -33.8688, lng: 151.2093 },
  'northern-rivers': { lat: -28.8131, lng: 153.276 },
  'gold-coast': { lat: -28.0167, lng: 153.4 },
  brisbane: { lat: -27.4698, lng: 153.0251 },
  'sunshine-coast': { lat: -26.65, lng: 153.0667 },
  townsville: { lat: -19.259, lng: 146.8169 },
  cairns: { lat: -16.9186, lng: 145.7781 },
  tamworth: { lat: -31.0927, lng: 150.932 },
}

/* ------------------------------------------------------------------ */
/*  Hook: fetch all active collectives with next upcoming event        */
/* ------------------------------------------------------------------ */

export function useCollectiveMapData() {
  return useQuery({
    queryKey: ['collective-map-data'],
    queryFn: async () => {
      // Fetch active collectives
      const { data: collectives, error } = await supabase
        .from('collectives')
        .select('id, slug, name, cover_image_url, region, state, member_count, description, location_point')
        .eq('is_active', true)
        .or('is_national.is.null,is_national.eq.false')
        .order('member_count', { ascending: false })

      if (error) throw error
      if (!collectives?.length) return []

      // Fetch the next upcoming event per collective in one query
      const now = new Date().toISOString()
      const collectiveIds = collectives.map((c) => c.id)

      const { data: events } = await supabase
        .from('events')
        .select('id, title, date_start, collective_id')
        .in('collective_id', collectiveIds)
        .eq('status', 'published')
        .gte('date_start', now)
        .order('date_start', { ascending: true })

      // Build map: collective_id -> first upcoming event
      const nextEventMap = new Map<string, { title: string; date_start: string }>()
      if (events) {
        for (const e of events) {
          if (e.collective_id && !nextEventMap.has(e.collective_id)) {
            nextEventMap.set(e.collective_id, { title: e.title, date_start: e.date_start })
          }
        }
      }

      // Merge - use location_point if available, else fall back to slug-based coords
      const result: MapCollective[] = []
      for (const c of collectives) {
        const loc = parseLocationPoint(c.location_point) ?? SLUG_COORDS[c.slug] ?? null
        if (!loc) continue
        result.push({
          id: c.id,
          slug: c.slug,
          name: c.name,
          cover_image_url: c.cover_image_url,
          region: c.region,
          state: c.state,
          member_count: c.member_count,
          description: c.description,
          lat: loc.lat,
          lng: loc.lng,
          nextEvent: nextEventMap.get(c.id) ?? null,
        })
      }

      return result
    },
    staleTime: 10 * 60 * 1000,
  })
}
