import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Product,
  ProductVariant,
  Order,
  OrderStatus,
  PromoCode,
  ReturnRequest,
  ProductReview,
  ShippingConfig,
} from '@/types/merch'

/* ------------------------------------------------------------------ */
/*  Products (admin - includes archived & draft)                       */
/* ------------------------------------------------------------------ */

export function useAdminProducts() {
  return useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_products')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Product[]
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Product CRUD                                                       */
/* ------------------------------------------------------------------ */

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'variants' | 'avg_rating' | 'review_count' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('merch_products').insert(product as any).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from('merch_products').update(updates as any).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Stock management (uses merch_inventory table)                      */
/* ------------------------------------------------------------------ */

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      variantKey,
      adjustment,
    }: {
      productId: string
      variantKey: string
      adjustment: number
    }) => {
      if (adjustment > 0) {
        const { error } = await (supabase as any).rpc('increment_stock', {
          p_product_id: productId,
          p_variant_key: variantKey,
          p_quantity: adjustment,
        })
        if (error) throw error
      } else if (adjustment < 0) {
        const { error } = await (supabase as any).rpc('decrement_stock', {
          p_product_id: productId,
          p_variant_key: variantKey,
          p_quantity: Math.abs(adjustment),
        })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })
}

export function useProductInventory(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-inventory', productId],
    queryFn: async () => {
      if (!productId) return []
      const { data, error } = await supabase
        .from('merch_inventory')
        .select('*')
        .eq('product_id', productId)
      if (error) throw error
      return data
    },
    enabled: !!productId,
    staleTime: 30 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Orders (admin)                                                     */
/* ------------------------------------------------------------------ */

export function useAdminOrders(statusFilter?: OrderStatus) {
  return useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('merch_orders')
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data as any as (Order & { profiles: { display_name: string | null; avatar_url: string | null } | null })[]
    },
    staleTime: 30 * 1000,
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      trackingNumber,
    }: {
      orderId: string
      status: OrderStatus
      trackingNumber?: string
    }) => {
      const updates: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      }
      if (trackingNumber) updates.tracking_number = trackingNumber

      const { error } = await supabase
        .from('merch_orders')
        .update(updates)
        .eq('id', orderId)
      if (error) throw error

      // If marking as shipped, send order_shipped email
      if (status === 'shipped') {
        const { data: order } = await supabase
          .from('merch_orders')
          .select('user_id')
          .eq('id', orderId)
          .single()

        if (order?.user_id) {
          supabase.functions.invoke('send-email', {
            body: {
              type: 'order_shipped',
              userId: order.user_id,
              data: {
                name: '',
                order_id: orderId.slice(0, 8),
                tracking_number: trackingNumber ?? '',
                tracking_url: trackingNumber
                  ? `https://auspost.com.au/mypost/track/#/details/${trackingNumber}`
                  : '',
              },
            },
          }).catch(console.error)
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Refund order                                                       */
/* ------------------------------------------------------------------ */

export function useRefundOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      // Mark order as refunded — actual Stripe refund should be processed
      // via Stripe dashboard. The charge.refunded webhook handles inventory
      // restoration automatically.
      const { error } = await supabase
        .from('merch_orders')
        .update({ status: 'refunded', updated_at: new Date().toISOString() })
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Variant upsert (add/update product variants via JSONB)             */
/* ------------------------------------------------------------------ */

export function useUpsertVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      variant,
    }: {
      productId: string
      variant: Omit<ProductVariant, 'product_id'> & { id?: string }
    }) => {
      // Fetch current product to get existing variants
      const { data: product, error: fetchErr } = await supabase
        .from('merch_products')
        .select('variants')
        .eq('id', productId)
        .single()
      if (fetchErr) throw fetchErr

      const existing = (product?.variants ?? []) as unknown as ProductVariant[]
      let updated: ProductVariant[]

      if (variant.id) {
        // Update existing variant
        updated = existing.map((v) =>
          v.id === variant.id ? { ...v, ...variant, product_id: productId } : v,
        )
      } else {
        // Add new variant with generated id
        const newVariant = {
          ...variant,
          id: crypto.randomUUID(),
          product_id: productId,
        } as ProductVariant
        updated = [...existing, newVariant]
      }

      const { error } = await supabase
        .from('merch_products')
        .update({ variants: updated as any })
        .eq('id', productId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Order admin notes                                                  */
/* ------------------------------------------------------------------ */

export function useUpdateOrderNotes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      const { error } = await supabase
        .from('merch_orders')
        .update({ admin_notes: notes, updated_at: new Date().toISOString() } as any)
        .eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Promo code management                                              */
/* ------------------------------------------------------------------ */

export function useAdminPromoCodes() {
  return useQuery({
    queryKey: ['admin-promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as PromoCode[]
    },
    staleTime: 60 * 1000,
  })
}

export function useUpsertPromoCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (promo: Partial<PromoCode> & { code: string }) => {
      const { error } = await supabase.from('promo_codes').upsert(promo as any)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-promo-codes'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Returns management                                                 */
/* ------------------------------------------------------------------ */

export function useAdminReturns() {
  return useQuery({
    queryKey: ['admin-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('return_requests' as any)
        .select('*, order:merch_orders(id, status, total_cents), profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ReturnRequest[]
    },
    staleTime: 60 * 1000,
  })
}

export function useUpdateReturnStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      returnId,
      status,
      adminNotes,
    }: {
      returnId: string
      status: 'approved' | 'denied'
      adminNotes?: string
    }) => {
      const { error } = await supabase
        .from('return_requests' as any)
        .update({
          status,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq('id', returnId)
      if (error) throw error

      // Note: Refunds should be processed via the Stripe dashboard.
      // The create-checkout function only handles checkout session creation,
      // not refunds. Stripe refunds trigger the charge.refunded webhook
      // which handles inventory restoration automatically.
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-returns'] })
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Review moderation                                                  */
/* ------------------------------------------------------------------ */

export function useAdminReviews() {
  return useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ProductReview[]
    },
    staleTime: 60 * 1000,
  })
}

export function useModerateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      reviewId,
      approved,
    }: {
      reviewId: string
      approved: boolean
    }) => {
      if (approved) {
        const { error } = await supabase
          .from('product_reviews')
          .update({ is_approved: true })
          .eq('id', reviewId)
        if (error) throw error
      } else {
        // Remove = delete the review
        const { error } = await supabase
          .from('product_reviews')
          .delete()
          .eq('id', reviewId)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Shipping config (admin)                                            */
/* ------------------------------------------------------------------ */

export function useUpdateShippingConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (config: { flat_rate_cents: number; free_shipping_threshold_cents: number | null }) => {
      const entries = [
        { key: 'flat_rate_cents', value: String(config.flat_rate_cents) },
        { key: 'free_shipping_threshold_cents', value: config.free_shipping_threshold_cents != null ? String(config.free_shipping_threshold_cents) : '' },
      ]
      for (const entry of entries) {
        const { error } = await supabase
          .from('shipping_config' as any)
          .upsert(entry, { onConflict: 'key' })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-config'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Sales analytics                                                    */
/* ------------------------------------------------------------------ */

export function useSalesAnalytics(period: 'week' | 'month' | 'year') {
  return useQuery({
    queryKey: ['admin-sales-analytics', period],
    queryFn: async () => {
      const now = new Date()
      let rangeStart: Date
      switch (period) {
        case 'week':
          rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          rangeStart = new Date(now.getFullYear(), 0, 1)
          break
      }

      const { data, error } = await supabase
        .from('merch_orders')
        .select('total_cents, items, created_at')
        .gte('created_at', rangeStart.toISOString())
        .in('status', ['delivered', 'shipped', 'processing'])

      if (error) throw error

      const orders = (data ?? []) as any[]
      const total_revenue_cents = orders.reduce((sum: number, o: any) => sum + (o.total_cents ?? 0), 0)
      const total_orders = orders.length
      const total_units_sold = orders.reduce((sum: number, o: any) => {
        if (!Array.isArray(o.items)) return sum
        return sum + o.items.reduce((s: number, i: any) => s + (i.quantity ?? 1), 0)
      }, 0)

      const productMap = new Map<string, { product_id: string; product_name: string; units: number; revenue_cents: number }>()
      for (const o of orders) {
        if (!Array.isArray(o.items)) continue
        for (const item of o.items) {
          const key = item.product_id ?? item.product_name ?? 'unknown'
          const existing = productMap.get(key) ?? { product_id: key, product_name: item.product_name ?? key, units: 0, revenue_cents: 0 }
          existing.units += item.quantity ?? 1
          existing.revenue_cents += (item.price_cents ?? 0) * (item.quantity ?? 1)
          productMap.set(key, existing)
        }
      }
      const by_product = Array.from(productMap.values()).sort((a, b) => b.revenue_cents - a.revenue_cents)

      const dateMap = new Map<string, { date: string; orders: number; revenue_cents: number }>()
      for (const o of orders) {
        const date = o.created_at?.slice(0, 10) ?? 'unknown'
        const existing = dateMap.get(date) ?? { date, orders: 0, revenue_cents: 0 }
        existing.orders++
        existing.revenue_cents += o.total_cents ?? 0
        dateMap.set(date, existing)
      }
      const by_period = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date))

      return { total_revenue_cents, total_orders, total_units_sold, by_product, by_period }
    },
    staleTime: 2 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Export orders CSV                                                   */
/* ------------------------------------------------------------------ */

export async function exportOrdersCsv(statusFilter?: OrderStatus) {
  let query = supabase
    .from('merch_orders')
    .select('*, profiles(display_name)')
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) throw error

  const rows = (data as any[]).map((o) => ({
    order_id: o.id,
    date: o.created_at,
    customer: o.profiles?.display_name ?? 'Unknown',
    status: o.status,
    items: Array.isArray(o.items)
      ? o.items.map((i: any) => `${i.product_name ?? i.product_id} x${i.quantity}`).join('; ')
      : '',
    total: ((o.total_cents ?? 0) / 100).toFixed(2),
    tracking: o.tracking_number ?? '',
    address: o.shipping_address
      ? `${o.shipping_address}, ${o.shipping_city ?? ''} ${o.shipping_state ?? ''} ${o.shipping_postcode ?? ''}`
      : '',
  }))

  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r) =>
      headers.map((h) => `"${String((r as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(','),
    ),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
