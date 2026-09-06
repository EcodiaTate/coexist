import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ROLE_RANK, LEADER_ROLES, STAFF_ROLES, highestRankedRole } from '@/lib/constants'

/* ------------------------------------------------------------------ */
/*  Role hierarchy: one rank table, one membership list per gate       */
/*                                                                     */
/*  CA3 finding 5a.F2. The rank hierarchy was re-declared in seven      */
/*  places, two of them inside one hook file. One copy had already      */
/*  diverged and was shipping a live bug, which is the first block      */
/*  below. Nothing in the suite exercised any of it.                    */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

describe('highestRankedRole (the use-updates bug)', () => {
  // THE DEFECT. use-updates.ts inlined { member: 0, assist_leader: 1,
  // co_leader: 2, leader: 3 } twice. No manager key, no admin key, and the
  // lookup was `rank[m.role] ?? 0`, so both scored ZERO: below every leader
  // and level with a plain member. A manager's collective membership could
  // never win the reduce that picks the viewer's highest role.
  it('ranks a manager above a member', () => {
    expect(highestRankedRole([{ role: 'member' }, { role: 'manager' }])).toBe('manager')
  })

  it('ranks a manager above a leader, which the inlined copy could not', () => {
    expect(highestRankedRole([{ role: 'leader' }, { role: 'manager' }])).toBe('manager')
  })

  it('ranks an admin above a manager', () => {
    expect(highestRankedRole([{ role: 'manager' }, { role: 'admin' }])).toBe('admin')
  })

  // The order the old copy DID get right. Pinned so a fix to the top of the
  // hierarchy cannot quietly break the bottom of it.
  it('keeps the collective ordering the old copy had', () => {
    expect(highestRankedRole([{ role: 'member' }, { role: 'assist_leader' }])).toBe('assist_leader')
    expect(highestRankedRole([{ role: 'assist_leader' }, { role: 'co_leader' }])).toBe('co_leader')
    expect(highestRankedRole([{ role: 'co_leader' }, { role: 'leader' }])).toBe('leader')
  })

  it('is order-independent', () => {
    expect(highestRankedRole([{ role: 'admin' }, { role: 'member' }])).toBe('admin')
    expect(highestRankedRole([{ role: 'member' }, { role: 'admin' }])).toBe('admin')
  })

  it('returns null for no memberships', () => {
    expect(highestRankedRole([])).toBeNull()
  })

  it('treats an unknown role as rank 0 rather than throwing', () => {
    expect(highestRankedRole([{ role: 'not_a_role' }, { role: 'leader' }])).toBe('leader')
    expect(highestRankedRole([{ role: 'not_a_role' }])).toBe('not_a_role')
  })
})

describe('LEADER_ROLES', () => {
  // Pins membership to what the two prior literals held, byte for byte.
  // use-leader-collective-scope.ts and route-guard.tsx each declared
  // ['assist_leader', 'co_leader', 'leader']; consolidating must not have
  // changed who reaches the leader suite.
  it('holds exactly the three roles the two prior copies held', () => {
    expect([...LEADER_ROLES]).toEqual(['assist_leader', 'co_leader', 'leader'])
  })

  it('every leader role outranks a participant in ROLE_RANK', () => {
    for (const r of LEADER_ROLES) expect(ROLE_RANK[r]).toBeGreaterThan(ROLE_RANK.participant)
  })

  // The rank table stays the source of ORDER. This is what stops the list and
  // the table drifting apart in the direction a reader would not notice: a
  // role promoted above `leader` in the table but left in this list.
  it('no leader role outranks leader itself', () => {
    for (const r of LEADER_ROLES) expect(ROLE_RANK[r]).toBeLessThanOrEqual(ROLE_RANK.leader)
  })

  // Why membership is spelled out instead of filtered out of ROLE_RANK.
  it('is NARROWER than a naive rank filter, which would admit global aliases', () => {
    const naive = Object.keys(ROLE_RANK).filter((k) => ROLE_RANK[k] >= 1 && ROLE_RANK[k] <= 3)
    const widened = naive.filter((k) => !(LEADER_ROLES as readonly string[]).includes(k))
    expect(widened.sort()).toEqual(['national_leader', 'national_staff'])
  })
})

describe('STAFF_ROLES (a PII gate)', () => {
  // Membership pinned to profile-visibility.ts's prior literal exactly.
  it('holds exactly the six roles the prior literal held', () => {
    expect([...STAFF_ROLES].sort()).toEqual(
      ['admin', 'assist_leader', 'co_leader', 'leader', 'manager', 'national_leader'].sort(),
    )
  })

  it('excludes participant and its legacy alias', () => {
    expect(STAFF_ROLES.has('participant')).toBe(false)
    expect(STAFF_ROLES.has('member')).toBe(false)
  })

  // THE TRAP THIS TEST EXISTS FOR. "Every ROLE_RANK key with rank >= 1" reads
  // like the obvious derivation and returns EIGHT roles against this set's
  // six, letting national_staff and national_admin read another member's
  // medical notes and emergency contacts. Deriving this set by predicate is a
  // silent widening of a privacy boundary, so the membership is explicit and
  // this case fails if anyone swaps it for the filter.
  it('is NARROWER than every ROLE_RANK key with rank >= 1', () => {
    const naive = Object.keys(ROLE_RANK).filter((k) => ROLE_RANK[k] >= 1)
    const widened = naive.filter((k) => !STAFF_ROLES.has(k))
    // Named exactly, so this fails loudly if the alias set changes rather
    // than passing on a vaguer "is smaller" assertion. Every one of these is
    // a legacy global alias, not a role anyone is granted today, and every
    // one would have gained read access to another member's PII.
    expect(widened.sort()).toEqual(['national_admin', 'national_staff', 'super_admin'])
    expect(naive.length).toBeGreaterThan(STAFF_ROLES.size)
  })

  it('every staff role outranks a participant', () => {
    for (const r of STAFF_ROLES) expect(ROLE_RANK[r]).toBeGreaterThan(ROLE_RANK.participant)
  })
})

describe('no site re-declares the hierarchy', () => {
  // A value test cannot catch a SEVENTH copy being pasted into a new file, so
  // this reads the consolidated sites' source. These are the four this lane
  // migrated; role-gate.tsx and validation.ts hold two further copies that are
  // CA5's deletions, deliberately untouched here and deliberately not asserted.
  const MIGRATED = [
    'src/hooks/use-updates.ts',
    'src/hooks/use-leader-collective-scope.ts',
    'src/components/route-guard.tsx',
    'src/lib/profile-visibility.ts',
  ]

  for (const site of MIGRATED) {
    it(`${site} declares no local rank object or role list`, () => {
      const body = read(site)
      expect(
        body,
        `${site} inlines a rank object again. Import ROLE_RANK / highestRankedRole from constants.ts.`,
      ).not.toMatch(/assist_leader:\s*1/)
      expect(
        body,
        `${site} re-declares a leader/staff role array. Import LEADER_ROLES / STAFF_ROLES.`,
      ).not.toMatch(/(const|let)\s+_?(LEADER_ROLES|STAFF_ROLES)\s*[:=]/)
    })
  }

  it('use-updates.ts routes both call sites through the shared helper', () => {
    const body = read('src/hooks/use-updates.ts')
    const uses = Array.from(body.matchAll(/highestRankedRole\(collectiveRoles\)/g))
    // useUpdates and useUnreadUpdateCount. Fixing one and not the other is the
    // exact half-fix the two identical inline copies invited.
    expect(uses.length, 'expected both update hooks to use the shared helper').toBe(2)
  })
})
