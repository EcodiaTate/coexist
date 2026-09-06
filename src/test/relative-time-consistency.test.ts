import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { formatRelative, formatDateLong } from '@/lib/date-format'

/* ------------------------------------------------------------------ */
/*  One relative-time helper, four surfaces                            */
/*                                                                     */
/*  CA3 finding 6.F5. formatRelative has been the canonical helper all */
/*  along; Notifications, Updates and the broadcast log each kept a     */
/*  local copy instead. One of the three had drifted, and the drift was */
/*  visible to members: an update between 1 day and 1 year old rendered */
/*  a bare date on Updates and "3d ago" on Notifications, for the same  */
/*  age, in the same app, on adjacent screens.                          */
/*                                                                     */
/*  Nothing tested any of it: `grep -rl "formatRelative\|timeAgo"       */
/*  src/test/` returned no hits before this file.                       */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')
const NOW = new Date('2026-06-15T12:00:00.000Z')
const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString()

afterEach(() => vi.useRealTimers())
const freeze = () => vi.useFakeTimers({ now: NOW, toFake: ['Date'] })

describe('formatRelative buckets', () => {
  it('covers every bucket end to end', () => {
    freeze()
    expect(formatRelative(ago(5))).toBe('Just now')
    expect(formatRelative(ago(59))).toBe('Just now')
    expect(formatRelative(ago(60))).toBe('1m ago')
    expect(formatRelative(ago(3599))).toBe('59m ago')
    expect(formatRelative(ago(3600))).toBe('1h ago')
    expect(formatRelative(ago(86399))).toBe('23h ago')
    expect(formatRelative(ago(86400))).toBe('1d ago')
    expect(formatRelative(ago(604799))).toBe('6d ago')
  })

  // THE DEFECT. updates/index.tsx's local copy had no `diff < 604800` branch,
  // so it fell straight from the hours bucket to a bare date. Three days old
  // read "12 Jun" on Updates and "3d ago" on Notifications.
  it('renders the day bucket that the Updates copy was missing', () => {
    freeze()
    for (const days of [1, 2, 3, 4, 5, 6]) {
      expect(formatRelative(ago(days * 86400))).toBe(`${days}d ago`)
    }
  })

  it('falls back to a date only once past a week', () => {
    freeze()
    expect(formatRelative(ago(7 * 86400))).not.toMatch(/ago$/)
    expect(formatRelative(ago(7 * 86400))).toMatch(/Jun/)
  })

  it('adds the year only once past a year', () => {
    freeze()
    expect(formatRelative(ago(200 * 86400))).not.toMatch(/\d{4}/)
    expect(formatRelative(ago(400 * 86400))).toMatch(/\d{4}/)
  })
})

describe('Updates and Notifications agree at every age', () => {
  // The user-visible contract: the same timestamp reads the same on both
  // surfaces. Both now call formatRelative, so this compares the helper
  // against itself for identity and, more usefully, pins the whole ladder so
  // a future local re-implementation on either page has something to fail.
  const AGES = [0, 30, 90, 3600, 7200, 86400, 3 * 86400, 6 * 86400, 8 * 86400, 400 * 86400]

  it('produces one rendering per age, not two', () => {
    freeze()
    const rendered = AGES.map((a) => formatRelative(ago(a)))
    // The relative half is written out, so a change to a bucket boundary has
    // to be made on purpose here as well as in the helper. The two date
    // fallbacks are composed from formatDateLong rather than typed as
    // strings: locale month abbreviation is an ICU detail (en-AU renders June
    // in full under `month: 'short'`), and pinning that would make this case
    // fail on an ICU upgrade while saying nothing about the bucket ladder it
    // exists to protect.
    expect(rendered.slice(0, 8)).toEqual([
      'Just now', 'Just now', '1m ago', '1h ago', '2h ago',
      '1d ago', '3d ago', '6d ago',
    ])
    expect(rendered[8]).toBe(formatDateLong(ago(8 * 86400), false))
    expect(rendered[9]).toBe(formatDateLong(ago(400 * 86400), true))
    // The year is the discriminator between the two fallbacks, and that IS
    // ICU-independent.
    expect(rendered[8]).not.toMatch(/\d{4}/)
    expect(rendered[9]).toMatch(/2025/)
  })

  // The old Updates copy, reconstructed. Kept as an executable record of what
  // was wrong: at three days it disagreed with the canonical helper. If
  // someone re-introduces this shape, the case above is what catches it; this
  // one documents why that case exists.
  it('the old Updates copy disagreed with the canonical helper at 3 days', () => {
    freeze()
    const oldUpdatesCopy = (dateStr: string): string => {
      const date = new Date(dateStr)
      const diff = Math.floor((Date.now() - date.getTime()) / 1000)
      if (diff < 60) return 'Just now'
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      return date.toLocaleDateString('en-AU', {
        day: 'numeric', month: 'short',
        year: diff > 31536000 ? 'numeric' : undefined,
      })
    }
    const threeDays = ago(3 * 86400)
    expect(oldUpdatesCopy(threeDays)).not.toBe(formatRelative(threeDays))
    expect(formatRelative(threeDays)).toBe('3d ago')
  })
})

describe('no surface re-declares a relative-time helper', () => {
  // A value test cannot see a fourth copy appearing in a new file. These are
  // the three that had one.
  const MIGRATED = [
    'src/pages/notifications/index.tsx',
    'src/pages/updates/index.tsx',
    'src/components/broadcast-notification-sheet.tsx',
  ]

  for (const site of MIGRATED) {
    it(`${site} imports formatRelative and declares no local copy`, () => {
      const body = read(site)
      expect(body, `${site} must import the canonical helper`)
        .toMatch(/import \{ formatRelative \} from '@\/lib\/date-format'/)
      expect(
        body,
        `${site} re-implements relative time locally. Import formatRelative instead.`,
      ).not.toMatch(/function (timeAgo|relativeTime|formatDate)\s*\(/)
      // The bucket arithmetic itself, which is what a re-implementation looks
      // like whatever the author names the function.
      expect(body, `${site} inlines the relative-time bucket arithmetic again`)
        .not.toMatch(/diff\s*<\s*(3600|86400|604800)/)
    })
  }
})
