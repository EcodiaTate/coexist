import { useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'framer-motion'
import {
  ShoppingBag,
  Star,
  Sparkles,
  Lock,
  Tag,
  ChevronRight,
  TrendingUp,
  Package,
  Heart,
  TreePine,
  Users,
  Clock,
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
import { useNationalImpact } from '@/hooks/use-impact'
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
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f0f4ec] via-[#f4f6f1] to-[#eef3e9]" />

      {/* Topographic contour lines — subtle nature map feel */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="shop-topo" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M20 100c30-40 70-60 100-40s60 50 80 20" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M10 140c40-30 80-50 120-30s50 40 70 10" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M30 60c25-35 55-45 85-25s45 35 65 5" fill="none" stroke="currentColor" strokeWidth="0.8" />
            <circle cx="160" cy="30" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="160" cy="30" r="25" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#shop-topo)" className="text-primary-900" />
      </svg>

      {/* A couple of soft blurred color orbs for warmth */}
      <div className="absolute top-[30%] -left-16 w-72 h-72 rounded-full bg-primary-200/15 blur-[100px]" />
      <div className="absolute top-[65%] -right-20 w-64 h-64 rounded-full bg-moss-200/12 blur-[100px]" />
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
/*  SVG landscape layers — mountains, hills, trees                     */
/* ------------------------------------------------------------------ */

/** Far mountain range — tall jagged peaks, lightest tone */
function MountainsFar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className={cn('absolute bottom-0 left-0 w-full', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0,320 L0,200
           L40,195 L80,160 L120,180 L160,120 L200,150
           L240,90 L280,130 L320,100 L360,140
           L400,60 L440,110 L480,80 L520,130
           L560,50 L600,100 L640,70 L680,120
           L720,55 L760,105 L800,75 L840,130
           L880,45 L920,95 L960,70 L1000,120
           L1040,65 L1080,110 L1120,80 L1160,130
           L1200,55 L1240,100 L1280,85 L1320,125
           L1360,70 L1400,110 L1440,90
           L1440,320 Z"
        className="fill-primary-800/30"
      />
    </svg>
  )
}

/** Near mountain range — craggy ridges, darker */
function MountainsNear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 280" preserveAspectRatio="none" className={cn('absolute bottom-0 left-0 w-full', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0,280 L0,185
           L30,180 L60,155 L90,165 L120,130 L150,150
           L180,110 L210,140 L240,105 L270,135
           L300,90 L330,125 L360,100 L390,130
           L420,85 L450,120 L480,95 L510,130
           L540,80 L570,115 L600,90 L630,125
           L660,78 L690,110 L720,88 L750,120
           L780,75 L810,115 L840,90 L870,125
           L900,82 L930,118 L960,92 L990,128
           L1020,80 L1050,112 L1080,88 L1110,122
           L1140,78 L1170,115 L1200,90 L1230,125
           L1260,85 L1290,118 L1320,95 L1350,125
           L1380,88 L1410,115 L1440,105
           L1440,280 Z"
        className="fill-primary-900/40"
      />
    </svg>
  )
}

/** Rocky ridge & tree line — foreground, darkest, dramatic elevation */
function TreeLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className={cn('absolute bottom-0 left-0 w-full', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0,220 L0,155
           C20,150 30,120 45,105 L50,108 L55,95 L62,100
           C75,110 85,130 100,125
           L110,100 L115,95 L120,98 L130,115
           C145,130 155,140 170,135
           L180,110 L185,90 L190,85 L198,92 L205,105
           C215,115 225,125 240,118
           L255,95 L260,80 L265,75 L272,82 L280,100
           C290,120 305,135 320,128
           L335,105 L340,98 L345,92 L348,88
           L355,70 L360,65 L365,68 L370,78
           C380,100 395,120 410,130
           L425,120 L435,100 L440,90
           L445,82 L450,78 L455,84 L465,100
           C480,125 500,138 520,132
           L530,110 L535,95 L540,88 L548,92 L555,108
           C570,128 585,135 600,128
           L615,105 L620,85 L625,75 L630,72 L638,80
           L645,95 L655,110
           C670,125 685,132 700,125
           L715,100 L720,82 L728,70 L735,66 L740,72 L748,88
           C758,110 775,130 795,135
           L810,120 L820,100 L825,90 L830,85
           L835,78 L840,72 L845,76 L852,88
           C862,108 880,128 900,132
           L915,118 L925,95 L930,82 L938,78 L945,85
           C955,105 970,120 985,125
           L1000,110 L1005,92 L1010,80 L1018,75 L1025,82
           C1035,100 1050,125 1070,130
           L1085,115 L1095,90 L1100,78 L1108,72 L1115,78
           L1125,95 L1135,112
           C1150,128 1165,135 1180,128
           L1195,105 L1200,88 L1208,75 L1215,70 L1220,76
           C1230,95 1248,118 1265,128
           L1280,115 L1290,95 L1295,85 L1302,80 L1310,88
           C1320,105 1340,125 1360,130
           L1375,115 L1385,95 L1390,85 L1398,80 L1405,88
           L1415,105 L1425,120
           L1440,125 L1440,220 Z"
        className="fill-secondary-900/60"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero section — parallax mountain landscape                         */
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

  const { scrollY } = useScroll()
  // Parallax: each layer moves at a different speed
  const bgY = useTransform(scrollY, [0, 400], [0, 60])
  const farY = useTransform(scrollY, [0, 400], [0, 40])
  const nearY = useTransform(scrollY, [0, 400], [0, 20])
  const treeY = useTransform(scrollY, [0, 400], [0, 8])
  const textY = useTransform(scrollY, [0, 300], [0, 50])
  const textOpacity = useTransform(scrollY, [0, 200], [1, 0])

  return (
    <div className="relative overflow-hidden">
      <div className="relative w-full h-[320px] sm:h-[380px]">

        {/* Layer 0: Sky / admin image — slowest parallax */}
        <motion.div
          className="absolute inset-0"
          style={rm ? undefined : { y: bgY }}
        >
          {heroUrl ? (
            <img
              src={heroUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-secondary-900 via-primary-900 to-primary-800">
              {/* Stars — tiny dots scattered across the sky */}
              <div className="absolute inset-0 overflow-hidden">
                {/* Star field */}
                <div className="absolute top-[12%] left-[8%] w-1 h-1 rounded-full bg-white/40" />
                <div className="absolute top-[8%] left-[25%] w-1.5 h-1.5 rounded-full bg-white/25" />
                <div className="absolute top-[18%] left-[42%] w-1 h-1 rounded-full bg-white/35" />
                <div className="absolute top-[6%] left-[58%] w-1 h-1 rounded-full bg-white/30" />
                <div className="absolute top-[15%] left-[72%] w-1.5 h-1.5 rounded-full bg-white/20" />
                <div className="absolute top-[10%] left-[88%] w-1 h-1 rounded-full bg-white/40" />
                <div className="absolute top-[22%] left-[15%] w-1 h-1 rounded-full bg-white/20" />
                <div className="absolute top-[5%] left-[35%] w-1 h-1 rounded-full bg-white/35" />
                <div className="absolute top-[20%] left-[65%] w-1 h-1 rounded-full bg-white/25" />
                <div className="absolute top-[25%] left-[50%] w-1.5 h-1.5 rounded-full bg-white/15" />
                {/* Moon glow */}
                <div className="absolute top-[8%] right-[18%] w-20 h-20 rounded-full bg-sky-200/8 blur-2xl" />
              </div>
            </div>
          )}
        </motion.div>

        {/* Gradient overlay — darkens bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 z-[1]" />

        {/* Layer 1: Far mountains — medium parallax */}
        <motion.div
          className="absolute inset-0 z-[2]"
          style={rm ? undefined : { y: farY }}
        >
          <MountainsFar className="h-[65%]" />
        </motion.div>

        {/* Layer 2: Near mountains — faster parallax */}
        <motion.div
          className="absolute inset-0 z-[3]"
          style={rm ? undefined : { y: nearY }}
        >
          <MountainsNear className="h-[55%]" />
        </motion.div>

        {/* Layer 3: Tree line — barely moves, closest to viewer */}
        <motion.div
          className="absolute inset-0 z-[4]"
          style={rm ? undefined : { y: treeY }}
        >
          <TreeLine className="h-[40%]" />
        </motion.div>

        {/* Ground — solid band at very bottom merging into content */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary-950/80 to-transparent z-[5]" />

        {/* Top bar: back + cart */}
        <div
          className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.75rem)' }}
        >
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-2xl bg-black/25 backdrop-blur-md text-white border border-white/10 active:scale-[0.95] transition-transform cursor-pointer"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onCartClick}
            className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-black/25 backdrop-blur-md text-white border border-white/10 active:scale-[0.95] transition-transform cursor-pointer"
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

        {/* Hero text — parallaxes away as you scroll */}
        <motion.div
          className="absolute inset-x-0 bottom-0 z-[6] px-5 pb-6"
          style={rm ? undefined : { y: textY, opacity: textOpacity }}
        >
          <h1 className="font-heading text-[1.75rem] sm:text-3xl font-bold text-white leading-tight tracking-tight drop-shadow-lg">
            Co-Exist Shop
          </h1>
          <p className="text-white/75 text-sm mt-1.5 max-w-xs drop-shadow-md">
            Wear the movement. Every purchase funds conservation.
          </p>
        </motion.div>
      </div>

      {/* Transition into content — rocky ridgeline edge */}
      <div className="relative -mt-1 z-20">
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="w-full h-8 sm:h-12 block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,12 L35,15 L50,8 L65,18 L90,5 L110,20 L130,10 L155,22
               L175,6 L200,18 L225,3 L250,16 L270,8 L295,20 L320,4 L345,17
               L365,10 L390,22 L415,5 L440,19 L460,8 L485,21 L510,3 L535,18
               L555,7 L580,20 L605,4 L630,17 L650,9 L675,22 L700,5 L725,19
               L745,8 L770,21 L795,3 L820,16 L840,10 L865,22 L890,4 L915,18
               L935,7 L960,20 L985,3 L1010,17 L1030,9 L1055,22 L1080,5 L1105,19
               L1125,8 L1150,21 L1175,4 L1200,18 L1220,7 L1245,20 L1270,3 L1295,16
               L1315,10 L1340,22 L1365,5 L1390,18 L1410,8 L1440,14
               L1440,80 L0,80 Z"
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

/* ------------------------------------------------------------------ */
/*  Impact strip — live community stats, every purchase contributes    */
/* ------------------------------------------------------------------ */

function formatStat(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`
  return n.toLocaleString()
}

function ImpactStrip() {
  const { data: impact } = useNationalImpact()

  const stats = useMemo(() => {
    if (!impact) return null
    return [
      { icon: TreePine, value: formatStat(impact.totalTrees), label: 'Trees planted' },
      { icon: Clock, value: formatStat(impact.totalHours), label: 'Volunteer hours' },
      { icon: Users, value: formatStat(impact.totalMembers), label: 'Members' },
    ]
  }, [impact])

  return (
    <motion.div variants={fadeUp}>
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-moss-700 shadow-lg shadow-primary-800/15">
        {/* Dot pattern texture */}
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

        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-sprout-300/15 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-moss-300/10 blur-2xl" />

        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/15 border border-white/10">
              <Heart size={16} className="text-coral-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Your purchases fund real impact</p>
              <p className="text-[11px] text-white/50 mt-0.5">Community totals so far</p>
            </div>
          </div>

          {/* Live stats row */}
          {stats ? (
            <div className="grid grid-cols-3 gap-2">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-2xl bg-white/10 border border-white/[0.06] px-3 py-3 text-center">
                  <Icon size={16} className="text-sprout-300 mx-auto mb-1.5" />
                  <p className="font-heading text-lg font-extrabold text-white leading-none">{value}</p>
                  <p className="text-[10px] text-white/50 mt-1 leading-tight">{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-white/10 border border-white/[0.06] px-3 py-3">
                  <div className="w-4 h-4 rounded bg-white/10 mx-auto mb-1.5" />
                  <div className="w-10 h-5 rounded bg-white/10 mx-auto" />
                  <div className="w-14 h-2.5 rounded bg-white/10 mx-auto mt-1" />
                </div>
              ))}
            </div>
          )}
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
                  {!search && activeCategory === CATEGORY_ALL && <ImpactStrip />}

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
                    <div>
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
