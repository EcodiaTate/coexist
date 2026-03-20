import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, ProductReview, ShippingConfig } from '@/types/merch'

/* ------------------------------------------------------------------ */
/*  Product listing                                                    */
/* ------------------------------------------------------------------ */

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as unknown as Product[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Single product detail                                              */
/* ------------------------------------------------------------------ */

export function useProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['product', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_products')
        .select('*')
        .eq('id', productId!)
        .single()
      if (error) throw error
      return data as unknown as Product
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Related products                                                   */
/* ------------------------------------------------------------------ */

export function useRelatedProducts(productId: string | undefined) {
  return useQuery({
    queryKey: ['related-products', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_products')
        .select('*')
        .eq('is_active', true)
        .neq('id', productId!)
        .limit(4)

      if (error) throw error
      return data as unknown as Product[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Product reviews                                                    */
/* ------------------------------------------------------------------ */

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*, profiles(display_name, avatar_url)')
        .eq('product_id', productId!)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ProductReview[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Product inventory (stock check for variant)                        */
/* ------------------------------------------------------------------ */

export function useProductStock(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-stock', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merch_inventory')
        .select('variant_key, stock_count, low_stock_threshold')
        .eq('product_id', productId!)
      if (error) throw error
      const map = new Map<string, number>()
      for (const row of data ?? []) {
        map.set(row.variant_key, row.stock_count)
      }
      return map
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Promo code validation                                              */
/* ------------------------------------------------------------------ */

/** Validate a promo code (called imperatively) */
export async function validatePromoCode(code: string) {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase().trim())
    .eq('is_active', true)
    .single()

  if (error || !data) return { valid: false, promo: null }

  const now = new Date()
  if (data.valid_to && new Date(data.valid_to) < now) return { valid: false, promo: null }
  if (data.max_uses && data.uses_count >= data.max_uses) return { valid: false, promo: null }

  return { valid: true, promo: data }
}
