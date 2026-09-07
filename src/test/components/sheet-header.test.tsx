import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { SheetHeader } from '@/components/sheet-header'

/* ------------------------------------------------------------------ */
/*  CA3 finding 4.F2. One sheet header.                                 */
/*                                                                      */
/*  Nine render sites across eight files each carried their own copy of  */
/*  the same icon-box header, in two idioms that differ only in the box  */
/*  and the title weight. Nothing bound them, so a change to the box     */
/*  size or the subtitle colour reached one sheet and left eight behind. */
/*                                                                      */
/*  These cases pin the two idioms' measurements, because those          */
/*  measurements are exactly what drifts when a header exists nine       */
/*  times, and pin the three per-site escape hatches, because each one   */
/*  keeps a real site's rendered output unchanged.                       */
/* ------------------------------------------------------------------ */

const SRC = path.resolve(__dirname, '../../components')

function classesOf(testTitle: string) {
  const h = screen.getByText(testTitle)
  const row = h.closest('div')?.parentElement as HTMLElement
  const box = row.firstElementChild as HTMLElement
  return { row: row.className, box: box.className, title: h.className, el: h.tagName }
}

describe('SheetHeader', () => {
  it('panel variant carries the 40px square box and the bold title', () => {
    render(
      <SheetHeader
        variant="panel"
        icon={<svg data-testid="glyph" />}
        iconClassName="bg-accent-100 text-accent-600"
        title="Create Announcement"
        subtitle="Share something with your collective"
      />,
    )
    const c = classesOf('Create Announcement')
    expect(c.box).toContain('h-10')
    expect(c.box).toContain('w-10')
    expect(c.box).toContain('rounded-sm')
    expect(c.box).toContain('bg-accent-100')
    expect(c.box).toContain('text-accent-600')
    expect(c.title).toContain('text-base')
    expect(c.title).toContain('font-bold')
    expect(c.el).toBe('H3')
  })

  it('compact variant carries the 36px circle and the semibold heading face', () => {
    render(
      <SheetHeader
        variant="compact"
        icon={<svg data-testid="glyph" />}
        iconClassName="bg-error-100 text-error-600"
        title="Block someone?"
        subtitle="They won't be notified"
      />,
    )
    const c = classesOf('Block someone?')
    expect(c.box).toContain('w-9')
    expect(c.box).toContain('h-9')
    expect(c.box).toContain('rounded-full')
    expect(c.title).toContain('font-heading')
    expect(c.title).toContain('font-semibold')
    expect(c.el).toBe('H3')
  })

  it('the two variants are actually different, so one cannot silently become the other', () => {
    const { unmount } = render(
      <SheetHeader variant="panel" icon={<svg />} iconClassName="bg-accent-100" title="A" />,
    )
    const panel = classesOf('A')
    unmount()
    render(
      <SheetHeader variant="compact" icon={<svg />} iconClassName="bg-accent-100" title="B" />,
    )
    const compact = classesOf('B')
    expect(panel.box).not.toBe(compact.box)
    expect(panel.title).not.toBe(compact.title)
  })

  it('the row spacing is shared by default', () => {
    render(<SheetHeader variant="panel" icon={<svg />} iconClassName="bg-accent-100" title="A" />)
    const c = classesOf('A')
    expect(c.row).toContain('gap-2.5')
    expect(c.row).toContain('mb-4')
  })

  it('className replaces the shared row spacing rather than racing it (walk-in-sheet)', () => {
    render(
      <SheetHeader
        variant="compact"
        className="gap-2 mb-0 pt-1 pb-1"
        icon={<svg />}
        iconClassName="bg-primary-100"
        title="Add Walk-In"
        titleClassName="font-bold"
        subtitle="Search by name or email"
      />,
    )
    const c = classesOf('Add Walk-In')
    // tailwind-merge must DROP the defaults, not leave both in the string,
    // or walk-in's header stacks 16px on top of its parent's space-y-4.
    expect(c.row).not.toContain('gap-2.5')
    expect(c.row).not.toContain('mb-4')
    expect(c.row).toContain('gap-2')
    expect(c.row).toContain('mb-0')
    // and its own weight survives the compact variant's semibold
    expect(c.title).toContain('font-bold')
    expect(c.title).not.toContain('font-semibold')
  })

  it('titleClassName replaces the default title colour (broadcast-notification-sheet)', () => {
    render(
      <SheetHeader
        variant="panel"
        icon={<svg />}
        iconClassName="bg-warning-100 text-warning-600"
        title="Push Notification"
        titleClassName="text-primary-900"
        subtitle="Send to all members"
      />,
    )
    const c = classesOf('Push Notification')
    expect(c.title).toContain('text-primary-900')
    expect(c.title).not.toContain('text-neutral-900')
  })

  it('truncate clips both lines and gives the text column min-w-0 (save-seat-sheet)', () => {
    render(
      <SheetHeader
        variant="panel"
        icon={<svg />}
        iconClassName="bg-success-50 text-success-600"
        title="Save me a seat"
        truncate
        subtitle="Riding with a driver whose name is very long indeed"
      />,
    )
    const h = screen.getByText('Save me a seat')
    const col = h.parentElement as HTMLElement
    expect(col.className).toContain('min-w-0')
    expect(h.className).toContain('truncate')
    expect(screen.getByText(/Riding with a driver/).className).toContain('truncate')
  })

  it('omits the subtitle paragraph entirely when no subtitle is given', () => {
    const { container } = render(
      <SheetHeader variant="panel" icon={<svg />} iconClassName="bg-accent-100" title="A" />,
    )
    expect(container.querySelectorAll('p')).toHaveLength(0)
  })

  it('renders the caller\'s glyph as given, size and colour included', () => {
    render(
      <SheetHeader
        variant="compact"
        icon={<svg data-testid="glyph" width={18} className="text-primary-600" />}
        iconClassName="bg-primary-100"
        title="Add Walk-In"
      />,
    )
    const glyph = screen.getByTestId('glyph')
    expect(glyph.getAttribute('width')).toBe('18')
    expect(glyph.getAttribute('class')).toContain('text-primary-600')
  })

  it('no sheet keeps a hand-rolled copy of either icon-box idiom', () => {
    // The consolidation is only real while this holds. Both greps are the
    // finding's own, re-run against source rather than against a render.
    const files = [
      'block-user-sheet.tsx',
      'broadcast-notification-sheet.tsx',
      'create-announcement-sheet.tsx',
      'create-carpool-sheet.tsx',
      'create-poll-sheet.tsx',
      'report-content-sheet.tsx',
      'save-seat-sheet.tsx',
      'walk-in-sheet.tsx',
    ]
    for (const f of files) {
      const src = readFileSync(path.join(SRC, f), 'utf8')
      expect(src, `${f} still hand-rolls the panel icon box`).not.toContain(
        'flex h-10 w-10 items-center justify-center rounded-sm bg-',
      )
      expect(src, `${f} still hand-rolls the compact icon box`).not.toContain(
        'flex items-center justify-center w-9 h-9 rounded-full bg-',
      )
      expect(src, `${f} does not use the shared header`).toContain('SheetHeader')
    }
  })

  it('all nine render sites go through the one component', () => {
    const files = [
      ['block-user-sheet.tsx', 1],
      ['broadcast-notification-sheet.tsx', 1],
      ['create-announcement-sheet.tsx', 1],
      ['create-carpool-sheet.tsx', 2], // CreateCarpoolSheet + EditCarpoolSheet
      ['create-poll-sheet.tsx', 1],
      ['report-content-sheet.tsx', 1],
      ['save-seat-sheet.tsx', 1],
      ['walk-in-sheet.tsx', 1],
    ] as const
    let total = 0
    for (const [f, n] of files) {
      const src = readFileSync(path.join(SRC, f), 'utf8')
      const uses = src.match(/<SheetHeader\b/g)?.length ?? 0
      expect(uses, `${f} renders ${uses} headers, expected ${n}`).toBe(n)
      total += uses
    }
    expect(total).toBe(9)
  })
})
