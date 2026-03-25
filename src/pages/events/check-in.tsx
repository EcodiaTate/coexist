import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    Camera,
    Keyboard,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    XCircle,
    WifiOff,
} from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/hooks/use-auth'
import { useProfile } from '@/hooks/use-profile'
import { useEventDetail, useCheckIn } from '@/hooks/use-events'
import { useOffline } from '@/hooks/use-offline'
import { queueOfflineCheckIn } from '@/lib/offline-sync'
import { supabase } from '@/lib/supabase'
import {
    Page,
    Header,
    Button,
    Input,
    Skeleton,
    EmptyState,
    Celebration,
    WhatsNext,
} from '@/components'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Confetti particles (inline for check-in success)                   */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = [
  'bg-primary-400',
  'bg-primary-500',
  'bg-secondary-400',
  'bg-accent-400',
  'bg-success-400',
  'bg-warning-400',
]

function Confetti() {
  const shouldReduceMotion = useReducedMotion()
  const [particles] = useState(() => Array.from({ length: 40 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
    direction: Math.random() > 0.5 ? 1 : -1,
    xDrift: (Math.random() - 0.5) * 200,
    duration: 1.5 + Math.random(),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  })))
  if (shouldReduceMotion) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className={cn('absolute rounded-sm', p.color)}
          style={{
            width: p.size,
            height: p.size * 0.6,
            left: `${p.left}%`,
            top: -20,
            rotate: p.rotation,
          }}
          initial={{ y: -20, opacity: 1 }}
          animate={{
            y: window.innerHeight + 50,
            opacity: [1, 1, 0],
            rotate: p.rotation + 360 * p.direction,
            x: p.xDrift,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: 'easeIn',
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Check-in states                                                    */
/* ------------------------------------------------------------------ */

type CheckInState = 'idle' | 'scanning' | 'manual' | 'success' | 'error'

type ErrorKind = 'not_registered' | 'already_checked_in' | 'invalid_qr' | 'event_cancelled' | 'event_not_active' | 'generic'

const ERROR_MESSAGES: Record<ErrorKind, string> = {
  not_registered: "You're not registered for this event. Register first, then try again.",
  already_checked_in: "You've already checked in to this event!",
  invalid_qr: 'This QR code is not valid for this event.',
  event_cancelled: 'This event has been cancelled.',
  event_not_active: 'Check-in is not available for this event right now.',
  generic: 'Something went wrong. Please try again.',
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CheckInPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const shouldReduceMotion = useReducedMotion()
  const { isOffline } = useOffline()

  const { data: profileData } = useProfile()
  const { data: event, isLoading } = useEventDetail(eventId)
  const showLoading = useDelayedLoading(isLoading)
  const checkInMutation = useCheckIn()

  const [state, setState] = useState<CheckInState>('idle')
  const [manualCode, setManualCode] = useState('')
  const [errorKind, setErrorKind] = useState<ErrorKind>('generic')
  const [showCelebration, setShowCelebration] = useState(false)
  const [checkedInOffline, setCheckedInOffline] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus manual input when switching to manual mode
  useEffect(() => {
    if (state === 'manual') {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [state])

  /* ---- Validate registration before check-in ---- */
  const validateAndCheckIn = useCallback(
    async (targetEventId: string) => {
      if (!user) return

      // Block check-in for cancelled or completed events
      if (event) {
        if (event.status === 'cancelled') {
          setErrorKind('event_cancelled')
          setState('error')
          return
        }
        if (event.status === 'draft') {
          setErrorKind('event_not_active')
          setState('error')
          return
        }
      }

      // Check registration status first
      const { data: registration, error: regError } = await supabase
        .from('event_registrations')
        .select('status, checked_in_at')
        .eq('event_id', targetEventId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (regError || !registration) {
        setErrorKind('not_registered')
        setState('error')
        return
      }

      if (registration.status === 'attended' && registration.checked_in_at) {
        setErrorKind('already_checked_in')
        setState('error')
        return
      }

      if (registration.status !== 'registered' && registration.status !== 'invited') {
        setErrorKind('not_registered')
        setState('error')
        return
      }

      // Proceed with check-in
      checkInMutation.mutate(
        { eventId: targetEventId, userId: user.id },
        {
          onSuccess: async () => {
            setState('success')

            // Show celebration after a brief delay
            setTimeout(() => setShowCelebration(true), 600)
          },
          onError: () => {
            setErrorKind('generic')
            setState('error')
          },
        },
      )
    },
    [user, checkInMutation, event],
  )

  /* ---- Offline check-in ---- */
  const handleOfflineCheckIn = useCallback(async () => {
    if (!eventId || !user) return

    // Even offline, attempt a cached registration check.
    // If we have no cached data, trust the user (the sync will validate server-side).
    try {
      const cached = await supabase
        .from('event_registrations')
        .select('status, checked_in_at')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (cached.data) {
        if (cached.data.status === 'attended' && cached.data.checked_in_at) {
          setErrorKind('already_checked_in')
          setState('error')
          return
        }
        if (cached.data.status !== 'registered' && cached.data.status !== 'invited') {
          setErrorKind('not_registered')
          setState('error')
          return
        }
      }
    } catch {
      // Query failed (truly offline / no cache) — proceed with queue
    }

    queueOfflineCheckIn(eventId, user.id)
    setCheckedInOffline(true)
    setState('success')
    setTimeout(() => setShowCelebration(true), 600)
  }, [eventId, user])

  /* ---- QR scan start ---- */
  const isNative = Capacitor.isNativePlatform()

  const handleScanStart = useCallback(async () => {
    if (!isNative) {
      // Web: no camera available, switch to manual entry
      setState('manual')
      return
    }

    setState('scanning')

    try {
      const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning')

      // Check if we already have permission before prompting
      const permStatus = await BarcodeScanner.checkPermissions()
      let camPerm = permStatus.camera

      if (camPerm !== 'granted' && camPerm !== 'limited') {
        const result = await BarcodeScanner.requestPermissions()
        camPerm = result.camera
      }

      if (camPerm !== 'granted' && camPerm !== 'limited') {
        setErrorKind('generic')
        setState('error')
        return
      }

      // Make the WebView transparent so the native camera shows through
      document.body.classList.add('scanner-active')

      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      })

      document.body.classList.remove('scanner-active')

      if (barcodes.length > 0 && barcodes[0].rawValue) {
        const match = barcodes[0].rawValue.match(/^coexist:\/\/event\/(.+)$/)
        if (match) {
          const scannedEventId = match[1]
          if (scannedEventId !== eventId) {
            setErrorKind('invalid_qr')
            setState('error')
            return
          }
          if (isOffline) {
            handleOfflineCheckIn()
          } else {
            await validateAndCheckIn(scannedEventId)
          }
        } else {
          setErrorKind('invalid_qr')
          setState('error')
        }
      } else {
        setState('idle')
      }
    } catch {
      // BarcodeScanner plugin failed - fall back to manual mode, don't auto-check-in
      document.body.classList.remove('scanner-active')
      setState('manual')
    }
  }, [eventId, isNative, isOffline, validateAndCheckIn, handleOfflineCheckIn])

  /* ---- Manual code submit ---- */
  const handleManualSubmit = useCallback(() => {
    if (!eventId || !user || !manualCode.trim()) return

    // Validate: the manual code is the first 6 chars of the event ID (no dashes, uppercase)
    const expectedCode = eventId.replace(/-/g, '').slice(0, 6).toUpperCase()
    const enteredCode = manualCode.trim().toUpperCase()

    if (enteredCode !== expectedCode) {
      setErrorKind('invalid_qr')
      setState('error')
      return
    }

    if (isOffline) {
      handleOfflineCheckIn()
    } else {
      validateAndCheckIn(eventId)
    }
  }, [eventId, user, manualCode, isOffline, validateAndCheckIn, handleOfflineCheckIn])

  if (showLoading) {
    return (
      <Page swipeBack header={<Header title="Check In" back />}>
        <div className="pt-8 space-y-4">
          <Skeleton variant="title" />
          <Skeleton variant="card" />
        </div>
      </Page>
    )
  }
  if (!event) {
    return (
      <Page swipeBack header={<Header title="Check In" back />}>
        <EmptyState
          illustration="error"
          title="Event not found"
          description="We couldn't find this event."
          action={{ label: 'Go Back', onClick: () => navigate(-1) }}
        />
      </Page>
    )
  }

  return (
    <Page swipeBack header={<Header title="Check In" back />}>
      <AnimatePresence mode="wait">
        {state === 'success' ? (
          <motion.div
            key="success"
            initial={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4, type: 'spring', stiffness: 300 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
          >
            <Confetti />

            <motion.div
              initial={shouldReduceMotion ? undefined : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-6"
            >
              <CheckCircle2 size={40} className="text-primary-400" />
            </motion.div>

            <motion.h2
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
              className="font-heading text-2xl font-bold text-primary-800"
            >
              You're checked in!
            </motion.h2>

            <motion.p
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4 }}
              className="text-primary-400 mt-2 max-w-xs"
            >
              Welcome to {event.title}. Have a great time making an impact!
            </motion.p>

            {/* Offline notice */}
            {checkedInOffline && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-warning-50 text-warning-700 text-caption"
              >
                <WifiOff size={14} />
                Queued offline - will sync when you reconnect
              </motion.div>
            )}


            {/* Profile survey prompt for first-time check-ins */}
            {profileData && !profileData.profile_details_completed && (
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.6 }}
                className="mt-6 w-full max-w-xs"
              >
                <div className="rounded-xl bg-primary-50 border border-primary-200 p-4 text-center">
                  <p className="text-sm font-semibold text-primary-800">
                    Quick profile setup
                  </p>
                  <p className="text-xs text-primary-400 mt-1">
                    Help us keep you safe - takes 1 minute
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    className="mt-3"
                    onClick={() => navigate(`/events/${event.id}/profile-survey`)}
                  >
                    Fill In Details
                  </Button>
                </div>
              </motion.div>
            )}

            {/* What's next? */}
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.8 }}
              className="mt-8 w-full max-w-xs"
            >
              <WhatsNext
                suggestions={[
                  {
                    label: 'View Event Details',
                    description: 'See the schedule and other attendees',
                    icon: <CheckCircle2 size={18} />,
                    to: `/events/${event.id}`,
                  },
                  {
                    label: 'Share a Photo',
                    description: 'Capture the moment with your group',
                    icon: <Camera size={18} />,
                    to: `/events/${event.id}?tab=photos`,
                  },
                ]}
              />
            </motion.div>
          </motion.div>
        ) : state === 'error' ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-error-100 flex items-center justify-center mb-4">
              <XCircle size={32} className="text-error-600" />
            </div>
            <h2 className="font-heading text-xl font-bold text-primary-800">
              {errorKind === 'already_checked_in' ? 'Already Checked In' : 'Check-in Failed'}
            </h2>
            <p className="text-primary-400 mt-2 max-w-xs">
              {ERROR_MESSAGES[errorKind]}
            </p>
            <div className="mt-6 w-full max-w-xs space-y-2">
              {errorKind === 'already_checked_in' || errorKind === 'event_cancelled' || errorKind === 'event_not_active' ? (
                <Button variant="primary" fullWidth onClick={() => navigate(`/events/${event.id}`)}>
                  View Event
                </Button>
              ) : (
                <Button variant="primary" fullWidth onClick={() => { setState('idle'); setManualCode('') }}>
                  Try Again
                </Button>
              )}
              <Button variant="ghost" fullWidth onClick={() => navigate(-1)}>
                Go Back
              </Button>
            </div>
          </motion.div>
        ) : state === 'scanning' ? (
          <motion.div
            key="scanning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
          >
            <div className="relative w-64 h-64 rounded-2xl bg-primary-50/60 shadow-sm flex items-center justify-center mb-6">
              <Camera size={48} className="text-primary-300" />
              {/* Scanning animation line */}
              <motion.div
                className="absolute left-4 right-4 h-0.5 bg-primary-500 rounded-full"
                animate={{ top: ['20%', '80%', '20%'] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <p className="absolute bottom-4 text-caption text-primary-400">
                Point camera at event QR code
              </p>
            </div>

            <p className="text-sm text-primary-400 mb-6">
              Scanning...
            </p>

            <div className="w-full max-w-xs space-y-2">
              <Button variant="secondary" fullWidth onClick={() => setState('manual')}>
                Enter Code Instead
              </Button>
              <Button variant="ghost" fullWidth onClick={() => setState('idle')}>
                Cancel
              </Button>
            </div>
          </motion.div>
        ) : (state === 'idle' || state === 'manual') ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-6 pb-8"
          >
            <div className="text-center mb-8">
              <h2 className="font-heading text-xl font-bold text-primary-800">
                Check In to Event
              </h2>
              <p className="text-sm text-primary-400 mt-1 max-w-xs mx-auto">
                Scan the event QR code shown by your leader, or enter the check-in code manually.
              </p>
            </div>

            {/* Event card preview */}
            <div className="rounded-xl bg-white p-4 mb-6">
              <p className="text-sm font-semibold text-primary-800">{event.title}</p>
              <p className="text-caption text-primary-400 mt-0.5">
                {event.collectives?.name}
              </p>
            </div>

            {/* Offline banner */}
            {isOffline && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-50 text-warning-700 text-sm font-medium mb-4">
                <WifiOff size={16} />
                You're offline. Check-in will be queued and synced later.
              </div>
            )}

            {/* Manual entry (expanded) */}
            {state === 'manual' ? (
              <motion.div
                initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <Input
                  ref={inputRef as React.Ref<HTMLInputElement>}
                  label="Check-in Code"
                  placeholder="Enter the 6-character code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  autoComplete="off"
                  maxLength={6}
                  className="text-center text-lg tracking-[0.3em] font-heading font-bold"
                />
                <Button
                  variant="primary"
                  fullWidth
                  loading={checkInMutation.isPending}
                  disabled={manualCode.trim().length < 6}
                  onClick={handleManualSubmit}
                >
                  Check In
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => {
                    setState('idle')
                    setManualCode('')
                  }}
                >
                  Cancel
                </Button>
              </motion.div>
            ) : isNative ? (
              /* ---- Native: camera scan primary ---- */
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Camera size={20} />}
                  onClick={handleScanStart}
                  className="mb-4"
                  loading={checkInMutation.isPending}
                >
                  Scan QR Code
                </Button>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white" />
                  <span className="text-caption text-primary-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white" />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  icon={<Keyboard size={20} />}
                  onClick={() => setState('manual')}
                >
                  Enter Code Manually
                </Button>
              </>
            ) : (
              /* ---- Web: camera scan + manual code ---- */
              <>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  icon={<Camera size={20} />}
                  onClick={handleScanStart}
                  className="mb-4"
                  loading={checkInMutation.isPending}
                >
                  Scan QR Code
                </Button>
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-white" />
                  <span className="text-caption text-primary-400 uppercase tracking-wider">or</span>
                  <div className="flex-1 h-px bg-white" />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  fullWidth
                  icon={<Keyboard size={20} />}
                  onClick={() => setState('manual')}
                >
                  Enter Code Manually
                </Button>
              </>
            )}

            {/* Offline notice */}
            {!isOffline && (
              <div className="mt-6 flex items-start gap-2 p-3 rounded-lg bg-warning-50 text-warning-700 text-caption">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  No signal? Check-in will be queued and synced when you're back online.
                </span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Celebration overlay */}
      <Celebration
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Amazing work!"
        subtitle="Thanks for checking in - enjoy making an impact!"
        icon={<Sparkles size={36} className="text-white" />}
        autoDismiss={4000}
      />
    </Page>
  )
}
