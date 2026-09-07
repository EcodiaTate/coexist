import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { attendanceRateFrom } from '@/hooks/use-leader-dashboard'

/* ------------------------------------------------------------------ */
/*  CA3 finding 3.F2. One attendance-rate computation.                 */
/*                                                                     */
/*  Not admin-versus-leader duplication: leader-versus-leader, inside   */
/*  one file. fetchLeaderDashboard and fetchCollectiveFullStats each     */
/*  ran the same query pair and the same formula, and                    */
/*  `grep -rln "fetchLeaderDashboard\|attendanceRate" src/test` returned */
/*  nothing, so neither copy was ever asserted.                          */
/* ------------------------------------------------------------------ */

const src = readFileSync(
  path.resolve(process.cwd(), 'src/hooks/use-leader-dashboard.ts'),
  'utf8',
)

describe('attendanceRateFrom', () => {
  it('is attended over registered-or-attended, as a whole percent', () => {
    expect(attendanceRateFrom(4, 3)).toBe(75)
    expect(attendanceRateFrom(200, 100)).toBe(50)
  })

  // THE CASE THE INLINE EXPRESSION GETS WRONG. A collective with no past
  // events has a zero denominator, and 0/0*100 is NaN, which renders as
  // "NaN%" on the dashboard. Both prior copies guarded it; the guard is the
  // part worth keeping pinned when the arithmetic moves.
  it('is 0 for a zero denominator, never NaN', () => {
    expect(attendanceRateFrom(0, 0)).toBe(0)
    expect(Number.isNaN(attendanceRateFrom(0, 0))).toBe(false)
  })

  it('treats a null or undefined count as zero rather than propagating it', () => {
    expect(attendanceRateFrom(null, 5)).toBe(0)
    expect(attendanceRateFrom(undefined, 5)).toBe(0)
    expect(attendanceRateFrom(10, null)).toBe(0)
    expect(attendanceRateFrom(10, undefined)).toBe(0)
  })

  it('rounds to the nearest whole percent, half away from zero', () => {
    expect(attendanceRateFrom(3, 1)).toBe(33)
    expect(attendanceRateFrom(3, 2)).toBe(67)
    expect(attendanceRateFrom(8, 1)).toBe(13)
  })

  it('reaches 100 when everyone registered turned up', () => {
    expect(attendanceRateFrom(12, 12)).toBe(100)
  })

  it('does not treat a negative denominator as a real one', () => {
    expect(attendanceRateFrom(-5, 3)).toBe(0)
  })
})

describe('both callers share the one query pair', () => {
  it('the formula appears exactly once in the file', () => {
    const occurrences = src.match(/Math\.round\(\(\(/g) ?? []
    expect(occurrences.length).toBe(1)
  })

  it('both fetchers call the shared stats helper', () => {
    expect(src).toContain('const { attendanceRate } = await fetchAttendanceStats(eventIds)')
    expect(src).toContain('const { attendanceCount, attendanceRate } = await fetchAttendanceStats(eventIds)')
  })

  it('the denominator is registered-or-attended, not every registration', () => {
    // The status set is the whole meaning of the number. A cancelled or
    // waitlisted row is not someone who failed to turn up, and widening this
    // to every registration would quietly deflate every collective's rate.
    expect(src).toContain(".in('status', ['registered', 'attended'])")
    expect(src.match(/\.in\('status', \['registered', 'attended'\]\)/g)?.length).toBe(1)
    expect(src).toContain(".eq('status', 'attended')")
  })

  it('the two head counts are issued in parallel, as the surviving copy did', () => {
    expect(src).toContain('await Promise.all([')
    // The sequential copy is gone: no lone awaited count query left behind.
    expect(src).not.toMatch(/const \{ count: totalReg \} = await supabase\n/)
  })
})
