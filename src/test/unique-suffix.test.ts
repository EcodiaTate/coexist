import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { uniqueSuffix } from '@/lib/unique-suffix'
import { buildStoragePath } from '@/lib/storage-path-builder'
import { buildChatImagePath } from '@/lib/chat-image-path'

/* ------------------------------------------------------------------ */
/*  CA3 finding 5a.F5. One <timestamp>-<random> suffix.                */
/*                                                                     */
/*  Nine copies, two of them inside the very path-builders that exist   */
/*  to centralise path construction. Zero test coverage anywhere        */
/*  (`grep -rln "buildStoragePath|buildChatImagePath" src/test` -> 0     */
/*  hits before this file), which is why the drift went unseen.         */
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

describe('uniqueSuffix', () => {
  it('is timestamp, dash, base-36 random', () => {
    expect(uniqueSuffix()).toMatch(/^\d{13}-[0-9a-z]{1,6}$/)
  })

  // The random part is a slice of Math.random().toString(36), so it is
  // theoretically short when the draw's base-36 form is short. Measured over
  // 200,000 draws on this Node: never. Asserting the MAX rather than every
  // length keeps that theoretical case from flaking the suite while still
  // failing if the default width changes.
  it('defaults to a 6-character random part', () => {
    const lengths = Array.from({ length: 500 }, () => uniqueSuffix().split('-')[1].length)
    expect(Math.max(...lengths)).toBe(6)
  })

  it('takes the random width as a parameter, because the copies had drifted to 4, 6 and 7', () => {
    expect(Math.max(...Array.from({ length: 300 }, () => uniqueSuffix(7).split('-')[1].length))).toBe(7)
    expect(Math.max(...Array.from({ length: 300 }, () => uniqueSuffix(4).split('-')[1].length))).toBe(4)
  })

  // Load-bearing at the storage sites: a bucket listing sorts chronologically
  // on the key alone, with no metadata read. Random-first would destroy that.
  it('puts the timestamp first, so keys sort chronologically as strings', () => {
    const before = uniqueSuffix()
    const now = Date.now()
    while (Date.now() === now) { /* spin one millisecond */ }
    const after = uniqueSuffix()
    expect(after > before).toBe(true)
  })

  it('does not repeat across a burst inside one millisecond', () => {
    const seen = new Set(Array.from({ length: 2000 }, () => uniqueSuffix()))
    expect(seen.size).toBe(2000)
  })
})

describe('the two path builders keep the exact shapes they shipped', () => {
  it('buildStoragePath is user, then prefix, then stem', () => {
    expect(buildStoragePath('u1', 'e1', 'png')).toMatch(/^u1\/e1\/\d{13}-[0-9a-z]{1,6}\.png$/)
  })

  it('buildStoragePath falls back to anon and defaults to jpg', () => {
    expect(buildStoragePath(undefined)).toMatch(/^anon\/\d{13}-[0-9a-z]{1,6}\.jpg$/)
  })

  it('buildChatImagePath is context, then user, then stem', () => {
    expect(buildChatImagePath('c1', 'u1', 'webp')).toMatch(/^c1\/u1\/\d{13}-[0-9a-z]{1,6}\.webp$/)
  })
})

describe('the event-photos folder-order split, pinned rather than fixed', () => {
  // NOT a consolidation. A record. useImageUpload in use-event-photos is
  // configured pathPrefix=eventId, so its images land at
  // <userId>/<eventId>/<stem>, while the video branch in the same hook writes
  // <eventId>/<userId>/<stem>. Two folder orders in one bucket. The audit
  // filed this finding believing the shapes already matched, so a later reader
  // needs to see the measurement rather than re-derive it.
  //
  // Left as-is because this bucket's storage RLS is Studio-managed and absent
  // from supabase/migrations (that migration's own header says so), so the
  // policy's folder expectations cannot be read here, and a blind swap is a
  // storage write that could start failing for every uploader. Deferred to
  // the spine/storage audit. If someone changes it, this case fails and they
  // have to say why.
  it('images go user-first and videos go event-first, and that is known', () => {
    expect(buildStoragePath('USER', 'EVENT')).toMatch(/^USER\/EVENT\//)
    const src = read('src/hooks/use-event-photos.ts')
    expect(src).toContain('`${eventId}/${user.id}/${uniqueSuffix(7)}.${ext}`')
    expect(src).toContain("pathPrefix: eventId ? `${eventId}` : 'misc'")
  })
})

describe('the census, so a tenth copy cannot land quietly', () => {
  const IDIOM = /Math\.random\(\)\.toString\(36\)/

  it('leaves exactly three hand-rolled copies, each for a stated reason', () => {
    const remaining = sourceFiles()
      .filter((f) => f !== 'src/lib/unique-suffix.ts')
      .filter((f) => IDIOM.test(read(f)))
      .sort()
    // use-chat and use-message-reactions take an UNBOUNDED slice(2), so
    // adopting the helper would shorten their optimistic ids: a behaviour
    // change on a client-only id, made blind, for no gain.
    // lead-a-collective separates with an UNDERSCORE and would change the
    // stored resume path shape.
    expect(remaining).toEqual([
      'src/hooks/use-chat.ts',
      'src/hooks/use-message-reactions.ts',
      'src/pages/lead-a-collective.tsx',
    ])
  })

  it('every adopted site calls the helper rather than rebuilding the pair', () => {
    for (const f of [
      'src/lib/storage-path-builder.ts',
      'src/lib/chat-image-path.ts',
      'src/lib/offline-sync.ts',
      'src/hooks/use-event-photos.ts',
      'src/hooks/use-staff-channels.ts',
      'src/pages/admin/email/quick-send-tab.tsx',
    ]) {
      const src = read(f)
      expect(src, `${f} should import uniqueSuffix`).toMatch(/import \{ uniqueSuffix \} from/)
      expect(src, `${f} should not rebuild the idiom`).not.toMatch(IDIOM)
    }
  })
})
