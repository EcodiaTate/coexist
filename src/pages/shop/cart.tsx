import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Minus, Plus, Tag, ArrowRight, ArrowLeft, Crown, Clock,
  AlertTriangle, ShoppingBag, Truck, Shield, X, Leaf,
} from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { useToast } from '@/components/toast'
import { useCart } from '@/hooks/use-cart'
import { useMemberAutoDiscount } from '@/hooks/use-member-discount'
import { validatePromoCode } from '@/hooks/use-merch'
import {
  useMyReservations,
  useReservationCountdown,
  useReserveStock,
  useCartReservationSync,
} from '@/hooks/use-stock-reservation'
import { formatPrice, variantLabel } from '@/types/merch'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Wave divider                                                       */
/* ------------------------------------------------------------------ */

const WAVE_PATH =
  'M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z'

function WaveDivider({ className = 'fill-surface-1' }: { className?: string }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20">
      <svg viewBox="0 0 1440 70" preserveAspectRatio="none" className="w-full h-7 sm:h-10 block" xmlns="http://www.w3.org/2000/svg">
        <path d={WAVE_PATH} className={className} />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Floating back button                                               */
/* ------------------------------------------------------------------ */

function FloatingBack() {
  const navigate = useNavigate()
  const rm = useReducedMotion()
  return (
    <motion.button
      type="button"
      onClick={() => navigate(-1)}
      whileTap={rm ? undefined : { scale: 0.9 }}
      className="absolute top-3 left-3 z-30 flex items-center justify-center w-10 h-10 rounded-full bg-black/20 backdrop-blur-md text-white cursor-pointer select-none transition-colors hover:bg-black/30"
      style={{ marginTop: 'var(--safe-top, 0px)' }}
      aria-label="Go back"
    >
      <ArrowLeft size={20} />
    </motion.button>
  )
}

/* ------------------------------------------------------------------ */
/*  Reservation countdown badge                                        */
/* ------------------------------------------------------------------ */

function ReservationTimer({ expiresAt }: { expiresAt: string | undefined }) {
  const { secondsLeft, isExpiring, isExpired } = useReservationCountdown(expiresAt)

  if (secondsLeft === null) return null

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const display = `${mins}:${secs.toString().padStart(2, '0')}`

  if (isExpired) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-50 mt-2 w-fit">
        <AlertTriangle size={11} className="text-error-500" />
        <span className="text-[11px] font-semibold text-error-600">Expired</span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full mt-2 w-fit',
      isExpiring ? 'bg-warning-50' : 'bg-moss-100/70',
    )}>
      <Clock size={11} className={isExpiring ? 'text-warning-500' : 'text-moss-600'} />
      <span className={cn(
        'text-[11px] font-semibold tabular-nums',
        isExpiring ? 'text-warning-600' : 'text-moss-700',
      )}>
        {display} left
      </span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Cart page                                                          */
/* ------------------------------------------------------------------ */

export default function CartPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { toast } = useToast()
  const placeholderMerch = useAppImage('placeholder_merch')

  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const updateQuantity = useCart((s) => s.updateQuantity)
  const promoCode = useCart((s) => s.promoCode)
  const setPromoCode = useCart((s) => s.setPromoCode)
  const subtotalCents = useCart((s) => s.subtotalCents())
  const memberDiscountCents = useCart((s) => s.memberDiscountCents())
  const discountCents = useCart((s) => s.discountCents())
  const shippingCents = useCart((s) => s.shippingCents())
  const totalCents = useCart((s) => s.totalCents())

  const { memberDiscount } = useMemberAutoDiscount()

  const { release, reserve } = useReserveStock()
  const { getReservation } = useMyReservations()
  useCartReservationSync(items)

  const handleRemove = useCallback((variantId: string) => {
    removeItem(variantId)
    release(variantId)
  }, [removeItem, release])

  const handleUpdateQuantity = useCallback(async (item: typeof items[0], newQty: number) => {
    if (newQty <= 0) {
      handleRemove(item.variant.id)
      return
    }
    const result = await reserve(item.product.id, item.variant.id, newQty)
    if (!result.success) {
      toast.error(
        result.available === 0
          ? 'This item is no longer available'
          : `Only ${result.available} available`,
      )
      if (result.available && result.available > 0) {
        updateQuantity(item.variant.id, result.available)
      }
      return
    }
    updateQuantity(item.variant.id, newQty)
  }, [handleRemove, reserve, updateQuantity, toast])

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  }

  const [promoInput, setPromoInput] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)

  const handleApplyPromo = useCallback(async () => {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    try {
      const result = await validatePromoCode(promoInput)
      if (result.valid && result.promo) {
        setPromoCode(result.promo as any)
        toast.success('Promo code applied!')
        setPromoInput('')
      } else {
        toast.error('Invalid or expired promo code')
      }
    } catch {
      toast.error('Error validating promo code')
    } finally {
      setPromoLoading(false)
    }
  }, [promoInput, setPromoCode, toast])

  /* ================================================================ */
  /*  Empty state                                                      */
  /* ================================================================ */
  if (items.length === 0) {
    return (
      <Page noBackground className="!px-0">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
          <FloatingBack />

          {/* Decorative */}
          <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/[0.04]" />
          <div className="absolute -left-10 bottom-4 w-36 h-36 rounded-full bg-white/[0.04]" />
          <div className="absolute right-12 bottom-12 w-20 h-20 rounded-full border border-white/[0.08]" />
          <div className="absolute left-[30%] top-[20%] w-2 h-2 rounded-full bg-white/10" />
          <div className="absolute right-[20%] top-[60%] w-1.5 h-1.5 rounded-full bg-white/10" />

          <div className="relative z-10 px-6 pt-20 pb-16 text-center">
            <motion.div
              initial={rm ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-5 ring-1 ring-white/10"
            >
              <ShoppingBag size={30} className="text-white/90" />
            </motion.div>

            <motion.div
              initial={rm ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h1 className="font-heading text-2xl font-bold text-white">
                Your cart is empty
              </h1>
              <p className="text-sm text-white/50 mt-2.5 max-w-[260px] mx-auto leading-relaxed">
                Gear that gives back — every purchase supports conservation across Australia
              </p>
            </motion.div>
          </div>

          <WaveDivider />
        </div>

        {/* Body */}
        <div className="bg-surface-1 px-5 pt-6 pb-10 flex flex-col items-center">
          <Link to="/shop" tabIndex={-1}>
            <Button variant="primary" size="lg" icon={<ShoppingBag size={18} />}>
              Browse the shop
            </Button>
          </Link>

          <div className="flex items-center gap-4 mt-8 px-5 py-3 rounded-2xl bg-surface-3/80">
            <div className="flex items-center gap-1.5 text-primary-500">
              <Truck size={14} />
              <span className="text-xs font-medium">Free over $75</span>
            </div>
            <div className="w-px h-4 bg-primary-200/50" />
            <div className="flex items-center gap-1.5 text-primary-500">
              <Shield size={14} />
              <span className="text-xs font-medium">Secure checkout</span>
            </div>
          </div>
        </div>
      </Page>
    )
  }

  /* ================================================================ */
  /*  Cart with items                                                  */
  /* ================================================================ */
  return (
    <Page
      noBackground
      className="!px-0"
      footer={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-500">Total</span>
            <span className="font-heading text-lg font-bold text-primary-800 tabular-nums">
              {formatPrice(totalCents)}
            </span>
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ArrowRight size={18} />}
            onClick={() => navigate('/shop/checkout')}
          >
            Checkout
          </Button>
        </div>
      }
    >
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        <FloatingBack />

        {/* Decorative */}
        <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/[0.04]" />
        <div className="absolute -left-8 bottom-0 w-28 h-28 rounded-full bg-white/[0.04]" />
        <div className="absolute right-10 bottom-10 w-14 h-14 rounded-full border border-white/[0.07]" />

        <div
          className="relative z-10 px-6 pb-12 flex items-center gap-4"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 3.5rem)' }}
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm shrink-0 ring-1 ring-white/10">
            <ShoppingBag size={22} className="text-white/90" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-white">
              {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              {formatPrice(subtotalCents)} subtotal
            </p>
          </div>
        </div>

        <WaveDivider />
      </div>

      {/* ── Cart body ── */}
      <div className="bg-surface-1 min-h-[50dvh]">
        <motion.div
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="px-4 pt-4 pb-6 space-y-3"
        >
          {/* Cart items */}
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.variant.id}
                layout
                initial={rm ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={rm ? undefined : { opacity: 0, x: -60, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.25 }}
                className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-surface-2 to-surface-3/60 ring-1 ring-primary-200/25 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                {/* Top edge accent line */}
                <div className="h-[2px] bg-gradient-to-r from-primary-300/40 via-moss-300/30 to-transparent" />

                <div className="flex gap-3.5 p-3.5">
                  {/* Image */}
                  <Link to={`/shop/product/${item.product.id}`} className="shrink-0 group">
                    <div className="relative rounded-xl overflow-hidden ring-1 ring-primary-900/[0.06]">
                      <img
                        src={item.product.images[0] ?? placeholderMerch}
                        alt={item.product.name}
                        className="w-[84px] h-[84px] object-cover group-active:scale-[0.97] transition-transform duration-150"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.04] rounded-xl pointer-events-none" />
                    </div>
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-heading font-semibold text-sm text-primary-800 truncate leading-tight">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-primary-400 mt-0.5">
                          {variantLabel(item.variant)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.variant.id)}
                        className="flex items-center justify-center w-8 h-8 -mt-0.5 -mr-1 rounded-full text-primary-300 hover:text-error-500 hover:bg-error-50 cursor-pointer select-none active:scale-[0.92] transition-all duration-150"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <ReservationTimer expiresAt={getReservation(item.variant.id)?.expires_at} />

                    {/* Price + Quantity */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <p className="font-heading font-bold text-[15px] text-primary-700 tabular-nums">
                        {formatPrice(item.variant.price_cents * item.quantity)}
                      </p>

                      <div className="inline-flex items-center gap-0 bg-gradient-to-b from-surface-3 to-primary-100/40 rounded-xl ring-1 ring-primary-200/40">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                          className="flex items-center justify-center w-9 h-9 rounded-l-xl text-primary-600 hover:bg-primary-100/60 cursor-pointer select-none active:scale-[0.92] transition-all duration-150"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-sm font-bold text-primary-800 tabular-nums min-w-[2.5ch] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                          className="flex items-center justify-center w-9 h-9 rounded-r-xl text-primary-600 hover:bg-primary-100/60 cursor-pointer select-none active:scale-[0.92] transition-all duration-150"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Promo code */}
          <motion.div variants={fadeUp} className="pt-1">
            {promoCode ? (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-moss-100/80 to-moss-50/60 rounded-xl ring-1 ring-moss-200/60">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-moss-200/70">
                  <Tag size={14} className="text-moss-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-moss-800">{promoCode.code}</p>
                  <p className="text-xs text-moss-500">Promo applied</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPromoCode(null)}
                  className="flex items-center justify-center w-8 h-8 rounded-full text-moss-400 hover:bg-moss-200/50 cursor-pointer select-none active:scale-[0.92] transition-all duration-150"
                  aria-label="Remove promo code"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Promo code"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    icon={<Tag size={16} />}
                  />
                </div>
                <Button
                  variant="secondary"
                  size="md"
                  loading={promoLoading}
                  onClick={handleApplyPromo}
                  className="self-start mt-1"
                >
                  Apply
                </Button>
              </div>
            )}
          </motion.div>

          {/* Member discount */}
          {memberDiscount && memberDiscountCents > 0 && (
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r from-primary-200/50 via-primary-100/40 to-surface-2 ring-1 ring-primary-200/40"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-200/60 ring-1 ring-primary-300/20">
                <Crown size={18} className="text-primary-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-800">
                  {memberDiscount.title}
                </p>
                <p className="text-xs text-primary-500">
                  {memberDiscount.discount_percent}% member discount
                </p>
              </div>
              <span className="text-sm font-bold text-primary-700 tabular-nums shrink-0">
                -{formatPrice(memberDiscountCents)}
              </span>
            </motion.div>
          )}

          {/* Order summary */}
          <motion.div
            variants={fadeUp}
            className="rounded-2xl overflow-hidden ring-1 ring-primary-200/25 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-200/50 to-surface-3 px-4 py-3 border-b border-primary-200/25">
              <h3 className="font-heading font-semibold text-sm text-primary-800">Order summary</h3>
            </div>

            {/* Body */}
            <div className="bg-gradient-to-b from-surface-2 to-surface-1 px-4 py-4 space-y-3">
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-primary-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-medium">{formatPrice(subtotalCents)}</span>
                </div>
                {memberDiscountCents > 0 && (
                  <div className="flex justify-between text-primary-700">
                    <span className="flex items-center gap-1.5">
                      <Crown size={12} />
                      Member discount
                    </span>
                    <span className="tabular-nums font-medium">-{formatPrice(memberDiscountCents)}</span>
                  </div>
                )}
                {discountCents > 0 && (
                  <div className="flex justify-between text-moss-700">
                    <span className="flex items-center gap-1.5">
                      <Tag size={12} />
                      Promo discount
                    </span>
                    <span className="tabular-nums font-medium">-{formatPrice(discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-primary-500">
                  <span className="flex items-center gap-1.5">
                    <Truck size={12} />
                    Shipping
                  </span>
                  <span className="tabular-nums font-medium">
                    {shippingCents === 0 ? (
                      <span className="text-moss-600 font-semibold">Free</span>
                    ) : (
                      formatPrice(shippingCents)
                    )}
                  </span>
                </div>
              </div>

              {/* Total */}
              <div className="-mx-4 px-4 py-3.5 bg-gradient-to-r from-primary-200/40 via-primary-100/30 to-surface-2 border-t border-primary-200/25 flex justify-between items-center">
                <span className="font-heading font-bold text-primary-800">Total</span>
                <span className="font-heading font-bold text-lg text-primary-800 tabular-nums">
                  {formatPrice(totalCents)}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 py-3">
            <div className="flex items-center gap-1.5 text-primary-400">
              <Truck size={13} />
              <span className="text-xs font-medium">Free over $75</span>
            </div>
            <div className="w-px h-3.5 bg-primary-200/40" />
            <div className="flex items-center gap-1.5 text-primary-400">
              <Shield size={13} />
              <span className="text-xs font-medium">Secure</span>
            </div>
            <div className="w-px h-3.5 bg-primary-200/40" />
            <div className="flex items-center gap-1.5 text-primary-400">
              <Leaf size={13} />
              <span className="text-xs font-medium">Eco packaging</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Page>
  )
}
