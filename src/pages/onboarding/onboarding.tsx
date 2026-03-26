import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database.types'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/cn'
import { Button } from '@/components/button'

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
  const { user, collectiveRoles, isStaff, refreshProfile, markOnboardingComplete } = useAuth()
  const shouldReduceMotion = useReducedMotion()

  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [showCelebration, setShowCelebration] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Track whether the user who just completed onboarding is a leader,
  // so the celebration screen routes them to /leader-welcome.
  const isLeaderAfterComplete = useRef(false)

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

    setIsSubmitting(true)
    setSubmitError(null)

    try {
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
        .upsert(profilePayload as Tables<'profiles'>, { onConflict: 'id' })

      if (profileError) {
        console.error('[onboarding] Failed to save profile:', profileError)
        setSubmitError('Something went wrong saving your profile. Tap retry.')
        return
      }

      // Join collective if selected - profile row is now guaranteed to exist.
      // Use upsert with onConflict to handle re-onboarding (user already a member).
      if (data.collectiveId) {
        const { error: memberError } = await supabase
          .from('collective_members')
          .upsert(
            {
              collective_id: data.collectiveId,
              user_id: user.id,
              role: 'member',
              status: 'active',
            },
            { onConflict: 'collective_id,user_id' },
          )

        if (memberError) {
          console.error('[onboarding] Failed to join collective:', memberError)
          // Non-fatal  don't block onboarding completion
        }
      }

      markOnboardingComplete()
      await refreshProfile()

      // Check if user holds a leader-tier collective role
      const hasLeaderRole = collectiveRoles.some(
        (m) => m.role === 'leader' || m.role === 'co_leader' || m.role === 'assist_leader',
      )
      isLeaderAfterComplete.current = hasLeaderRole || isStaff

      setShowCelebration(true)
    } catch (err) {
      console.error('[onboarding] Unexpected error:', err)
      setSubmitError('Something went wrong. Tap retry.')
    } finally {
      setIsSubmitting(false)
    }
  }, [user, data, collectiveRoles, isStaff, markOnboardingComplete, refreshProfile])

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
    return (
      <StepCelebration
        onContinue={() =>
          navigate(isLeaderAfterComplete.current ? '/leader-welcome' : '/', { replace: true })
        }
      />
    )
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
          className="self-start ml-4 mb-2 text-sm text-primary-400 hover:text-primary-800 active:scale-[0.97] transition-[colors,transform] duration-150 cursor-pointer"
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

      {/* Error banner + retry */}
      {submitError && (
        <div className="px-6 pb-4">
          <p className="text-sm text-red-600 text-center mb-2">{submitError}</p>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            onClick={completeOnboarding}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  )
}
