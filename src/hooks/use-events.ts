import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type {
  Event,
  EventRegistration,
  EventImpact,
  Collective,
  Profile,
  Database,
  TablesInsert,
} from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ActivityType = Database['public']['Enums']['activity_type']
type RegistrationStatus = Database['public']['Enums']['registration_status']

export interface EventWithCollective extends Event {
  collectives: Pick<Collective, 'id' | 'name' | 'cover_image_url'> | null
}

export interface EventDetailData extends Event {
  collectives: Pick<Collective, 'id' | 'name' | 'cover_image_url' | 'slug' | 'region' | 'state'> | null
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  registration_count: number
  user_registration: EventRegistration | null
  attendees: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]
  impact: EventImpact | null
}

export interface MyEventItem extends Event {
  collectives: Pick<Collective, 'id' | 'name'> | null
  registration_status: RegistrationStatus
}

export interface AttendeeWithStatus {
  user_id: string
  status: RegistrationStatus
  checked_in_at: string | null
  registered_at: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

export interface WaitlistEntry {
  id: string
  user_id: string
  registered_at: string
  profiles: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

/* ------------------------------------------------------------------ */
/*  Activity type helpers                                              */
/* ------------------------------------------------------------------ */

export const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'shore_cleanup', label: 'Shore Cleanup' },
  { value: 'tree_planting', label: 'Tree Planting' },
  { value: 'land_regeneration', label: 'Land Regeneration' },
  { value: 'nature_walk', label: 'Nature Walks' },
  { value: 'camp_out', label: 'Camp Out' },
  { value: 'retreat', label: 'Retreats' },
  { value: 'film_screening', label: 'Film Screening' },
  { value: 'marine_restoration', label: 'Marine Restoration' },
  { value: 'workshop', label: 'Workshop' },
]

export const ACTIVITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

/* ------------------------------------------------------------------ */
/*  Impact field configs per activity type                             */
/* ------------------------------------------------------------------ */

export interface ImpactField {
  key: keyof Omit<EventImpact, 'id' | 'event_id' | 'logged_by' | 'custom_metrics' | 'notes' | 'logged_at'>
  label: string
  unit: string
  icon: string
}

export const IMPACT_FIELDS_BY_ACTIVITY: Record<ActivityType, ImpactField[]> = {
  shore_cleanup: [
    { key: 'rubbish_kg', label: 'Rubbish Collected', unit: 'kg', icon: 'trash' },
    { key: 'coastline_cleaned_m', label: 'Shoreline Cleaned', unit: 'm', icon: 'wave' },
  ],
  tree_planting: [
    { key: 'trees_planted', label: 'Trees Planted', unit: 'trees', icon: 'tree' },
    { key: 'native_plants', label: 'Native Plants', unit: 'plants', icon: 'leaf' },
    { key: 'invasive_weeds_pulled', label: 'Invasive Weeds Pulled', unit: 'weeds', icon: 'weed' },
    { key: 'area_restored_sqm', label: 'Area Covered', unit: 'sqm', icon: 'area' },
  ],
  land_regeneration: [
    { key: 'area_restored_sqm', label: 'Area Restored', unit: 'sqm', icon: 'area' },
    { key: 'native_plants', label: 'Native Plants', unit: 'plants', icon: 'leaf' },
    { key: 'invasive_weeds_pulled', label: 'Invasive Weeds Pulled', unit: 'weeds', icon: 'weed' },
  ],
  nature_walk: [
    { key: 'wildlife_sightings', label: 'Wildlife Sightings', unit: 'sightings', icon: 'eye' },
  ],
  camp_out: [],
  retreat: [
    { key: 'leaders_trained', label: 'Leaders Trained', unit: 'leaders', icon: 'users' },
  ],
  film_screening: [],
  marine_restoration: [
    { key: 'area_restored_sqm', label: 'Area Restored', unit: 'sqm', icon: 'area' },
    { key: 'coastline_cleaned_m', label: 'Coastline Restored', unit: 'm', icon: 'wave' },
    { key: 'rubbish_kg', label: 'Rubbish Collected', unit: 'kg', icon: 'trash' },
  ],
  workshop: [
    { key: 'leaders_trained', label: 'Leaders Trained', unit: 'leaders', icon: 'users' },
  ],
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

export function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function formatEventDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export function getCountdown(dateStr: string): string {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return 'Started'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `Starts in ${days} day${days === 1 ? '' : 's'}`
  if (hours > 0) return `Starts in ${hours} hour${hours === 1 ? '' : 's'}`
  return `Starts in ${minutes} min${minutes === 1 ? '' : 's'}`
}

export function getEventDuration(start: string, end: string | null): string {
  if (!end) return ''
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h`
  return `${minutes}m`
}

export function isPastEvent(event: Event): boolean {
  const end = event.date_end ?? event.date_start
  return new Date(end).getTime() < Date.now()
}

/* ------------------------------------------------------------------ */
/*  Queries - My Events                                                */
/* ------------------------------------------------------------------ */

export function useMyEvents(tab: 'upcoming' | 'invited' | 'past') {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['my-events', tab, user?.id],
    queryFn: async () => {
      if (!user) return []

      const now = new Date().toISOString()
      let query = supabase
        .from('event_registrations')
        .select('*, events(*, collectives(id, name))')
        .eq('user_id', user.id)

      if (tab === 'upcoming') {
        query = query
          .in('status', ['registered', 'waitlisted'])
          .gte('events.date_start', now)
      } else if (tab === 'invited') {
        query = query.eq('status', 'invited')
      } else {
        query = query
          .in('status', ['registered', 'attended'])
          .lt('events.date_start', now)
      }

      const { data, error } = await query.order('registered_at', { ascending: tab === 'upcoming' })
      if (error) throw error

      return (data ?? [])
        .filter((r) => r.events !== null)
        .map((r) => ({
          ...(r.events as EventWithCollective),
          registration_status: r.status,
        })) as MyEventItem[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Queries - Event Detail                                             */
/* ------------------------------------------------------------------ */

export function useEventDetail(eventId: string | undefined) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['event', eventId, user?.id],
    queryFn: async () => {
      if (!eventId) return null

      // Fetch event with collective + creator
      const { data: event, error } = await supabase
        .from('events')
        .select('*, collectives(id, name, slug, cover_image_url, region, state), profiles!events_created_by_fkey(id, display_name, avatar_url)')
        .eq('id', eventId)
        .single()
      if (error) throw error

      // Registration count
      const { count: regCount } = await supabase
        .from('event_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .in('status', ['registered', 'attended'])

      // User's registration
      let userReg: EventRegistration | null = null
      if (user) {
        const { data } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .neq('status', 'cancelled')
          .maybeSingle()
        userReg = data
      }

      // Attendee avatars (first 8)
      const { data: attendeeData } = await supabase
        .from('event_registrations')
        .select('profiles!event_registrations_user_id_fkey(id, display_name, avatar_url)')
        .eq('event_id', eventId)
        .in('status', ['registered', 'attended'])
        .limit(8)

      const attendees = (attendeeData ?? [])
        .map((a) => a.profiles)
        .filter(Boolean) as Pick<Profile, 'id' | 'display_name' | 'avatar_url'>[]

      // Impact data (if completed)
      const { data: impact } = await supabase
        .from('event_impact')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle()

      return {
        ...event,
        registration_count: regCount ?? 0,
        user_registration: userReg,
        attendees,
        impact,
      } as EventDetailData
    },
    enabled: !!eventId,
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Queries - Event Attendees (leader view)                            */
/* ------------------------------------------------------------------ */

export function useEventAttendees(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const { data, error } = await supabase
        .from('event_registrations')
        .select('user_id, status, checked_in_at, registered_at, profiles!event_registrations_user_id_fkey(id, display_name, avatar_url)')
        .eq('event_id', eventId)
        .in('status', ['registered', 'attended', 'waitlisted'])
        .order('registered_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as AttendeeWithStatus[]
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Queries - Event Waitlist                                           */
/* ------------------------------------------------------------------ */

export function useEventWaitlist(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-waitlist', eventId],
    queryFn: async () => {
      if (!eventId) return []

      const { data, error } = await supabase
        .from('event_registrations')
        .select('id, user_id, registered_at, profiles!event_registrations_user_id_fkey(id, display_name, avatar_url)')
        .eq('event_id', eventId)
        .eq('status', 'waitlisted')
        .order('registered_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as WaitlistEntry[]
    },
    enabled: !!eventId,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Queries - Nearby & Collective Events                               */
/* ------------------------------------------------------------------ */

export function useNearbyEvents(limit = 20) {
  return useQuery({
    queryKey: ['nearby-events', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, collectives(id, name)')
        .eq('status', 'published')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useDiscoverEvents(filters?: {
  activityType?: ActivityType | ''
  collectiveId?: string
}) {
  return useQuery({
    queryKey: ['discover-events', filters?.activityType, filters?.collectiveId],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*, collectives(id, name)')
        .eq('status', 'published')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })
        .limit(50)

      if (filters?.activityType) {
        query = query.eq('activity_type', filters.activityType)
      }
      if (filters?.collectiveId) {
        query = query.eq('collective_id', filters.collectiveId)
      }

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useCollectiveEvents(collectiveId: string | undefined) {
  return useQuery({
    queryKey: ['collective-events', collectiveId],
    queryFn: async () => {
      if (!collectiveId) return []
      const { data, error } = await supabase
        .from('events')
        .select('*, collectives(id, name)')
        .eq('collective_id', collectiveId)
        .eq('status', 'published')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })
        .limit(20)
      if (error) throw error
      return (data ?? []) as EventWithCollective[]
    },
    enabled: !!collectiveId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Queries - Event Impact                                             */
/* ------------------------------------------------------------------ */

export function useEventImpact(eventId: string | undefined) {
  return useQuery({
    queryKey: ['event-impact', eventId],
    queryFn: async () => {
      if (!eventId) return null
      const { data, error } = await supabase
        .from('event_impact')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle()
      if (error) throw error
      return data as EventImpact | null
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Mutations - Registration                                          */
/* ------------------------------------------------------------------ */

export function useRegisterForEvent() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, asWaitlist = false }: { eventId: string; asWaitlist?: boolean }) => {
      if (!user) throw new Error('Must be signed in')

      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: asWaitlist ? 'waitlisted' : 'registered',
        })
      if (error) throw error

      // Send confirmation email (only for registered, not waitlisted)
      if (!asWaitlist) {
        const { data: event } = await supabase
          .from('events')
          .select('title, date_start, address')
          .eq('id', eventId)
          .single()

        if (event) {
          supabase.functions.invoke('send-email', {
            body: {
              type: 'event_confirmation',
              userId: user.id,
              data: {
                name: profile?.display_name ?? 'there',
                event_title: event.title,
                event_date: new Date(event.date_start).toLocaleString('en-AU', {
                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                }),
                event_location: event.address ?? '',
                event_url: `https://app.coexistaus.org/events/${eventId}`,
              },
            },
          }).catch(console.error)
        }
      }
    },
    onMutate: async ({ eventId, asWaitlist }) => {
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })
      const previousEvent = queryClient.getQueryData(['event', eventId, user?.id])
      queryClient.setQueryData(['event', eventId, user?.id], (old: EventDetailData | undefined) => {
        if (!old) return old
        return {
          ...old,
          registration_count: old.registration_count + (asWaitlist ? 0 : 1),
          user_registration: { event_id: eventId, user_id: user!.id, status: asWaitlist ? 'waitlisted' : 'registered', checked_in_at: null, registered_at: new Date().toISOString() } as EventRegistration,
        }
      })
      return { previousEvent }
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previousEvent) queryClient.setQueryData(['event', eventId, user?.id], context.previousEvent)
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
    },
  })
}

export function useCancelRegistration() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      if (!user) throw new Error('Must be signed in')

      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled' })
        .eq('event_id', eventId)
        .eq('user_id', user.id)
      if (error) throw error
    },
    onMutate: async (eventId: string) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['my-events'] })

      // Snapshot previous value for rollback
      const previousUpcoming = queryClient.getQueryData<MyEventItem[]>(['my-events', 'upcoming'])

      // Optimistically remove the event from the upcoming list
      if (previousUpcoming) {
        queryClient.setQueryData<MyEventItem[]>(
          ['my-events', 'upcoming'],
          previousUpcoming.filter((e) => e.id !== eventId),
        )
      }

      return { previousUpcoming }
    },
    onError: (_err, _eventId, context) => {
      // Rollback on failure
      if (context?.previousUpcoming) {
        queryClient.setQueryData(['my-events', 'upcoming'], context.previousUpcoming)
      }
    },
    onSettled: (_, __, eventId) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-waitlist', eventId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Mutations - Check-in                                               */
/* ------------------------------------------------------------------ */

export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'attended',
          checked_in_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('user_id', userId)
      if (error) throw error
    },
    onMutate: async ({ eventId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['event-attendees', eventId] })
      const previous = queryClient.getQueryData<AttendeeWithStatus[]>(['event-attendees', eventId])
      queryClient.setQueryData<AttendeeWithStatus[]>(['event-attendees', eventId], (old) => {
        if (!old) return old
        return old.map(a => a.user_id === userId ? { ...a, status: 'attended' as const, checked_in_at: new Date().toISOString() } : a)
      })
      return { previous }
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) queryClient.setQueryData(['event-attendees', eventId], context.previous)
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
    },
  })
}

export function useBulkCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'attended',
          checked_in_at: new Date().toISOString(),
        })
        .eq('event_id', eventId)
        .eq('status', 'registered')
      if (error) throw error
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: ['event-attendees', eventId] })
      const previous = queryClient.getQueryData<AttendeeWithStatus[]>(['event-attendees', eventId])
      queryClient.setQueryData<AttendeeWithStatus[]>(['event-attendees', eventId], (old) => {
        if (!old) return old
        return old.map(a => a.status === 'registered' ? { ...a, status: 'attended' as const, checked_in_at: new Date().toISOString() } : a)
      })
      return { previous }
    },
    onError: (_err, eventId, context) => {
      if (context?.previous) queryClient.setQueryData(['event-attendees', eventId], context.previous)
    },
    onSettled: (_, __, eventId) => {
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Mutations - Event CRUD                                             */
/* ------------------------------------------------------------------ */

export function useCreateEvent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (eventData: Omit<TablesInsert<'events'>, 'created_by'>) => {
      if (!user) throw new Error('Must be signed in')

      const { data, error } = await supabase
        .from('events')
        .insert({ ...eventData, created_by: user.id })
        .select()
        .single()
      if (error) throw error
      return data as Event
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['collective-events'] })
      await queryClient.cancelQueries({ queryKey: ['nearby-events'] })
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['collective-events', data.collective_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['nearby-events'] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, ...updates }: { eventId: string } & Partial<Event>) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single()
      if (error) throw error
      return data as Event
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })
      await queryClient.cancelQueries({ queryKey: ['collective-events'] })
      await queryClient.cancelQueries({ queryKey: ['nearby-events'] })
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['event', data.id] })
        queryClient.invalidateQueries({ queryKey: ['collective-events', data.collective_id] })
      }
      queryClient.invalidateQueries({ queryKey: ['nearby-events'] })
    },
  })
}

export function useCancelEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, reason }: { eventId: string; reason?: string }) => {
      // Fetch event details and registered attendees before cancelling
      const [{ data: event }, { data: registrations }] = await Promise.all([
        supabase.from('events').select('title, date_start').eq('id', eventId).single(),
        supabase.from('event_registrations')
          .select('user_id, profiles!inner(display_name)')
          .eq('event_id', eventId)
          .in('status', ['registered', 'waitlisted', 'invited']),
      ])

      const { error } = await supabase
        .from('events')
        .update({ status: 'cancelled' })
        .eq('id', eventId)
      if (error) throw error

      // Notify all registered/waitlisted/invited attendees
      if (event && registrations?.length) {
        const eventDate = new Date(event.date_start).toLocaleString('en-AU', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })

        for (const reg of registrations) {
          const displayName = (reg as any).profiles?.display_name ?? 'there'
          supabase.functions.invoke('send-email', {
            body: {
              type: 'event_cancelled',
              userId: reg.user_id,
              data: {
                name: displayName,
                event_title: event.title,
                event_date: eventDate,
                reason: reason ?? '',
              },
            },
          }).catch(console.error)
        }
      }
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })
      // Optimistically set status to cancelled
      const previous = queryClient.getQueryData(['event', eventId])
      queryClient.setQueriesData<EventDetailData>(
        { queryKey: ['event', eventId] },
        (old) => old ? { ...old, status: 'cancelled' } : old,
      )
      return { previous, eventId }
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previous) {
        queryClient.setQueriesData({ queryKey: ['event', eventId] }, () => context.previous)
      }
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
      queryClient.invalidateQueries({ queryKey: ['nearby-events'] })
    },
  })
}

export function useDuplicateEvent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sourceEventId: string) => {
      if (!user) throw new Error('Must be signed in')

      const { data: source, error: fetchErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', sourceEventId)
        .single()
      if (fetchErr) throw fetchErr

      const { id: _, created_at: _ca, updated_at: _ua, status: _s, ...rest } = source
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...rest,
          title: `${rest.title} (Copy)`,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single()
      if (error) throw error
      return data as Event
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['collective-events'] })
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['collective-events', data.collective_id] })
      }
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Auto-survey trigger (best-effort, fire-and-forget)                 */
/* ------------------------------------------------------------------ */

async function triggerSurveyNotifications(eventId: string, eventTitle: string) {
  // Check if auto-surveys are enabled
  const { data: config } = await (supabase as any)
    .from('app_settings')
    .select('value')
    .eq('key', 'auto_survey_config')
    .maybeSingle()

  const autoConfig = (config as any)?.value as { enabled?: boolean } | null
  if (autoConfig && autoConfig.enabled === false) return

  // Get all checked-in attendees
  const { data: attendees } = await supabase
    .from('event_registrations')
    .select('user_id')
    .eq('event_id', eventId)
    .not('checked_in_at', 'is', null)

  if (!attendees?.length) return

  // Check who already has a survey response
  const userIds = attendees.map((a) => a.user_id)
  const { data: existingResponses } = await (supabase as any)
    .from('post_event_survey_responses')
    .select('user_id')
    .eq('event_id', eventId)
    .in('user_id', userIds)

  const respondedIds = new Set((existingResponses ?? []).map((r: any) => r.user_id))
  const pendingUsers = userIds.filter((id) => !respondedIds.has(id))
  if (!pendingUsers.length) return

  // Insert notifications for each attendee
  await supabase.from('notifications').insert(
    pendingUsers.map((userId) => ({
      user_id: userId,
      type: 'survey_request',
      title: 'How was your event?',
      body: `Tell us about "${eventTitle}" — your feedback helps improve future events.`,
      data: { event_id: eventId },
    })),
  )
}

/* ------------------------------------------------------------------ */
/*  Mutations - Impact Logging                                         */
/* ------------------------------------------------------------------ */

export function useLogImpact() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (impactData: Omit<TablesInsert<'event_impact'>, 'logged_by'>) => {
      if (!user) throw new Error('Must be signed in')

      const { data, error } = await supabase
        .from('event_impact')
        .upsert(
          { ...impactData, logged_by: user.id },
          { onConflict: 'event_id' },
        )
        .select()
        .single()
      if (error) throw error

      // Mark event as completed once impact is logged
      await supabase
        .from('events')
        .update({ status: 'completed' })
        .eq('id', impactData.event_id)
        .in('status', ['published']) // Only transition from published, not draft/cancelled

      return data as EventImpact
    },
    onMutate: async (impactData) => {
      const eventId = impactData.event_id
      await queryClient.cancelQueries({ queryKey: ['event-impact', eventId] })
      const previous = queryClient.getQueryData<EventImpact | null>(['event-impact', eventId])
      // Optimistically set the impact data
      queryClient.setQueryData<EventImpact | null>(['event-impact', eventId], (old) => ({
        ...(old ?? { id: 'optimistic', logged_by: user?.id ?? '', logged_at: new Date().toISOString() }),
        ...impactData,
      } as EventImpact))
      return { previous, eventId }
    },
    onError: (_err, _vars, context) => {
      if (context) {
        queryClient.setQueryData(['event-impact', context.eventId], context.previous)
      }
    },
    onSuccess: async (data) => {
      // Trigger auto-survey notifications for attendees
      try {
        const eventId = data.event_id
        const { data: eventData } = await supabase
          .from('events')
          .select('title')
          .eq('id', eventId)
          .single()
        if (eventData) {
          triggerSurveyNotifications(eventId, eventData.title)
        }
      } catch {
        // Survey notification is best-effort, don't block impact logging
      }
    },
    onSettled: (data, _err, vars) => {
      const eventId = data?.event_id ?? vars.event_id
      queryClient.invalidateQueries({ queryKey: ['event-impact', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['home', 'impact-stats'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Mutations - Invite Collective                                      */
/* ------------------------------------------------------------------ */

export function useInviteCollective() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, collectiveId }: { eventId: string; collectiveId: string }) => {
      if (!user) throw new Error('Must be signed in')

      // Create invite record
      const { error: inviteErr } = await supabase
        .from('event_invites')
        .insert({
          event_id: eventId,
          collective_id: collectiveId,
          invited_by: user.id,
        })
      if (inviteErr) throw inviteErr

      // Get all collective members
      const { data: members } = await supabase
        .from('collective_members')
        .select('user_id')
        .eq('collective_id', collectiveId)
        .eq('status', 'active')

      if (!members?.length) return

      // Create registration entries for each member (status: invited)
      const registrations = members
        .filter((m) => m.user_id !== user.id)
        .map((m) => ({
          event_id: eventId,
          user_id: m.user_id,
          status: 'invited' as const,
          invited_at: new Date().toISOString(),
        }))

      if (registrations.length > 0) {
        const { error } = await supabase
          .from('event_registrations')
          .upsert(registrations, { onConflict: 'event_id,user_id', ignoreDuplicates: true })
        if (error) throw error

        // Send invite emails, push notifications, and in-app notifications
        const { data: event } = await supabase
          .from('events')
          .select('title, date_start')
          .eq('id', eventId)
          .single()

        if (event) {
          const { data: inviterProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single()

          const inviterName = inviterProfile?.display_name ?? 'A collective leader'
          const eventDate = new Date(event.date_start).toLocaleString('en-AU', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            hour: 'numeric', minute: '2-digit',
          })

          // Send invite emails
          for (const reg of registrations) {
            supabase.functions.invoke('send-email', {
              body: {
                type: 'event_invite',
                userId: reg.user_id,
                data: {
                  name: '', // resolved by edge function via userId lookup if needed
                  inviter_name: inviterName,
                  event_title: event.title,
                  event_date: eventDate,
                  event_url: `https://app.coexistaus.org/events/${eventId}`,
                },
              },
            }).catch(console.error)
          }

          // Send push notifications to all invited members
          const invitedUserIds = registrations.map((r) => r.user_id)
          supabase.functions.invoke('send-push', {
            body: {
              userIds: invitedUserIds,
              title: `You're invited!`,
              body: `${inviterName} invited you to ${event.title} on ${eventDate}`,
              data: { type: 'event_invite', event_id: eventId },
            },
          }).catch(console.error)

          // Create in-app notifications
          const notifications = invitedUserIds.map((uid) => ({
            user_id: uid,
            type: 'event_invite',
            title: `You're invited to ${event.title}`,
            body: `${inviterName} invited your collective to ${event.title} on ${eventDate}`,
            data: { event_id: eventId },
            read: false,
          }))

          supabase
            .from('notifications')
            .insert(notifications)
            .then(({ error: notifErr }) => {
              if (notifErr) console.error('[invite-all] notification insert error:', notifErr)
            })
        }
      }
    },
    onMutate: async ({ eventId }) => {
      await queryClient.cancelQueries({ queryKey: ['event', eventId] })
      await queryClient.cancelQueries({ queryKey: ['event-attendees', eventId] })
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Mutations - Waitlist Management                                    */
/* ------------------------------------------------------------------ */

export function usePromoteFromWaitlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, userId }: { eventId: string; userId: string }) => {
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'registered' })
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'waitlisted')
      if (error) throw error

      // Send waitlist promotion email
      const { data: event } = await supabase
        .from('events')
        .select('title, date_start')
        .eq('id', eventId)
        .single()

      if (event) {
        supabase.functions.invoke('send-email', {
          body: {
            type: 'waitlist_promoted',
            userId,
            data: {
              name: '', // resolved via userId
              event_title: event.title,
              event_date: new Date(event.date_start).toLocaleString('en-AU', {
                weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              }),
              event_url: `https://app.coexistaus.org/events/${eventId}`,
            },
          },
        }).catch(console.error)
      }
    },
    onMutate: async ({ eventId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ['event-waitlist', eventId] })
      await queryClient.cancelQueries({ queryKey: ['event-attendees', eventId] })
      const previousWaitlist = queryClient.getQueryData<WaitlistEntry[]>(['event-waitlist', eventId])
      const previousAttendees = queryClient.getQueryData<AttendeeWithStatus[]>(['event-attendees', eventId])
      queryClient.setQueryData<WaitlistEntry[]>(['event-waitlist', eventId], (old) => old?.filter(e => e.user_id !== userId))
      queryClient.setQueryData<AttendeeWithStatus[]>(['event-attendees', eventId], (old) => {
        if (!old) return old
        return old.map(a => a.user_id === userId ? { ...a, status: 'registered' as const } : a)
      })
      return { previousWaitlist, previousAttendees }
    },
    onError: (_err, { eventId }, context) => {
      if (context?.previousWaitlist) queryClient.setQueryData(['event-waitlist', eventId], context.previousWaitlist)
      if (context?.previousAttendees) queryClient.setQueryData(['event-attendees', eventId], context.previousAttendees)
    },
    onSettled: (_, __, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['event-waitlist', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event-attendees', eventId] })
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Calendar helpers                                                   */
/* ------------------------------------------------------------------ */

export function generateIcsFile(event: Event): string {
  const start = new Date(event.date_start)
  const end = event.date_end ? new Date(event.date_end) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const formatIcsDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Co-Exist//Event//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description ?? '').replace(/\n/g, '\\n')}`,
    `LOCATION:${event.address ?? ''}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Event reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcsFile(event: Event) {
  const ics = generateIcsFile(event)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${event.title.replace(/[^a-zA-Z0-9]/g, '-')}.ics`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function getGoogleCalendarUrl(event: Event): string {
  const start = new Date(event.date_start)
  const end = event.date_end ? new Date(event.date_end) : new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const formatGcalDate = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGcalDate(start)}/${formatGcalDate(end)}`,
    details: event.description ?? '',
    location: event.address ?? '',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
