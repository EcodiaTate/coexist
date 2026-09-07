import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

/* ------------------------------------------------------------------ */
/*  CA3 finding 5a.F6. One EventWithCollective.                        */
/*                                                                     */
/*  Three hand-written interfaces of the same name for the same idea:   */
/*  two byte-identical narrow copies in use-home-feed and use-nearby,   */
/*  and a wider exported one in use-events. A type has no runtime, so   */
/*  these cases read the tree: they are what stops a fourth copy, and   */
/*  what stops the declared shape drifting away from the columns the    */
/*  queries actually fetch.                                             */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

function sourceFiles(dir = 'src'): string[] {
  const abs = path.resolve(process.cwd(), dir)
  const out: string[] = []
  for (const entry of readdirSync(abs)) {
    const rel = `${dir}/${entry}`
    if (rel === 'src/test') continue
    if (statSync(path.resolve(process.cwd(), rel)).isDirectory()) out.push(...sourceFiles(rel))
    else if (/\.tsx?$/.test(entry)) out.push(rel)
  }
  return out
}

describe('one declaration', () => {
  it('EventWithCollective is declared in exactly one file', () => {
    const decl = /(?:export )?interface EventWithCollective\b/
    expect(sourceFiles().filter((f) => decl.test(read(f)))).toEqual(['src/hooks/use-events.ts'])
  })

  it('EventWithCollectiveRef is declared in exactly one file too', () => {
    const decl = /(?:export )?interface EventWithCollectiveRef\b/
    expect(sourceFiles().filter((f) => decl.test(read(f)))).toEqual(['src/hooks/use-events.ts'])
  })

  it('the two former copy-holders import it instead', () => {
    expect(read('src/hooks/use-home-feed.ts')).toContain(
      "import type { EventWithCollective } from '@/hooks/use-events'",
    )
    expect(read('src/hooks/use-nearby.ts')).toContain(
      "import type { EventWithCollectiveRef } from '@/hooks/use-events'",
    )
  })
})

describe('the declared shape matches what the queries fetch', () => {
  // THE LOAD-BEARING PAIR. These types are casts over PostgREST rows, so
  // TypeScript cannot check them against the select string. Claiming a column
  // the query never asked for hands a consumer `undefined` with no type error,
  // which is exactly how the three copies drifted apart in the first place.

  it('EventWithCollective claims id, name and timezone, and nothing more', () => {
    expect(read('src/hooks/use-events.ts')).toContain(
      "  collectives: Pick<Collective, 'id' | 'name' | 'timezone'> | null",
    )
  })

  it('every event row use-home-feed casts to it was selected with timezone', () => {
    // The `*, collectives(...)` selects are the event-row ones. The bare
    // `collectives(id, name)` at the my-collectives query is a different
    // shape with its own inline cast, so it is deliberately not matched.
    const eventSelects = read('src/hooks/use-home-feed.ts')
      .split('\n')
      .filter((l) => /\.select\('\*, /.test(l) || /events!inner\(\*, collectives/.test(l))
    expect(eventSelects.length).toBeGreaterThanOrEqual(5)
    for (const line of eventSelects) {
      expect(line, `select is missing timezone: ${line.trim()}`).toMatch(/collectives[^)]*timezone/)
    }
  })

  it('use-nearby fetches only id and name, which is why it gets the narrow type', () => {
    const src = read('src/hooks/use-nearby.ts')
    const selects = src.match(/collectives\([^)]*\)/g) ?? []
    expect(selects.length).toBeGreaterThan(0)
    for (const s of selects) expect(s).toBe('collectives(id, name)')
    expect(src).not.toMatch(/\bEventWithCollective\b(?!Ref)/)
  })
})

describe('the column the wide copy claimed and nobody read', () => {
  // use-events' copy claimed cover_image_url. No select feeding it fetches
  // that column (all four are `collectives(id, name, timezone)`), and a tree
  // search finds no reader. It was dropped rather than propagated to the two
  // files being consolidated onto it. If someone re-adds it, this fails and
  // they have to add a reader and a select alongside.
  it('nothing reads cover_image_url off an event collective', () => {
    const readers = sourceFiles().filter((f) =>
      /collectives\??\.\s*cover_image_url/.test(read(f)),
    )
    expect(readers).toEqual([])
  })
})
