import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { IMPACT_SELECT_COLUMNS } from '@/lib/impact-metrics'
import type { Database } from '@/types/database.types'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export function useProfile(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['profile', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfileCollectives(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['profile-collectives', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')
      const { data, error } = await supabase
        .from('collective_members')
        .select('collective_id, role, collectives(id, name, slug, cover_image_url, region, member_count)')
        .eq('user_id', id)
        .eq('status', 'active')
      if (error) throw error
      return data
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useProfileStats(userId?: string) {
  const { user } = useAuth()
  const id = userId ?? user?.id

  return useQuery({
    queryKey: ['profile-stats', id],
    queryFn: async () => {
      if (!id) throw new Error('No user ID')

      // Get events attended
      const { count: eventsAttended } = await supabase
        .from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', id)
        .eq('status', 'attended')

      // Get total impact from events the user attended
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', id)
        .eq('status', 'attended')

      const eventIds = registrations?.map((r) => r.event_id) ?? []

      let totalTreesPlanted = 0
      let totalHours = 0
      let totalRubbishKg = 0
      let totalAreaSqm = 0
      let totalNativePlants = 0
      let totalWildlifeSightings = 0

      if (eventIds.length > 0) {
        // Batch in chunks to avoid URL length limits
        const impactRows: Record<string, unknown>[] = []
        for (let i = 0; i < eventIds.length; i += 50) {
          const chunk = eventIds.slice(i, i + 50)
          const { data } = await supabase
            .from('event_impact')
            .select(IMPACT_SELECT_COLUMNS)
            .in('event_id', chunk)
          if (data) impactRows.push(...(data as Record<string, unknown>[]))
        }

        if (impactRows.length > 0) {
          for (const impact of impactRows) {
            totalTreesPlanted += Number(impact.trees_planted) || 0
            totalHours += Number(impact.hours_total) || 0
            totalRubbishKg += Number(impact.rubbish_kg) || 0
            totalAreaSqm += Number(impact.area_restored_sqm) || 0
            totalNativePlants += Number(impact.native_plants) || 0
            totalWildlifeSightings += Number(impact.wildlife_sightings) || 0
          }
        }
      }

      return {
        eventsAttended: eventsAttended ?? 0,
        treesPlanted: totalTreesPlanted,
        hoursVolunteered: totalHours,
        rubbishCollectedKg: totalRubbishKg,
        areaRestoredSqm: totalAreaSqm,
        nativePlants: totalNativePlants,
        wildlifeSightings: totalWildlifeSightings,
      }
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMutualConnections(targetUserId: string) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['mutual-connections', user?.id, targetUserId],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated')

      // Shared collectives
      const { data: myCollectives } = await supabase
        .from('collective_members')
        .select('collective_id')
        .eq('user_id', user.id)
        .eq('status', 'active')

      const { data: theirCollectives } = await supabase
        .from('collective_members')
        .select('collective_id, collectives(name)')
        .eq('user_id', targetUserId)
        .eq('status', 'active')

      const myIds = new Set(myCollectives?.map((c) => c.collective_id) ?? [])
      const sharedCollectives = theirCollectives?.filter((c) => myIds.has(c.collective_id)) ?? []

      // Shared events
      const { data: myEvents } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id)
        .eq('status', 'attended')

      const { data: theirEvents } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', targetUserId)
        .eq('status', 'attended')

      const myEventIds = new Set(myEvents?.map((e) => e.event_id) ?? [])
      const sharedEventCount = theirEvents?.filter((e) => myEventIds.has(e.event_id)).length ?? 0

      return {
        sharedCollectives: sharedCollectives.map((c) => ({
          id: c.collective_id,
          name: (c.collectives as { name: string } | null)?.name ?? '',
        })),
        sharedEventCount,
      }
    },
    enabled: !!user && !!targetUserId && user.id !== targetUserId,
    staleTime: 10 * 60 * 1000,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const { user, refreshProfile } = useAuth()

  return useMutation({
    mutationFn: async (updates: ProfileUpdate) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
      if (error) throw error
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['profile', user?.id] })
      const previous = queryClient.getQueryData(['profile', user?.id])
      queryClient.setQueryData(['profile', user?.id], (old: Record<string, unknown> | undefined) => old ? { ...old, ...updates } : old)
      return { previous }
    },
    onError: (_err, _, context) => {
      if (context?.previous) queryClient.setQueryData(['profile', user?.id], context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      refreshProfile()
    },
  })
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
      if (updateError) throw updateError

      return publicUrl
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
    },
  })
}
