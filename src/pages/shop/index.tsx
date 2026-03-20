import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ShoppingBag } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { SearchBar } from '@/components/search-bar'
import { Card } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { useProducts } from '@/hooks/use-merch'
import { useCart } from '@/hooks/use-cart'
import { formatPrice, type Product } from '@/types/merch'
import { cn } from '@/lib/cn'

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

/* ------------------------------------------------------------------ */
/*  Product card                                                       */
/* ------------------------------------------------------------------ */

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const inStock = product.variants.some((v) => v.stock > 0 && v.is_active)
  const lowStock = product.variants.every((v) => v.stock <= 5) && inStock

  return (
    <Card variant="merch" onClick={onClick} aria-label={product.name}>
      <div className="relative">
        <Card.Image
          src={product.images[0] ?? '/img/placeholder-merch.jpg'}
          alt={product.name}
          aspectRatio="1/1"
        />
        {!inStock && (
          <div className="absolute inset-0 bg-primary-950/50 flex items-center justify-center rounded-t-2xl">
            <span className="px-3 py-1.5 bg-white/90 rounded-full text-sm font-semibold text-primary-800">
              Sold out
            </span>
          </div>
        )}
        {lowStock && inStock && (
          <Card.Badge position="top-right">
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full">
              Low stock
            </span>
          </Card.Badge>
        )}
      </div>
      <Card.Content className="pb-3">
        <Card.Title className="text-sm line-clamp-1">{product.name}</Card.Title>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-heading font-bold text-primary-400">
            {formatPrice(product.base_price_cents)}
          </span>
          {product.avg_rating !== null && product.review_count > 0 && (
            <span className="text-xs text-primary-400">
              {'★'.repeat(Math.round(product.avg_rating))}{' '}
              ({product.review_count})
            </span>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main shop page                                                     */
/* ------------------------------------------------------------------ */

export default function ShopPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { data: products, isLoading } = useProducts()
  const cartCount = useCart((s) => s.itemCount())
  const [search, setSearch] = useState('')

  const filtered = products?.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['shop'] })
  }, [queryClient])

  return (
    <Page
      header={
        <Header
          title="Shop"
          back
          rightActions={
            <button
              type="button"
              onClick={() => navigate('/shop/cart')}
              className="relative flex items-center justify-center w-9 h-9 rounded-full text-primary-800 hover:bg-primary-50 cursor-pointer"
              aria-label={`Cart (${cartCount} items)`}
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                    'min-w-[18px] h-[18px] px-1 rounded-full',
                    'bg-primary-500 text-white text-[10px] font-bold',
                  )}
                >
                  {cartCount}
                </span>
              )}
            </button>
          }
        />
      }
    >
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 py-4">
        {/* Search */}
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search merch..."
          compact
          className="mb-4"
        />

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card.Skeleton key={i} hasImage lines={2} />
            ))}
          </div>
        ) : !filtered || filtered.length === 0 ? (
          <EmptyState
            illustration="search"
            title={search ? 'No results' : 'Coming soon'}
            description={
              search
                ? `No merch matching "${search}"`
                : 'Our merch store is getting stocked up!'
            }
          />
        ) : (
          <motion.div
            variants={shouldReduceMotion ? undefined : stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-3"
          >
            {filtered.map((product) => (
              <motion.div key={product.id} variants={fadeUp}>
                <ProductCard
                  product={product}
                  onClick={() => navigate(`/shop/${product.slug}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
      </PullToRefresh>
    </Page>
  )
}
