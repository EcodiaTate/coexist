import { describe, it, expect } from 'vitest'
import { formatPrice, variantLabel } from '@/types/merch'

describe('formatPrice', () => {
  it('formats cents to AUD string', () => {
    expect(formatPrice(3500)).toBe('$35.00')
    expect(formatPrice(995)).toBe('$9.95')
    expect(formatPrice(0)).toBe('$0.00')
    expect(formatPrice(100)).toBe('$1.00')
    expect(formatPrice(99)).toBe('$0.99')
  })
})

describe('variantLabel', () => {
  it('combines size and colour', () => {
    expect(variantLabel({ size: 'M', colour: 'Green' })).toBe('M / Green')
  })

  it('returns size only when no colour', () => {
    expect(variantLabel({ size: 'L', colour: null })).toBe('L')
  })

  it('returns colour only when no size', () => {
    expect(variantLabel({ size: null, colour: 'Blue' })).toBe('Blue')
  })

  it('returns "Default" when both null', () => {
    expect(variantLabel({ size: null, colour: null })).toBe('Default')
  })
})
