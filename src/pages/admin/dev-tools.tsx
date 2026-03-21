import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Bug,
  Calendar,
  QrCode,
  ClipboardCheck,
  TreePine,
  MapPin,
  Bell,
  Users,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Star,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { useToast } from '@/components/toast'
import { useAuth } from '@/hooks/use-auth'
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_LABELS } from '@/hooks/use-events'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TestEvent {
  id: string
  title: string
  activity_type: string
  date_start: string
  date_end: string | null
  collective_name: string
  collective_id: string
  registration_count: number
  user_role: string | null
  user_status: string | null
}

/* ------------------------------------------------------------------ */
/*  Seed test event (happening right now)                              */
/* ------------------------------------------------------------------ */

function useSeedTestEvent() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (activityType: string) => {
      if (!user) throw new Error('Not authenticated')

      // Pick the first collective (or Byron Bay as fallback)
      const { data: membership } = await supabase
        .from('collective_members')
        .select('collective_id, collectives(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      let collectiveId: string
      let collectiveName: string

      if (membership) {
        collectiveId = membership.collective_id
        collectiveName = (membership as any).collectives?.name ?? 'Test Collective'
      } else {
        // Use Byron Bay seed collective and add user as leader
        collectiveId = 'c0000000-0000-0000-0000-000000000001'
        collectiveName = 'Byron Bay Collective'

        await supabase.from('collective_members').upsert(
          {
            collective_id: collectiveId,
            user_id: user.id,
            role: 'leader',
            status: 'active',
          },
          { onConflict: 'collective_id,user_id' },
        )
      }

      // Ensure user is leader in this collective for testing
      await supabase
        .from('collective_members')
        .update({ role: 'leader' })
        .eq('collective_id', collectiveId)
        .eq('user_id', user.id)

      // Create event happening RIGHT NOW (started 30 min ago, ends in 2.5 hours)
      const now = new Date()
      const start = new Date(now.getTime() - 30 * 60 * 1000)
      const end = new Date(now.getTime() + 2.5 * 60 * 60 * 1000)

      const label = ACTIVITY_TYPE_LABELS[activityType] ?? activityType
      const title = `[TEST] ${label} - ${now.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          collective_id: collectiveId,
          created_by: user.id,
          title,
          description: `Dev test event for ${label}. This event is happening right now for testing day-of flows.`,
          activity_type: activityType as any,
          date_start: start.toISOString(),
          date_end: end.toISOString(),
          capacity: 30,
          address: '1 Main Beach, Byron Bay NSW 2481',
          is_public: true,
          status: 'published',
        })
        .select('id')
        .single()

      if (eventError) throw eventError

      // Register the current user
      await supabase.from('event_registrations').upsert(
        {
          event_id: event.id,
          user_id: user.id,
          status: 'registered',
        },
        { onConflict: 'event_id,user_id' },
      )

      // Add some fake attendees (use seed user if it exists)
      const fakeNames = [
        'Alex Rivera', 'Sam Chen', 'Jordan Kim', 'Taylor Nguyen',
        'Casey Patel', 'Morgan Lee', 'Quinn Davis', 'Riley Zhang',
      ]

      for (let i = 0; i < fakeNames.length; i++) {
        const fakeId = `f0000000-test-0000-0000-${String(i + 1).padStart(12, '0')}`

        // Upsert fake profiles (may already exist from previous test runs)
        await supabase.from('profiles').upsert(
          {
            id: fakeId,
            display_name: fakeNames[i],
            role: 'participant',
          },
          { onConflict: 'id' },
        )

        // Also need auth.users entry — skip if RLS blocks it
        // Register for the event
        const status = i < 6 ? 'registered' : 'waitlisted'
        await supabase.from('event_registrations').upsert(
          {
            event_id: event.id,
            user_id: fakeId,
            status,
          },
          { onConflict: 'event_id,user_id' },
        )
      }

      return { eventId: event.id, collectiveId, collectiveName, title }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dev-test-events'] })
      toast.success(`Created: ${data.title}`)
    },
    onError: (err) => {
      toast.error(`Failed: ${(err as Error).message}`)
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Fetch test events (created by current user, today)                 */
/* ------------------------------------------------------------------ */

function useTestEvents() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['dev-test-events', user?.id],
    queryFn: async () => {
      if (!user) return []

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)

      // Get events created by current user that are active today
      const { data: events, error } = await supabase
        .from('events')
        .select(`
          id, title, activity_type, date_start, date_end, status,
          collectives(id, name)
        `)
        .eq('created_by', user.id)
        .gte('date_end', todayStart.toISOString())
        .lte('date_start', todayEnd.toISOString())
        .in('status', ['published', 'completed'])
        .order('date_start', { ascending: false })

      if (error) throw error

      // For each event, get registration info
      const results: TestEvent[] = []
      for (const evt of events ?? []) {
        const { count } = await supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', evt.id)
          .in('status', ['registered', 'attended'])

        const { data: userReg } = await supabase
          .from('event_registrations')
          .select('status')
          .eq('event_id', evt.id)
          .eq('user_id', user.id)
          .maybeSingle()

        const { data: membership } = await supabase
          .from('collective_members')
          .select('role')
          .eq('collective_id', (evt as any).collectives?.id)
          .eq('user_id', user.id)
          .maybeSingle()

        results.push({
          id: evt.id,
          title: evt.title,
          activity_type: evt.activity_type,
          date_start: evt.date_start,
          date_end: evt.date_end,
          collective_name: (evt as any).collectives?.name ?? '',
          collective_id: (evt as any).collectives?.id ?? '',
          registration_count: count ?? 0,
          user_role: membership?.role ?? null,
          user_status: userReg?.status ?? null,
        })
      }

      return results
    },
    enabled: !!user,
    staleTime: 10 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Cleanup test data                                                  */
/* ------------------------------------------------------------------ */

function useCleanupTests() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated')

      // Delete test events (ones with [TEST] in title)
      const { data: testEvents } = await supabase
        .from('events')
        .select('id')
        .eq('created_by', user.id)
        .like('title', '%[TEST]%')

      if (testEvents?.length) {
        const ids = testEvents.map((e) => e.id)

        // Delete registrations first
        for (const id of ids) {
          await supabase.from('event_registrations').delete().eq('event_id', id)
          await supabase.from('event_impact').delete().eq('event_id', id)
        }

        // Delete events
        await supabase.from('events').delete().in('id', ids)
      }

      // Clean up fake test profiles
      for (let i = 0; i < 8; i++) {
        const fakeId = `f0000000-test-0000-0000-${String(i + 1).padStart(12, '0')}`
        await supabase.from('profiles').delete().eq('id', fakeId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dev-test-events'] })
      toast.success('Test data cleaned up')
    },
    onError: (err) => {
      toast.error(`Cleanup failed: ${(err as Error).message}`)
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function DevToolsPage() {
  useAdminHeader('Dev Tools')

  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { user, profile } = useAuth()
  const { data: testEvents, isLoading } = useTestEvents()
  const seedEvent = useSeedTestEvent()
  const cleanup = useCleanupTests()

  const [selectedActivity, setSelectedActivity] = useState('beach_cleanup')

  const stagger = shouldReduceMotion
    ? undefined
    : { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }
  const fadeUp = shouldReduceMotion
    ? undefined
    : { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

  if (!import.meta.env.DEV && profile?.role !== 'super_admin') {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-error-400" size={32} />
        <p className="text-sm text-primary-500">Dev tools are only available in development mode or for super admins.</p>
      </div>
    )
  }

  return (
    <motion.div
      className="p-4 space-y-6 pb-24"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ---- User Context ---- */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-info-100 text-info-600">
              <Bug size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-800">Dev Testing Panel</h3>
              <p className="text-caption text-primary-400">
                Signed in as <span className="font-medium text-primary-600">{profile?.display_name ?? user?.email}</span>
                {' '}({profile?.role ?? 'unknown'})
              </p>
            </div>
          </div>
          <p className="text-xs text-primary-400">
            Create test events happening right now, then jump into any day-of flow to test check-in, QR codes, impact logging, and surveys.
          </p>
        </div>
      </motion.div>

      {/* ---- Seed Event Creator ---- */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-4">
          <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
            <Calendar size={16} className="text-primary-400" />
            Create Test Event (Happening Now)
          </h3>

          <div className="space-y-2">
            <label className="text-xs font-medium text-primary-500">Activity Type</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedActivity(opt.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150',
                    'cursor-pointer select-none active:scale-[0.97]',
                    selectedActivity === opt.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            icon={<Play size={16} />}
            loading={seedEvent.isPending}
            onClick={() => seedEvent.mutate(selectedActivity)}
          >
            Seed "{ACTIVITY_TYPE_LABELS[selectedActivity]}" Event
          </Button>

          <p className="text-[10px] text-primary-400">
            Creates a published event (started 30m ago, ends in 2.5h) with you as leader + 8 fake attendees.
          </p>
        </div>
      </motion.div>

      {/* ---- Active Test Events ---- */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
              <Users size={16} className="text-primary-400" />
              Your Test Events (Today)
            </h3>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              loading={cleanup.isPending}
              onClick={() => cleanup.mutate()}
            >
              Clean Up
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          ) : !testEvents?.length ? (
            <div className="text-center py-6">
              <p className="text-sm text-primary-400">No test events today. Create one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {testEvents.map((evt) => (
                <TestEventCard key={evt.id} event={evt} navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ---- Quick-Nav to Flows ---- */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-3">
          <h3 className="text-sm font-semibold text-primary-800">Quick Navigation</h3>
          <p className="text-xs text-primary-400 mb-2">
            Jump directly to any day-of page. Use a test event ID from above.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<QrCode size={14} />}
              onClick={() => {
                const first = testEvents?.[0]
                if (first) navigate(`/events/${first.id}/check-in`)
                else alert('Create a test event first')
              }}
            >
              Check-In (QR)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ClipboardCheck size={14} />}
              onClick={() => {
                const first = testEvents?.[0]
                if (first) navigate(`/events/${first.id}/day`)
                else alert('Create a test event first')
              }}
            >
              Event Day
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<TreePine size={14} />}
              onClick={() => {
                const first = testEvents?.[0]
                if (first) navigate(`/events/${first.id}/impact`)
                else alert('Create a test event first')
              }}
            >
              Log Impact
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<MapPin size={14} />}
              onClick={() => {
                const first = testEvents?.[0]
                if (first) navigate(`/events/${first.id}`)
                else alert('Create a test event first')
              }}
            >
              Event Detail
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ClipboardCheck size={14} />}
              onClick={() => {
                const first = testEvents?.[0]
                if (first) navigate(`/events/${first.id}/survey`)
                else alert('Create a test event first')
              }}
            >
              Post-Event Survey
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Test Event Card                                                    */
/* ------------------------------------------------------------------ */

function TestEventCard({
  event,
  navigate,
}: {
  event: TestEvent
  navigate: ReturnType<typeof useNavigate>
}) {
  const now = new Date()
  const start = new Date(event.date_start)
  const end = event.date_end ? new Date(event.date_end) : null
  const isActive = start <= now && (!end || end > now)
  const isPast = end ? end < now : start < now

  return (
    <div className={cn(
      'rounded-xl border p-3 space-y-3',
      isActive ? 'border-success-200 bg-success-50/30' : isPast ? 'border-primary-100 bg-primary-50/30' : 'border-primary-100',
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
              isActive ? 'bg-success-100 text-success-700' : isPast ? 'bg-primary-100 text-primary-500' : 'bg-info-100 text-info-600',
            )}>
              {isActive ? 'LIVE' : isPast ? 'ENDED' : 'UPCOMING'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-100 text-primary-600">
              {ACTIVITY_TYPE_LABELS[event.activity_type] ?? event.activity_type}
            </span>
          </div>
          <p className="text-sm font-medium text-primary-800 mt-1 truncate">{event.title}</p>
          <p className="text-caption text-primary-400">
            {event.collective_name} — {event.registration_count} registered
          </p>
          <p className="text-[10px] text-primary-400 mt-0.5">
            Your role: <span className="font-medium text-primary-600">{event.user_role ?? 'none'}</span>
            {' '} | Status: <span className="font-medium text-primary-600">{event.user_status ?? 'not registered'}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        <button
          type="button"
          onClick={() => navigate(`/events/${event.id}/day`)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white hover:bg-primary-50 transition-colors cursor-pointer"
        >
          <ClipboardCheck size={16} className="text-primary-500" />
          <span className="text-[10px] font-medium text-primary-600">Day</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(`/events/${event.id}/check-in`)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white hover:bg-primary-50 transition-colors cursor-pointer"
        >
          <QrCode size={16} className="text-success-500" />
          <span className="text-[10px] font-medium text-primary-600">Check-In</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(`/events/${event.id}/impact`)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white hover:bg-primary-50 transition-colors cursor-pointer"
        >
          <TreePine size={16} className="text-success-600" />
          <span className="text-[10px] font-medium text-primary-600">Impact</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(`/events/${event.id}/survey`)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white hover:bg-primary-50 transition-colors cursor-pointer"
        >
          <Star size={16} className="text-warning-500" />
          <span className="text-[10px] font-medium text-primary-600">Survey</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(`/events/${event.id}`)}
          className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white hover:bg-primary-50 transition-colors cursor-pointer"
        >
          <MapPin size={16} className="text-info-500" />
          <span className="text-[10px] font-medium text-primary-600">Detail</span>
        </button>
      </div>
    </div>
  )
}
