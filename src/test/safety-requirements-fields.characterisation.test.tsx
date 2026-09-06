import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

/* ------------------------------------------------------------------ *
 *  1.F4 + 4.F1 - characterisation of the three safety-capture shells.
 *
 *  dietary-gate.tsx, campout-requirements-modal.tsx and
 *  campout-guest-requirements-modal.tsx each carry their own copy of the
 *  same dietary / medical / emergency-contact form. The copy has already
 *  drifted once with consequences: commit 65646d56 added the emergency
 *  contact to two of the three call paths and campout-type.tsx kept its
 *  old two-field signature, so every camp-out booking posted an empty
 *  emergency contact into a server that hard-requires one.
 *
 *  This file is written BEFORE the extraction and pins what each shell
 *  does today: which fields it shows, their maxLengths, the exact
 *  validation message for each missing field and the ORDER those fire
 *  in, and the exact object each one submits. It is the equivalence
 *  harness the extraction has to satisfy, not a description of it.
 *
 *  Where the extraction deliberately CHANGES something, this file has to
 *  be edited, and the edit is the visible record of that decision.
 *
 *  TWO EDITS WERE MADE, and these are the whole list. The harness caught
 *  both, which is what it is for.
 *
 *  1. The emergency block's LABELS unify on the purchase modal's explicit
 *     wording ("Emergency contact name" / "Emergency contact phone")
 *     rather than the gate's and guest modal's shorter "Their name" /
 *     "Their phone". Explicit wins because each field still says what it
 *     is when a screen reader reads it alone, and because it leaves the
 *     live 65646d56 incident guard in
 *     src/test/components/campout-requirements-modal.test.tsx matching
 *     verbatim: an incident regression guard should not have to be
 *     rewritten to accommodate a refactor.
 *  2. The block's LAYOUT unifies the other way, on the gate's and guest
 *     modal's bordered card with an "Emergency contact" caption, which is
 *     what 2 of the 3 already had and which groups the three inputs as
 *     one contact. Relationship maxLength goes 60 -> 80, a widening.
 * ------------------------------------------------------------------ */

const mockUpdate = vi.fn()
const mockRefreshProfile = vi.fn()
const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

let dietaryGateProfile: Record<string, unknown> | null = null
let eligibility: { ticketed: boolean } | undefined = { ticketed: true }

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: dietaryGateProfile,
    isLoading: false,
    refreshProfile: mockRefreshProfile,
  }),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: eligibility }),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (payload: unknown) => {
        mockUpdate(payload)
        return { eq: () => Promise.resolve({ error: null }) }
      },
    }),
  },
}))

vi.mock('@/components/toast', () => ({
  useToast: () => ({ toast: { success: mockToastSuccess, error: mockToastError } }),
}))

import { CampoutRequirementsModal } from '@/components/campout-requirements-modal'
import { CampoutGuestRequirementsModal } from '@/components/campout-guest-requirements-modal'
import { DietaryGate } from '@/components/dietary-gate'

const authedProps = {
  open: true,
  needDietary: true,
  needMedical: true,
  needEmergency: true,
  needFourWheelDrive: true,
  isCampout: true,
  onClose: vi.fn(),
  onSaved: vi.fn(),
}

const guestProps = {
  open: true,
  submitting: false,
  isCampout: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
}

/** A profile that trips every arm of the DietaryGate predicate. */
const emptySafetyProfile = {
  onboarding_completed: true,
  phone: '0400000000',
  dietary_requirements: null,
  medical_requirements: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  has_four_wheel_drive: null,
}

const maxLen = (el: HTMLElement) => el.getAttribute('maxlength')

beforeEach(() => {
  vi.clearAllMocks()
  dietaryGateProfile = { ...emptySafetyProfile }
  eligibility = { ticketed: true }
  cleanup()
})

/* ================================================================== *
 *  Field set + input constraints, per shell
 * ================================================================== */

describe('field set: what each shell asks for', () => {
  it('the authed purchase modal asks all four when all four are needed', () => {
    render(<CampoutRequirementsModal {...authedProps} />)
    expect(screen.getByLabelText(/dietary requirements/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/medical \/ allergy info/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^emergency contact name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^emergency contact phone$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/relationship \(optional\)/i)).toBeInTheDocument()
    expect(screen.getByText(/four-wheel drive/i)).toBeInTheDocument()
  })

  it('the authed purchase modal asks for nothing it was not told to ask for', () => {
    render(
      <CampoutRequirementsModal
        {...authedProps}
        needMedical={false}
        needEmergency={false}
        needFourWheelDrive={false}
      />,
    )
    expect(screen.getByLabelText(/dietary requirements/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/medical \/ allergy info/i)).toBeNull()
    expect(screen.queryByLabelText(/emergency contact name/i)).toBeNull()
  })

  it('the guest modal always asks for the three it collects, and never for 4WD', () => {
    render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(screen.getByLabelText(/dietary requirements/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/medical \/ allergy info/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^emergency contact name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^emergency contact phone$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/relationship \(optional\)/i)).toBeInTheDocument()
    // Absent BY DESIGN: a guest has no profile row, and their 4WD is collected
    // by the organiser-authored per-event question instead. Not a gap.
    expect(screen.queryByText(/four-wheel drive/i)).toBeNull()
  })

  it('the app-open gate asks for everything the profile is missing', () => {
    render(<DietaryGate />)
    expect(screen.getByLabelText(/dietary requirements/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/medical \/ allergy info/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^emergency contact name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^emergency contact phone$/i)).toBeInTheDocument()
    expect(screen.getByText(/four-wheel drive/i)).toBeInTheDocument()
  })

  it('the app-open gate does not render for a profile with nothing missing', () => {
    dietaryGateProfile = {
      ...emptySafetyProfile,
      dietary_requirements: 'None',
      medical_requirements: 'None',
      emergency_contact_name: 'Sam',
      emergency_contact_phone: '0400000000',
      has_four_wheel_drive: false,
    }
    render(<DietaryGate />)
    expect(screen.queryByLabelText(/dietary requirements/i)).toBeNull()
  })

  it('the app-open gate does not render without a live ticket or registration', () => {
    eligibility = { ticketed: false }
    render(<DietaryGate />)
    expect(screen.queryByLabelText(/dietary requirements/i)).toBeNull()
  })
})

describe('input constraints are identical across the three shells', () => {
  it('dietary and medical are 500-char textareas in every shell', () => {
    const seen: string[] = []
    for (const ui of [
      <CampoutRequirementsModal key="a" {...authedProps} />,
      <CampoutGuestRequirementsModal key="b" {...guestProps} />,
      <DietaryGate key="c" />,
    ]) {
      cleanup()
      render(ui)
      seen.push(
        [
          maxLen(screen.getByLabelText(/dietary requirements/i)),
          maxLen(screen.getByLabelText(/medical \/ allergy info/i)),
        ].join(','),
      )
    }
    expect(seen).toEqual(['500,500', '500,500', '500,500'])
  })

  it('emergency name is 120 and phone is 40 in every shell', () => {
    cleanup(); render(<CampoutRequirementsModal {...authedProps} />)
    expect(maxLen(screen.getByLabelText(/^emergency contact name$/i))).toBe('120')
    expect(maxLen(screen.getByLabelText(/^emergency contact phone$/i))).toBe('40')
    cleanup(); render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(maxLen(screen.getByLabelText(/^emergency contact name$/i))).toBe('120')
    expect(maxLen(screen.getByLabelText(/^emergency contact phone$/i))).toBe('40')
    cleanup(); render(<DietaryGate />)
    expect(maxLen(screen.getByLabelText(/^emergency contact name$/i))).toBe('120')
    expect(maxLen(screen.getByLabelText(/^emergency contact phone$/i))).toBe('40')
  })

  it('the emergency phone is a tel input everywhere, so mobiles raise a keypad', () => {
    cleanup(); render(<CampoutRequirementsModal {...authedProps} />)
    expect(screen.getByLabelText(/^emergency contact phone$/i)).toHaveAttribute('type', 'tel')
    cleanup(); render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(screen.getByLabelText(/^emergency contact phone$/i)).toHaveAttribute('type', 'tel')
    cleanup(); render(<DietaryGate />)
    expect(screen.getByLabelText(/^emergency contact phone$/i)).toHaveAttribute('type', 'tel')
  })

  it('the relationship maxLength is now 80 everywhere (it was 60 on the purchase modal)', () => {
    // The drift this extraction unified. 60 -> 80 is a widening, so no stored
    // value can be truncated by it and no member loses characters they had.
    cleanup(); render(<CampoutRequirementsModal {...authedProps} />)
    expect(maxLen(screen.getByLabelText(/relationship \(optional\)/i))).toBe('80')
    cleanup(); render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(maxLen(screen.getByLabelText(/relationship \(optional\)/i))).toBe('80')
    cleanup(); render(<DietaryGate />)
    expect(maxLen(screen.getByLabelText(/relationship \(optional\)/i))).toBe('80')
  })
})

describe('the None sentinel quick-fills', () => {
  it('dietary and medical each offer one, in every shell', () => {
    for (const ui of [
      <CampoutRequirementsModal key="a" {...authedProps} />,
      <CampoutGuestRequirementsModal key="b" {...guestProps} />,
      <DietaryGate key="c" />,
    ]) {
      cleanup()
      render(ui)
      expect(screen.getByRole('button', { name: /no dietary requirements/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /no medical needs or allergies/i })).toBeInTheDocument()
    }
  })

  it('the emergency contact offers NONE, in every shell', () => {
    // A remote camp-out with nobody to call is not a valid answer, and a
    // quick-fill would make it one.
    for (const ui of [
      <CampoutRequirementsModal key="a" {...authedProps} />,
      <CampoutGuestRequirementsModal key="b" {...guestProps} />,
      <DietaryGate key="c" />,
    ]) {
      cleanup()
      render(ui)
      expect(screen.queryByRole('button', { name: /no emergency/i })).toBeNull()
    }
  })

  it('tapping the dietary quick-fill fills the sentinel, not a blank', () => {
    render(<CampoutGuestRequirementsModal {...guestProps} />)
    fireEvent.click(screen.getByRole('button', { name: /no dietary requirements/i }))
    expect(screen.getByLabelText(/dietary requirements/i)).toHaveValue('None')
  })
})

/* ================================================================== *
 *  Validation: the exact message, and the ORDER they fire in
 * ================================================================== */

const MESSAGES = {
  dietary: 'Tell us your dietary requirements, or tap "None"',
  medical: 'Tell us your medical / allergy info, or tap "None"',
  emName: 'Give us an emergency contact name',
  emPhone: 'Give us a phone number for your emergency contact',
  fourWheelDrive: 'Let us know whether you have a four-wheel drive',
}

describe('validation messages are verbatim identical across shells', () => {
  it('the authed purchase modal reports each missing field in order', async () => {
    render(<CampoutRequirementsModal {...authedProps} />)
    const save = screen.getByRole('button', { name: /save and continue to payment/i })

    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.dietary)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /no dietary requirements/i }))
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.medical)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /no medical needs or allergies/i }))
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.emName)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.emPhone)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^emergency contact phone$/i), { target: { value: '0400000000' } })
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.fourWheelDrive)).toBeInTheDocument())

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('the guest modal reports each missing field in the same order, same words', async () => {
    const onSubmit = vi.fn()
    render(<CampoutGuestRequirementsModal {...guestProps} onSubmit={onSubmit} />)
    const go = screen.getByRole('button', { name: /continue to payment/i })

    fireEvent.click(go)
    await waitFor(() => expect(screen.getByText(MESSAGES.dietary)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /no dietary requirements/i }))
    fireEvent.click(go)
    await waitFor(() => expect(screen.getByText(MESSAGES.medical)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /no medical needs or allergies/i }))
    fireEvent.click(go)
    await waitFor(() => expect(screen.getByText(MESSAGES.emName)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.click(go)
    await waitFor(() => expect(screen.getByText(MESSAGES.emPhone)).toBeInTheDocument())

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('the app-open gate reports each missing field in the same order, same words', async () => {
    render(<DietaryGate />)
    const save = screen.getByRole('button', { name: /save and continue/i })

    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.dietary)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /no dietary requirements/i }))
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.medical)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /no medical needs or allergies/i }))
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.emName)).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.click(save)
    await waitFor(() => expect(screen.getByText(MESSAGES.emPhone)).toBeInTheDocument())

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('whitespace is not an answer in any shell', async () => {
    render(<CampoutGuestRequirementsModal {...guestProps} />)
    fireEvent.change(screen.getByLabelText(/dietary requirements/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() => expect(screen.getByText(MESSAGES.dietary)).toBeInTheDocument())
  })

  it('typing clears the visible error rather than leaving a stale one', async () => {
    render(<CampoutGuestRequirementsModal {...guestProps} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() => expect(screen.getByText(MESSAGES.dietary)).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText(/dietary requirements/i), { target: { value: 'Vegan' } })
    expect(screen.queryByText(MESSAGES.dietary)).toBeNull()
  })
})

/* ================================================================== *
 *  What each shell SUBMITS. This is the incident surface.
 * ================================================================== */

function fillEverything(nameLabel: RegExp, phoneLabel: RegExp) {
  fireEvent.change(screen.getByLabelText(/dietary requirements/i), { target: { value: ' Vegan ' } })
  fireEvent.change(screen.getByLabelText(/medical \/ allergy info/i), { target: { value: ' Asthma ' } })
  fireEvent.change(screen.getByLabelText(nameLabel), { target: { value: ' Sam Rivers ' } })
  fireEvent.change(screen.getByLabelText(phoneLabel), { target: { value: ' 0400 000 000 ' } })
  fireEvent.change(screen.getByLabelText(/relationship \(optional\)/i), { target: { value: ' Partner ' } })
}

describe('submitted payloads', () => {
  it('the authed purchase modal writes trimmed profile columns and calls onSaved', async () => {
    const onSaved = vi.fn()
    render(<CampoutRequirementsModal {...authedProps} needFourWheelDrive={false} onSaved={onSaved} />)
    fillEverything(/^emergency contact name$/i, /^emergency contact phone$/i)
    fireEvent.click(screen.getByRole('button', { name: /save and continue to payment/i }))
    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    expect(mockUpdate).toHaveBeenCalledWith({
      dietary_requirements: 'Vegan',
      medical_requirements: 'Asthma',
      emergency_contact_name: 'Sam Rivers',
      emergency_contact_phone: '0400 000 000',
      emergency_contact_relationship: 'Partner',
    })
  })

  it('the authed purchase modal omits a blank relationship rather than blanking a stored one', async () => {
    render(<CampoutRequirementsModal {...authedProps} needFourWheelDrive={false} />)
    fireEvent.click(screen.getByRole('button', { name: /no dietary requirements/i }))
    fireEvent.click(screen.getByRole('button', { name: /no medical needs or allergies/i }))
    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^emergency contact phone$/i), { target: { value: '0400' } })
    fireEvent.click(screen.getByRole('button', { name: /save and continue to payment/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('emergency_contact_relationship')
  })

  it('the authed purchase modal writes ONLY the columns it asked about', async () => {
    render(
      <CampoutRequirementsModal
        {...authedProps}
        needDietary={false}
        needMedical={false}
        needFourWheelDrive={false}
      />,
    )
    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^emergency contact phone$/i), { target: { value: '0400' } })
    fireEvent.click(screen.getByRole('button', { name: /save and continue to payment/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][0]).toEqual({
      emergency_contact_name: 'Sam',
      emergency_contact_phone: '0400',
    })
  })

  it('a four-wheel-drive NO is stored as false, not dropped as falsy', async () => {
    render(
      <CampoutRequirementsModal
        {...authedProps}
        needDietary={false}
        needMedical={false}
        needEmergency={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /^no$/i }))
    fireEvent.click(screen.getByRole('button', { name: /save and continue to payment/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][0]).toEqual({ has_four_wheel_drive: false })
  })

  it('the guest modal hands back trimmed answers and writes NOTHING to the DB', async () => {
    const onSubmit = vi.fn()
    render(<CampoutGuestRequirementsModal {...guestProps} onSubmit={onSubmit} />)
    fillEverything(/^emergency contact name$/i, /^emergency contact phone$/i)
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit).toHaveBeenCalledWith({
      dietary: 'Vegan',
      medical: 'Asthma',
      emergencyName: 'Sam Rivers',
      emergencyPhone: '0400 000 000',
      emergencyRelationship: 'Partner',
    })
    // The guest has no profile row to write to; guest-ticket-checkout persists.
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('the guest modal sends an empty string, never undefined, for a blank relationship', async () => {
    const onSubmit = vi.fn()
    render(<CampoutGuestRequirementsModal {...guestProps} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByRole('button', { name: /no dietary requirements/i }))
    fireEvent.click(screen.getByRole('button', { name: /no medical needs or allergies/i }))
    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^emergency contact phone$/i), { target: { value: '0400' } })
    fireEvent.click(screen.getByRole('button', { name: /continue to payment/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('emergencyRelationship', '')
  })

  it('the app-open gate writes trimmed profile columns and refreshes the profile', async () => {
    render(<DietaryGate />)
    fillEverything(/^emergency contact name$/i, /^emergency contact phone$/i)
    fireEvent.click(screen.getByRole('button', { name: /^yes$/i }))
    fireEvent.click(screen.getByRole('button', { name: /save and continue/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled())
    expect(mockUpdate.mock.calls[0][0]).toEqual({
      dietary_requirements: 'Vegan',
      medical_requirements: 'Asthma',
      emergency_contact_name: 'Sam Rivers',
      emergency_contact_phone: '0400 000 000',
      emergency_contact_relationship: 'Partner',
      has_four_wheel_drive: true,
    })
    expect(mockRefreshProfile).toHaveBeenCalled()
  })
})

/* ================================================================== *
 *  Shell-level behaviour that must NOT be flattened by the extraction
 * ================================================================== */

describe('the three shells stay different where they are meant to', () => {
  it('the app-open gate is blocking and offers no Cancel', () => {
    render(<DietaryGate />)
    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull()
  })

  it('both purchase modals are cancellable, because no ticket exists yet', () => {
    cleanup(); render(<CampoutRequirementsModal {...authedProps} />)
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
    cleanup(); render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument()
  })

  it('the guest modal cannot be cancelled mid-submit', () => {
    const onClose = vi.fn()
    render(<CampoutGuestRequirementsModal {...guestProps} submitting onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('each shell keeps its own call to action', () => {
    cleanup(); render(<CampoutRequirementsModal {...authedProps} />)
    expect(screen.getByRole('button', { name: /save and continue to payment/i })).toBeInTheDocument()
    cleanup(); render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(screen.getByRole('button', { name: /^continue to payment$/i })).toBeInTheDocument()
    cleanup(); render(<DietaryGate />)
    expect(screen.getByRole('button', { name: /^save and continue$/i })).toBeInTheDocument()
  })

  it('the purchase modals name the camp-out framing, and say it once to both eyes and screen readers', () => {
    // Two matches is CORRECT and is itself the assertion: Modal renders the
    // ariaLabel as an sr-only title alongside the visible h2, and both shells
    // derive the two from one expression, so the announcement and the heading
    // cannot disagree.
    cleanup(); render(<CampoutRequirementsModal {...authedProps} />)
    expect(screen.getAllByText(/before you book this camp-out/i)).toHaveLength(2)
    cleanup(); render(<CampoutRequirementsModal {...authedProps} isCampout={false} />)
    expect(screen.getAllByText(/before you book your ticket/i)).toHaveLength(2)
    cleanup(); render(<CampoutGuestRequirementsModal {...guestProps} />)
    expect(screen.getAllByText(/before you book this camp-out/i)).toHaveLength(2)
  })

  it('the authed purchase modal names only the fields it is actually asking for', () => {
    render(
      <CampoutRequirementsModal
        {...authedProps}
        needMedical={false}
        needEmergency={false}
        needFourWheelDrive={false}
      />,
    )
    const blurb = screen.getByText(/leaders need your/i)
    expect(blurb.textContent).toContain('dietary info')
    expect(blurb.textContent).not.toContain('emergency contact')
  })

  it('a failed save on the purchase modal toasts and does not continue to checkout', async () => {
    const onSaved = vi.fn()
    const { supabase } = await import('@/lib/supabase')
    const spy = vi.spyOn(supabase, 'from').mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: new Error('nope') }) }),
    } as unknown as ReturnType<typeof supabase.from>)
    render(
      <CampoutRequirementsModal
        {...authedProps}
        needDietary={false}
        needMedical={false}
        needFourWheelDrive={false}
        onSaved={onSaved}
      />,
    )
    fireEvent.change(screen.getByLabelText(/^emergency contact name$/i), { target: { value: 'Sam' } })
    fireEvent.change(screen.getByLabelText(/^emergency contact phone$/i), { target: { value: '0400' } })
    fireEvent.click(screen.getByRole('button', { name: /save and continue to payment/i }))
    await waitFor(() => expect(mockToastError).toHaveBeenCalled())
    expect(onSaved).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
