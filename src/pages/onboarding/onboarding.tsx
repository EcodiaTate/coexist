import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/cn'

import { StepProfilePhoto } from './steps/step-profile-photo'
import { StepNameHandle } from './steps/step-name-handle'
import { StepLocation } from './steps/step-location'
import { StepInterests } from './steps/step-interests'
import { StepCollective } from './steps/step-collective'
import { StepFirstEvent } from './steps/step-first-event'
import { StepCelebration } from './steps/step-celebration'

const TOTAL_STEPS = 6

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, refreshProfile, markOnboardingComplete } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showCelebration, setShowCelebration] = useState(false)

  // Shared onboarding data
  const [data, setData] = useState({
    avatarUrl: null as string | null,
    displayName: '',
    instagramHandle: '',
    location: '',
    locationPoint: null as { lat: number; lng: number } | null,
    interests: [] as string[],
    collectiveId: null as string | null,
  })

  const updateData = useCallback(
    (patch: Partial<typeof data>) => setData((prev) => ({ ...prev, ...patch })),
    [],
  )

  const completeOnboarding = useCallback(async () => {
    if (!user) return

    // Build profile payload - upsert guarantees the row exists even if the
    // auth trigger hasn't fired yet, preventing the FK violation on
    // collective_members when we insert below.
    const profilePayload: Record<string, unknown> = {
      id: user.id,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    }

    if (data.displayName) profilePayload.display_name = data.displayName
    if (data.instagramHandle) profilePayload.instagram_handle = data.instagramHandle
    if (data.location) profilePayload.location = data.location
    if (data.interests.length > 0) profilePayload.interests = data.interests
    if (data.avatarUrl) profilePayload.avatar_url = data.avatarUrl

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload as any, { onConflict: 'id' })

    if (profileError) {
      console.error('[onboarding] Failed to save profile:', profileError)
      return
    }

    // Join collective if selected - profile row is now guaranteed to exist
    if (data.collectiveId) {
      const { error: memberError } = await supabase
        .from('collective_members')
        .insert({
          collective_id: data.collectiveId,
          user_id: user.id,
          role: 'member',
          status: 'active',
        })

      if (memberError) {
        console.error('[onboarding] Failed to join collective:', memberError)
      }
    }

    markOnboardingComplete()
    await refreshProfile()
    setShowCelebration(true)
  }, [user, data, markOnboardingComplete, refreshProfile])

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1)
      setStep((s) => s + 1)
    } else {
      completeOnboarding()
    }
  }, [step, completeOnboarding])

  const goBack = useCallback(() => {
    if (step > 0) {
      setDirection(-1)
      setStep((s) => s - 1)
    }
  }, [step])

  if (showCelebration) {
    return <StepCelebration onContinue={() => navigate('/', { replace: true })} />
  }

  const steps = [
    <StepProfilePhoto
      key="photo"
      avatarUrl={data.avatarUrl}
      onUpload={(url) => updateData({ avatarUrl: url })}
      onNext={goNext}
      onSkip={goNext}
    />,
    <StepNameHandle
      key="name"
      displayName={data.displayName}
      instagramHandle={data.instagramHandle}
      onChange={(name, handle) => updateData({ displayName: name, instagramHandle: handle })}
      onNext={goNext}
      onSkip={goNext}
    />,
    <StepLocation
      key="location"
      location={data.location}
      onChange={(loc, point) => updateData({ location: loc, locationPoint: point })}
      onNext={goNext}
      onSkip={goNext}
    />,
    <StepInterests
      key="interests"
      selected={data.interests}
      onChange={(interests) => updateData({ interests })}
      onNext={goNext}
      onSkip={goNext}
    />,
    <StepCollective
      key="collective"
      selectedId={data.collectiveId}
      onSelect={(id) => updateData({ collectiveId: id })}
      onNext={goNext}
      onSkip={goNext}
    />,
    <StepFirstEvent
      key="event"
      collectiveId={data.collectiveId}
      onNext={goNext}
      onSkip={goNext}
    />,
  ]

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-6 pb-4 px-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <motion.div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-colors duration-300',
              i === step ? 'bg-primary-500 w-6' : i < step ? 'bg-primary-300 w-1.5' : 'bg-white w-1.5',
            )}
            layout={!shouldReduceMotion}
          />
        ))}
      </div>

      {/* Back button (visible from step 1 onward) */}
      {step > 0 && (
        <button
          type="button"
          onClick={goBack}
          className="self-start ml-4 mb-2 text-sm text-primary-400 hover:text-primary-800 cursor-pointer"
        >
          &larr; Back
        </button>
      )}

      {/* Step content with animated transitions */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={shouldReduceMotion ? undefined : slideVariants}
            initial={shouldReduceMotion ? false : 'enter'}
            animate="center"
            exit={shouldReduceMotion ? undefined : 'exit'}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-0 flex flex-col"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
