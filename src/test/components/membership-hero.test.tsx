import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { MembershipHero } from '@/components/membership-hero'

/* ------------------------------------------------------------------ */
/*  CA3 finding 6.F1. One membership hero.                             */
/*                                                                     */
/*  The join page and the manage page each carried their own copy of    */
/*  the same full-bleed photo hero: same OptimizedImage props, same     */
/*  gradient, same floating back button, same motion variants. A        */
/*  change to the image quality or the srcSet widths reached one page   */
/*  and not the other.                                                  */
/* ------------------------------------------------------------------ */

const navigate = vi.fn()
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
  useReducedMotion: () => true,
}))

vi.mock('@/components/optimized-image', () => ({
  OptimizedImage: (props: Record<string, unknown>) => (
    <img
      data-testid="hero-image"
      alt=""
      data-src={String(props.src)}
      data-quality={String(props.quality)}
      data-sizes={String(props.sizes)}
      data-srcset-widths={JSON.stringify(props.srcSetWidths)}
      data-priority={String(props.priority)}
      className={props.className as string | undefined}
    />
  ),
}))

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')

describe('MembershipHero', () => {
  it('renders the eyebrow and title', () => {
    render(<MembershipHero variant="join" eyebrow="Co-Exist" title="Membership" heroImage="x.jpg" />)
    expect(screen.getByText('Co-Exist')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Membership' })).toBeInTheDocument()
  })

  // The props both copies carried identically. These are the ones that
  // silently drift when a hero exists twice: an image tuned on one page and
  // not the other is invisible until someone compares the two on a phone.
  it('passes the shared image props both copies had spelled out', () => {
    render(<MembershipHero variant="join" eyebrow="e" title="t" heroImage="hero.jpg" />)
    const img = screen.getByTestId('hero-image')
    expect(img).toHaveAttribute('data-quality', '72')
    expect(img).toHaveAttribute('data-sizes', '100vw')
    expect(img).toHaveAttribute('data-srcset-widths', '[640,960,1280,1600]')
    expect(img).toHaveAttribute('data-priority', 'true')
  })

  it('renders no image at all when there is no hero photo', () => {
    render(<MembershipHero variant="manage" eyebrow="e" title="t" heroImage={null} />)
    expect(screen.queryByTestId('hero-image')).toBeNull()
  })

  it('passes an image class through, which is how a lapsed membership greys out', () => {
    render(<MembershipHero variant="manage" eyebrow="e" title="t" heroImage="h.jpg" imageClassName="grayscale" />)
    expect(screen.getByTestId('hero-image')).toHaveClass('grayscale')
  })

  it('the back button navigates back', async () => {
    render(<MembershipHero variant="join" eyebrow="e" title="t" />)
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('renders a badge beside the title and children beneath it', () => {
    render(
      <MembershipHero variant="manage" eyebrow="My Membership" title="Supporter" badge={<span>Active</span>}>
        <p>$8 / month</p>
      </MembershipHero>,
    )
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('$8 / month')).toBeInTheDocument()
  })

  // The one structural difference between the two pages, and the reason the
  // badge row is conditional rather than always rendered: a flex item is
  // content-sized, so wrapping the join page's bare h1 in the manage page's
  // flex row would change where a long plan name breaks.
  it('does not wrap a badge-less title in the flex row', () => {
    const { container } = render(<MembershipHero variant="join" eyebrow="e" title="Membership" />)
    const heading = screen.getByRole('heading', { name: 'Membership' })
    expect(heading.parentElement?.className).not.toContain('flex items-center gap-2.5')
    expect(container.querySelectorAll('.flex.items-center.gap-2\\.5').length).toBe(0)
  })

  it('the two variants differ in exactly their three measurements', () => {
    const { container: join } = render(<MembershipHero variant="join" eyebrow="e" title="t" />)
    const { container: manage } = render(<MembershipHero variant="manage" eyebrow="e" title="t" />)
    expect(join.querySelector('.min-h-\\[360px\\]')).not.toBeNull()
    expect(manage.querySelector('.min-h-\\[300px\\]')).not.toBeNull()
    expect(join.querySelector('.text-\\[2\\.5rem\\]')).not.toBeNull()
    expect(manage.querySelector('.text-\\[2rem\\]')).not.toBeNull()
  })
})

describe('neither page keeps its own copy', () => {
  it('both membership pages render the shared hero', () => {
    for (const f of ['src/pages/membership/index.tsx', 'src/pages/profile/membership.tsx']) {
      const src = read(f)
      expect(src, `${f} should use the shared hero`).toContain('<MembershipHero')
      expect(src, `${f} should not keep its own gradient`).not.toContain('bg-gradient-to-t from-black/85')
      expect(src, `${f} should not keep its own back button`).not.toContain("aria-label=\"Back\"")
      expect(src, `${f} should not render OptimizedImage itself`).not.toContain('<OptimizedImage')
    }
  })

  it('the hero markup lives in exactly one file', () => {
    const hero = read('src/components/membership-hero.tsx')
    expect(hero).toContain('bg-gradient-to-t from-black/85')
    expect(hero).toContain('srcSetWidths={[640, 960, 1280, 1600]}')
  })
})
