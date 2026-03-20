import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/badge'

describe('Badge', () => {
  it('renders with activity variant', () => {
    render(
      <Badge variant="activity" activity="tree-planting">
        Tree Planting
      </Badge>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Tree Planting')
  })

  it('renders with tier variant', () => {
    render(
      <Badge variant="tier" tier="canopy">
        Canopy
      </Badge>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Canopy')
  })

  it('applies activity-specific colors', () => {
    render(
      <Badge variant="activity" activity="beach-cleanup">
        Beach
      </Badge>,
    )
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-blue-100')
    expect(badge.className).toContain('text-blue-800')
  })

  it('applies tier-specific colors', () => {
    render(
      <Badge variant="tier" tier="elder">
        Elder
      </Badge>,
    )
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('bg-amber-100')
  })

  it('renders with icon', () => {
    render(
      <Badge variant="activity" activity="wildlife" icon={<span data-testid="icon">🦜</span>}>
        Wildlife
      </Badge>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
  })

  it('supports aria-label', () => {
    render(
      <Badge variant="tier" tier="seedling" aria-label="Current tier: Seedling">
        Seedling
      </Badge>,
    )
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Current tier: Seedling')
  })

  it('applies small size', () => {
    render(
      <Badge variant="activity" activity="education" size="sm">
        Edu
      </Badge>,
    )
    const badge = screen.getByRole('status')
    expect(badge.className).toContain('text-[11px]')
  })
})
