import { useState } from 'react'
import { Modal } from '@/components/modal'
import { DateInput } from '@/components/date-input'
import { Button } from '@/components/button'
import { useAuth } from '@/hooks/use-auth'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { calculateAge } from '@/lib/date-format'

/**
 * One-time gate that asks every existing user for their date of birth the
 * next time they open the app. We switched onboarding from a static age
 * number to DOB (age derives from it, so it never goes stale), but users
 * who already completed their profile have `age` set and `date_of_birth`
 * null - the profile-completion gate will never re-prompt them. This fills
 * that gap: it fires for any authenticated user whose date_of_birth is null
 * and writes both date_of_birth and the derived age.
 *
 * BLOCKING PRIMITIVE (2026-09-06, consolidation 4.F4): this used to render a
 * plain `BottomSheet` with a no-op `onClose` and a "mandatory - no dismiss"
 * comment. That defeated backdrop-tap and Escape (both only call the no-op)
 * but NOT drag-to-dismiss: MobileSheet's own touch handler imperatively sets
 * `transform: translateY(100%)` on the DOM node (bottom-sheet.tsx:203),
 * independent of React state, and nothing ever undid it because `open` never
 * flipped. A member could swipe the "mandatory" gate off-screen and keep a
 * null date_of_birth for the whole session. It now uses `Modal` with the real
 * `dismissible={false}`, exactly as phone-gate.tsx and dietary-gate.tsx do:
 * vaul honours it by disabling backdrop-tap, Escape AND drag together.
 */
export function BirthdayPromptGate() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [error, setError] = useState<string | null>(null)

  const needsBirthday = !!user && !isLoading && !!profile && !profile.date_of_birth

  if (!needsBirthday) return null

  const handleSave = async () => {
    const age = calculateAge(dateOfBirth)
    if (age === null) {
      setError('Please enter a valid date')
      return
    }
    if (age < 5 || age > 120) {
      setError('Please check the date is correct')
      return
    }
    setError(null)
    await updateProfile.mutateAsync({
      date_of_birth: dateOfBirth || null,
      age,
    })
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    // Blocking gate: `dismissible={false}` = no backdrop tap, no Escape, no drag.
    <Modal
      open
      onClose={() => {}}
      dismissible={false}
      keyboardAware
      ariaLabel="Add your date of birth"
    >
      <div className="px-6 pt-7 pb-6 space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-lg font-heading font-semibold text-neutral-900">
            One quick thing
          </h2>
          <p className="text-sm text-neutral-600">
            We now use your birthday instead of your age, so it stays right
            without you having to update it every year.
          </p>
        </div>
        <DateInput
          label="Date of Birth"
          value={dateOfBirth}
          onChange={(v) => { setDateOfBirth(v); setError(null) }}
          max={today}
          error={error ?? undefined}
        />
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={updateProfile.isPending}
          disabled={!dateOfBirth}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </Modal>
  )
}
