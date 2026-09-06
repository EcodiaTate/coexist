import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseRichLinks, LINK_PATTERN_SOURCE } from '@/lib/rich-links'

/* ------------------------------------------------------------------ */
/*  CA3 finding 6.F6                                                   */
/*                                                                     */
/*  The member-facing Updates page and the admin authoring preview      */
/*  each carried their own copy of this parser, and each had            */
/*  independently hit the same /g lastIndex bug and fixed it a          */
/*  different way (rebuild the RegExp per call vs reset lastIndex       */
/*  before use). Neither copy had a test: `grep -rl RichContent         */
/*  src/test/` returned nothing before this file.                       */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

describe('parseRichLinks', () => {
  it('returns a single text token for text with no links', () => {
    expect(parseRichLinks('just some words')).toEqual([{ type: 'text', value: 'just some words' }])
  })

  it('returns nothing for empty text', () => {
    expect(parseRichLinks('')).toEqual([])
  })

  it('parses a labelled link', () => {
    expect(parseRichLinks('[Co-Exist](https://coexistaus.org)')).toEqual([
      { type: 'link', href: 'https://coexistaus.org', label: 'Co-Exist', bare: false },
    ])
  })

  it('parses a bare url and flags it bare', () => {
    expect(parseRichLinks('https://coexistaus.org')).toEqual([
      { type: 'link', href: 'https://coexistaus.org', label: 'https://coexistaus.org', bare: true },
    ])
  })

  it('keeps the text either side of a link', () => {
    expect(parseRichLinks('see [here](https://a.test) now')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', href: 'https://a.test', label: 'here', bare: false },
      { type: 'text', value: ' now' },
    ])
  })

  it('handles http as well as https', () => {
    const out = parseRichLinks('http://plain.test')
    expect(out).toHaveLength(1)
    expect((out[0] as { href: string }).href).toBe('http://plain.test')
  })

  it('stops a bare url at whitespace and at an angle bracket', () => {
    expect(parseRichLinks('go https://a.test then')[1]).toEqual({
      type: 'link', href: 'https://a.test', label: 'https://a.test', bare: true,
    })
    const angled = parseRichLinks('https://a.test<br>')
    expect((angled[0] as { href: string }).href).toBe('https://a.test')
  })

  it('does not swallow the closing paren of a labelled link', () => {
    const out = parseRichLinks('[x](https://a.test) tail')
    expect((out[0] as { href: string }).href).toBe('https://a.test')
    expect(out[1]).toEqual({ type: 'text', value: ' tail' })
  })

  it('mixes labelled and bare links in one string', () => {
    expect(parseRichLinks('[a](https://one.test) and https://two.test')).toEqual([
      { type: 'link', href: 'https://one.test', label: 'a', bare: false },
      { type: 'text', value: ' and ' },
      { type: 'link', href: 'https://two.test', label: 'https://two.test', bare: true },
    ])
  })
})

describe('the lastIndex footgun both copies patched separately', () => {
  // What both prior copies were guarding, and what is actually true.
  //
  // A module-level /g RegExp keeps `lastIndex` between calls. Both copies
  // carried a comment saying a later render would skip matches near the start,
  // and each patched it differently: the member page rebuilt the RegExp per
  // call, the admin page assigned lastIndex = 0 first.
  //
  // MEASURED while writing these tests: with a loop that always runs to
  // exhaustion, the hazard does not fire. `exec` sets lastIndex back to 0 on
  // the failing match that ends the loop, so a shared regex survives repeated
  // calls. Mutating the shared parser to a module-level regex left all of the
  // repeat-call cases below GREEN, which is worth recording because it means
  // those cases pin the contract, they do not prove the fix.
  //
  // The hazard is real the moment a parse does NOT drain: an early return, a
  // throw mid-loop, or the same regex object borrowed elsewhere. That is a
  // structural property, so the case that actually discriminates is the
  // source-level one at the bottom of this block, plus the dirty-state case
  // that proves immunity rather than assuming it.
  it('returns identical output when called repeatedly on the same text', () => {
    const text = '[a](https://one.test) middle https://two.test end'
    const first = parseRichLinks(text)
    const second = parseRichLinks(text)
    const third = parseRichLinks(text)
    expect(second).toEqual(first)
    expect(third).toEqual(first)
  })

  it('finds a leading link on every call, which is what a stale lastIndex loses', () => {
    const text = 'https://first.test then https://second.test'
    for (let i = 0; i < 5; i++) {
      const out = parseRichLinks(text)
      expect(out.filter((t) => t.type === 'link')).toHaveLength(2)
      expect((out[0] as { href: string }).href).toBe('https://first.test')
    }
  })

  // The mechanism, demonstrated on a regex this test owns, so the claim above
  // rests on an observation rather than on the prior authors' comments. A /g
  // regex whose lastIndex is left dirty by an interrupted walk loses the
  // leading match on the next walk.
  it('a /g regex left mid-string genuinely loses the leading match', () => {
    const shared = new RegExp(LINK_PATTERN_SOURCE, 'g')
    const text = 'https://first.test then https://second.test'
    const runAll = (re: RegExp) => {
      const hits: string[] = []
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) hits.push(m[0])
      return hits
    }
    expect(runAll(shared)).toHaveLength(2)
    // An interrupted walk: lastIndex left at the start of the SECOND link, as
    // a mid-loop return or throw would leave it. The first link is now
    // unreachable, which is precisely the reported symptom.
    shared.lastIndex = text.indexOf('https://second.test')
    const afterInterrupt = runAll(shared)
    expect(afterInterrupt).toHaveLength(1)
    expect(afterInterrupt[0]).toBe('https://second.test')
  })

  // Immunity, asserted rather than assumed. parseRichLinks cannot be put into
  // the state above by any caller, because there is no regex object for a
  // caller to reach. This is the behavioural half of the guarantee; the
  // structural half is the source case below.
  it('parseRichLinks has no reachable regex state to corrupt', () => {
    const text = 'https://first.test then https://second.test'
    const pattern = new RegExp(LINK_PATTERN_SOURCE, 'g')
    pattern.lastIndex = text.indexOf('https://second.test')
    // Dirtying a regex built from the exported source changes nothing, because
    // the parser never touches that object.
    expect(parseRichLinks(text).filter((t) => t.type === 'link')).toHaveLength(2)
    expect((parseRichLinks(text)[0] as { href: string }).href).toBe('https://first.test')
  })

  // THE DISCRIMINATING CASE. The property being protected is structural, so
  // this is where it is enforced: the RegExp must be constructed inside the
  // function body. Hoisting it to module scope, which is the regrowth this
  // finding exists to prevent, fails here and nowhere else in this file.
  it('constructs the RegExp inside parseRichLinks, not at module scope', () => {
    const body = read('src/lib/rich-links.ts')
    const fnStart = body.indexOf('export function parseRichLinks')
    expect(fnStart).toBeGreaterThan(-1)
    const beforeFn = body.slice(0, fnStart)
    const insideFn = body.slice(fnStart)
    expect(insideFn, 'the pattern must be built per call')
      .toMatch(/new RegExp\(LINK_PATTERN_SOURCE, 'g'\)/)
    expect(
      beforeFn,
      'a module-level /g RegExp is shared mutable state across every call site. Build it inside the function.',
    ).not.toMatch(/new RegExp\(LINK_PATTERN_SOURCE, 'g'\)/)
  })
})

describe('neither updates page re-declares the parser', () => {
  const MIGRATED = ['src/pages/updates/index.tsx', 'src/pages/admin/updates.tsx']

  for (const site of MIGRATED) {
    it(`${site} imports the shared RichContent`, () => {
      const body = read(site)
      expect(body, `${site} must import RichContent from @/components/rich-content`)
        .toMatch(/import \{ RichContent \} from '@\/components\/rich-content'/)
      expect(body, `${site} declares its own RichContent again`)
        .not.toMatch(/function RichContent\s*\(/)
      expect(body, `${site} declares its own link regex again`)
        .not.toMatch(/LINK_RE|LINK_PATTERN_SOURCE/)
    })
  }

  it('the admin preview still asks for its own variant', () => {
    // The one real difference between the two copies was the trailing
    // ExternalLink icon on the authoring surface. Losing it in the merge would
    // be a silent visual regression on a page nothing screenshots.
    expect(read('src/pages/admin/updates.tsx')).toMatch(/variant="admin"/)
  })
})
