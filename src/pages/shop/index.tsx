import { Fragment, useState, useCallback, useMemo } from 'react'
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
function ShopBackground({ rm }: { rm: boolean }) {
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

      {/* Breathing blurred orbs — gentle depth */}
      <motion.div
        className="absolute top-[30%] -left-16 w-72 h-72 rounded-full bg-primary-200/15 blur-[100px]"
        animate={rm ? undefined : { scale: [1, 1.15, 1], opacity: [0.15, 0.22, 0.15] }}
        transition={rm ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[60%] -right-20 w-64 h-64 rounded-full bg-moss-200/12 blur-[100px]"
        animate={rm ? undefined : { scale: [1, 1.12, 1], opacity: [0.12, 0.18, 0.12] }}
        transition={rm ? undefined : { duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute top-[85%] left-[25%] w-56 h-56 rounded-full bg-bark-200/10 blur-[90px]"
        animate={rm ? undefined : { scale: [1, 1.1, 1], opacity: [0.1, 0.16, 0.1] }}
        transition={rm ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
      />

      {/* Breathing rings — large, thin, slow pulse */}
      <motion.div
        className="absolute top-[25%] -right-20 w-64 h-64 rounded-full border-[1.5px] border-primary-300/15"
        animate={rm ? undefined : { scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={rm ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[55%] -left-12 w-48 h-48 rounded-full border-[1.5px] border-moss-300/12"
        animate={rm ? undefined : { scale: [1, 1.06, 1], opacity: [0.12, 0.2, 0.12] }}
        transition={rm ? undefined : { duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-[78%] right-[15%] w-36 h-36 rounded-full border-[1.5px] border-bark-300/10"
        animate={rm ? undefined : { scale: [1, 1.1, 1], opacity: [0.1, 0.18, 0.1] }}
        transition={rm ? undefined : { duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Floating dots — tiny, drifting vertically */}
      <motion.div
        className="absolute top-[35%] left-[15%] w-2.5 h-2.5 rounded-full bg-primary-400/15"
        animate={rm ? undefined : { y: [0, -14, 0], opacity: [0.15, 0.3, 0.15] }}
        transition={rm ? undefined : { duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[50%] right-[22%] w-2 h-2 rounded-full bg-moss-400/12"
        animate={rm ? undefined : { y: [0, -10, 0], opacity: [0.12, 0.25, 0.12] }}
        transition={rm ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <motion.div
        className="absolute top-[70%] left-[40%] w-3 h-3 rounded-full bg-bark-300/10"
        animate={rm ? undefined : { y: [0, -12, 0], opacity: [0.1, 0.22, 0.1] }}
        transition={rm ? undefined : { duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        className="absolute top-[42%] right-[45%] w-2 h-2 rounded-full bg-primary-300/12"
        animate={rm ? undefined : { y: [0, -8, 0], opacity: [0.12, 0.2, 0.12] }}
        transition={rm ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      <motion.div
        className="absolute top-[88%] left-[65%] w-2.5 h-2.5 rounded-full bg-moss-300/10"
        animate={rm ? undefined : { y: [0, -10, 0], opacity: [0.1, 0.2, 0.1] }}
        transition={rm ? undefined : { duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />
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

/** Far mountain range — broad peaks with smooth slopes, lightest tone */
function MountainsFar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className={cn('absolute bottom-0 left-0 w-full', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0,320 L0,240
           C40,235 70,200 120,170 C150,150 170,140 200,120
           C220,108 240,130 280,160
           C310,180 340,170 380,140 C410,115 430,90 460,80
           C490,70 510,100 540,140
           C570,175 600,180 640,155 C680,130 700,100 740,85
           C770,72 790,110 820,145
           C850,175 880,170 920,140 C950,115 980,95 1010,80
           C1040,65 1060,90 1090,130
           C1120,165 1150,175 1190,150 C1220,130 1250,110 1280,100
           C1310,90 1340,120 1370,150
           C1400,175 1420,180 1440,170
           L1440,320 Z"
        className="fill-primary-800/30"
      />
    </svg>
  )
}

/** Near hills — rounder, rolling, darker */
function MountainsNear({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 260" preserveAspectRatio="none" className={cn('absolute bottom-0 left-0 w-full', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0,260 L0,200
           C60,195 100,170 160,150
           C200,138 240,155 300,170
           C340,180 380,160 420,135
           C460,110 500,120 540,145
           C580,165 620,170 660,150
           C700,130 730,110 780,105
           C820,100 860,130 900,155
           C940,175 980,165 1020,140
           C1060,118 1100,125 1140,148
           C1180,168 1220,170 1260,152
           C1300,135 1340,140 1380,155
           C1410,165 1430,160 1440,155
           L1440,260 Z"
        className="fill-primary-900/40"
      />
    </svg>
  )
}

/** Eucalyptus tree line — rounded bushy canopies, Australian silhouette */
function TreeLine({ className }: { className?: string }) {
  // Gum trees: wide rounded crowns on thin trunks, varying heights
  // Mix of tall and short, some overlapping — natural bush feel
  return (
    <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className={cn('absolute bottom-0 left-0 w-full', className)} xmlns="http://www.w3.org/2000/svg">
      <path
        d="M0,160 L0,125
           C10,124 15,120 20,115 C25,95 30,75 45,65 C60,55 75,58 85,68 C95,78 98,100 100,110 C102,115 108,118 115,120
           C120,118 125,112 130,105 C138,85 148,60 165,50 C182,40 198,48 208,62 C218,76 222,100 224,112 C226,118 232,122 240,124
           C248,122 252,115 258,108 C265,90 275,68 290,55 C305,42 318,50 328,65 C338,80 342,105 344,115 C346,120 352,124 360,125
           C365,124 370,118 375,110 C382,92 392,72 408,60 C424,48 438,55 448,70 C458,85 460,108 462,118 C464,122 470,125 478,126
           C485,124 490,116 496,106 C504,85 515,58 535,45 C555,32 572,42 582,60 C592,78 594,105 596,116 C598,122 605,126 615,127
           C622,125 628,118 634,108 C642,88 652,65 668,52 C684,40 698,48 708,65 C718,80 720,106 722,116 C724,122 730,126 740,127
           C748,125 754,118 760,108 C768,88 778,62 795,48 C812,35 828,45 838,62 C848,78 850,106 852,116 C854,122 860,126 870,127
           C878,125 882,116 888,105 C896,82 908,55 928,42 C948,30 965,42 975,60 C985,78 988,108 990,118 C992,124 998,127 1008,128
           C1015,126 1020,118 1026,108 C1034,88 1045,62 1062,48 C1080,35 1095,45 1105,62 C1115,78 1118,106 1120,116 C1122,122 1128,126 1138,127
           C1145,125 1150,116 1156,105 C1164,82 1175,55 1195,42 C1215,30 1232,42 1242,60 C1252,78 1254,108 1256,118 C1258,124 1265,127 1275,128
           C1282,126 1288,118 1294,108 C1302,88 1312,65 1328,52 C1344,40 1358,48 1368,65 C1378,80 1380,106 1382,116 C1384,122 1390,126 1400,127
           C1408,125 1415,118 1422,108 C1428,95 1434,82 1440,78
           L1440,160 Z"
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
                {/* Moon glow — warm amber */}
                <div className="absolute top-[8%] right-[18%] w-20 h-20 rounded-full bg-amber-200/10 blur-2xl" />
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

      {/* Transition into content — rolling hills with occasional rocky crags */}
      <div className="relative -mt-1 z-20">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="w-full h-7 sm:h-10 block"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,25
               C60,22 100,18 140,20
               C180,22 200,15 220,18
               L228,8 L234,5 L240,10
               C280,18 340,24 400,20
               C440,16 470,22 510,25
               C560,28 600,20 640,22
               C670,24 690,18 710,20
               L718,10 L722,6 L728,12
               C760,20 820,26 880,22
               C920,18 950,24 990,26
               C1020,28 1050,20 1080,18
               C1100,16 1120,22 1140,24
               L1148,12 L1153,7 L1158,9 L1165,16
               C1200,22 1260,26 1320,22
               C1360,18 1400,24 1440,22
               L1440,70 L0,70 Z"
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
  'from-moss-500 to-sprout-500',
  'from-bark-400 to-primary-500',
  'from-sprout-500 to-primary-500',
  'from-coral-400 to-amber-400',
  'from-amber-400 to-primary-500',
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
      <div className="relative rounded-3xl overflow-visible bg-gradient-to-br from-primary-700 via-primary-600 to-moss-700 shadow-lg shadow-primary-800/15">
        {/* Dot pattern texture */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-[0.06]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="impact-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#impact-dots)" />
          </svg>
        </div>

        <div className="absolute top-0 right-0 w-28 h-28 rounded-full bg-sprout-300/15 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-moss-300/10 blur-2xl" />

        <div className="relative p-5 pb-7">
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
            <div className="flex items-center">
              {stats.map(({ icon: Icon, value, label }, i) => (
                <Fragment key={label}>
                  {i > 0 && <div className="w-px self-stretch bg-white/[0.1] shrink-0" />}
                  <div className="relative flex-1 px-3 py-3.5 text-center">
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 pointer-events-none rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 65%)' }} />
                    <Icon size={16} className="relative text-sprout-300 mx-auto mb-1.5" />
                    <p className="relative font-heading text-lg font-extrabold text-white leading-none">{value}</p>
                    <p className="relative text-[10px] text-white/50 mt-1 leading-tight">{label}</p>
                  </div>
                </Fragment>
              ))}
            </div>
          ) : (
            <div className="flex items-center">
              {[1, 2, 3].map((i) => (
                <Fragment key={i}>
                  {i > 1 && <div className="w-px self-stretch bg-white/[0.1] shrink-0" />}
                  <div className="flex-1 px-3 py-3.5">
                    <div className="w-4 h-4 rounded bg-white/10 mx-auto mb-1.5" />
                    <div className="w-10 h-5 rounded bg-white/10 mx-auto" />
                    <div className="w-14 h-2.5 rounded bg-white/10 mx-auto mt-1" />
                  </div>
                </Fragment>
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
          <ShopBackground rm={rm} />

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
