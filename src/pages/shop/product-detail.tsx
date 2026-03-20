import { useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ShoppingBag, Star, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Avatar } from '@/components/avatar'
import { useToast } from '@/components/toast'
import { useProduct, useRelatedProducts, useProductReviews } from '@/hooks/use-merch'
import { useCart } from '@/hooks/use-cart'
import { formatPrice, variantLabel, type ProductVariant } from '@/types/merch'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Swipeable image gallery                                            */
/* ------------------------------------------------------------------ */

function ImageGallery({ images, alt }: { images: string[]; alt: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const scrollTo = useCallback((index: number) => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setCurrentIndex(index)
  }, [])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    setCurrentIndex(idx)
  }, [])

  if (images.length === 0) {
    return (
      <div className="w-full aspect-square bg-white flex items-center justify-center">
        <ShoppingBag size={48} className="text-primary-300" />
      </div>
    )
  }

  return (
    <div className="relative -mx-4 lg:-mx-6">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
      >
        {images.map((src, i) => (
          <div key={i} className="snap-center shrink-0 w-full">
            <img
              src={src}
              alt={`${alt} image ${i + 1}`}
              className="w-full aspect-square object-cover"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Image ${i + 1}`}
              className={cn(
                'w-2 h-2 rounded-full p-2.5 bg-clip-content transition-all duration-150 cursor-pointer select-none active:scale-[0.97]',
                i === currentIndex ? 'bg-white' : 'bg-white/50',
              )}
            />
          ))}
        </div>
      )}
      {/* Arrow buttons (desktop) */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollTo(Math.max(0, currentIndex - 1))}
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 items-center justify-center min-w-11 min-h-11 rounded-full bg-white/80 shadow-sm cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
            aria-label="Previous image"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(Math.min(images.length - 1, currentIndex + 1))}
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 items-center justify-center min-w-11 min-h-11 rounded-full bg-white/80 shadow-sm cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
            aria-label="Next image"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Star rating display                                                */
/* ------------------------------------------------------------------ */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={cn(
            i < Math.round(rating) ? 'text-warning-400 fill-warning-400' : 'text-primary-300',
          )}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main product detail page                                           */
/* ------------------------------------------------------------------ */

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { toast } = useToast()

  const { data: product, isLoading } = useProduct(slug)
  const { data: reviews } = useProductReviews(product?.id)
  const { data: related } = useRelatedProducts(product?.id, product?.category ?? null)
  const addItem = useCart((s) => s.addItem)

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Auto-select first in-stock variant when product loads
  const activeVariant = selectedVariant ?? product?.variants.find((v) => v.stock > 0 && v.is_active) ?? product?.variants[0] ?? null
  const inStock = activeVariant ? activeVariant.stock > 0 : false

  const handleAddToCart = useCallback(() => {
    if (!product || !activeVariant) return
    addItem(product, activeVariant, quantity)
    toast.success(`${product.name} added to cart`)
  }, [product, activeVariant, quantity, addItem, toast])

  if (isLoading) {
    return (
      <Page header={<Header title="Product" back />}>
        <Skeleton variant="card" className="rounded-none" />
        <div className="py-4 space-y-3">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={3} />
        </div>
      </Page>
    )
  }

  if (!product) {
    return (
      <Page header={<Header title="Product" back />}>
        <EmptyState
          illustration="error"
          title="Product not found"
          description="This product may have been removed"
          action={{ label: 'Back to shop', to: '/shop' }}
        />
      </Page>
    )
  }

  // Group unique sizes and colours
  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[]
  const colours = [...new Set(product.variants.map((v) => v.colour).filter(Boolean))] as string[]

  return (
    <Page
      header={<Header title={product.name} back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ShoppingBag size={18} />}
          disabled={!inStock}
          onClick={handleAddToCart}
        >
          {inStock ? `Add to cart - ${formatPrice(activeVariant!.price_cents * quantity)}` : 'Sold out'}
        </Button>
      }
    >
      {/* Image gallery */}
      <ImageGallery images={product.images} alt={product.name} />

      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="py-5 space-y-5"
      >
        {/* Name + price */}
        <motion.div variants={fadeUp}>
          <h1 className="font-heading text-xl font-bold text-primary-800">
            {product.name}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-heading text-lg font-bold text-primary-400">
              {formatPrice(activeVariant?.price_cents ?? product.base_price_cents)}
            </span>
            {product.avg_rating !== null && product.review_count > 0 && (
              <div className="flex items-center gap-1.5">
                <Stars rating={product.avg_rating} />
                <span className="text-sm text-primary-400">
                  ({product.review_count})
                </span>
              </div>
            )}
          </div>
          {activeVariant && !inStock && (
            <p className="mt-1 text-sm font-medium text-error">Out of stock</p>
          )}
          {activeVariant && activeVariant.stock > 0 && activeVariant.stock <= 5 && (
            <p className="mt-1 text-sm font-medium text-warning-600">
              Only {activeVariant.stock} left
            </p>
          )}
        </motion.div>

        {/* Description */}
        <motion.div variants={fadeUp}>
        <p className="text-sm text-primary-400 leading-relaxed">
          {product.description}
        </p>
        </motion.div>

        {/* Variant selector: sizes */}
        {sizes.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-primary-800 mb-2">Size</h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => {
                const variant = product.variants.find(
                  (v) => v.size === size && (activeVariant?.colour ? v.colour === activeVariant.colour : true),
                )
                const isSelected = activeVariant?.size === size
                const available = variant && variant.stock > 0

                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => variant && setSelectedVariant(variant)}
                    disabled={!available}
                    className={cn(
                      'px-4 py-2 min-h-11 rounded-xl text-sm font-medium cursor-pointer select-none',
                      'active:scale-[0.97] transition-all duration-150',
                      isSelected
                        ? 'bg-primary-100 text-primary-800 shadow-sm ring-2 ring-primary-500'
                        : available
                          ? 'bg-primary-50/60 text-primary-800 hover:bg-primary-100/60'
                          : 'bg-primary-50/30 text-primary-300 cursor-not-allowed line-through',
                    )}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Variant selector: colours */}
        {colours.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-primary-800 mb-2">Colour</h3>
            <div className="flex flex-wrap gap-2">
              {colours.map((colour) => {
                const variant = product.variants.find(
                  (v) => v.colour === colour && (activeVariant?.size ? v.size === activeVariant.size : true),
                )
                const isSelected = activeVariant?.colour === colour
                const available = variant && variant.stock > 0

                return (
                  <button
                    key={colour}
                    type="button"
                    onClick={() => variant && setSelectedVariant(variant)}
                    disabled={!available}
                    className={cn(
                      'px-4 py-2 min-h-11 rounded-xl text-sm font-medium cursor-pointer select-none',
                      'active:scale-[0.97] transition-all duration-150',
                      isSelected
                        ? 'bg-primary-100 text-primary-800 shadow-sm ring-2 ring-primary-500'
                        : available
                          ? 'bg-primary-50/60 text-primary-800 hover:bg-primary-100/60'
                          : 'bg-primary-50/30 text-primary-300 cursor-not-allowed line-through',
                    )}
                  >
                    {colour}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* Quantity */}
        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold text-primary-800 mb-2">Quantity</h3>
          <div className="inline-flex items-center gap-3 bg-white rounded-lg p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-primary-400 hover:bg-primary-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="font-heading font-semibold text-primary-800 min-w-[2ch] text-center tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-primary-400 hover:bg-primary-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
        </motion.div>

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className="font-heading font-semibold text-primary-800 mb-3">
              Reviews ({reviews.length})
            </h3>
            <div className="space-y-3">
              {reviews.slice(0, 5).map((review) => (
                <div
                  key={review.id}
                  className="p-3 rounded-xl bg-primary-50/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar
                      src={review.profiles?.avatar_url}
                      name={review.profiles?.display_name ?? 'Anonymous'}
                      size="xs"
                    />
                    <span className="text-sm font-medium text-primary-800">
                      {review.profiles?.display_name ?? 'Anonymous'}
                    </span>
                    <Stars rating={review.rating} />
                  </div>
                  {review.text && (
                    <p className="text-sm text-primary-400">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Related products */}
        {related && related.length > 0 && (
          <motion.div variants={fadeUp}>
            <h3 className="font-heading font-semibold text-primary-800 mb-3">
              You might also like
            </h3>
            <div className="-mx-4 lg:-mx-6">
            <div className="flex gap-3 overflow-x-auto px-4 lg:px-6 scrollbar-none pb-2">
              {related.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigate(`/shop/${p.slug}`)}
                  className="shrink-0 w-36 min-h-11 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
                >
                  <Card variant="merch">
                    <Card.Image
                      src={p.images[0] ?? '/img/placeholder-merch.jpg'}
                      alt={p.name}
                      aspectRatio="1/1"
                    />
                    <Card.Content className="pb-2">
                      <Card.Title className="text-xs line-clamp-1">{p.name}</Card.Title>
                      <p className="text-xs font-semibold text-primary-400 mt-0.5">
                        {formatPrice(p.base_price_cents)}
                      </p>
                    </Card.Content>
                  </Card>
                </button>
              ))}
            </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Page>
  )
}
