import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Every active collective, for pickers that let a leader choose one.
 *
 * Lifted out of create-event.tsx when edit-event gained the collaborator card
 * (finding 2.F3, the surfacing half): both pages need the same list, and a
 * second copy of the query is the shape this audit exists to remove.
 */
export function useAllActiveCollectives() {
  return useQuery({
    queryKey: ['all-active-collectives'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('id, name, slug, region, state, cover_image_url, timezone, location_point')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}
