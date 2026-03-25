import { describe, it, expect, beforeEach } from 'vitest'
import { useCart } from '@/hooks/use-cart'
import type { Product, ProductVariant, PromoCode } from '@/types/merch'

// Helper factories
function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 'v-1',
    product_id: 'p-1',
    size: 'M',
    colour: 'Green',
    sku: 'TEE-M-GRN',
    price_cents: 3500,
    stock: 10,
    low_stock_threshold: 3,
    is_active: true,
    ...overrides,
  }
}

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-1',
    name: 'Co-Exist Tee',
    slug: 'coexist-tee',
    description: 'Organic cotton tee',
    images: [],
    category: 'apparel',
    status: 'active',
    base_price_cents: 3500,
    variants: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: 'promo-1',
    code: 'SAVE20',
    type: 'percentage',
    value: 20,
    min_order_amount: null,
    max_uses: null,
    uses_count: 0,
    valid_from: null,
    valid_to: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useCart (Zustand store)', () => {
  const product = makeProduct()
  const variant = makeVariant()
  const variant2 = makeVariant({ id: 'v-2', size: 'L', price_cents: 4000 })

  beforeEach(() => {
    useCart.getState().clear()
  })

  describe('addItem', () => {
    it('adds a new item to cart', () => {
      useCart.getState().addItem(product, variant)
      expect(useCart.getState().items).toHaveLength(1)
      expect(useCart.getState().items[0].quantity).toBe(1)
    })

    it('increments quantity if same variant exists', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().addItem(product, variant, 2)
      expect(useCart.getState().items).toHaveLength(1)
      expect(useCart.getState().items[0].quantity).toBe(3)
    })

    it('adds different variants as separate items', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().addItem(product, variant2)
      expect(useCart.getState().items).toHaveLength(2)
    })
  })

  describe('removeItem', () => {
    it('removes an item by variant id', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().addItem(product, variant2)
      useCart.getState().removeItem('v-1')
      expect(useCart.getState().items).toHaveLength(1)
      expect(useCart.getState().items[0].variant.id).toBe('v-2')
    })
  })

  describe('updateQuantity', () => {
    it('updates the quantity of an item', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().updateQuantity('v-1', 5)
      expect(useCart.getState().items[0].quantity).toBe(5)
    })

    it('removes item when quantity set to 0', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().updateQuantity('v-1', 0)
      expect(useCart.getState().items).toHaveLength(0)
    })

    it('removes item when quantity set to negative', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().updateQuantity('v-1', -1)
      expect(useCart.getState().items).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('empties the cart and resets promo code', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().setPromoCode(makePromo())
      useCart.getState().clear()
      expect(useCart.getState().items).toHaveLength(0)
      expect(useCart.getState().promoCode).toBeNull()
    })
  })

  describe('computed: itemCount', () => {
    it('returns total quantity across items', () => {
      useCart.getState().addItem(product, variant, 2)
      useCart.getState().addItem(product, variant2, 3)
      expect(useCart.getState().itemCount()).toBe(5)
    })

    it('returns 0 for empty cart', () => {
      expect(useCart.getState().itemCount()).toBe(0)
    })
  })

  describe('computed: subtotalCents', () => {
    it('calculates subtotal from item prices and quantities', () => {
      useCart.getState().addItem(product, variant, 2) // 3500 * 2 = 7000
      useCart.getState().addItem(product, variant2, 1) // 4000 * 1 = 4000
      expect(useCart.getState().subtotalCents()).toBe(11000)
    })
  })

  describe('computed: discountCents', () => {
    it('returns 0 with no promo code', () => {
      useCart.getState().addItem(product, variant)
      expect(useCart.getState().discountCents()).toBe(0)
    })

    it('calculates percentage discount', () => {
      useCart.getState().addItem(product, variant, 2) // subtotal = 7000
      useCart.getState().setPromoCode(makePromo({ type: 'percentage', value: 10 }))
      expect(useCart.getState().discountCents()).toBe(700)
    })

    it('calculates flat discount capped at subtotal', () => {
      useCart.getState().addItem(product, variant) // subtotal = 3500 cents = $35
      useCart.getState().setPromoCode(makePromo({ type: 'flat', value: 50 })) // $50 → 5000 cents, capped at subtotal
      expect(useCart.getState().discountCents()).toBe(3500) // capped
    })

    it('returns 0 for free_shipping promo type', () => {
      useCart.getState().addItem(product, variant)
      useCart.getState().setPromoCode(makePromo({ type: 'free_shipping', value: 0 }))
      expect(useCart.getState().discountCents()).toBe(0)
    })

    it('returns 0 if subtotal below min_order_amount', () => {
      useCart.getState().addItem(product, variant) // subtotal = 3500 cents = $35
      useCart.getState().setPromoCode(
        makePromo({ type: 'percentage', value: 20, min_order_amount: 50 }), // $50 minimum
      )
      expect(useCart.getState().discountCents()).toBe(0)
    })
  })

  describe('computed: shippingCents', () => {
    it('returns flat rate for small orders', () => {
      useCart.getState().addItem(product, variant) // 3500 < 10000
      expect(useCart.getState().shippingCents()).toBe(995)
    })

    it('returns 0 when subtotal >= free shipping threshold', () => {
      useCart.getState().addItem(product, variant, 3) // 10500 >= 10000
      expect(useCart.getState().shippingCents()).toBe(0)
    })

    it('returns 0 with free_shipping promo', () => {
      useCart.getState().addItem(product, variant) // subtotal below threshold
      useCart.getState().setPromoCode(makePromo({ type: 'free_shipping', value: 0 }))
      expect(useCart.getState().shippingCents()).toBe(0)
    })
  })

  describe('computed: totalCents', () => {
    it('calculates subtotal - discount + shipping', () => {
      useCart.getState().addItem(product, variant, 2) // subtotal = 7000
      useCart.getState().setPromoCode(makePromo({ type: 'percentage', value: 10 })) // discount = 700
      // shipping = 995 (7000 < 10000)
      expect(useCart.getState().totalCents()).toBe(7000 - 700 + 995)
    })

    it('never goes below 0', () => {
      useCart.getState().addItem(product, variant) // 3500
      useCart.getState().setPromoCode(makePromo({ type: 'flat', value: 999.99 }))
      expect(useCart.getState().totalCents()).toBeGreaterThanOrEqual(0)
    })
  })
})
