import { useEffect, useRef, useCallback, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { parseLocationPoint } from '@/lib/geo'

interface RegistrationEvent {
  id: string
  title: string
  activity_type: string
  date_start: string
  date_end: string | null
  location_point: unknown
  status: string
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NearbyEvent {
  id: string
  title: string
  activity_type: string
  date_start: string
  date_end: string | null
  distance_m: number
}

interface UseEventProximityReturn {
  nearbyEvent: NearbyEvent | null
  isChecking: boolean
  lastCheck: Date | null
  checkNow: () => Promise<void>
}

/* ------------------------------------------------------------------ */
/*  Haversine distance (meters)                                        */
/* ------------------------------------------------------------------ */

function haversineM(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Radius in meters to consider "at the event" */
const PROXIMITY_RADIUS_M = 500

/** How often to re-check location (ms) */
const CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

/** How far ahead/behind to look for events (ms) */
const TIME_WINDOW_MS = 60 * 60 * 1000 // 1 hour before start, during event

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useEventProximity(): UseEventProximityReturn {
  const { user } = useAuth()
  const [nearbyEvent, setNearbyEvent] = useState<NearbyEvent | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedRef = useRef<Set<string>>(new Set())

  const checkProximity = useCallback(async () => {
    if (!user) return
    setIsChecking(true)

    try {
      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const userLat = position.coords.latitude
      const userLng = position.coords.longitude
      const now = new Date()

      // Find events the user is registered for, happening now or very soon
      const { data: registrations } = await supabase
        .from('event_registrations')
        .select(`
          event_id,
          status,
          checked_in_at,
          events!inner(
            id, title, activity_type, date_start, date_end,
            location_point, status
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['registered', 'invited'])
        .is('checked_in_at', null)

      if (!registrations?.length) {
        setNearbyEvent(null)
        return
      }

      // Filter by time window and proximity
      let closest: NearbyEvent | null = null
      let closestDist = Infinity

      for (const reg of registrations) {
        const event = (reg as unknown as { events: RegistrationEvent | null }).events
        if (!event || event.status !== 'published') continue
        if (dismissedRef.current.has(event.id)) continue

        const eventStart = new Date(event.date_start)
        const eventEnd = event.date_end ? new Date(event.date_end) : new Date(eventStart.getTime() + 3 * 60 * 60 * 1000)

        // Check time window: from 1h before start to end
        const earlyStart = new Date(eventStart.getTime() - TIME_WINDOW_MS)
        if (now < earlyStart || now > eventEnd) continue

        // Check location proximity
        const loc = parseLocationPoint(event.location_point)
        if (!loc) continue

        const dist = haversineM(userLat, userLng, loc.lat, loc.lng)
        if (dist <= PROXIMITY_RADIUS_M && dist < closestDist) {
          closestDist = dist
          closest = {
            id: event.id,
            title: event.title,
            activity_type: event.activity_type,
            date_start: event.date_start,
            date_end: event.date_end,
            distance_m: Math.round(dist),
          }
        }
      }

      setNearbyEvent(closest)
    } catch (err) {
      // Geolocation failed or denied — silently skip
      console.warn('[proximity] Geolocation check failed:', err)
    } finally {
      setIsChecking(false)
      setLastCheck(new Date())
    }
  }, [user])

  // Auto-check on interval
  useEffect(() => {
    if (!user) return

    // Initial check after a short delay
    const timeout = setTimeout(checkProximity, 3000)

    // Periodic re-checks
    intervalRef.current = setInterval(checkProximity, CHECK_INTERVAL_MS)

    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [user, checkProximity])

  return { nearbyEvent, isChecking, lastCheck, checkNow: checkProximity }
}

/* ------------------------------------------------------------------ */
/*  Send proximity-based push notification (for Edge Function use)     */
/* ------------------------------------------------------------------ */

/**
 * Trigger a proximity check-in notification for all registered attendees
 * of an event. Called from the event-day-notify Edge Function.
 *
 * This is the client-side counterpart — it checks if the current user
 * is near an event and shows a local notification prompt.
 */
export async function sendLocalCheckInPrompt(eventTitle: string, eventId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title: 'You\'re at the event!',
          body: `Tap to check in to ${eventTitle}`,
          extra: { type: 'event_check_in', eventId },
          schedule: { at: new Date() },
          smallIcon: 'ic_notification',
        },
      ],
    })
  } catch {
    // Local notifications not available
  }
}
