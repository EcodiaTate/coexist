import { useState, forwardRef } from 'react'
import { LocateFixed, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/input'
import { PlaceAutocomplete, type PlaceResult } from '@/components/place-autocomplete'

/* ------------------------------------------------------------------ */
/*  The profile fields a member can be asked for twice.                */
/*                                                                     */
/*  Display name, mobile number and location are each captured in      */
/*  onboarding AND edited in Settings, and each was implemented        */
/*  independently in the two places. The onboarding copies carry       */
/*  hardening the Settings copies never got, which is the whole shape  */
/*  of dimension 6 F2 and F3: a fix made once did not propagate.       */
/*                                                                     */
/*    - the mobile number is validated with isValidPhone in onboarding */
/*      and in phone-gate, and was NOT validated in edit-profile, so a */
/*      member could save "asdf" into the field event leaders ring on  */
/*      event day.                                                     */
/*    - the display name reads its live DOM value on submit to survive */
/*      an open iOS IME composition in onboarding, and did not in      */
/*      edit-profile.                                                  */
/*    - location offers "use my current location" in onboarding and    */
/*      did not in edit-profile.                                       */
/*                                                                     */
/*  These components are the one implementation of each. They are      */
/*  presentational: the surfaces keep their own layout, motion and     */
/*  submit handling, and the IME-safe read is the separate             */
/*  useLiveFieldValue hook so a caller can own its own submit.         */
/* ------------------------------------------------------------------ */

interface DisplayNameFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  className?: string
  enterKeyHint?: 'done' | 'next'
}

/**
 * Never disable a submit on this field's React value. It can lag the DOM by a
 * whole IME composition; read `useLiveFieldValue().read()` on submit instead.
 */
export const DisplayNameField = forwardRef<HTMLInputElement, DisplayNameFieldProps>(
  function DisplayNameField({ value, onChange, error, className, enterKeyHint }, ref) {
    return (
      <Input
        ref={ref}
        label="Display name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="name"
        autoCapitalize="words"
        enterKeyHint={enterKeyHint}
        placeholder="How you appear to others"
        // 50 is what edit-profile has always enforced, and onboarding enforced
        // nothing, so a member could be given a 70-character name at signup and
        // then meet a field that refused to let them extend it. maxlength never
        // truncates an already-stored value, only what can be typed, so
        // matching the two costs nobody a character they already have.
        maxLength={50}
        error={error}
        className={className}
      />
    )
  },
)

interface PhoneFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  required?: boolean
  className?: string
  enterKeyHint?: 'done' | 'next'
}

/**
 * Validate with `isValidPhone` from @/lib/validation on submit. The rule lives
 * there rather than here so the phone-gate, which owns its own layout, runs
 * exactly the same one.
 */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  function PhoneField({ value, onChange, error, required, className, enterKeyHint }, ref) {
    return (
      <Input
        ref={ref}
        label="Mobile number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0400 000 000 or +44 7911 123456"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint={enterKeyHint}
        maxLength={20}
        required={required}
        error={error}
        helperText="Any country's number works (include the country code, like +44, if outside Australia). Event leaders reach you on the day."
        className={className}
      />
    )
  },
)

interface LocationFieldProps {
  label?: string
  value: string
  onChange: (value: string, place: PlaceResult | null) => void
  /**
   * Resolve the device's location on an explicit tap. Returns coordinates, or
   * null if the user declined or it failed.
   */
  onUseCurrentLocation?: () => Promise<{ lat: number; lng: number } | null>
  /**
   * Turn coordinates into a place name to fill the field with. Optional: a
   * caller that only wants the coordinates (onboarding wants them for
   * collective proximity ranking) can leave it out, and the field then behaves
   * exactly as it did before, capturing coordinates and leaving the text alone.
   */
  resolvePlaceName?: (point: { lat: number; lng: number }) => Promise<string | null>
  locating?: boolean
  placeholder?: string
  className?: string
}

export function LocationField({
  label = 'Location',
  value,
  onChange,
  onUseCurrentLocation,
  resolvePlaceName,
  locating,
  placeholder = 'e.g. Byron Bay, NSW',
  className,
}: LocationFieldProps) {
  const [usedCurrent, setUsedCurrent] = useState(false)
  const [resolving, setResolving] = useState(false)

  function handleChange(next: string, place: PlaceResult | null) {
    setUsedCurrent(false)
    onChange(next, place)
  }

  async function handleUseCurrentLocation() {
    if (!onUseCurrentLocation) return
    const point = await onUseCurrentLocation()
    setUsedCurrent(!!point)
    if (!point || !resolvePlaceName) return
    // Fill the text too, so tapping this is a complete answer. Without it the
    // tap captures coordinates and leaves an empty field, which on a step whose
    // Continue is disabled until the field has text is a button that appears to
    // do nothing. A failed lookup keeps the coordinates and leaves the text
    // exactly as the member left it, which is the old behaviour unchanged.
    setResolving(true)
    try {
      const name = await resolvePlaceName(point)
      if (name) onChange(name, null)
    } finally {
      setResolving(false)
    }
  }

  const busy = !!locating || resolving

  return (
    <div className={className}>
      <PlaceAutocomplete
        label={label}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
      />
      {onUseCurrentLocation && (
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={busy}
          className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 active:scale-[0.98] transition-[colors,transform] duration-150 disabled:opacity-60 disabled:cursor-default"
        >
          {busy ? (
            <><Loader2 size={16} className="animate-spin" /> Finding your location...</>
          ) : usedCurrent ? (
            <><Check size={16} /> Using your current location</>
          ) : (
            <><LocateFixed size={16} /> Use my current location</>
          )}
        </button>
      )}
    </div>
  )
}
