/**
 * Payment provider seam - switch logic.
 *
 * Guards the double gate that keeps GreenPay OFF: the provider only resolves to
 * 'greenpay' when VITE_GREENPAY_ENABLED === 'true' AND a publishable key is
 * present. Every other combination falls back to Stripe. On greenpay-staging
 * the env is unset, so the default is always Stripe. See
 * GREENPAY-STAGING-DO-NOT-MERGE.md + status_board 97ee9a1e.
 */
import { describe, it, expect, afterEach, vi } from 'vitest'
import { resolvePaymentProviderId, isGreenPayConfigured } from '@/lib/payments/config'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('payment provider switch', () => {
  it('defaults to stripe when nothing is set (greenpay-staging reality)', () => {
    expect(resolvePaymentProviderId()).toBe('stripe')
    expect(isGreenPayConfigured()).toBe(false)
  })

  it('stays on stripe when the flag is on but no key is present', () => {
    vi.stubEnv('VITE_GREENPAY_ENABLED', 'true')
    vi.stubEnv('VITE_GREENPAY_PUBLISHABLE_KEY', '')
    expect(isGreenPayConfigured()).toBe(false)
    expect(resolvePaymentProviderId()).toBe('stripe')
  })

  it('stays on stripe when a key is present but the flag is off', () => {
    vi.stubEnv('VITE_GREENPAY_ENABLED', 'false')
    vi.stubEnv('VITE_GREENPAY_PUBLISHABLE_KEY', 'gp_test_placeholder')
    expect(isGreenPayConfigured()).toBe(false)
    expect(resolvePaymentProviderId()).toBe('stripe')
  })

  it('resolves to greenpay ONLY when flag is true AND a key is present', () => {
    vi.stubEnv('VITE_GREENPAY_ENABLED', 'true')
    vi.stubEnv('VITE_GREENPAY_PUBLISHABLE_KEY', 'gp_test_placeholder')
    expect(isGreenPayConfigured()).toBe(true)
    expect(resolvePaymentProviderId()).toBe('greenpay')
  })

  it('treats any non-"true" flag value as off', () => {
    vi.stubEnv('VITE_GREENPAY_ENABLED', '1')
    vi.stubEnv('VITE_GREENPAY_PUBLISHABLE_KEY', 'gp_test_placeholder')
    expect(resolvePaymentProviderId()).toBe('stripe')
  })
})
