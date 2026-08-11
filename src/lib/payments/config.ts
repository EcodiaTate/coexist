/**
 * Payment provider resolution - client side.
 *
 * The active provider is Stripe UNLESS GreenPay is BOTH explicitly enabled
 * (`VITE_GREENPAY_ENABLED === 'true'`) AND has a publishable key present. This
 * double gate means an accidental flag flip with no key still falls back to
 * Stripe rather than routing money at an unconfigured gateway.
 *
 * STAGING ONLY - `VITE_GREENPAY_ENABLED` is absent/false everywhere today, so
 * this always resolves to 'stripe'. See GREENPAY-STAGING-DO-NOT-MERGE.md.
 */

import type { PaymentProviderId } from './types'

export function isGreenPayEnabledFlag(): boolean {
  return import.meta.env.VITE_GREENPAY_ENABLED === 'true'
}

export function greenPayPublishableKey(): string {
  return import.meta.env.VITE_GREENPAY_PUBLISHABLE_KEY ?? ''
}

export function isGreenPayConfigured(): boolean {
  return isGreenPayEnabledFlag() && greenPayPublishableKey().length > 0
}

/**
 * Resolve the active provider id. Defaults to 'stripe' and only returns
 * 'greenpay' when the double gate above is satisfied.
 */
export function resolvePaymentProviderId(): PaymentProviderId {
  return isGreenPayConfigured() ? 'greenpay' : 'stripe'
}
