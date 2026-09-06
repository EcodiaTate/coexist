import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BirthdayPromptGate } from '@/components/birthday-prompt-gate'
import { BottomSheet } from '@/components/bottom-sheet'

/* ------------------------------------------------------------------ *
 *  4.F4 - the "mandatory" birthday gate had a live escape hatch.
 *
 *  It rendered a plain `BottomSheet` with a no-op `onClose` and a
 *  "mandatory - no dismiss" comment. That stopped backdrop-tap and
 *  Escape (both only call the no-op) and stopped nothing else: the
 *  sheet's own touch handler imperatively sets
 *  `transform: translateY(100%)` on the DOM node (bottom-sheet.tsx:203)
 *  outside React, then fires `setTimeout(onClose, SHEET_ANIM_MS)`.
 *  With `onClose` a no-op, `open` never flipped, so nothing ever undid
 *  the transform: swipe down and the gate is gone for the session with
 *  `date_of_birth` still null.
 *
 *  The fix is the primitive, not a patch: `Modal dismissible={false}`,
 *  which vaul honours by killing backdrop-tap, Escape AND drag at once,
 *  matching phone-gate.tsx and dietary-gate.tsx.
 *
 *  jsdom cannot run a real touch-drag, so these tests do not pretend to.
 *  They pin the two things that DO decide the outcome: the gate is
 *  rendered by `Modal` (whose mobile branch passes `dismissible` to
 *  vaul, closing the drag vector) and it is rendered NON-dismissibly.
 *  A revert to `<BottomSheet open onClose={noop}>` fails both.
 * ------------------------------------------------------------------ */

const mockMutateAsync = vi.fn().mockResolvedValue(undefined)
type GateProfile = { date_of_birth: string | null; onboarding_completed?: boolean; phone?: string | null }
// A profile at THIS gate's turn in the blocking order: onboarded, phone
// already on file (PhoneGate goes first), birthday still missing.
const AT_BIRTHDAY_TURN: GateProfile = { onboarding_completed: true, phone: '0400 000 000', date_of_birth: null }
let profileValue: GateProfile | null = { ...AT_BIRTHDAY_TURN }
let isLoadingValue = false
let userValue: { id: string } | null = { id: 'user-1' }

vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ user: userValue }),
}))

vi.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({ data: profileValue, isLoading: isLoadingValue }),
  useUpdateProfile: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}))

const MODAL_DESKTOP = '[data-eos-id="src/components/modal.tsx#desktop"]'
const MODAL_MOBILE = '[data-eos-id="src/components/modal.tsx#mobile"]'

/** Force the Modal's `useIsDesktop` breakpoint one way or the other. */
function setViewport(desktop: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('min-width: 640px') ? desktop : !desktop,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: desktop ? 1440 : 390 })
}

describe('BirthdayPromptGate cannot be dismissed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profileValue = { ...AT_BIRTHDAY_TURN }
    isLoadingValue = false
    userValue = { id: 'user-1' }
    setViewport(true)
  })
  afterEach(() => cleanup())

  it('renders through the Modal primitive, not BottomSheet', () => {
    const { baseElement } = render(<BirthdayPromptGate />)
    expect(screen.getByText(/one quick thing/i)).toBeInTheDocument()
    // The gate's shell IS a Modal. BottomSheet stamps no such marker, so a
    // revert to the old primitive leaves this null.
    expect(baseElement.querySelector(MODAL_DESKTOP)).not.toBeNull()
  })

  it('offers no close affordance (Modal renders one only when dismissible)', () => {
    render(<BirthdayPromptGate />)
    // Modal desktop passes `showCloseButton={dismissible}`; dismissible={false}
    // means Radix renders no close button at all.
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  /* An Escape / backdrop-click pair was written here first and DELETED after a
     mutation exposed both as vacuous: they passed with `dismissible` flipped
     back to true. jsdom cannot make either one discriminate. Radix
     preventDefaults Escape identically in both modes, vaul emits a
     byte-identical attribute set for `dismissible` true and false, and this
     gate hardcodes `open`, so no dismiss path could close it in React even
     when the primitive allowed one. Backdrop-tap and Escape were never the
     escape hatch anyway; the drag was. What follows tests the drag. */

  it('renders the mobile branch through Modal, and offers no drag affordance', () => {
    setViewport(false)
    const { baseElement } = render(<BirthdayPromptGate />)
    expect(screen.getByText(/one quick thing/i)).toBeInTheDocument()
    const sheet = baseElement.querySelector(MODAL_MOBILE)
    expect(sheet).not.toBeNull()
    // Modal renders the grab handle ONLY when dismissible. Its absence is the
    // one DOM-visible consequence of `dismissible={false}` on this branch, and
    // it is the affordance that invited the swipe in the first place.
    expect(sheet!.querySelector('.rounded-full.bg-neutral-300')).toBeNull()
  })

  it('is still the same gate: asks for DOB and saves the derived age', async () => {
    render(<BirthdayPromptGate />)
    // `ariaLabel="Add your date of birth"` also matches /date of birth/i, so
    // scope to the field itself rather than every node carrying that text.
    const input = screen.getByRole('textbox', { name: /date of birth/i })
    expect(input).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '01/01/1990' } })
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).not.toBeDisabled()
    fireEvent.click(save)
    await vi.waitFor(() => expect(mockMutateAsync).toHaveBeenCalled())
    const payload = mockMutateAsync.mock.calls[0][0]
    expect(payload.date_of_birth).toBe('1990-01-01')
    expect(typeof payload.age).toBe('number')
  })

  it('refuses an out-of-range birthday instead of writing it', async () => {
    // Found by mutation: deleting the 5..120 range check left the suite green,
    // because the happy-path date sits inside the range. A typo'd year is the
    // realistic input here (the field takes dd/mm/yyyy free text).
    render(<BirthdayPromptGate />)
    const input = screen.getByRole('textbox', { name: /date of birth/i })
    fireEvent.change(input, { target: { value: '01/01/2025' } })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await vi.waitFor(() => expect(screen.getByText(/check the date is correct/i)).toBeInTheDocument())
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('keeps Save unreachable while the typed date is unparseable', () => {
    // DateInput answers an unparseable or out-of-max entry with onChange(''),
    // so `dateOfBirth` never leaves empty and Save stays disabled. That is
    // what makes handleSave's `age === null` branch unreachable from the UI
    // (a mutation confirmed deleting it changes nothing observable); this
    // pins the guard that actually holds, one layer up.
    render(<BirthdayPromptGate />)
    const input = screen.getByRole('textbox', { name: /date of birth/i })
    fireEvent.change(input, { target: { value: '99/99/9999' } })
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('does not render during onboarding, where this gate used to block the front door', () => {
    // Onboarding writes date_of_birth NOWHERE, so every brand-new user has it
    // null the moment a profile row exists. With no onboarding term in the
    // predicate and a mount at the App root outside every <Routes>, this sheet
    // rendered on top of the onboarding flow. It was survivable only while the
    // swipe dismissed it; the 4.F4 fix would have made it a hard block.
    profileValue = { ...AT_BIRTHDAY_TURN, onboarding_completed: false }
    render(<BirthdayPromptGate />)
    expect(screen.queryByText(/one quick thing/i)).toBeNull()
  })

  it('waits its turn behind the phone gate rather than stacking on it', () => {
    // Both are Modal dismissible={false}. Two at once is two undismissable
    // sheets on one screen with no way past either.
    profileValue = { ...AT_BIRTHDAY_TURN, phone: null }
    render(<BirthdayPromptGate />)
    expect(screen.queryByText(/one quick thing/i)).toBeNull()
  })

  it('does not render at all when the profile already has a birthday', () => {
    profileValue = { ...AT_BIRTHDAY_TURN, date_of_birth: '1990-01-01' }
    render(<BirthdayPromptGate />)
    expect(screen.queryByText(/one quick thing/i)).toBeNull()
  })
})

describe('the escape hatch this gate was migrated off', () => {
  /* Proving the premise rather than asserting it. This drives the primitive
     the gate USED to render and shows the swipe really did hide a "mandatory"
     sheet whose onClose was a no-op: MobileSheet writes translateY(100%)
     straight onto the DOM node (bottom-sheet.tsx:203), so `open` staying true
     never undoes it. If this ever stops reproducing, the migration's
     justification changed and someone should know. */
  it('BottomSheet + a no-op onClose still slides off-screen on a fast drag', () => {
    setViewport(false)
    const noop = vi.fn()
    const { baseElement } = render(
      <BottomSheet open onClose={noop}>
        <div>mandatory content</div>
      </BottomSheet>,
    )
    const grip = baseElement.querySelector('[data-eos-id="src/components/bottom-sheet.tsx#3"]')
    expect(grip).not.toBeNull()
    const sheet = baseElement.querySelector('[data-eos-id="src/components/bottom-sheet.tsx#2"]') as HTMLElement
    expect(sheet).not.toBeNull()

    const t = (clientY: number) => [{ clientY, clientX: 0, identifier: 0, target: grip! }] as unknown as Touch[]
    fireEvent.touchStart(grip!, { touches: t(0) })
    fireEvent.touchMove(grip!, { touches: t(400) })
    fireEvent.touchEnd(grip!, { changedTouches: t(400) })

    // The gate is visually gone, and nothing was told about it.
    expect(sheet.style.transform).toBe('translateY(100%)')
    expect(noop).not.toHaveBeenCalled()
  })
})

describe('BirthdayPromptGate is mounted behind an error boundary', () => {
  it('App.tsx wraps the gate so a throw degrades to no-gate, not a dead app', async () => {
    // The gate mounts OUTSIDE App's own ErrorBoundary, so before 2026-09-06 a
    // throw inside it took the whole app down for exactly the population it
    // renders for. PhoneGate and DietaryGate have carried this wrapper since
    // the 2026-07-05 Android crash; this pins the third gate to the same rule.
    const fs = await import('node:fs')
    const src = fs.readFileSync('src/App.tsx', 'utf8')
    const mount = src.indexOf('<BirthdayPromptGate')
    expect(mount).toBeGreaterThan(-1)
    // The nearest enclosing element before the mount must be the boundary, and
    // it must close immediately after: slice tightly rather than grepping the
    // whole file, which any unrelated boundary elsewhere would satisfy.
    const before = src.slice(0, mount)
    const after = src.slice(mount)
    expect(before.trimEnd().endsWith('<SentryErrorBoundary fallback={null}>')).toBe(true)
    expect(after.slice(0, 200)).toMatch(/<\/SentryErrorBoundary>/)
  })
})
