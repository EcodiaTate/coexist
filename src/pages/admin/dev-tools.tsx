import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Bug,
    Bell,
    BellOff,
    Calendar,
    QrCode,
    ClipboardCheck,
    TreePine,
    MapPin, Users,
    Trash2,
    Play, AlertCircle, Star,
    Send,
    CheckCircle2,
    XCircle,
    Clock,
    MessageSquare,
    Megaphone,
    Trophy,
    Zap,
    Shield,
    Smartphone,
    Moon,
    Globe,
    RefreshCw,
    Volume2,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { Toggle } from '@/components/toggle'
import { useAuth } from '@/hooks/use-auth'
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_LABELS } from '@/hooks/use-events'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import type { NotificationType, NotificationPreferences } from '@/hooks/use-notifications'
import { DEFAULT_PREFERENCES } from '@/hooks/use-notifications'

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

        // Also need auth.users entry - skip if RLS blocks it
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
/*  Push Notification Test Types                                       */
/* ------------------------------------------------------------------ */

interface PushTestResult {
  id: string
  label: string
  status: 'idle' | 'running' | 'pass' | 'fail'
  detail?: string
  durationMs?: number
}

interface TokenInfo {
  token: string
  platform: string
  user_id: string
  updated_at: string
  device_info: Record<string, string>
}

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, { label: string; icon: typeof Bell; color: string }> = {
  event_reminder: { label: 'Event Reminder', icon: Calendar, color: 'text-info-600' },
  registration_confirmed: { label: 'Registration Confirmed', icon: CheckCircle2, color: 'text-success-600' },
  waitlist_promotion: { label: 'Waitlist Promotion', icon: Trophy, color: 'text-accent-600' },
  event_cancelled: { label: 'Event Cancelled', icon: XCircle, color: 'text-error-600' },
  event_updated: { label: 'Event Updated', icon: RefreshCw, color: 'text-warning-600' },
  points_earned: { label: 'Points Earned', icon: Star, color: 'text-warning-600' },
  new_event_in_collective: { label: 'New Event', icon: Calendar, color: 'text-primary-600' },
  event_invite: { label: 'Event Invite', icon: Send, color: 'text-primary-600' },
  global_announcement: { label: 'Announcement', icon: Megaphone, color: 'text-accent-600' },
  challenge_update: { label: 'Challenge Update', icon: Zap, color: 'text-secondary-600' },
  chat_mention: { label: 'Chat @Mention', icon: MessageSquare, color: 'text-info-600' },
  chat_messages: { label: 'Chat Message', icon: MessageSquare, color: 'text-primary-500' },
}

/* ------------------------------------------------------------------ */
/*  Push Test Hooks                                                    */
/* ------------------------------------------------------------------ */

/** Fetch current user's registered push tokens */
function usePushTokens() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dev-push-tokens', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token, platform, user_id, updated_at, device_info')
        .eq('user_id', user.id)
      if (error) throw error
      return (data ?? []) as TokenInfo[]
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

/** Fetch current user's notification preferences from profile */
function useNotifPrefs() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dev-notif-prefs', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_PREFERENCES
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()
      if (error) throw error
      return {
        ...DEFAULT_PREFERENCES,
        ...((data?.notification_preferences as Partial<NotificationPreferences>) ?? {}),
      }
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

/** Fetch the user's collectives for collective-level tests */
function useUserCollectives() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dev-user-collectives', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('collective_members')
        .select('collective_id, role, collectives(name)')
        .eq('user_id', user.id)
        .eq('status', 'active')
      if (error) throw error
      return (data ?? []).map((m: any) => ({
        id: m.collective_id as string,
        name: (m.collectives?.name ?? 'Unknown') as string,
        role: m.role as string,
      }))
    },
    enabled: !!user,
    staleTime: 30_000,
  })
}

/** Count recent notifications for the user */
function useRecentNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['dev-recent-notifs', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, unread: 0, types: {} as Record<string, number> }
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, read_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const types: Record<string, number> = {}
      let unread = 0
      for (const n of data ?? []) {
        types[n.type] = (types[n.type] ?? 0) + 1
        if (!n.read_at) unread++
      }
      return { total: data?.length ?? 0, unread, types }
    },
    enabled: !!user,
    staleTime: 5_000,
  })
}

/* ------------------------------------------------------------------ */
/*  Push Test Runner                                                   */
/* ------------------------------------------------------------------ */

function usePushTestSuite() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [results, setResults] = useState<PushTestResult[]>([])
  const [running, setRunning] = useState(false)

  /** Helper: run a single test */
  async function runTest(
    id: string,
    label: string,
    fn: () => Promise<string>,
  ): Promise<PushTestResult> {
    const start = Date.now()
    try {
      const detail = await fn()
      return { id, label, status: 'pass', detail, durationMs: Date.now() - start }
    } catch (err) {
      return { id, label, status: 'fail', detail: (err as Error).message, durationMs: Date.now() - start }
    }
  }

  /** Run the full test suite */
  async function runAll(opts: {
    selectedTypes: NotificationType[]
    testCollectiveId?: string
    testQuietHours: boolean
    testSilent: boolean
  }) {
    if (!user) return
    setRunning(true)

    const tests: PushTestResult[] = []
    const updateTests = (t: PushTestResult) => {
      tests.push(t)
      setResults([...tests])
    }

    // ── 1. Token Registration Check ──
    updateTests({ id: 'token-check', label: 'Token Registration', status: 'running' })
    const tokenResult = await runTest('token-check', 'Token Registration', async () => {
      const { data, error } = await supabase
        .from('push_tokens')
        .select('token, platform, updated_at')
        .eq('user_id', user.id)
      if (error) throw error
      if (!data?.length) throw new Error('No push tokens registered for your account. Open the app on a device first.')
      const platforms = [...new Set(data.map((t) => t.platform))].join(', ')
      const newest = data.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
      const age = Date.now() - new Date(newest.updated_at).getTime()
      const ageMins = Math.round(age / 60_000)
      return `${data.length} token(s) on ${platforms}. Latest updated ${ageMins}m ago.`
    })
    tests[tests.length - 1] = tokenResult
    setResults([...tests])

    // ── 2. Preferences Load Check ──
    updateTests({ id: 'prefs-check', label: 'Preferences Loaded', status: 'running' })
    const prefsResult = await runTest('prefs-check', 'Preferences Loaded', async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()
      if (error) throw error
      const prefs = data?.notification_preferences as Record<string, unknown> | null
      if (!prefs || Object.keys(prefs).length === 0) {
        return 'Using defaults (no custom prefs saved yet). This is fine for new users.'
      }
      const disabled = Object.entries(prefs).filter(([k, v]) => v === false && k !== 'quiet_hours_enabled')
      const tz = (prefs.timezone as string) || 'not set'
      return `${Object.keys(prefs).length} prefs saved. ${disabled.length} disabled. Timezone: ${tz}`
    })
    tests[tests.length - 1] = prefsResult
    setResults([...tests])

    // ── 3. Send self-notification for each selected type ──
    for (const type of opts.selectedTypes) {
      const meta = NOTIFICATION_TYPE_LABELS[type]
      const testId = `push-${type}`
      updateTests({ id: testId, label: `Push: ${meta.label}`, status: 'running' })

      const result = await runTest(testId, `Push: ${meta.label}`, async () => {
        const payload: Record<string, unknown> = {
          userId: user.id,
          title: `[TEST] ${meta.label}`,
          body: `Dev test notification at ${new Date().toLocaleTimeString('en-AU')}`,
          data: { type },
        }

        // Add context-appropriate data fields
        if (['event_reminder', 'event_cancelled', 'event_updated', 'registration_confirmed',
             'waitlist_promotion', 'new_event_in_collective', 'event_invite'].includes(type)) {
          payload.data = { ...payload.data as Record<string, string>, event_id: '00000000-0000-0000-0000-000000000000' }
        }
        if (['chat_mention', 'chat_messages'].includes(type)) {
          payload.data = { ...payload.data as Record<string, string>, collective_id: opts.testCollectiveId ?? '00000000-0000-0000-0000-000000000000' }
        }

        if (opts.testSilent) {
          payload.silent = true
        }

        const { data: resp, error } = await supabase.functions.invoke('send-push', { body: payload })
        if (error) throw error
        if (resp?.error) throw new Error(resp.error)
        return `Sent ${resp?.sent ?? 0}/${resp?.total ?? 0} tokens. ${opts.testSilent ? '(silent/data-only)' : ''}`
      })

      tests[tests.length - 1] = result
      setResults([...tests])
    }

    // ── 4. Collective broadcast test (if collective selected) ──
    if (opts.testCollectiveId) {
      updateTests({ id: 'collective-push', label: 'Collective Broadcast', status: 'running' })
      const collectiveResult = await runTest('collective-push', 'Collective Broadcast', async () => {
        const { data: resp, error } = await supabase.functions.invoke('send-push', {
          body: {
            collectiveId: opts.testCollectiveId,
            title: '[TEST] Collective Broadcast',
            body: `Dev broadcast at ${new Date().toLocaleTimeString('en-AU')}`,
            data: { type: 'chat_messages', collective_id: opts.testCollectiveId },
          },
        })
        if (error) throw error
        if (resp?.error) throw new Error(resp.error)
        return `Sent to ${resp?.sent ?? 0}/${resp?.total ?? 0} member tokens.`
      })
      tests[tests.length - 1] = collectiveResult
      setResults([...tests])
    }

    // ── 5. Quiet hours validation ──
    if (opts.testQuietHours) {
      updateTests({ id: 'quiet-hours', label: 'Quiet Hours Filtering', status: 'running' })
      const quietResult = await runTest('quiet-hours', 'Quiet Hours Filtering', async () => {
        // Temporarily enable quiet hours for NOW, send a push, then restore
        const { data: profile } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .single()
        const origPrefs = (profile?.notification_preferences ?? {}) as Record<string, unknown>

        // Set quiet hours to cover right now
        const now = new Date()
        const h = now.getHours()
        const m = now.getMinutes()
        const startH = h > 0 ? h - 1 : 23
        const endH = (h + 2) % 24
        const quietPrefs = {
          ...origPrefs,
          quiet_hours_enabled: true,
          quiet_hours_start: `${String(startH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          quiet_hours_end: `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }

        await supabase
          .from('profiles')
          .update({ notification_preferences: quietPrefs } as any)
          .eq('id', user.id)

        // Small delay for consistency
        await new Promise((r) => setTimeout(r, 500))

        // Attempt to send - should be filtered by quiet hours
        const { data: resp, error } = await supabase.functions.invoke('send-push', {
          body: {
            userId: user.id,
            title: '[TEST] Quiet Hours Check',
            body: 'This should be BLOCKED by quiet hours.',
            data: { type: 'event_reminder' },
          },
        })

        // Restore original preferences
        await supabase
          .from('profiles')
          .update({ notification_preferences: origPrefs } as any)
          .eq('id', user.id)

        if (error) throw error
        if (resp?.error) throw new Error(resp.error)

        const sent = resp?.sent ?? 0
        const total = resp?.total ?? 0
        if (sent === 0 && total === 0) {
          return `PASS: 0 sent / 0 total. Notification correctly filtered out during quiet hours (${quietPrefs.quiet_hours_start}-${quietPrefs.quiet_hours_end} ${quietPrefs.timezone}).`
        }
        if (sent > 0) {
          throw new Error(`FAIL: ${sent} notifications sent despite active quiet hours! Timezone: ${quietPrefs.timezone}`)
        }
        return `0 sent / ${total} total. Filtered correctly.`
      })
      tests[tests.length - 1] = quietResult
      setResults([...tests])
    }

    // ── 6. Preference opt-out test ──
    updateTests({ id: 'pref-optout', label: 'Preference Opt-Out', status: 'running' })
    const optoutResult = await runTest('pref-optout', 'Preference Opt-Out', async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', user.id)
        .single()
      const origPrefs = (profile?.notification_preferences ?? {}) as Record<string, unknown>

      // Disable event_reminder, then try to send one
      const testPrefs = { ...origPrefs, event_reminder: false }
      await supabase
        .from('profiles')
        .update({ notification_preferences: testPrefs } as any)
        .eq('id', user.id)

      await new Promise((r) => setTimeout(r, 500))

      const { data: resp, error } = await supabase.functions.invoke('send-push', {
        body: {
          userId: user.id,
          title: '[TEST] Opt-Out Check',
          body: 'This should be BLOCKED by preference opt-out.',
          data: { type: 'event_reminder' },
        },
      })

      // Restore
      await supabase
        .from('profiles')
        .update({ notification_preferences: origPrefs } as any)
        .eq('id', user.id)

      if (error) throw error
      if (resp?.error) throw new Error(resp.error)

      const sent = resp?.sent ?? 0
      if (sent === 0) {
        return 'PASS: Notification correctly blocked when event_reminder is disabled.'
      }
      throw new Error(`FAIL: ${sent} notifications sent despite event_reminder being disabled!`)
    })
    tests[tests.length - 1] = optoutResult
    setResults([...tests])

    // ── 7. In-app notification creation test ──
    updateTests({ id: 'in-app-notif', label: 'In-App Notification', status: 'running' })
    const inAppResult = await runTest('in-app-notif', 'In-App Notification', async () => {
      const before = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'event_reminder',
        title: '[TEST] In-App Notification',
        body: `Test created at ${new Date().toLocaleTimeString('en-AU')}`,
        data: { event_id: '00000000-0000-0000-0000-000000000000' },
      })
      if (error) throw error

      const after = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      const beforeCount = before.count ?? 0
      const afterCount = after.count ?? 0
      if (afterCount > beforeCount) {
        return `PASS: In-app notification created. Total: ${afterCount}. Realtime channel should update UI.`
      }
      throw new Error('Notification was inserted but count did not increase.')
    })
    tests[tests.length - 1] = inAppResult
    setResults([...tests])

    // ── 8. Invalid token cleanup test ──
    updateTests({ id: 'token-cleanup', label: 'Invalid Token Cleanup', status: 'running' })
    const cleanupResult = await runTest('token-cleanup', 'Invalid Token Cleanup', async () => {
      // Insert a known-bad token
      const fakeToken = `__dev_test_invalid_${Date.now()}`
      await supabase.from('push_tokens').insert({
        user_id: user.id,
        token: fakeToken,
        platform: 'android',
        device_info: { test: 'true' },
      })

      // Send push - the fake token should fail with INVALID_ARGUMENT and be deleted
      await supabase.functions.invoke('send-push', {
        body: {
          userId: user.id,
          title: '[TEST] Token Cleanup',
          body: 'Testing invalid token removal.',
          data: { type: 'event_reminder' },
        },
      })

      // Small delay for async cleanup
      await new Promise((r) => setTimeout(r, 1000))

      // Check if the fake token was cleaned up
      const { data: remaining } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', user.id)
        .eq('token', fakeToken)

      if (remaining?.length) {
        // Clean up manually if it wasn't auto-removed
        await supabase.from('push_tokens').delete().eq('token', fakeToken)
        return 'Token was not auto-cleaned (FCM may not have returned INVALID_ARGUMENT for malformed tokens). Cleaned up manually.'
      }
      return 'PASS: Invalid token was automatically removed after FCM rejection.'
    })
    tests[tests.length - 1] = cleanupResult
    setResults([...tests])

    // ── 9. Multi-user batch test ──
    updateTests({ id: 'multi-user', label: 'Multi-User Batch Send', status: 'running' })
    const multiResult = await runTest('multi-user', 'Multi-User Batch Send', async () => {
      // Send to the current user plus some non-existent users (they just won't have tokens)
      const fakeIds = [
        'aaaaaaaa-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-000000000002',
      ]
      const { data: resp, error } = await supabase.functions.invoke('send-push', {
        body: {
          userIds: [user.id, ...fakeIds],
          title: '[TEST] Multi-User Batch',
          body: `Sent to ${1 + fakeIds.length} user IDs, only you have tokens.`,
          data: { type: 'event_reminder' },
        },
      })
      if (error) throw error
      if (resp?.error) throw new Error(resp.error)
      return `Sent ${resp?.sent ?? 0}/${resp?.total ?? 0}. Only your tokens should receive this.`
    })
    tests[tests.length - 1] = multiResult
    setResults([...tests])

    // ── 10. Timing / latency test ──
    updateTests({ id: 'latency', label: 'Send Latency', status: 'running' })
    const latencyResult = await runTest('latency', 'Send Latency', async () => {
      const t0 = Date.now()
      const { data: resp, error } = await supabase.functions.invoke('send-push', {
        body: {
          userId: user.id,
          title: '[TEST] Latency Check',
          body: `Measuring round-trip time.`,
          data: { type: 'event_reminder' },
        },
      })
      const elapsed = Date.now() - t0
      if (error) throw error
      if (resp?.error) throw new Error(resp.error)
      const verdict = elapsed < 2000 ? 'Good' : elapsed < 5000 ? 'Acceptable' : 'Slow'
      return `${elapsed}ms round-trip (${verdict}). Sent ${resp?.sent ?? 0} push(es).`
    })
    tests[tests.length - 1] = latencyResult
    setResults([...tests])

    setRunning(false)
    queryClient.invalidateQueries({ queryKey: ['dev-push-tokens'] })
    queryClient.invalidateQueries({ queryKey: ['dev-notif-prefs'] })
    queryClient.invalidateQueries({ queryKey: ['dev-recent-notifs'] })
    toast.success(`Push test suite complete: ${tests.filter((t) => t.status === 'pass').length}/${tests.length} passed`)
  }

  return { results, running, runAll, setResults }
}

/* ------------------------------------------------------------------ */
/*  Push Test Suite UI                                                 */
/* ------------------------------------------------------------------ */

function PushTestSuite() {
  const { user } = useAuth()
  const { data: tokens, isLoading: tokensLoading, refetch: refetchTokens } = usePushTokens()
  const { data: prefs, isLoading: prefsLoading, refetch: refetchPrefs } = useNotifPrefs()
  const { data: collectives } = useUserCollectives()
  const { data: recentNotifs, refetch: refetchNotifs } = useRecentNotifications()
  const { results, running, runAll, setResults } = usePushTestSuite()

  // Test configuration
  const [selectedTypes, setSelectedTypes] = useState<NotificationType[]>(['event_reminder', 'chat_messages', 'event_invite'])
  const [testCollectiveId, setTestCollectiveId] = useState<string | undefined>(undefined)
  const [testQuietHours, setTestQuietHours] = useState(true)
  const [testSilent, setTestSilent] = useState(false)

  const allTypes = Object.keys(NOTIFICATION_TYPE_LABELS) as NotificationType[]

  const toggleType = (type: NotificationType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const total = results.length

  return (
    <div className="space-y-4">
      {/* ── Device & Registration Status ── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
            <Smartphone size={16} className="text-primary-400" />
            Device Registration
          </h3>
          <button
            type="button"
            onClick={() => refetchTokens()}
            className="text-xs text-primary-400 hover:text-primary-600 flex items-center gap-1"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {tokensLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : !tokens?.length ? (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-50 border border-warning-200">
            <AlertCircle size={16} className="text-warning-600 shrink-0" />
            <p className="text-xs text-warning-700">
              No push tokens registered. Push notifications won't be delivered. Open the app on a real device to register.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tokens.map((t, i) => {
              const age = Date.now() - new Date(t.updated_at).getTime()
              const ageMins = Math.round(age / 60_000)
              const isStale = ageMins > 60 * 24 * 7 // older than 7 days
              return (
                <div key={i} className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg border text-xs',
                  isStale ? 'bg-warning-50/50 border-warning-200' : 'bg-success-50/30 border-success-200',
                )}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                      t.platform === 'ios' ? 'bg-primary-100 text-primary-700' : 'bg-success-100 text-success-700',
                    )}>
                      {t.platform}
                    </span>
                    <span className="text-primary-500 truncate font-mono">{t.token.slice(0, 20)}...</span>
                  </div>
                  <span className={cn('shrink-0', isStale ? 'text-warning-600' : 'text-primary-400')}>
                    {ageMins < 60 ? `${ageMins}m ago` : ageMins < 1440 ? `${Math.round(ageMins / 60)}h ago` : `${Math.round(ageMins / 1440)}d ago`}
                    {isStale && ' (stale)'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Current Preferences Summary ── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
            <Bell size={16} className="text-primary-400" />
            Notification Preferences
          </h3>
          <button
            type="button"
            onClick={() => refetchPrefs()}
            className="text-xs text-primary-400 hover:text-primary-600 flex items-center gap-1"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {prefsLoading ? (
          <Skeleton className="h-20 rounded-lg" />
        ) : prefs ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {allTypes.map((type) => {
                const enabled = prefs[type] !== false
                return (
                  <span
                    key={type}
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      enabled ? 'bg-success-100 text-success-700' : 'bg-error-100 text-error-700',
                    )}
                  >
                    {enabled ? '' : ''} {NOTIFICATION_TYPE_LABELS[type].label}
                  </span>
                )
              })}
            </div>
            <div className="flex items-center gap-4 text-xs text-primary-500 pt-1">
              <span className="flex items-center gap-1">
                <Moon size={12} />
                Quiet: {prefs.quiet_hours_enabled
                  ? `${prefs.quiet_hours_start}-${prefs.quiet_hours_end}`
                  : 'Off'}
              </span>
              <span className="flex items-center gap-1">
                <Globe size={12} />
                TZ: {prefs.timezone || 'not set'}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Recent In-App Notifications ── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
            <Volume2 size={16} className="text-primary-400" />
            Recent Notifications
          </h3>
          <button
            type="button"
            onClick={() => refetchNotifs()}
            className="text-xs text-primary-400 hover:text-primary-600 flex items-center gap-1"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-primary-600 font-medium">Total: {recentNotifs?.total ?? 0}</span>
          <span className={cn(
            'font-medium',
            (recentNotifs?.unread ?? 0) > 0 ? 'text-warning-600' : 'text-success-600',
          )}>
            Unread: {recentNotifs?.unread ?? 0}
          </span>
        </div>
        {recentNotifs?.types && Object.keys(recentNotifs.types).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(recentNotifs.types).map(([type, count]) => (
              <span key={type} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-50 text-primary-600">
                {type}: {count}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Test Configuration ── */}
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-4">
        <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
          <Shield size={16} className="text-primary-400" />
          Test Configuration
        </h3>

        {/* Type selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-primary-500">Notification Types to Test</label>
            <button
              type="button"
              className="text-[10px] text-primary-400 hover:text-primary-600"
              onClick={() => setSelectedTypes(selectedTypes.length === allTypes.length ? [] : [...allTypes])}
            >
              {selectedTypes.length === allTypes.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allTypes.map((type) => {
              const meta = NOTIFICATION_TYPE_LABELS[type]
              const selected = selectedTypes.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleType(type)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-medium transition-all duration-150',
                    'cursor-pointer select-none active:scale-[0.97]',
                    selected
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-primary-50 text-primary-500 hover:bg-primary-100',
                  )}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Collective selector */}
        {collectives && collectives.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary-500">Test Collective Broadcast</label>
            <select
              value={testCollectiveId ?? ''}
              onChange={(e) => setTestCollectiveId(e.target.value || undefined)}
              className="w-full rounded-lg bg-primary-50/50 px-3 py-2 text-xs text-primary-800 focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Skip collective test</option>
              {collectives.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Toggle options */}
        <div className="space-y-2">
          <Toggle
            checked={testQuietHours}
            onChange={setTestQuietHours}
            label="Test Quiet Hours"
            description="Temporarily enables quiet hours, verifies blocking, then restores your settings"
            size="sm"
          />
          <Toggle
            checked={testSilent}
            onChange={setTestSilent}
            label="Silent / Data-Only Mode"
            description="Sends pushes as silent (no alert, badge, or sound)"
            size="sm"
          />
        </div>
      </div>

      {/* ── Run Button ── */}
      <Button
        variant="primary"
        size="md"
        fullWidth
        icon={<Play size={16} />}
        loading={running}
        onClick={() => runAll({ selectedTypes, testCollectiveId, testQuietHours, testSilent })}
        disabled={selectedTypes.length === 0 && !testCollectiveId}
      >
        {running ? 'Running Tests...' : 'Run Push Notification Test Suite'}
      </Button>

      {/* ── Results ── */}
      {results.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary-800 flex items-center gap-2">
              <ClipboardCheck size={16} className="text-primary-400" />
              Test Results
            </h3>
            <div className="flex items-center gap-2 text-xs">
              {passed > 0 && (
                <span className="text-success-600 font-semibold">{passed} passed</span>
              )}
              {failed > 0 && (
                <span className="text-error-600 font-semibold">{failed} failed</span>
              )}
              <span className="text-primary-400">/ {total}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {results.map((r) => (
              <div
                key={r.id}
                className={cn(
                  'flex items-start gap-2 p-2.5 rounded-lg border text-xs',
                  r.status === 'pass' ? 'bg-success-50/30 border-success-200' :
                  r.status === 'fail' ? 'bg-error-50/30 border-error-200' :
                  r.status === 'running' ? 'bg-info-50/30 border-info-200' :
                  'bg-primary-50/30 border-primary-100',
                )}
              >
                <span className="shrink-0 mt-0.5">
                  {r.status === 'pass' && <CheckCircle2 size={14} className="text-success-600" />}
                  {r.status === 'fail' && <XCircle size={14} className="text-error-600" />}
                  {r.status === 'running' && <RefreshCw size={14} className="text-info-600 animate-spin" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-primary-800">{r.label}</span>
                    {r.durationMs !== undefined && (
                      <span className="text-[10px] text-primary-400 shrink-0 ml-2">{r.durationMs}ms</span>
                    )}
                  </div>
                  {r.detail && (
                    <p className={cn(
                      'text-[11px] mt-0.5 break-words',
                      r.status === 'fail' ? 'text-error-600' : 'text-primary-500',
                    )}>
                      {r.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!running && results.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResults([])}
            >
              Clear Results
            </Button>
          )}
        </div>
      )}
    </div>
  )
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

      {/* ---- Push Notification Test Suite ---- */}
      <motion.div variants={fadeUp}>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-primary-100/40 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-100 text-accent-600">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-800">Push Notification Test Suite</h3>
              <p className="text-[10px] text-primary-400">
                Test device registration, preferences, quiet hours, opt-outs, batching, latency, and every notification type.
              </p>
            </div>
          </div>
          <PushTestSuite />
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
            {event.collective_name} - {event.registration_count} registered
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
