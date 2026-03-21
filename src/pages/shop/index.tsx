import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ShoppingBag, Star, Sparkles, Lock, Tag } from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { SearchBar } from '@/components/search-bar'
import { Card } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { Button } from '@/components/button'
import { useProducts } from '@/hooks/use-merch'
import { useCart } from '@/hooks/use-cart'
import { usePartnerPerks, type PartnerPerk } from '@/hooks/use-partner-perks'
import { useMyMembership } from '@/hooks/use-membership'
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
  const placeholderMerch = useAppImage('placeholder_merch')
  const inStock = product.variants.some((v) => v.stock > 0 && v.is_active)
  const lowStock = product.variants.every((v) => v.stock <= 5) && inStock

  return (
    <Card variant="merch" onClick={onClick} aria-label={product.name}>
      <div className="relative">
        <Card.Image
          src={product.images[0] ?? placeholderMerch}
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
            <span className="px-2 py-0.5 bg-warning-100 text-warning-800 text-xs font-semibold rounded-full">
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
            <span className="flex items-center gap-0.5 text-xs text-primary-400">
              {Array.from({ length: Math.round(product.avg_rating) }).map((_, i) => (
                <Star key={i} size={12} className="text-warning-400" fill="currentColor" />
              ))}
              {' '}({product.review_count})
            </span>
          )}
        </div>
      </Card.Content>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Partner perk card                                                  */
/* ------------------------------------------------------------------ */

function PerkCard({ perk, isMember }: { perk: PartnerPerk; isMember: boolean }) {
  return (
    <div className="shrink-0 w-64 p-4 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-100/60 border border-primary-100/50 shadow-sm">
      <div className="flex items-start gap-3">
        {perk.partner_logo_url ? (
          <img
            src={perk.partner_logo_url}
            alt={perk.partner_name}
            className="w-10 h-10 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center shrink-0">
            <Tag size={16} className="text-primary-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary-800 line-clamp-1">{perk.title}</p>
          <p className="text-xs text-primary-500 mt-0.5">{perk.partner_name}</p>
        </div>
      </div>

      {perk.description && (
        <p className="text-xs text-primary-500 mt-2 line-clamp-2">{perk.description}</p>
      )}

      {/* Discount code or locked state */}
      <div className="mt-3">
        {isMember ? (
          <>
            {perk.discount_code && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80">
                <Sparkles size={14} className="text-primary-500 shrink-0" />
                <span className="text-sm font-mono font-bold text-primary-700 tracking-wide">
                  {perk.discount_code}
                </span>
              </div>
            )}
            {perk.discount_percent && !perk.discount_code && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80">
                <Sparkles size={14} className="text-primary-500 shrink-0" />
                <span className="text-sm font-semibold text-primary-700">
                  {perk.discount_percent}% off
                </span>
              </div>
            )}
            {perk.points_cost && perk.points_cost > 0 && (
              <p className="text-[10px] text-primary-400 mt-1.5">{perk.points_cost} points to redeem</p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm">
            <Lock size={14} className="text-primary-300 shrink-0" />
            <span className="text-xs font-medium text-primary-400">Join to unlock</span>
          </div>
        )}
      </div>

      {perk.category && (
        <span className="inline-block mt-2.5 px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-medium text-primary-500 capitalize">
          {perk.category}
        </span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Partner perks section                                              */
/* ------------------------------------------------------------------ */

function PartnerPerksSection({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  const navigate = useNavigate()
  const { data: perks } = usePartnerPerks()
  const { data: membership } = useMyMembership()
  const isMember = !!membership

  if (!perks || perks.length === 0) return null

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : fadeUp}
      className="mt-6"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary-500" />
          <h2 className="font-heading font-bold text-primary-800">
            Member Perks
          </h2>
        </div>
        {!isMember && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/membership')}
          >
            Learn more
          </Button>
        )}
      </div>

      {!isMember && (
        <p className="text-xs text-primary-400 mb-3">
          Exclusive partner discounts for Co-Exist members
        </p>
      )}

      <div className="-mx-4 lg:-mx-6">
        <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
          {perks.map((perk) => (
            <PerkCard key={perk.id} perk={perk} isMember={isMember} />
          ))}
        </div>
      </div>
    </motion.div>
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
              className="relative flex items-center justify-center min-w-11 min-h-11 rounded-full text-primary-800 hover:bg-surface-3 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
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
      <div className="py-4">
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
          >
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((product) => (
                <motion.div key={product.id} variants={fadeUp}>
                  <ProductCard
                    product={product}
                    onClick={() => navigate(`/shop/${product.slug}`)}
                  />
                </motion.div>
              ))}
            </div>

            {/* Partner perks section */}
            <PartnerPerksSection shouldReduceMotion={shouldReduceMotion} />
          </motion.div>
        )}
      </div>
      </PullToRefresh>
    </Page>
  )
}
