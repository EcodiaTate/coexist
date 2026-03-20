/** Merch store types for Co-Exist */

export type ProductStatus = 'active' | 'archived' | 'draft'
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
export type ReturnStatus = 'requested' | 'approved' | 'denied' | 'refunded'
export type PromoType = 'percentage' | 'flat' | 'free_shipping'

export interface ProductVariant {
  id: string
  product_id: string
  size: string | null
  colour: string | null
  sku: string
  price_cents: number
  stock: number
  low_stock_threshold: number
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  images: string[]
  category: string | null
  status: ProductStatus
  base_price_cents: number
  variants: ProductVariant[]
  avg_rating: number | null
  review_count: number
  created_at: string
  updated_at: string
}

export interface ProductReview {
  id: string
  product_id: string
  user_id: string
  rating: number
  text: string | null
  status: 'pending' | 'approved' | 'removed'
  created_at: string
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export interface CartItem {
  product: Product
  variant: ProductVariant
  quantity: number
}

export interface PromoCode {
  id: string
  code: string
  type: PromoType
  value: number
  min_order_cents: number | null
  max_uses: number | null
  uses: number
  expires_at: string | null
  is_active: boolean
  created_at: string
}

export interface ShippingAddress {
  id?: string
  full_name: string
  line1: string
  line2: string | null
  city: string
  state: string
  postcode: string
  country: string
  phone: string | null
}

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  items: OrderItem[]
  subtotal_cents: number
  shipping_cents: number
  discount_cents: number
  total_cents: number
  promo_code_id: string | null
  shipping_address: ShippingAddress
  tracking_number: string | null
  stripe_payment_intent_id: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  variant_id: string
  product_name: string
  variant_label: string
  price_cents: number
  quantity: number
  image_url: string | null
}

export interface ReturnRequest {
  id: string
  order_id: string
  user_id: string
  reason: string
  status: ReturnStatus
  admin_notes: string | null
  created_at: string
  updated_at: string
  order?: Order
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export interface SalesAnalytics {
  total_revenue_cents: number
  total_orders: number
  total_units_sold: number
  by_product: { product_id: string; product_name: string; revenue_cents: number; units: number }[]
  by_period: { date: string; revenue_cents: number; orders: number }[]
}

export interface ShippingConfig {
  flat_rate_cents: number
  free_shipping_threshold_cents: number | null
}

/** Format cents to AUD display string */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/** Build a human-readable variant label */
export function variantLabel(v: Pick<ProductVariant, 'size' | 'colour'>): string {
  return [v.size, v.colour].filter(Boolean).join(' / ') || 'Default'
}
