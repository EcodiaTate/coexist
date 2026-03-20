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
  SalesAnalytics,
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
        .from('products' as any)
        .select('*, variants:product_variants(*)')
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
      const { data, error } = await supabase.from('products' as any).insert(product).select().single()
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
      const { error } = await supabase.from('products' as any).update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Variant management                                                 */
/* ------------------------------------------------------------------ */

export function useUpsertVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (variant: Omit<ProductVariant, 'id'> & { id?: string }) => {
      const { error } = await supabase.from('product_variants' as any).upsert(variant)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
  })
}

export function useAdjustStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      variantId,
      adjustment,
      reason,
    }: {
      variantId: string
      adjustment: number
      reason: string
    }) => {
      // Record the adjustment
      await supabase.from('stock_adjustments' as any).insert({
        variant_id: variantId,
        adjustment,
        reason,
      })
      // Update the stock count
      const { error } = await supabase.rpc('adjust_variant_stock' as any, {
        p_variant_id: variantId,
        p_adjustment: adjustment,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }),
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
        .from('orders' as any)
        .select('*, items:order_items(*), profiles(display_name, avatar_url)')
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
      const updates: Record<string, unknown> = { status }
      if (trackingNumber) updates.tracking_number = trackingNumber
      const { error } = await supabase.from('orders' as any).update(updates).eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })
}

export function useRefundOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: string) => {
      const res = await supabase.functions.invoke('create-checkout', {
        body: { type: 'refund', order_id: orderId },
      })
      if (res.error) throw res.error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Sales analytics                                                    */
/* ------------------------------------------------------------------ */

export function useSalesAnalytics(period: 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['sales-analytics', period],
    queryFn: async () => {
      const res = await supabase.rpc('get_sales_analytics' as any, { p_period: period })
      if (res.error) throw res.error
      return res.data as unknown as SalesAnalytics
    },
    staleTime: 5 * 60 * 1000,
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
        .from('promo_codes' as any)
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
      const { error } = await supabase.from('promo_codes' as any).upsert(promo)
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
        .select('*, order:orders(id, status, total_cents), profiles(display_name, avatar_url)')
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
        .update({ status, admin_notes: adminNotes ?? null } as any)
        .eq('id', returnId)
      if (error) throw error

      // If approved, trigger refund
      if (status === 'approved') {
        const { data: ret } = await supabase
          .from('return_requests' as any)
          .select('order_id')
          .eq('id', returnId)
          .single()
        if (ret) {
          await supabase.functions.invoke('create-checkout', {
            body: { type: 'refund', order_id: (ret as any).order_id },
          })
        }
      }
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
        .from('product_reviews' as any)
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
      status,
    }: {
      reviewId: string
      status: 'approved' | 'removed'
    }) => {
      const { error } = await supabase
        .from('product_reviews' as any)
        .update({ status } as any)
        .eq('id', reviewId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-reviews'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Shipping config                                                    */
/* ------------------------------------------------------------------ */

export function useUpdateShippingConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (config: ShippingConfig) => {
      const { error } = await supabase
        .from('shipping_config' as any)
        .upsert({ id: 'default', ...config })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shipping-config'] }),
  })
}

/* ------------------------------------------------------------------ */
/*  Export orders CSV                                                   */
/* ------------------------------------------------------------------ */

export async function exportOrdersCsv(statusFilter?: OrderStatus) {
  let query = supabase
    .from('orders' as any)
    .select('*, items:order_items(*), profiles(display_name)')
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query
  if (error) throw error

  const rows = (data as unknown as (Order & { profiles: { display_name: string | null } | null })[]).map((o) => ({
    order_id: o.id,
    date: o.created_at,
    customer: o.profiles?.display_name ?? 'Unknown',
    status: o.status,
    items: o.items.map((i) => `${i.product_name} x${i.quantity}`).join('; '),
    subtotal: (o.subtotal_cents / 100).toFixed(2),
    shipping: (o.shipping_cents / 100).toFixed(2),
    discount: (o.discount_cents / 100).toFixed(2),
    total: (o.total_cents / 100).toFixed(2),
    tracking: o.tracking_number ?? '',
    address: `${o.shipping_address.line1}, ${o.shipping_address.city} ${o.shipping_address.state} ${o.shipping_address.postcode}`,
  }))

  const headers = Object.keys(rows[0] ?? {})
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
