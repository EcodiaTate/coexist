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

const stagger: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}
const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
}
const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

/* ------------------------------------------------------------------ */
/*  Layered background — fills the entire page behind content          */
/* ------------------------------------------------------------------ */

/**
 * Rich multi-layered background:
 * 1. Base: warm green-tinted off-white
 * 2. Diagonal gradient band (top-left → bottom-right)
 * 3. Topographic contour SVG pattern
 * 4. Large leaf silhouette watermarks
 * 5. Subtle dot grid in alternating bands
 * 6. Static blurred color orbs for depth
 */
function ShopBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Base gradient — warm earthy tones shifting across the viewport */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f0f4ec] via-[#f5f7f2] to-[#edf2e8]" />

      {/* 2. Diagonal warm accent band */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, transparent 30%, rgb(var(--color-primary-100) / 0.3) 45%, transparent 60%, rgb(var(--color-moss-100) / 0.2) 75%, transparent 90%)',
        }}
      />

      {/* 3. Topographic contour lines — nature map feel */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="shop-topo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M20 100c30-40 70-60 100-40s60 50 80 20" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M10 140c40-30 80-50 120-30s50 40 70 10" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M30 60c25-35 55-45 85-25s45 35 65 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="160" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="160" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="40" cy="170" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shop-topo)" className="text-primary-900" />
      </svg>

      {/* 4. Leaf silhouette watermarks — large, faded, organic */}
      <Leaf className="absolute top-[25%] -left-8 w-48 h-48 rotate-[-30deg] text-primary-300/[0.04]" />
      <Leaf className="absolute top-[55%] -right-12 w-56 h-56 rotate-[20deg] text-moss-300/[0.04]" />
      <Leaf className="absolute top-[80%] left-[20%] w-36 h-36 rotate-[50deg] text-sprout-300/[0.03]" />

      {/* 5. Dot grid texture in a mid-section band */}
      <div className="absolute top-[35%] left-0 right-0 h-[30%] opacity-[0.025]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="shop-dots" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#shop-dots)" className="text-primary-800" />
        </svg>
      </div>

      {/* 6. Static blurred color orbs — depth without animation cost */}
      <div className="absolute top-[20%] -left-20 w-80 h-80 rounded-full bg-primary-200/20 blur-[100px]" />
      <div className="absolute top-[50%] -right-24 w-72 h-72 rounded-full bg-moss-200/18 blur-[100px]" />
      <div className="absolute top-[75%] left-[30%] w-64 h-64 rounded-full bg-sprout-200/12 blur-[90px]" />
      <div className="absolute top-[10%] right-[15%] w-48 h-48 rounded-full bg-sky-200/10 blur-[80px]" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Category pills                                                     */
/* ------------------------------------------------------------------ */

const CATEGORY_ALL = '__all__'

const CATEGORY_ICONS: Record<string, string> = {
  clothing: '👕',
  accessories: '🎒',
  stickers: '🏷️',
  drinkware: '☕',
  headwear: '🧢',
}

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
    <div className="relative -mx-5 lg:-mx-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#f0f4ec] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-[#f0f4ec] to-transparent" />
      <div
        className="flex gap-2 overflow-x-auto px-5 lg:px-6 pb-1 scrollbar-none snap-x snap-proximity"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <button
          type="button"
          onClick={() => onChange(CATEGORY_ALL)}
          className={cn(
            'shrink-0 snap-start px-4 h-10 rounded-2xl text-sm font-semibold transition-all duration-200 select-none cursor-pointer',
            'flex items-center gap-1.5 active:scale-[0.96]',
            active === CATEGORY_ALL
              ? 'bg-gradient-to-r from-primary-600 to-moss-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-100/60 shadow-sm',
          )}
        >
          <Package size={14} />
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={cn(
              'shrink-0 snap-start px-4 h-10 rounded-2xl text-sm font-semibold capitalize transition-all duration-200 select-none cursor-pointer whitespace-nowrap',
              'flex items-center gap-1.5 active:scale-[0.96]',
              active === cat
                ? 'bg-gradient-to-r from-primary-600 to-moss-600 text-white shadow-md shadow-primary-600/20'
                : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-100/60 shadow-sm',
            )}
          >
            {CATEGORY_ICONS[cat.toLowerCase()] && (
              <span className="text-xs">{CATEGORY_ICONS[cat.toLowerCase()]}</span>
            )}
            {cat}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero section — full-bleed with parallax & organic curve            */
/* ------------------------------------------------------------------ */

function ShopHero({
  cartCount,
  onCartClick,
  onBack,
  rm,
}: {
  cartCount: number
  onCartClick: () => void
  onBack: () => void
  rm: boolean
}) {
  const { data: appImages } = useAppImages()
  // Admin-configurable hero image — set via app_images table key "shop_hero"
  const heroUrl = appImages?.shop_hero

  return (
    <div className="relative overflow-hidden">
      <div className="relative w-full min-h-[280px] sm:min-h-[340px]">
        {/* Admin hero image OR rich fallback gradient */}
        {heroUrl ? (
          <img
            src={heroUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-800 via-secondary-800 to-moss-900">
            {/* Leaf silhouettes for visual interest when no admin image */}
            <div className="absolute inset-0 overflow-hidden">
              <Leaf className="absolute top-6 left-[8%] w-28 h-28 rotate-[-25deg] text-white/[0.04]" />
              <Leaf className="absolute bottom-16 right-[10%] w-20 h-20 rotate-[40deg] text-sprout-400/[0.06]" />
              <Leaf className="absolute top-[35%] right-[25%] w-24 h-24 rotate-[15deg] text-moss-400/[0.05]" />
              <Leaf className="absolute bottom-8 left-[30%] w-14 h-14 rotate-[-50deg] text-white/[0.03]" />
              {/* Static gradient orbs — no animation, pure CSS */}
              <div className="absolute top-10 right-[20%] w-32 h-32 rounded-full bg-sprout-400/10 blur-3xl" />
              <div className="absolute bottom-20 left-[15%] w-40 h-40 rounded-full bg-moss-400/10 blur-3xl" />
            </div>
          </div>
        )}

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />

        {/* Top bar: back + cart */}
        <div
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)' }}
        >
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xl text-white border border-white/10 active:scale-[0.95] transition-transform cursor-pointer"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onCartClick}
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xl text-white border border-white/10 active:scale-[0.95] transition-transform cursor-pointer"
            aria-label={`Cart (${cartCount} items)`}
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span
                className={cn(
                  'absolute -top-1 -right-1 flex items-center justify-center',
                  'min-w-[20px] h-[20px] px-1 rounded-full',
                  'bg-coral-500 text-white text-[10px] font-bold shadow-lg shadow-coral-500/30',
                )}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Hero content — layered text */}
        <div className="relative z-10 flex flex-col justify-end h-full min-h-[280px] sm:min-h-[340px] px-5 pb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-sprout-400/20 backdrop-blur-sm text-sprout-200 text-xs font-semibold tracking-wide border border-sprout-400/15">
              <Leaf size={12} />
              Conservation Merch
            </span>
            <h1 className="font-heading text-[2rem] sm:text-4xl font-extrabold text-white leading-[1.1] tracking-tight">
              Wear the
              <br />
              <span className="bg-gradient-to-r from-sprout-300 via-moss-300 to-sky-300 bg-clip-text text-transparent">
                Movement
              </span>
            </h1>
            <p className="text-white/60 text-sm mt-2 max-w-[280px] leading-relaxed">
              Every purchase funds wildlife conservation and habitat protection.
            </p>
          </div>
        </div>
      </div>

      {/* Organic wave transition — overlaps the hero bottom */}
      <div className="relative -mt-1 z-20">
        <svg
          viewBox="0 0 1440 60"
          preserveAspectRatio="none"
          className="w-full h-6 sm:h-10 block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,0 C360,60 720,0 1080,40 C1260,55 1380,20 1440,30 L1440,60 L0,60 Z"
            className="fill-[#f0f4ec]"
          />
        </svg>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Product card — with colored accent & hover depth                   */
/* ------------------------------------------------------------------ */

const ACCENT_COLORS = [
  'from-primary-500 to-moss-500',
  'from-moss-500 to-sky-500',
  'from-bark-400 to-primary-500',
  'from-sprout-500 to-primary-500',
  'from-coral-400 to-amber-400',
  'from-sky-400 to-moss-400',
] as const

function ProductCard({ product, onClick, index }: { product: Product; onClick: () => void; index: number }) {
  const placeholderMerch = useAppImage('placeholder_merch')
  const inStock = product.variants.some((v) => v.stock > 0 && v.is_active)
  const lowStock = product.variants.every((v) => v.stock <= 5) && inStock
  const accent = ACCENT_COLORS[index % ACCENT_COLORS.length]

  return (
    <motion.div
      variants={scaleIn}
      whileTap={{ scale: 0.97 }}
      className="cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={product.name}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
    >
      <div className="relative rounded-3xl overflow-hidden bg-white shadow-sm hover:shadow-lg hover:shadow-primary-900/8 transition-shadow duration-300">
        {/* Top accent bar */}
        <div className={cn('h-1 w-full bg-gradient-to-r', accent)} />

        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-primary-50/50">
          <img
            src={product.images[0] ?? placeholderMerch}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            loading="lazy"
          />

          {/* Subtle shimmer on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {!inStock && (
            <div className="absolute inset-0 bg-secondary-900/50 backdrop-blur-[3px] flex items-center justify-center">
              <span className="px-4 py-1.5 bg-white rounded-full text-sm font-bold text-secondary-800 shadow">
                Sold Out
              </span>
            </div>
          )}

          {lowStock && inStock && (
            <span className="absolute top-3 right-3 px-2.5 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-xl shadow-sm uppercase tracking-wider">
              Low Stock
            </span>
          )}

          {inStock && isNewProduct(product.created_at) && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-gradient-to-r from-sprout-500 to-moss-500 text-white text-[10px] font-bold rounded-xl shadow-sm uppercase tracking-wider">
              New
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-3.5 pb-4">
          <p className="font-heading text-sm font-bold text-secondary-800 line-clamp-1 leading-snug">
            {product.name}
          </p>
          {product.category && (
            <p className="text-[11px] text-primary-400 mt-0.5 capitalize font-medium">{product.category}</p>
          )}
          <div className="flex items-center justify-between mt-2.5">
            <span className="font-heading font-extrabold text-base text-primary-700">
              {formatPrice(product.base_price_cents)}
            </span>
            {product.avg_rating !== null && product.review_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-primary-500 bg-amber-50 px-2 py-0.5 rounded-full">
                <Star size={10} className="text-amber-400" fill="currentColor" />
                <span className="font-semibold">{product.avg_rating.toFixed(1)}</span>
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
/*  Featured product — bold gradient overlay card                      */
/* ------------------------------------------------------------------ */

function FeaturedProduct({ product, onClick }: { product: Product; onClick: () => void }) {
  const placeholderMerch = useAppImage('placeholder_merch')

  return (
    <motion.div
      variants={fadeUp}
      whileTap={{ scale: 0.98 }}
      className="cursor-pointer group"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Featured: ${product.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
    >
      <div className="relative rounded-3xl overflow-hidden shadow-lg shadow-primary-900/10">
        <div className="relative aspect-[16/9] sm:aspect-[2/1] overflow-hidden">
          <img
            src={product.images[0] ?? placeholderMerch}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Gradient: primary-to-moss diagonal overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-secondary-900/80 via-primary-900/50 to-moss-800/30" />

          {/* Decorative floating circle */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-sprout-400/10 blur-2xl" />

          {/* Content overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 mb-2.5 rounded-full bg-sprout-400/25 backdrop-blur-sm text-sprout-200 text-xs font-bold tracking-wide border border-sprout-400/20">
              <TrendingUp size={12} />
              Featured
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {product.name}
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-heading font-extrabold text-lg text-white">
                {formatPrice(product.base_price_cents)}
              </span>
              {product.avg_rating !== null && product.review_count > 0 && (
                <span className="flex items-center gap-1 text-white/70 text-xs bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  <Star size={11} fill="currentColor" className="text-amber-300" />
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
/*  Impact banner — gradient card, not white                           */
/* ------------------------------------------------------------------ */

function ImpactBanner() {
  return (
    <motion.div variants={fadeUp}>
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-moss-700 p-5 shadow-lg shadow-primary-800/15">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="impact-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#impact-dots)" />
          </svg>
        </div>
        {/* Static floating orb — depth without animation cost */}
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-sprout-300/15 blur-2xl" />

        <div className="relative flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/10 shrink-0">
            <Heart size={22} className="text-coral-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Shop with purpose</p>
            <p className="text-xs text-white/60 mt-0.5 leading-relaxed">
              Profits from the Co-Exist shop fund our conservation programs
            </p>
          </div>
          <ChevronRight size={18} className="text-white/30 shrink-0" />
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Partner perk card — glassmorphism style                            */
/* ------------------------------------------------------------------ */

function PerkCard({ perk, isMember }: { perk: PartnerPerk; isMember: boolean }) {
  return (
    <div className="shrink-0 w-64 snap-start rounded-3xl bg-white/80 backdrop-blur-sm shadow-sm border border-primary-100/40 overflow-hidden">
      {/* Top gradient accent */}
      <div className="h-1.5 bg-gradient-to-r from-moss-400 via-primary-400 to-sprout-400" />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {perk.partner_logo_url ? (
            <img
              src={perk.partner_logo_url}
              alt={perk.partner_name}
              className="w-11 h-11 rounded-2xl object-cover shrink-0 shadow-sm ring-1 ring-primary-100/40"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-100 to-moss-100 flex items-center justify-center shrink-0">
              <Tag size={16} className="text-primary-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-secondary-800 line-clamp-1">{perk.title}</p>
            <p className="text-xs text-primary-400 mt-0.5 font-medium">{perk.partner_name}</p>
          </div>
        </div>

        {perk.description && (
          <p className="text-xs text-primary-500/80 mt-2.5 line-clamp-2 leading-relaxed">{perk.description}</p>
        )}

        <div className="mt-3">
          {isMember ? (
            <>
              {perk.discount_code && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-sprout-50 to-primary-50 border border-sprout-200/40">
                  <Sparkles size={14} className="text-sprout-600 shrink-0" />
                  <span className="text-sm font-mono font-bold text-primary-800 tracking-wide">
                    {perk.discount_code}
                  </span>
                </div>
              )}
              {perk.discount_percent && !perk.discount_code && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-sprout-50 to-primary-50 border border-sprout-200/40">
                  <Sparkles size={14} className="text-sprout-600 shrink-0" />
                  <span className="text-sm font-bold text-primary-800">
                    {perk.discount_percent}% off
                  </span>
                </div>
              )}
              {perk.points_cost && perk.points_cost > 0 && (
                <p className="text-[10px] text-primary-400 mt-1.5 font-medium">{perk.points_cost} points to redeem</p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-secondary-50/60 border border-secondary-100/30">
              <Lock size={14} className="text-secondary-300 shrink-0" />
              <span className="text-xs font-semibold text-secondary-400">Join to unlock</span>
            </div>
          )}
        </div>

        {perk.category && (
          <span className="inline-block mt-2.5 px-2.5 py-0.5 rounded-full bg-moss-100/50 text-[10px] font-semibold text-moss-700 capitalize border border-moss-200/30">
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

function PartnerPerksSection({ rm }: { rm: boolean }) {
  const navigate = useNavigate()
  const { data: perks } = usePartnerPerks()
  const { data: membership } = useMyMembership()
  const isMember = !!membership

  if (!perks || perks.length === 0) return null

  return (
    <motion.div variants={rm ? undefined : fadeUp}>
      {/* Section on a tinted panel */}
      <div className="relative -mx-5 lg:-mx-6 px-5 lg:px-6 py-6 bg-gradient-to-b from-moss-50/40 to-transparent">
        {/* Top wave divider */}
        <div className="absolute top-0 left-0 right-0 -translate-y-[calc(100%-1px)]">
          <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="w-full h-5 block" xmlns="http://www.w3.org/2000/svg">
            <path d="M0,40 C480,0 960,30 1440,10 L1440,40 Z" className="fill-moss-50/40" />
          </svg>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-moss-500 to-primary-500 shadow-sm">
              <Sparkles size={14} className="text-white" />
            </div>
            <h2 className="font-heading font-extrabold text-secondary-800 text-lg">
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
          <p className="text-xs text-primary-400 mb-3 font-medium">
            Exclusive partner discounts for Co-Exist members
          </p>
        )}

        <div className="-mx-5 lg:-mx-6">
          <div className="flex gap-3 overflow-x-auto px-5 lg:px-6 scrollbar-none snap-x snap-proximity pb-2">
            {perks.map((perk) => (
              <PerkCard key={perk.id} perk={perk} isMember={isMember} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Section header — with gradient icon badge                          */
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
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-moss-500 shadow-sm">
          <Icon size={14} className="text-white" />
        </div>
        <h2 className="font-heading font-extrabold text-secondary-800 text-lg">{title}</h2>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="flex items-center gap-0.5 text-sm font-semibold text-primary-500 active:opacity-70 cursor-pointer"
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
      <div className="relative">
        <Skeleton className="w-full h-[280px] sm:h-[340px] rounded-none" />
        <div className="relative -mt-1 z-10">
          <div className="h-6 sm:h-10 bg-[#f0f4ec]" />
        </div>
      </div>
      {/* Search + pills skeleton */}
      <div className="space-y-3 px-5 lg:px-6">
        <Skeleton className="w-full h-12 rounded-2xl" />
        <div className="flex gap-2">
          <Skeleton className="w-18 h-10 rounded-2xl" />
          <Skeleton className="w-22 h-10 rounded-2xl" />
          <Skeleton className="w-26 h-10 rounded-2xl" />
        </div>
      </div>
      {/* Featured skeleton */}
      <div className="px-5 lg:px-6">
        <Skeleton className="w-full h-[200px] rounded-3xl" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 gap-3.5 px-5 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-3xl overflow-hidden bg-white shadow-sm">
            <Skeleton className="h-1 w-full rounded-none" />
            <Skeleton className="aspect-[4/5] rounded-none" />
            <div className="p-3.5 space-y-2">
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
  const rm = !!shouldReduceMotion
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
    <Page className="!px-0 !bg-transparent">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="relative min-h-screen">
          {/* Rich layered background */}
          <ShopBackground />

          {/* Main content */}
          <div className="relative z-10">
            {isLoading ? (
              <ShopSkeleton />
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={rm ? undefined : stagger}
                className="pb-8"
              >
                {/* Hero — full bleed with wave transition */}
                <motion.div variants={rm ? undefined : fadeUp}>
                  <ShopHero
                    cartCount={cartCount}
                    onCartClick={() => navigate('/shop/cart')}
                    onBack={() => navigate(-1)}
                    rm={rm}
                  />
                </motion.div>

                {/* Content below hero — padded */}
                <div className="px-5 lg:px-6 space-y-6 -mt-1">
                  {/* Search — elevated with subtle shadow */}
                  <motion.div variants={rm ? undefined : fadeUp}>
                    <div className="relative">
                      <SearchBar
                        value={search}
                        onChange={(val) => {
                          setSearch(val)
                          if (val) setActiveCategory(CATEGORY_ALL)
                        }}
                        placeholder="Search merch..."
                        compact
                      />
                    </div>
                  </motion.div>

                  {/* Category pills */}
                  {categories.length > 0 && (
                    <motion.div variants={rm ? undefined : fadeUp}>
                      <CategoryPills
                        categories={categories}
                        active={activeCategory}
                        onChange={setActiveCategory}
                      />
                    </motion.div>
                  )}

                  {/* Impact banner — now a gradient card */}
                  {!search && activeCategory === CATEGORY_ALL && <ImpactBanner />}

                  {/* Featured product */}
                  {showFeatured && (
                    <motion.div variants={rm ? undefined : slideInRight}>
                      <SectionHeader icon={TrendingUp} title="Featured" />
                      <FeaturedProduct
                        product={featured}
                        onClick={() => navigate(`/shop/${featured.slug}`)}
                      />
                    </motion.div>
                  )}

                  {/* Product grid — on a lightly tinted panel */}
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
                    <div className="relative -mx-5 lg:-mx-6">
                      {/* Tinted band behind the grid */}
                      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/30 via-primary-50/20 to-transparent rounded-none" />
                      {/* Top edge wave */}
                      <svg viewBox="0 0 1440 30" preserveAspectRatio="none" className="absolute -top-3 left-0 right-0 w-full h-3 block" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0,30 C360,0 720,20 1080,5 C1260,0 1380,15 1440,10 L1440,30 Z" className="fill-primary-50/30" />
                      </svg>
                      <div className="relative px-5 lg:px-6 py-5">
                        <SectionHeader
                          icon={Package}
                          title={activeCategory !== CATEGORY_ALL ? activeCategory : 'All Products'}
                        />
                        <motion.div
                          variants={rm ? undefined : stagger}
                          className="grid grid-cols-2 gap-3.5"
                        >
                          {gridProducts.map((product, i) => (
                            <ProductCard
                              key={product.id}
                              product={product}
                              onClick={() => navigate(`/shop/${product.slug}`)}
                              index={i}
                            />
                          ))}
                        </motion.div>
                      </div>
                    </div>
                  )}

                  {/* Partner perks — on tinted panel */}
                  <PartnerPerksSection rm={rm} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </PullToRefresh>
    </Page>
  )
}
