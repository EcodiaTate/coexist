import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Product, ProductReview, ShippingConfig } from '@/types/merch'

/* ------------------------------------------------------------------ */
/*  Product listing                                                    */
/* ------------------------------------------------------------------ */

export function useProducts(category?: string) {
  return useQuery({
    queryKey: ['products', category],
    queryFn: async () => {
      let query = supabase
        .from('products' as any)
        .select('*, variants:product_variants(*)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query
      if (error) throw error
      return data as unknown as Product[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Single product detail                                              */
/* ------------------------------------------------------------------ */

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ['product', slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products' as any)
        .select('*, variants:product_variants(*)')
        .eq('slug', slug!)
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

export function useRelatedProducts(productId: string | undefined, category: string | null) {
  return useQuery({
    queryKey: ['related-products', productId, category],
    enabled: !!productId,
    queryFn: async () => {
      let query = supabase
        .from('products' as any)
        .select('*, variants:product_variants(*)')
        .eq('status', 'active')
        .neq('id', productId!)
        .limit(4)

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query
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
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as ProductReview[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Promo code validation                                              */
/* ------------------------------------------------------------------ */

export function useValidatePromo() {
  return useQuery({
    queryKey: ['validate-promo'],
    enabled: false, // manually triggered
    queryFn: async () => null,
  })
}

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

/* ------------------------------------------------------------------ */
/*  Shipping config                                                    */
/* ------------------------------------------------------------------ */

export function useShippingConfig() {
  return useQuery({
    queryKey: ['shipping-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_config' as any)
        .select('*')
        .limit(1)
        .single()
      if (error) {
        // Default fallback
        return { flat_rate_cents: 995, free_shipping_threshold_cents: 10000 } as ShippingConfig
      }
      return data as unknown as ShippingConfig
    },
    staleTime: 10 * 60 * 1000,
  })
}
