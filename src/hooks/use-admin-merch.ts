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
      const { data, error } = await supabase.from('merch_products').insert(product).select().single()
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
      const { error } = await supabase.from('merch_products').update(updates).eq('id', id)
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
        const { error } = await supabase.rpc('increment_stock', {
          p_product_id: productId,
          p_variant_key: variantKey,
          p_quantity: adjustment,
        })
        if (error) throw error
      } else if (adjustment < 0) {
        const { error } = await supabase.rpc('decrement_stock', {
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
      const { error } = await supabase.from('promo_codes').upsert(promo)
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
        .select('*, order:merch_orders(id, status, total), profiles(display_name, avatar_url)')
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
    total: Number(o.total).toFixed(2),
    tracking: o.tracking_number ?? '',
    address: o.shipping_address
      ? `${o.shipping_address.line1 ?? ''}, ${o.shipping_address.city ?? ''} ${o.shipping_address.state ?? ''} ${o.shipping_address.postcode ?? ''}`
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
