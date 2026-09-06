import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { PhoneField, DisplayNameField, LocationField } from '@/components/profile-fields'
import { isValidPhone } from '@/lib/validation'

/* ------------------------------------------------------------------ *
 *  6.F2 + 6.F3 - the same field, asked twice, hardened once.
 *
 *  Display name, mobile number and location are each captured in
 *  onboarding AND edited in Settings, and each was written twice. The
 *  onboarding copies carry hardening the Settings copies never got:
 *  isValidPhone on the number (so Settings could save "asdf" over a
 *  working number and quietly make a member unreachable on event day),
 *  a live-DOM read on the name (so an open iOS IME composition could
 *  not strand it), and a "use my current location" affordance.
 *
 *  These tests hold the two halves that matter: the SHARED components
 *  behave, and every surface actually ROUTES through them, because a
 *  shared component nobody renders fixes nothing.
 * ------------------------------------------------------------------ */

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

const EDIT_PROFILE = 'src/pages/profile/edit-profile.tsx'
const STEP_PHONE = 'src/pages/onboarding/steps/step-phone.tsx'
const STEP_NAME = 'src/pages/onboarding/steps/step-name-handle.tsx'
const STEP_LOCATION = 'src/pages/onboarding/steps/step-location.tsx'

afterEach(() => cleanup())

describe('every phone-entry surface runs the one validation rule', () => {
  // The gap 6.F2 names, stated as the assertion. edit-profile had ZERO hits
  // for isValidPhone while the identical field was strictly validated in
  // onboarding and in the phone-gate.
  const PHONE_SURFACES = [EDIT_PROFILE, STEP_PHONE, 'src/components/phone-gate.tsx']

  it.each(PHONE_SURFACES)('%s validates with isValidPhone', (file) => {
    // Not just present: actually CALLED. `isValidPhone(` cannot be satisfied by
    // a longer identifier the way a bare name can.
    expect(read(file)).toMatch(/isValidPhone\(/)
  })

  it.each([EDIT_PROFILE, STEP_PHONE])('%s renders the shared PhoneField', (file) => {
    // Word-boundary, not toContain. A mutation proved the bare substring
    // vacuous: aliasing the import and rendering `<PhoneFieldXX` still
    // contains `<PhoneField`, so the assertion passed on a surface that had
    // stopped using the shared component. A superstring satisfies a substring.
    expect(read(file)).toMatch(/<PhoneField[\s/>]/)
  })

  it('a non-empty but junk number is rejected by the rule the surfaces call', () => {
    // Pins the rule itself so the surface assertions above mean something:
    // "asdf" is exactly the input edit-profile used to accept.
    expect(isValidPhone('asdf')).toBe(false)
    expect(isValidPhone('   ')).toBe(false)
    expect(isValidPhone('0400 000 000')).toBe(true)
    expect(isValidPhone('+44 7911 123456')).toBe(true)
  })

  it('edit-profile no longer passes on a mere non-empty check', () => {
    const body = read(EDIT_PROFILE)
    // The old guard was `if (!phone.trim())` and nothing else. A surface that
    // reverts to it stops calling the shared rule, which the assertion above
    // catches; this one catches the narrower regression of the rule being
    // imported and then not reached on the save path.
    const save = body.slice(body.indexOf('const handleSave'), body.indexOf('const handleSave') + 1600)
    expect(save).toContain('isValidPhone')
  })
})

describe('every name-entry surface survives an open IME composition', () => {
  it.each([EDIT_PROFILE, STEP_NAME])('%s reads the live field value on submit', (file) => {
    expect(read(file)).toMatch(/useLiveFieldValue\(/)
  })

  it.each([EDIT_PROFILE, STEP_NAME])('%s renders the shared DisplayNameField', (file) => {
    expect(read(file)).toMatch(/<DisplayNameField[\s/>]/)
  })

  it('the live read returns what is in the DOM, not the stale React value', () => {
    // The composition case in miniature: the input holds a name the parent has
    // not heard about yet. Reading `value` gives '', reading the DOM gives the
    // name. This is what made the Continue tap look eaten.
    function Harness() {
      const [ref, readLive] = useLiveFieldValueForTest('')
      return (
        <div>
          <input ref={ref} aria-label="name" defaultValue="" />
          <button onClick={() => { const v = readLive(); screenValue.current = v }}>read</button>
        </div>
      )
    }
    const screenValue = { current: '' }
    render(<Harness />)
    const input = screen.getByLabelText('name') as HTMLInputElement
    // Set the DOM value WITHOUT firing React's onChange, which is what an open
    // composition amounts to from the parent's point of view.
    input.value = '  Sam  '
    fireEvent.click(screen.getByRole('button', { name: 'read' }))
    expect(screenValue.current).toBe('Sam')
  })
})

describe('every location-entry surface offers the same affordance', () => {
  it.each([EDIT_PROFILE, STEP_LOCATION])('%s renders the shared LocationField', (file) => {
    expect(read(file)).toMatch(/<LocationField[\s/>]/)
  })

  it.each([EDIT_PROFILE, 'src/pages/onboarding/onboarding.tsx'])(
    '%s can turn the coordinates into a place name',
    (file) => {
      expect(read(file)).toMatch(/reverseGeocodeLocality\(/)
    },
  )
})

describe('the shared PhoneField', () => {
  it('shows an inline error beside the field, not only a toast', () => {
    render(<PhoneField value="asdf" onChange={() => {}} error="Please enter a valid mobile number" />)
    expect(screen.getByText(/please enter a valid mobile number/i)).toBeInTheDocument()
  })

  it('raises a phone keypad and caps at 20 characters', () => {
    render(<PhoneField value="" onChange={() => {}} />)
    const input = screen.getByLabelText(/mobile number/i)
    expect(input).toHaveAttribute('type', 'tel')
    expect(input).toHaveAttribute('inputmode', 'tel')
    expect(input).toHaveAttribute('maxlength', '20')
  })
})

describe('the shared LocationField', () => {
  it('fills the field from the resolved place name, so the tap is a whole answer', async () => {
    const onChange = vi.fn()
    render(
      <LocationField
        value=""
        onChange={onChange}
        onUseCurrentLocation={async () => ({ lat: -28.6, lng: 153.6 })}
        resolvePlaceName={async () => 'Byron Bay, New South Wales'}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('Byron Bay, New South Wales', null))
  })

  it('keeps the coordinates and leaves the text alone when the lookup fails', async () => {
    // The old behaviour exactly. A failed lookup must not clear what the member
    // typed, and must not read as an error: the coordinates are still useful.
    const onChange = vi.fn()
    const onUse = vi.fn(async () => ({ lat: -28.6, lng: 153.6 }))
    render(
      <LocationField
        value="Mullumbimby"
        onChange={onChange}
        onUseCurrentLocation={onUse}
        resolvePlaceName={async () => null}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }))
    await waitFor(() => expect(onUse).toHaveBeenCalled())
    expect(onChange).not.toHaveBeenCalled()
    expect(await screen.findByText(/using your current location/i)).toBeInTheDocument()
  })

  it('does not fill the text when no resolver is supplied', async () => {
    const onChange = vi.fn()
    render(
      <LocationField
        value=""
        onChange={onChange}
        onUseCurrentLocation={async () => ({ lat: 1, lng: 2 })}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /use my current location/i }))
    await waitFor(() => expect(screen.getByText(/using your current location/i)).toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('offers no affordance at all when the surface cannot locate', () => {
    render(<LocationField value="" onChange={() => {}} />)
    expect(screen.queryByRole('button', { name: /use my current location/i })).toBeNull()
  })
})

describe('the shared DisplayNameField', () => {
  it('caps at the length the edit page has always enforced', () => {
    render(<DisplayNameField value="" onChange={() => {}} />)
    expect(screen.getByLabelText(/display name/i)).toHaveAttribute('maxlength', '50')
  })
})

// Imported at the bottom so the harness above reads in order.
import { useLiveFieldValue as useLiveFieldValueForTest } from '@/hooks/use-live-field-value'
