import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  gatesApply,
  needsPhoneGate,
  needsBirthdayGate,
  dietaryGateOrderAllows,
  type GateProfile,
} from '@/lib/profile-gates'

/* ------------------------------------------------------------------ *
 *  Three undismissable gates, one screen.
 *
 *  PhoneGate, BirthdayPromptGate and DietaryGate are each a Modal with
 *  dismissible={false}. Two eligible at once is two sheets stacked with
 *  no way past either, so the ordering is not a nicety, it is the thing
 *  that keeps the app usable.
 *
 *  Consolidation 2026-09-06 found it broken: the birthday gate checked
 *  only `!profile.date_of_birth`, with no onboarding term and no phone
 *  precedence, while mounting at the App root outside every <Routes>.
 *  Onboarding writes date_of_birth nowhere, so every brand-new user met
 *  it on top of the onboarding flow. It only looked survivable because
 *  that gate's blocking was fake and a swipe dismissed it.
 *
 *  These tests enumerate the whole profile space the predicates read
 *  and assert the order is TOTAL: never two, and never a dead end where
 *  a member who still owes us something is asked for nothing.
 * ------------------------------------------------------------------ */

const PHONES = [null, '', '   ', '0400 000 000']
const BIRTHDAYS = [null, '', '1990-01-01']
const ONBOARDED = [true, false, null, undefined]

function everyProfile(): GateProfile[] {
  const out: GateProfile[] = []
  for (const onboarding_completed of ONBOARDED)
    for (const phone of PHONES)
      for (const date_of_birth of BIRTHDAYS)
        out.push({ onboarding_completed, phone, date_of_birth } as GateProfile)
  return out
}

const eligible = (p: GateProfile) =>
  [
    needsPhoneGate(p) && 'phone',
    needsBirthdayGate(p) && 'birthday',
    dietaryGateOrderAllows(p) && 'dietary',
  ].filter(Boolean) as string[]

describe('the blocking gate order is total', () => {
  it('covers a real space, so the assertions below are not vacuous', () => {
    // 48 profiles, and the ones that matter must actually occur: without this
    // an empty generator would satisfy every it() that follows.
    const all = everyProfile()
    expect(all.length).toBe(48)
    expect(all.some((p) => eligible(p).includes('phone'))).toBe(true)
    expect(all.some((p) => eligible(p).includes('birthday'))).toBe(true)
    expect(all.some((p) => eligible(p).includes('dietary'))).toBe(true)
  })

  it('never lets two gates be eligible for the same profile', () => {
    const clashes = everyProfile()
      .map((p) => ({ p, gates: eligible(p) }))
      .filter((x) => x.gates.length > 1)
    expect(clashes, `two undismissable sheets would stack: ${JSON.stringify(clashes)}`).toEqual([])
  })

  it('asks a member who owes us something for exactly one thing', () => {
    // No dead end: an onboarded profile missing anything must have a gate.
    const stranded = everyProfile().filter(
      (p) =>
        gatesApply(p) &&
        (!(p.phone ?? '').trim() || !(p.date_of_birth ?? '').trim()) &&
        eligible(p).length === 0,
    )
    expect(stranded, `a member owes us data and no gate asks: ${JSON.stringify(stranded)}`).toEqual([])
  })

  it('asks a mid-onboarding member for nothing at all', () => {
    // Onboarding runs in its own shell and asks for these itself. This is the
    // clause the birthday gate was missing.
    const during = everyProfile().filter((p) => p.onboarding_completed !== true)
    for (const p of during) expect(eligible(p)).toEqual([])
  })

  it('treats whitespace as absent, not as an answer', () => {
    expect(needsPhoneGate({ onboarding_completed: true, phone: '   ', date_of_birth: null })).toBe(true)
  })

  it('goes quiet once a profile is complete', () => {
    expect(
      eligible({ onboarding_completed: true, phone: '0400 000 000', date_of_birth: '1990-01-01' }),
    ).toEqual(['dietary'])
  })
})

describe('each gate reads the shared order rather than its own copy', () => {
  const ROOT = path.resolve(__dirname, '../..')
  const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

  it.each([
    ['src/components/phone-gate.tsx', 'needsPhoneGate'],
    ['src/components/birthday-prompt-gate.tsx', 'needsBirthdayGate'],
    ['src/components/dietary-gate.tsx', 'dietaryGateOrderAllows'],
  ])('%s calls %s', (file, fn) => {
    // Called, with a parenthesis, not merely imported: an import that is never
    // reached is how the ordering went missing from one of the three.
    expect(read(file)).toMatch(new RegExp(String.raw`${fn}\(`))
  })

  it.each([
    'src/components/phone-gate.tsx',
    'src/components/birthday-prompt-gate.tsx',
    'src/components/dietary-gate.tsx',
  ])('%s does not re-derive onboarding_completed itself', (file) => {
    // A second copy of the rule is how the three drifted apart in the first
    // place. The predicate module is the only place it belongs.
    expect(read(file)).not.toMatch(/onboarding_completed\s*===\s*true/)
  })
})
