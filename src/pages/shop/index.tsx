import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  ShoppingBag,
  Star,
  Sparkles,
  Lock,
  Tag,
  Leaf,
  ChevronRight,
  TrendingUp,
  Package,
  Heart,
} from 'lucide-react'
import { useAppImage, useAppImages } from '@/hooks/use-app-images'
import { Page } from '@/components/page'
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

/* ------------------------------------------------------------------ */
/*  Animations                                                         */
/* ------------------------------------------------------------------ */

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}

/* ------------------------------------------------------------------ */
/*  Category pills                                                     */
/* ------------------------------------------------------------------ */

const CATEGORY_ALL = '__all__'

function CategoryPills({
  categories,
  active,
  onChange,
}: {
  categories: string[]
  active: string
  onChange: (cat: string) => void
}) {
  return (
    <div className="relative -mx-4 lg:-mx-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-surface-1 to-transparent" />
      <div
        className="flex gap-2 overflow-x-auto px-4 lg:px-6 pb-1 scrollbar-none snap-x snap-proximity"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => onChange(CATEGORY_ALL)}
          className={cn(
            'shrink-0 snap-start px-4 h-9 rounded-full text-sm font-medium transition-all duration-150 select-none cursor-pointer',
            'active:scale-[0.96]',
            active === CATEGORY_ALL
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-surface-2 text-primary-600 hover:bg-surface-3',
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              'shrink-0 snap-start px-4 h-9 rounded-full text-sm font-medium capitalize transition-all duration-150 select-none cursor-pointer whitespace-nowrap',
              'active:scale-[0.96]',
              active === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-surface-2 text-primary-600 hover:bg-surface-3',
            )}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero section                                                       */
/* ------------------------------------------------------------------ */

function ShopHero({
  cartCount,
  onCartClick,
  onBack,
}: {
  cartCount: number
  onCartClick: () => void
  onBack: () => void
}) {
  const { data: appImages } = useAppImages()
  const heroUrl = appImages?.shop_hero

  return (
    <div className="relative -mx-4 lg:-mx-6">
      <div className="relative w-full min-h-[240px] sm:min-h-[300px] overflow-hidden">
        {/* Background */}
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
            {/* Decorative leaf pattern when no image */}
            <div className="absolute inset-0 opacity-[0.06]">
              <Leaf className="absolute top-8 left-[10%] w-24 h-24 rotate-[-20deg]" />
              <Leaf className="absolute bottom-12 right-[15%] w-16 h-16 rotate-[35deg]" />
              <Leaf className="absolute top-[40%] right-[30%] w-20 h-20 rotate-[10deg]" />
              <Leaf className="absolute bottom-4 left-[35%] w-12 h-12 rotate-[-45deg]" />
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/5" />

        {/* Top bar: back + cart */}
        <div
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)' }}
        >
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:scale-[0.95] transition-transform cursor-pointer"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onCartClick}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white active:scale-[0.95] transition-transform cursor-pointer"
            aria-label={`Cart (${cartCount} items)`}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span
                className={cn(
                  'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                  'min-w-[18px] h-[18px] px-1 rounded-full',
                  'bg-white text-primary-700 text-[10px] font-bold',
                )}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex flex-col justify-end h-full min-h-[240px] sm:min-h-[300px] px-5 pb-6">
          <h1 className="font-heading text-[1.75rem] sm:text-3xl font-bold text-white leading-tight tracking-tight">
            Co-Exist Shop
          </h1>
          <p className="text-white/75 text-sm mt-1.5 max-w-xs">
            Wear the movement. Every purchase funds conservation.
          </p>
        </div>
      </div>

    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Product card (redesigned)                                          */
/* ------------------------------------------------------------------ */

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const placeholderMerch = useAppImage('placeholder_merch')
  const inStock = product.variants.some((v) => v.stock > 0 && v.is_active)
  const lowStock = product.variants.every((v) => v.stock <= 5) && inStock

  return (
    <motion.div
      variants={scaleIn}
      whileTap={{ scale: 0.97 }}
      className="cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={product.name}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
    >
      <div className="relative rounded-2xl bg-surface-2 shadow-md overflow-hidden group">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-surface-2">
          <img
            src={product.images[0] ?? placeholderMerch}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Soft bottom gradient for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/15 to-transparent" />

          {!inStock && (
            <div className="absolute inset-0 bg-primary-950/40 backdrop-blur-[2px] flex items-center justify-center">
              <span className="px-3.5 py-1.5 bg-white/95 rounded-full text-sm font-semibold text-primary-800 shadow-sm">
                Sold Out
              </span>
            </div>
          )}

          {lowStock && inStock && (
            <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-warning-100/95 text-warning-800 text-[11px] font-semibold rounded-full backdrop-blur-sm shadow-sm">
              Low Stock
            </span>
          )}

          {/* New badge for recently added products (last 14 days) */}
          {inStock && isNewProduct(product.created_at) && (
            <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-primary-500/90 text-white text-[11px] font-semibold rounded-full backdrop-blur-sm shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-3 pb-3.5">
          <p className="font-heading text-sm font-semibold text-primary-800 line-clamp-1 leading-snug">
            {product.name}
          </p>
          {product.category && (
            <p className="text-[11px] text-primary-400 mt-0.5 capitalize">{product.category}</p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="font-heading font-bold text-base text-primary-600">
              {formatPrice(product.base_price_cents)}
            </span>
            {product.avg_rating !== null && product.review_count > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-primary-400">
                <Star size={11} className="text-warning-400" fill="currentColor" />
                <span className="font-medium">{product.avg_rating.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/** Check if a product was created in the last 14 days */
function isNewProduct(createdAt: string): boolean {
  const diff = Date.now() - new Date(createdAt).getTime()
  return diff < 14 * 24 * 60 * 60 * 1000
}

/* ------------------------------------------------------------------ */
/*  Featured product (large horizontal card)                           */
/* ------------------------------------------------------------------ */

function FeaturedProduct({ product, onClick }: { product: Product; onClick: () => void }) {
  const placeholderMerch = useAppImage('placeholder_merch')

  return (
    <motion.div
      variants={fadeUp}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Featured: ${product.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
    >
      <div className="relative rounded-2xl overflow-hidden shadow-lg bg-surface-2">
        <div className="relative aspect-[16/9] sm:aspect-[2/1] overflow-hidden">
          <img
            src={product.images[0] ?? placeholderMerch}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Content overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mb-2 rounded-full bg-white/20 backdrop-blur-sm text-white/90 text-xs font-medium">
              <TrendingUp size={11} />
              Featured
            </span>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-white leading-tight">
              {product.name}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-heading font-bold text-white/95">
                {formatPrice(product.base_price_cents)}
              </span>
              {product.avg_rating !== null && product.review_count > 0 && (
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Star size={11} fill="currentColor" />
                  {product.avg_rating.toFixed(1)} ({product.review_count})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Quick stats banner                                                 */
/* ------------------------------------------------------------------ */

function ImpactBanner() {
  return (
    <motion.div variants={fadeUp}>
      <div className="rounded-2xl bg-gradient-to-br from-primary-100/70 via-surface-2 to-primary-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-500/10">
            <Heart size={18} className="text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-800">Shop with purpose</p>
            <p className="text-xs text-primary-400 mt-0.5">
              Profits from the Co-Exist shop support our conservation programs
            </p>
          </div>
          <ChevronRight size={16} className="text-primary-300 shrink-0" />
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Partner perk card                                                  */
/* ------------------------------------------------------------------ */

function PerkCard({ perk, isMember }: { perk: PartnerPerk; isMember: boolean }) {
  return (
    <div className="shrink-0 w-64 snap-start rounded-2xl bg-gradient-to-br from-surface-2 to-primary-50/60 shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          {perk.partner_logo_url ? (
            <img
              src={perk.partner_logo_url}
              alt={perk.partner_name}
              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-primary-100/60 flex items-center justify-center shrink-0">
              <Tag size={16} className="text-primary-500" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary-800 line-clamp-1">{perk.title}</p>
            <p className="text-xs text-primary-400 mt-0.5">{perk.partner_name}</p>
          </div>
        </div>

        {perk.description && (
          <p className="text-xs text-primary-500 mt-2.5 line-clamp-2 leading-relaxed">{perk.description}</p>
        )}

        <div className="mt-3">
          {isMember ? (
            <>
              {perk.discount_code && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-100/60">
                  <Sparkles size={14} className="text-primary-500 shrink-0" />
                  <span className="text-sm font-mono font-bold text-primary-700 tracking-wide">
                    {perk.discount_code}
                  </span>
                </div>
              )}
              {perk.discount_percent && !perk.discount_code && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-100/60">
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
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-3/80">
              <Lock size={14} className="text-primary-300 shrink-0" />
              <span className="text-xs font-medium text-primary-400">Join to unlock</span>
            </div>
          )}
        </div>

        {perk.category && (
          <span className="inline-block mt-2.5 px-2 py-0.5 rounded-full bg-primary-100/40 text-[10px] font-medium text-primary-500 capitalize">
            {perk.category}
          </span>
        )}
      </div>
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
      className="mt-2"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary-500" />
          <h2 className="font-heading font-bold text-primary-800">
            Member Perks
          </h2>
        </div>
        {!isMember && (
          <Button variant="ghost" size="sm" onClick={() => navigate('/membership')}>
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
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-surface-1 to-transparent" />
        <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none snap-x snap-proximity pb-2">
          {perks.map((perk) => (
            <PerkCard key={perk.id} perk={perk} isMember={isMember} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section header                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ElementType
  title: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-primary-500" />
        <h2 className="font-heading font-bold text-primary-800">{title}</h2>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-0.5 text-sm font-medium text-primary-400 active:opacity-70 cursor-pointer"
        >
          {action.label}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function ShopSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero skeleton */}
      <div className="-mx-4 lg:-mx-6">
        <Skeleton className="w-full h-[240px] sm:h-[300px] rounded-none" />
      </div>
      {/* Search + pills skeleton */}
      <div className="space-y-3 pt-2">
        <Skeleton className="w-full h-11 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="w-16 h-9 rounded-full" />
          <Skeleton className="w-20 h-9 rounded-full" />
          <Skeleton className="w-24 h-9 rounded-full" />
        </div>
      </div>
      {/* Featured skeleton */}
      <Skeleton className="w-full h-[200px] rounded-2xl" />
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden">
            <Skeleton className="aspect-[4/5] rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="w-3/4 h-4 rounded" />
              <Skeleton className="w-1/2 h-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
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
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ALL)

  // Derive categories from products
  const categories = useMemo(() => {
    if (!products) return []
    const cats = new Set<string>()
    for (const p of products) {
      if (p.category) cats.add(p.category)
    }
    return Array.from(cats).sort()
  }, [products])

  // Filter by search + category
  const filtered = useMemo(() => {
    if (!products) return undefined
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
      const matchesCat = activeCategory === CATEGORY_ALL || p.category === activeCategory
      return matchesSearch && matchesCat
    })
  }, [products, search, activeCategory])

  // Pick the first product with an image and good rating as featured
  const featured = useMemo(() => {
    if (!products || products.length === 0) return null
    const candidates = products
      .filter((p) => p.images.length > 0 && p.variants.some((v) => v.stock > 0 && v.is_active))
      .sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
    return candidates[0] ?? null
  }, [products])

  // The remaining products (excluding featured if shown at top)
  const gridProducts = useMemo(() => {
    if (!filtered) return undefined
    if (!featured || search || activeCategory !== CATEGORY_ALL) return filtered
    return filtered.filter((p) => p.id !== featured.id)
  }, [filtered, featured, search, activeCategory])

  const showFeatured = featured && !search && activeCategory === CATEGORY_ALL

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['shop'] })
    await queryClient.invalidateQueries({ queryKey: ['products'] })
  }, [queryClient])

  return (
    <Page className="!px-0 bg-surface-1">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="px-4 lg:px-6">
          {isLoading ? (
            <ShopSkeleton />
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={shouldReduceMotion ? undefined : stagger}
              className="space-y-5 pb-6"
            >
              {/* Hero */}
              <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
                <ShopHero
                  cartCount={cartCount}
                  onCartClick={() => navigate('/shop/cart')}
                  onBack={() => navigate(-1)}
                />
              </motion.div>

              {/* Search */}
              <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="pt-1">
                <SearchBar
                  value={search}
                  onChange={(val) => {
                    setSearch(val)
                    if (val) setActiveCategory(CATEGORY_ALL)
                  }}
                  placeholder="Search merch..."
                  compact
                />
              </motion.div>

              {/* Category pills */}
              {categories.length > 0 && (
                <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
                  <CategoryPills
                    categories={categories}
                    active={activeCategory}
                    onChange={setActiveCategory}
                  />
                </motion.div>
              )}

              {/* Impact banner */}
              {!search && activeCategory === CATEGORY_ALL && <ImpactBanner />}

              {/* Featured product */}
              {showFeatured && (
                <div>
                  <SectionHeader icon={TrendingUp} title="Featured" />
                  <FeaturedProduct
                    product={featured}
                    onClick={() => navigate(`/shop/${featured.slug}`)}
                  />
                </div>
              )}

              {/* Product grid */}
              {!gridProducts || gridProducts.length === 0 ? (
                <EmptyState
                  illustration="search"
                  title={search ? 'No results' : 'Coming soon'}
                  description={
                    search
                      ? `No merch matching "${search}"`
                      : activeCategory !== CATEGORY_ALL
                        ? `No products in this category yet`
                        : 'Our merch store is getting stocked up!'
                  }
                />
              ) : (
                <div>
                  <SectionHeader
                    icon={Package}
                    title={activeCategory !== CATEGORY_ALL ? activeCategory : 'All Products'}
                  />
                  <motion.div
                    variants={shouldReduceMotion ? undefined : stagger}
                    className="grid grid-cols-2 gap-3"
                  >
                    {gridProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => navigate(`/shop/${product.slug}`)}
                      />
                    ))}
                  </motion.div>
                </div>
              )}

              {/* Partner perks */}
              <PartnerPerksSection shouldReduceMotion={shouldReduceMotion} />
            </motion.div>
          )}
        </div>
      </PullToRefresh>
    </Page>
  )
}
