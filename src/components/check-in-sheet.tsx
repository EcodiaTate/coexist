import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    Camera,
    Keyboard,
    CheckCircle2, XCircle,
    WifiOff,
    Sparkles,
    User,
    AlertTriangle,
    QrCode,
    ChevronLeft
} from 'lucide-react'
import jsQR from 'jsqr'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '@/hooks/use-auth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { useCheckIn } from '@/hooks/use-events'
import { useOffline } from '@/hooks/use-offline'
import { queueOfflineCheckIn } from '@/lib/offline-sync'
import { supabase } from '@/lib/supabase'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Celebration } from '@/components/celebration'
import { WhatsNext } from '@/components/whats-next'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Confetti                                                           */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = [
  'bg-primary-400', 'bg-primary-500', 'bg-secondary-400',
  'bg-accent-400', 'bg-success-400', 'bg-warning-400',
]

function Confetti() {
  const rm = useReducedMotion()
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
  if (rm) return null
  return (
    <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className={cn('absolute rounded-sm', p.color)}
          style={{ width: p.size, height: p.size * 0.6, left: `${p.left}%`, top: -20, rotate: p.rotation }}
          initial={{ y: -20, opacity: 1 }}
          animate={{ y: window.innerHeight + 50, opacity: [1, 1, 0], rotate: p.rotation + 360 * p.direction, x: p.xDrift }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Web QR Scanner (getUserMedia + jsQR)                               */
/* ------------------------------------------------------------------ */

function WebQrScanner({ onScan, onError }: { onScan: (value: string) => void; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [cameraReady, setCameraReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()
          setCameraReady(true)
        }
      } catch {
        if (!cancelled) onError()
      }
    }

    startCamera()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [onError])

  // Scan loop
  useEffect(() => {
    if (!cameraReady) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    function tick() {
      if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      canvas!.width = video.videoWidth
      canvas!.height = video.videoHeight
      ctx!.drawImage(video, 0, 0, canvas!.width, canvas!.height)
      const imageData = ctx!.getImageData(0, 0, canvas!.width, canvas!.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
      if (code?.data) {
        onScan(code.data)
        return // Stop scanning once we find a code
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [cameraReady, onScan])

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />
      {/* Scan overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[70%] aspect-square border-2 border-white/60 rounded-xl relative">
          <motion.div
            className="absolute left-2 right-2 h-0.5 bg-primary-400 rounded-full"
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>
      {!cameraReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <Camera size={32} className="text-white/40 mx-auto mb-2" />
            <p className="text-sm text-white/60">Opening camera...</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Step = 'details' | 'checkin' | 'success' | 'error'
type CheckInMode = 'idle' | 'scanning' | 'manual'
type ErrorKind = 'not_registered' | 'already_checked_in' | 'invalid_qr' | 'generic'

const ERROR_MESSAGES: Record<ErrorKind, string> = {
  not_registered: "You're not registered for this event. Register first, then try again.",
  already_checked_in: "You've already checked in to this event!",
  invalid_qr: 'This QR code is not valid for this event.',
  generic: 'Something went wrong. Please try again.',
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface CheckInSheetProps {
  open: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
  collectiveName?: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CheckInSheet({ open, onClose, eventId, eventTitle, collectiveName }: CheckInSheetProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const rm = useReducedMotion()
  const { isOffline } = useOffline()
  const { data: profileData, isLoading: profileLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const checkInMutation = useCheckIn()

  // Determine step based on profile completeness
  const needsDetails = profileData && !profileData.profile_details_completed
  const [step, setStep] = useState<Step>('checkin')
  const [mode, setMode] = useState<CheckInMode>('idle')
  const [manualCode, setManualCode] = useState('')
  const [errorKind, setErrorKind] = useState<ErrorKind>('generic')
  const [showCelebration, setShowCelebration] = useState(false)
  const [checkedInOffline, setCheckedInOffline] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelationship, setEmergencyRelationship] = useState('')

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setStep(needsDetails ? 'details' : 'checkin')
      setMode('idle')
      setManualCode('')
      setShowCelebration(false)
      setCheckedInOffline(false)
      // Pre-fill from existing profile
      if (profileData) {
        setFirstName(profileData.first_name ?? '')
        setLastName(profileData.last_name ?? '')
        setAge(profileData.age != null ? String(profileData.age) : '')
        setGender(profileData.gender ?? '')
        setEmail(profileData.email ?? '')
        setEmergencyName(profileData.emergency_contact_name ?? '')
        setEmergencyPhone(profileData.emergency_contact_phone ?? '')
        setEmergencyRelationship(profileData.emergency_contact_relationship ?? '')
      }
    }
  }, [open, needsDetails, profileData])

  // Focus manual input
  useEffect(() => {
    if (mode === 'manual') requestAnimationFrame(() => inputRef.current?.focus())
  }, [mode])

  /* ---- Profile details validation ---- */
  const detailsValid = firstName.trim() && lastName.trim() && emergencyName.trim() && emergencyPhone.trim()

  const handleSaveDetails = useCallback(async () => {
    try {
      await updateProfile.mutateAsync({
        first_name: firstName || null,
        last_name: lastName || null,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        email: email || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        emergency_contact_relationship: emergencyRelationship || null,
        profile_details_completed: true,
      })
      setStep('checkin')
    } catch {
      // Stay on details step
    }
  }, [firstName, lastName, age, gender, email, emergencyName, emergencyPhone, emergencyRelationship, updateProfile])

  /* ---- Check-in logic ---- */
  const validateAndCheckIn = useCallback(
    async (targetEventId: string) => {
      if (!user) return

      const { data: registration, error: regError } = await supabase
        .from('event_registrations')
        .select('status, checked_in_at')
        .eq('event_id', targetEventId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (regError || !registration) {
        setErrorKind('not_registered')
        setStep('error')
        return
      }
      if (registration.status === 'attended' && registration.checked_in_at) {
        setErrorKind('already_checked_in')
        setStep('error')
        return
      }
      if (registration.status !== 'registered' && registration.status !== 'invited') {
        setErrorKind('not_registered')
        setStep('error')
        return
      }

      checkInMutation.mutate(
        { eventId: targetEventId, userId: user.id },
        {
          onSuccess: () => {
            setStep('success')
            setTimeout(() => setShowCelebration(true), 600)
          },
          onError: () => {
            setErrorKind('generic')
            setStep('error')
          },
        },
      )
    },
    [user, checkInMutation],
  )

  const handleOfflineCheckIn = useCallback(() => {
    if (!eventId || !user) return
    queueOfflineCheckIn(eventId, user.id)
    setCheckedInOffline(true)
    setStep('success')
    setTimeout(() => setShowCelebration(true), 600)
  }, [eventId, user])

  const isNative = Capacitor.isNativePlatform()

  const handleScanStart = useCallback(async () => {
    setMode('scanning')

    try {
      if (isNative) {
        // Native: use Capacitor ML Kit BarcodeScanner
        const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning')
        const { camera } = await BarcodeScanner.requestPermissions()
        if (camera !== 'granted' && camera !== 'limited') {
          setErrorKind('generic')
          setStep('error')
          return
        }
        document.querySelector('body')?.classList.add('scanner-active')
        const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] })
        document.querySelector('body')?.classList.remove('scanner-active')

        if (barcodes.length > 0 && barcodes[0].rawValue) {
          const match = barcodes[0].rawValue.match(/^coexist:\/\/event\/(.+)$/)
          if (match) {
            const scannedEventId = match[1]
            if (scannedEventId !== eventId) {
              setErrorKind('invalid_qr')
              setStep('error')
              return
            }
            if (isOffline) handleOfflineCheckIn()
            else await validateAndCheckIn(scannedEventId)
          } else {
            setErrorKind('invalid_qr')
            setStep('error')
          }
        } else {
          setMode('idle')
        }
      } else {
        // Web: use browser getUserMedia + jsQR for camera scanning
        // (stays in 'scanning' mode - the UI renders the <video> camera view)
      }
    } catch {
      document.querySelector('body')?.classList.remove('scanner-active')
      setMode('idle')
    }
  }, [eventId, isNative, isOffline, validateAndCheckIn, handleOfflineCheckIn])

  const handleManualSubmit = useCallback(() => {
    if (!eventId || !user || !manualCode.trim()) return
    const expected = eventId.replace(/-/g, '').slice(0, 6).toUpperCase()
    if (manualCode.trim().toUpperCase() !== expected) {
      setErrorKind('invalid_qr')
      setStep('error')
      return
    }
    if (isOffline) handleOfflineCheckIn()
    else validateAndCheckIn(eventId)
  }, [eventId, user, manualCode, isOffline, validateAndCheckIn, handleOfflineCheckIn])

  const handleWebQrScan = useCallback((value: string) => {
    const match = value.match(/^coexist:\/\/event\/(.+)$/)
    if (match) {
      const scannedEventId = match[1]
      if (scannedEventId !== eventId) {
        setErrorKind('invalid_qr')
        setStep('error')
        return
      }
      if (isOffline) handleOfflineCheckIn()
      else validateAndCheckIn(scannedEventId)
    } else {
      setErrorKind('invalid_qr')
      setStep('error')
    }
  }, [eventId, isOffline, validateAndCheckIn, handleOfflineCheckIn])

  const handleWebCameraError = useCallback(() => {
    // Camera not available - fall back to manual mode
    setMode('manual')
  }, [])

  const handleClose = useCallback(() => {
    if (step === 'success') {
      // Let query caches refresh before closing
      onClose()
    } else {
      onClose()
    }
  }, [step, onClose])

  /* ---- Snap points: taller for details form, medium for check-in ---- */
  const snapPoints = step === 'details' ? [0.92] : step === 'success' ? [0.7] : [0.65]

  return (
    <>
      <BottomSheet open={open} onClose={handleClose} snapPoints={snapPoints}>
        <AnimatePresence mode="wait">
          {/* ══════════════════════════════════════════════════════════ */}
          {/*  STEP: Profile Details (blocks check-in)                  */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === 'details' && (
            <motion.div
              key="details"
              initial={rm ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pb-4"
            >
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={22} className="text-warning-600" />
                </div>
                <h3 className="font-heading text-lg font-bold text-primary-800">
                  Safety details required
                </h3>
                <p className="text-sm text-primary-400 mt-1 max-w-xs mx-auto">
                  We need a few details before you can check in. Your emergency info is only visible to event leaders.
                </p>
              </div>

              <div className="space-y-4 max-h-[55vh] overflow-y-auto px-0.5 -mx-0.5">
                {/* Personal */}
                <div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <User size={14} className="text-primary-500" />
                    <h4 className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">Your Details</h4>
                  </div>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        label="First Name *"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        maxLength={50}
                        className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                      />
                      <Input
                        label="Last Name *"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        maxLength={50}
                        className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Input
                        label="Age"
                        value={age}
                        onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
                        placeholder="Age"
                        type="number"
                        maxLength={3}
                        className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                      />
                      <Input
                        label="Gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        placeholder="e.g. Female"
                        maxLength={30}
                        className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                      />
                    </div>
                    <Input
                      label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      type="email"
                      maxLength={100}
                      className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                    />
                  </div>
                </div>

                {/* Emergency */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle size={14} className="text-warning-600" />
                    <h4 className="text-[11px] font-bold text-primary-500 uppercase tracking-wider">Emergency Contact *</h4>
                  </div>
                  <p className="text-[11px] text-primary-400 mb-2.5">Only visible to event leaders for safety.</p>
                  <div className="space-y-2.5">
                    <Input
                      label="Contact Name *"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Full name"
                      maxLength={100}
                      className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                    />
                    <Input
                      label="Contact Phone *"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="0400 000 000"
                      type="tel"
                      maxLength={20}
                      className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                    />
                    <Input
                      label="Relationship"
                      value={emergencyRelationship}
                      onChange={(e) => setEmergencyRelationship(e.target.value)}
                      placeholder="e.g. Parent, Partner"
                      maxLength={50}
                      className="[&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={!detailsValid}
                  loading={updateProfile.isPending}
                  onClick={handleSaveDetails}
                >
                  Save & Continue to Check In
                </Button>
                {!detailsValid && (
                  <p className="text-[11px] text-center text-primary-400">
                    Fill in starred (*) fields to continue
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/*  STEP: Check-in (scan / manual / self)                    */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === 'checkin' && (
            <motion.div
              key="checkin"
              initial={rm ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pb-2"
            >
              {mode === 'scanning' ? (
                <div className="flex flex-col items-center py-4 text-center">
                  {isNative ? (
                    /* Native: Capacitor handles the camera overlay */
                    <div className="relative w-52 h-52 rounded-2xl bg-primary-50/60 shadow-sm flex items-center justify-center mb-5">
                      <Camera size={44} className="text-primary-300" />
                      <motion.div
                        className="absolute left-4 right-4 h-0.5 bg-primary-500 rounded-full"
                        animate={{ top: ['20%', '80%', '20%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <p className="absolute bottom-3 text-[11px] text-primary-400">
                        Point camera at event QR code
                      </p>
                    </div>
                  ) : (
                    /* Web: live camera feed with jsQR scanning */
                    <>
                      <p className="text-sm font-semibold text-primary-700 mb-3">
                        Point your camera at the QR code
                      </p>
                      <WebQrScanner onScan={handleWebQrScan} onError={handleWebCameraError} />
                    </>
                  )}
                  <div className="w-full space-y-2 mt-4">
                    <Button variant="secondary" fullWidth onClick={() => setMode('manual')}>
                      Enter Code Instead
                    </Button>
                    <Button variant="ghost" fullWidth onClick={() => setMode('idle')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : mode === 'manual' ? (
                <div className="py-4">
                  <button
                    type="button"
                    onClick={() => { setMode('idle'); setManualCode('') }}
                    className="flex items-center gap-1 text-caption font-semibold text-primary-400 mb-4 min-h-11 cursor-pointer select-none"
                  >
                    <ChevronLeft size={16} />
                    Back
                  </button>
                  <div className="space-y-3">
                    <Input
                      ref={inputRef as React.Ref<HTMLInputElement>}
                      label="Check-in Code"
                      placeholder="Enter the 6-character code"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      autoComplete="off"
                      maxLength={6}
                      className="text-center text-lg tracking-[0.3em] font-heading font-bold [&_input]:bg-primary-50/80 [&_input]:border [&_input]:border-primary-200"
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
                  </div>
                </div>
              ) : (
                /* ---- Idle: main check-in menu ---- */
                <div className="py-2">
                  <div className="text-center mb-5">
                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                      <QrCode size={26} className="text-primary-500" />
                    </div>
                    <h3 className="font-heading text-lg font-bold text-primary-800">
                      Check In
                    </h3>
                    <p className="text-sm text-primary-400 mt-1">
                      {eventTitle}
                    </p>
                    {collectiveName && (
                      <p className="text-caption text-primary-300 mt-0.5">{collectiveName}</p>
                    )}
                  </div>

                  {isOffline && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-50 text-warning-700 text-sm font-medium mb-4">
                      <WifiOff size={16} />
                      You're offline. Check-in will be queued and synced later.
                    </div>
                  )}

                  {isNative ? (
                    /* ---- Native: camera scan is primary ---- */
                    <>
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        icon={<Camera size={20} />}
                        onClick={handleScanStart}
                        className="mb-3"
                        loading={checkInMutation.isPending}
                      >
                        Scan QR Code
                      </Button>

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-primary-100" />
                        <span className="text-caption text-primary-400 uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-primary-100" />
                      </div>

                      <Button
                        variant="secondary"
                        size="lg"
                        fullWidth
                        icon={<Keyboard size={20} />}
                        onClick={() => setMode('manual')}
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
                        className="mb-3"
                        loading={checkInMutation.isPending}
                      >
                        Scan QR Code
                      </Button>

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-primary-100" />
                        <span className="text-caption text-primary-400 uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-primary-100" />
                      </div>

                      <Button
                        variant="secondary"
                        size="lg"
                        fullWidth
                        icon={<Keyboard size={20} />}
                        onClick={() => setMode('manual')}
                      >
                        Enter Code Manually
                      </Button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/*  STEP: Success                                            */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={rm ? undefined : { opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={rm ? { duration: 0 } : { duration: 0.35, type: 'spring', stiffness: 300 }}
              className="flex flex-col items-center py-6 text-center"
            >
              <Confetti />

              <motion.div
                initial={rm ? undefined : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={rm ? { duration: 0 } : { delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-18 h-18 rounded-full bg-primary-100 flex items-center justify-center mb-5"
              >
                <CheckCircle2 size={36} className="text-primary-400" />
              </motion.div>

              <motion.h3
                initial={rm ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={rm ? { duration: 0 } : { delay: 0.3 }}
                className="font-heading text-xl font-bold text-primary-800"
              >
                You're checked in!
              </motion.h3>

              <motion.p
                initial={rm ? undefined : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={rm ? { duration: 0 } : { delay: 0.4 }}
                className="text-primary-400 mt-1.5 max-w-xs text-sm"
              >
                Welcome to {eventTitle}. Have a great time making an impact!
              </motion.p>

              {checkedInOffline && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-warning-50 text-warning-700 text-caption"
                >
                  <WifiOff size={14} />
                  Queued offline - will sync when you reconnect
                </motion.div>
              )}

              <motion.div
                initial={rm ? undefined : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={rm ? { duration: 0 } : { delay: 0.6 }}
                className="mt-6 w-full"
              >
                <WhatsNext
                  suggestions={[
                    {
                      label: 'View Event Details',
                      description: 'See the schedule and other attendees',
                      icon: <CheckCircle2 size={18} />,
                      onClick: () => { onClose(); navigate(`/events/${eventId}`) },
                    },
                    {
                      label: 'Share a Photo',
                      description: 'Capture the moment with your group',
                      icon: <Camera size={18} />,
                      onClick: () => { onClose(); navigate(`/events/${eventId}?tab=photos`) },
                    },
                  ]}
                />
              </motion.div>

              <Button variant="ghost" className="mt-4" onClick={handleClose}>
                Done
              </Button>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/*  STEP: Error                                              */}
          {/* ══════════════════════════════════════════════════════════ */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-8 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-error-100 flex items-center justify-center mb-4">
                <XCircle size={28} className="text-error-600" />
              </div>
              <h3 className="font-heading text-lg font-bold text-primary-800">
                {errorKind === 'already_checked_in' ? 'Already Checked In' : 'Check-in Failed'}
              </h3>
              <p className="text-primary-400 mt-1.5 max-w-xs text-sm">
                {ERROR_MESSAGES[errorKind]}
              </p>
              <div className="mt-5 w-full space-y-2">
                {errorKind === 'already_checked_in' ? (
                  <Button variant="primary" fullWidth onClick={() => { onClose(); navigate(`/events/${eventId}`) }}>
                    View Event
                  </Button>
                ) : (
                  <Button variant="primary" fullWidth onClick={() => { setStep('checkin'); setMode('idle'); setManualCode('') }}>
                    Try Again
                  </Button>
                )}
                <Button variant="ghost" fullWidth onClick={handleClose}>
                  Close
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>

      <Celebration
        open={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="Amazing work!"
        subtitle="Thanks for checking in - enjoy making an impact!"
        icon={<Sparkles size={36} className="text-white" />}
        autoDismiss={4000}
      />
    </>
  )
}
