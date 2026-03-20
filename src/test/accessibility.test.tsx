import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '@/components/button'

/**
 * Accessibility audit setup with axe-core.
 *
 * Note: Full axe-core integration requires `@axe-core/react` in dev mode
 * and `axe-core` for programmatic audits. These tests validate basic
 * accessibility patterns; run the full audit with:
 *
 *   import { axe, toHaveNoViolations } from 'jest-axe'
 *
 * For comprehensive audits, use Lighthouse CI or the axe browser extension.
 */

describe('Accessibility basics', () => {
  it('buttons are accessible by role', () => {
    const { getByRole } = render(<Button>Submit</Button>)
    const btn = getByRole('button')
    expect(btn).toBeDefined()
    expect(btn.textContent).toBe('Submit')
  })

  it('disabled buttons have aria-disabled', () => {
    const { getByRole } = render(<Button disabled>Nope</Button>)
    expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true')
  })

  it('loading buttons have aria-busy', () => {
    const { getByRole } = render(<Button loading>Wait</Button>)
    expect(getByRole('button')).toHaveAttribute('aria-busy', 'true')
  })

  it('buttons accept aria-label for icon-only use', () => {
    const { getByRole } = render(
      <Button aria-label="Close dialog" icon={<span>×</span>} />,
    )
    expect(getByRole('button')).toHaveAttribute('aria-label', 'Close dialog')
  })
})
