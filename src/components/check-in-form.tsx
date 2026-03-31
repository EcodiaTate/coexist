import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Camera,
  Keyboard,
  WifiOff,
  User,
  AlertTriangle,
  QrCode,
  ChevronLeft
} from 'lucide-react'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { useCheckIn } from '@/hooks/use-events'
import { useOffline } from '@/hooks/use-offline'
import { Button } from '@/components/button'
import { Input } from '@/components/input'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CheckInMode = 'idle' | 'scanning' | 'manual'

/* ------------------------------------------------------------------ */
/*  Profile Details Form                                               */
/* ------------------------------------------------------------------ */

interface ProfileDetailsProps {
  onComplete: () => void
}

export function ProfileDetails({ onComplete }: ProfileDetailsProps) {
  const rm = useReducedMotion()
  const { data: profileData } = useProfile()
  const updateProfile = useUpdateProfile()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [email, setEmail] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [emergencyRelationship, setEmergencyRelationship] = useState('')

  // Pre-fill from existing profile
  useEffect(() => {
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
  }, [profileData])

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
      onComplete()
    } catch {
      // Stay on details step
    }
  }, [firstName, lastName, age, gender, email, emergencyName, emergencyPhone, emergencyRelationship, updateProfile, onComplete])

  return (
    <motion.div
      key="details"
      initial={rm ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={rm ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={rm ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
      className="pb-4"
    >
      <div className="text-center mb-5">
        <div className="w-12 h-12 rounded-full bg-warning-100 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle size={22} className="text-warning-600" />
        </div>
        <h3 className="font-heading text-lg font-bold text-neutral-900">
          Safety details required
        </h3>
        <p className="text-sm text-neutral-500 mt-1 max-w-xs mx-auto">
          We need a few details before you can check in. Your emergency info is only visible to event leaders.
        </p>
      </div>

      <div className="space-y-4 max-h-[55vh] overflow-y-auto px-0.5 -mx-0.5">
        {/* Personal */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <User size={14} className="text-neutral-500" />
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Your Details</h4>
          </div>
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Input
                label="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                maxLength={50}
                className="[&_input]:bg-surface-3"
              />
              <Input
                label="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                maxLength={50}
                className="[&_input]:bg-surface-3"
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
                className="[&_input]:bg-surface-3"
              />
              <Input
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="e.g. Female"
                maxLength={30}
                className="[&_input]:bg-surface-3"
              />
            </div>
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              type="email"
              maxLength={100}
              className="[&_input]:bg-surface-3"
            />
          </div>
        </div>

        {/* Emergency */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle size={14} className="text-warning-600" />
            <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Emergency Contact *</h4>
          </div>
          <p className="text-[11px] text-neutral-500 mb-2.5">Only visible to event leaders for safety.</p>
          <div className="space-y-2.5">
            <Input
              label="Contact Name *"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="Full name"
              maxLength={100}
              className="[&_input]:bg-surface-3"
            />
            <Input
              label="Contact Phone *"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="0400 000 000"
              type="tel"
              maxLength={20}
              className="[&_input]:bg-surface-3"
            />
            <Input
              label="Relationship"
              value={emergencyRelationship}
              onChange={(e) => setEmergencyRelationship(e.target.value)}
              placeholder="e.g. Parent, Partner"
              maxLength={50}
              className="[&_input]:bg-surface-3"
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
          <p className="text-[11px] text-center text-neutral-500">
            Fill in starred (*) fields to continue
          </p>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Check-in Mode Selector (idle + manual entry)                       */
/* ------------------------------------------------------------------ */

interface CheckInModeViewProps {
  eventTitle: string
  collectiveName?: string
  isPending: boolean
  onStartScan: () => void
  onManualSubmit: (code: string) => void
}

export function CheckInModeView({
  eventTitle,
  collectiveName,
  isPending,
  onStartScan,
  onManualSubmit,
}: CheckInModeViewProps) {
  const rm = useReducedMotion()
  const { isOffline } = useOffline()
  const [mode, setMode] = useState<CheckInMode>('idle')
  const [manualCode, setManualCode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus manual input
  useEffect(() => {
    if (mode === 'manual') requestAnimationFrame(() => inputRef.current?.focus())
  }, [mode])

  const handleManualSubmit = useCallback(() => {
    if (!manualCode.trim()) return
    onManualSubmit(manualCode.trim().toUpperCase())
  }, [manualCode, onManualSubmit])

  /** Reset to idle when parent triggers scan (mode managed externally via onStartScan) */
  const handleStartScan = useCallback(() => {
    setMode('idle')
    onStartScan()
  }, [onStartScan])

  return (
    <motion.div
      key="checkin"
      initial={rm ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={rm ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={rm ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
      className="pb-2"
    >
      <AnimatePresenceInner mode="wait" initial={false}>
        {mode === 'manual' ? (
          <motion.div
            key="manual"
            initial={rm ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={rm ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={rm ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="h-[70vh] flex flex-col"
          >
            <button
              type="button"
              onClick={() => { setMode('idle'); setManualCode('') }}
              className="flex items-center gap-1 text-caption font-semibold text-neutral-500 mb-4 min-h-11 cursor-pointer select-none active:scale-[0.97] transition-[colors,transform] duration-150"
            >
              <ChevronLeft size={16} />
              Back
            </button>
            <div className="flex-1 flex flex-col items-center justify-center space-y-3 w-full px-4">
              <Input
                ref={inputRef as React.Ref<HTMLInputElement>}
                label="Check-in Code"
                placeholder="Enter the 6-character code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                autoComplete="off"
                maxLength={6}
                className="text-center text-lg tracking-[0.3em] font-heading font-bold [&_input]:bg-surface-3"
              />
              <Button
                variant="primary"
                fullWidth
                loading={isPending}
                disabled={manualCode.trim().length < 6}
                onClick={handleManualSubmit}
              >
                Check In
              </Button>
            </div>
          </motion.div>
        ) : (
          /* ---- Idle: main check-in menu ---- */
          <motion.div
            key="idle"
            initial={rm ? undefined : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={rm ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={rm ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="py-2"
          >
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-3">
                <QrCode size={26} className="text-primary-500" />
              </div>
              <h3 className="font-heading text-lg font-bold text-neutral-900">
                Check In
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                {eventTitle}
              </p>
              {collectiveName && (
                <p className="text-caption text-neutral-400 mt-0.5">{collectiveName}</p>
              )}
            </div>

            {isOffline && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-50 text-warning-700 text-sm font-medium mb-4">
                <WifiOff size={16} />
                You're offline. Check-in will be queued and synced later.
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={<Camera size={20} />}
              onClick={handleStartScan}
              className="mb-3"
              loading={isPending}
            >
              Scan QR Code
            </Button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-primary-100" />
              <span className="text-caption text-neutral-400 uppercase tracking-wider">or</span>
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
          </motion.div>
        )}
      </AnimatePresenceInner>
    </motion.div>
  )
}

// Re-export AnimatePresence under a different name to avoid import collision
import { AnimatePresence as AnimatePresenceInner } from 'framer-motion'
