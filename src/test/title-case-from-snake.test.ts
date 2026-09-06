import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { titleCaseFromSnake, formatRole } from '@/lib/labels-and-enums'
import { formatActivityType } from '@/lib/activity-types'

/* ------------------------------------------------------------------ */
/*  CA3 finding 5a.F4. One snake_case-to-Title-Case formatter.         */
/*                                                                     */
/*  The same two chained replaces were written out three times, twice   */
/*  inside src/lib itself. Nothing in the suite touched any of the      */
/*  three, so a fourth copy could land unnoticed and a fix to one would */
/*  never reach the other two.                                          */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

/** Every .ts/.tsx file under src, excluding the test tree. */
function sourceFiles(dir = 'src'): string[] {
  const abs = path.resolve(process.cwd(), dir)
  const out: string[] = []
  for (const entry of readdirSync(abs)) {
    const rel = `${dir}/${entry}`
    if (rel === 'src/test') continue
    if (statSync(path.resolve(process.cwd(), rel)).isDirectory()) {
      out.push(...sourceFiles(rel))
    } else if (/\.tsx?$/.test(entry)) {
      out.push(rel)
    }
  }
  return out
}

describe('titleCaseFromSnake', () => {
  it('turns a snake_case enum value into Title Case', () => {
    expect(titleCaseFromSnake('tree_planting')).toBe('Tree Planting')
  })

  it('capitalises a single word with no underscore', () => {
    expect(titleCaseFromSnake('cleanup')).toBe('Cleanup')
  })

  it('handles three or more segments', () => {
    expect(titleCaseFromSnake('social_media_content')).toBe('Social Media Content')
  })

  it('leaves an already-capitalised value alone', () => {
    expect(titleCaseFromSnake('Tree Planting')).toBe('Tree Planting')
  })

  it('returns empty for empty, rather than throwing', () => {
    expect(titleCaseFromSnake('')).toBe('')
  })

  it('capitalises the letter after a digit segment', () => {
    expect(titleCaseFromSnake('level_2_start')).toBe('Level 2 Start')
  })

  // THE ONE THAT DISCRIMINATES on implementation. \b\w capitalises after
  // ANY non-word character, a hyphen included, which a per-underscore
  // split-and-capitalise does not. A first draft claimed the digit case
  // above was this discriminator; the mutation run said otherwise (a
  // capitalised '2' is still '2'), so the honest case is the hyphen.
  it('capitalises after a hyphen, which a per-underscore split does not', () => {
    expect(titleCaseFromSnake('co-leader_handover')).toBe('Co-Leader Handover')
  })

  it('renders a leading underscore as a leading space, unchanged from the copies', () => {
    expect(titleCaseFromSnake('_draft')).toBe(' Draft')
  })
})

describe('the three call sites still behave as they did', () => {
  it('formatRole prefers the explicit label map over the formatter', () => {
    // member -> Participant is a deliberate relabel, NOT a title-case of the key.
    expect(formatRole('member')).toBe('Participant')
    expect(formatRole('assist_leader')).toBe('Assistant Leader')
  })

  it('formatRole falls back through the shared formatter for an unmapped role', () => {
    expect(formatRole('regional_coordinator')).toBe('Regional Coordinator')
    expect(formatRole('regional_coordinator')).toBe(titleCaseFromSnake('regional_coordinator'))
  })

  it('formatActivityType title-cases through the shared formatter', () => {
    expect(formatActivityType('beach_cleanup')).toBe('Beach Cleanup')
    expect(formatActivityType('beach_cleanup')).toBe(titleCaseFromSnake('beach_cleanup'))
  })

  it('formatActivityType keeps its own null sentinel', () => {
    expect(formatActivityType(null)).toBe('Event')
    expect(formatActivityType(undefined)).toBe('Event')
    expect(formatActivityType('')).toBe('Event')
  })
})

describe('no file re-declares the formatter', () => {
  // The load-bearing case. A value test cannot see a fourth copy pasted into
  // a new file: it would agree with this one on every input. This one reads
  // the tree instead, so the copy is what fails.
  it('the chained underscore-then-word-boundary replace appears in exactly one file', () => {
    const CHAINED = /replace\(\/_\/g,\s*' '\)\s*\.replace\(\/\\b\\w\/g/
    const offenders = sourceFiles().filter((f) => CHAINED.test(read(f)))
    expect(offenders).toEqual(['src/lib/labels-and-enums.ts'])
  })

  it('activity-types.ts calls the shared formatter rather than its own', () => {
    const src = read('src/lib/activity-types.ts')
    expect(src).toContain("import { titleCaseFromSnake } from '@/lib/labels-and-enums'")
    expect(src).toContain('return titleCaseFromSnake(type)')
  })

  it('the campaign template-variable label calls the shared formatter', () => {
    const src = read('src/pages/admin/email/campaigns-tab.tsx')
    expect(src).toContain("import { titleCaseFromSnake } from '@/lib/labels-and-enums'")
    expect(src).toContain('label={titleCaseFromSnake(varName)}')
  })

  // Deliberately NOT swept up: about twenty sites do a bare
  // `.replace(/_/g, ' ')` with no casing pass, most of them under a
  // `className="capitalize"`. Those are a different transform and changing
  // them would double-capitalise. Recorded so a later reader can tell
  // left-alone-on-purpose from missed.
  it('leaves the bare underscore-to-space sites alone', () => {
    const BARE = /\.replace\(\/_\/g, ' '\)/
    const bareOnly = sourceFiles().filter((f) => {
      const s = read(f)
      return BARE.test(s) && !/replace\(\/_\/g,\s*' '\)\s*\.replace\(\/\\b\\w\/g/.test(s)
    })
    expect(bareOnly.length).toBeGreaterThan(10)
    expect(bareOnly).toContain('src/pages/admin/audit-log.tsx')
  })
})
