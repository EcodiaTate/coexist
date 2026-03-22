/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from '@/components/avatar'

describe('Avatar', () => {
  it('renders with image when src provided', () => {
    render(<Avatar src="/avatar.jpg" name="Jane Doe" />)
    // Both the wrapper div (role="img") and <img> match role="img"
    const images = screen.getAllByRole('img', { name: 'Jane Doe' })
    expect(images.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByAltText('Jane Doe')).toBeInTheDocument()
  })

  it('renders initials when no src', () => {
    render(<Avatar name="Jane Doe" />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders single initial for single name', () => {
    render(<Avatar name="Jane" />)
    expect(screen.getByText('J')).toBeInTheDocument()
  })

  it('renders ? for empty name', () => {
    render(<Avatar name="" />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('renders ? for null name', () => {
    render(<Avatar name={null} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('shows online indicator when online', () => {
    render(<Avatar name="Jane" online />)
    expect(screen.getByLabelText('Online')).toBeInTheDocument()
  })

  it('does not show online indicator when not online', () => {
    render(<Avatar name="Jane" online={false} />)
    expect(screen.queryByLabelText('Online')).not.toBeInTheDocument()
  })

  it('renders loading skeleton', () => {
    render(<Avatar loading />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Loading avatar')
  })

  it('applies custom aria-label', () => {
    render(<Avatar name="Jane" aria-label="User avatar for Jane" />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'User avatar for Jane')
  })

  it('uses name as default aria-label', () => {
    render(<Avatar name="Jane Doe" />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Jane Doe')
  })
})
