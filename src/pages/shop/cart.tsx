import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Trash2, Minus, Plus, Tag, ArrowRight, Crown, Clock, AlertTriangle } from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { EmptyState } from '@/components/empty-state'
import { Divider } from '@/components/divider'
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
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-error-50 mt-1">
        <AlertTriangle size={12} className="text-error-500" />
        <span className="text-xs font-medium text-error-600">Reservation expired</span>
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-2 py-1 rounded-lg mt-1',
      isExpiring ? 'bg-warning-50' : 'bg-primary-50/60',
    )}>
      <Clock size={12} className={isExpiring ? 'text-warning-500' : 'text-primary-400'} />
      <span className={cn(
        'text-xs font-medium tabular-nums',
        isExpiring ? 'text-warning-600' : 'text-primary-400',
      )}>
        Reserved for {display}
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

  // Stock reservation system
  const { release, reserve } = useReserveStock()
  const { getReservation } = useMyReservations()

  // Keep reservations synced with cart items
  useCartReservationSync(items)

  // Release reservation when removing from cart
  const handleRemove = useCallback((variantId: string) => {
    removeItem(variantId)
    release(variantId)
  }, [removeItem, release])

  // Update quantity with re-reservation
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
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
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

  if (items.length === 0) {
    return (
      <Page header={<Header title="Cart" back />}>
        <EmptyState
          illustration="empty"
          title="Your cart is empty"
          description="Browse our merch store for Co-Exist branded gear"
          action={{ label: 'Shop now', to: '/shop' }}
        />
      </Page>
    )
  }

  return (
    <Page
      header={<Header title={`Cart (${items.length})`} back />}
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          icon={<ArrowRight size={18} />}
          onClick={() => navigate('/shop/checkout')}
        >
          Checkout - {formatPrice(totalCents)}
        </Button>
      }
    >
      <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="py-4 space-y-4">
        {/* Cart items */}
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.variant.id}
              layout
              initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, x: 20, height: 0 }}
              className="flex gap-3 p-3 bg-white rounded-2xl shadow-sm"
            >
              {/* Image */}
              <img
                src={item.product.images[0] ?? placeholderMerch}
                alt={item.product.name}
                className="w-20 h-20 object-cover rounded-xl shrink-0"
                loading="lazy"
              />

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-primary-800 truncate">
                  {item.product.name}
                </p>
                <p className="text-xs text-primary-400 mt-0.5">
                  {variantLabel(item.variant)}
                </p>
                <p className="font-heading font-bold text-sm text-primary-400 mt-1">
                  {formatPrice(item.variant.price_cents * item.quantity)}
                </p>

                {/* Reservation timer */}
                <ReservationTimer expiresAt={getReservation(item.variant.id)?.expires_at} />

                {/* Quantity + remove */}
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center gap-2 bg-white rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                      className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-primary-400 hover:bg-primary-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold tabular-nums min-w-[2ch] text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                      className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-primary-400 hover:bg-primary-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.variant.id)}
                    className="flex items-center justify-center min-w-11 min-h-11 rounded-full text-primary-400 hover:text-error hover:bg-error-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Promo code */}
        <motion.div variants={fadeUp} className="flex gap-2">
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
        </motion.div>
        {promoCode && (
          <div className="flex items-center justify-between px-3 py-2 bg-white rounded-lg shadow-sm">
            <span className="text-sm text-primary-400 font-medium">
              <Tag size={14} className="inline -mt-0.5 mr-1" />
              {promoCode.code}
            </span>
            <button
              type="button"
              onClick={() => setPromoCode(null)}
              className="text-xs text-primary-400 hover:underline min-h-11 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
            >
              Remove
            </button>
          </div>
        )}

        <Divider />

        {/* Member discount banner */}
        {memberDiscount && memberDiscountCents > 0 && (
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-primary-50 ring-1 ring-primary-200/50"
          >
            <Crown size={16} className="text-primary-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary-800">
                Member discount applied
              </p>
              <p className="text-xs text-primary-500">
                {memberDiscount.title} &middot; {memberDiscount.discount_percent}% off
              </p>
            </div>
            <span className="text-sm font-bold text-primary-700 tabular-nums shrink-0">
              -{formatPrice(memberDiscountCents)}
            </span>
          </motion.div>
        )}

        {/* Summary */}
        <motion.div variants={fadeUp} className="space-y-2 text-sm">
          <div className="flex justify-between text-primary-400">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
          </div>
          {memberDiscountCents > 0 && (
            <div className="flex justify-between text-primary-600">
              <span className="flex items-center gap-1">
                <Crown size={12} />
                Member discount
              </span>
              <span className="tabular-nums">-{formatPrice(memberDiscountCents)}</span>
            </div>
          )}
          {discountCents > 0 && (
            <div className="flex justify-between text-primary-400">
              <span>Promo discount</span>
              <span className="tabular-nums">-{formatPrice(discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between text-primary-400">
            <span>Shipping</span>
            <span className="tabular-nums">
              {shippingCents === 0 ? 'Free' : formatPrice(shippingCents)}
            </span>
          </div>
          <Divider />
          <div className="flex justify-between font-heading font-bold text-primary-800">
            <span>Total</span>
            <span className="tabular-nums">{formatPrice(totalCents)}</span>
          </div>
        </motion.div>
      </motion.div>
    </Page>
  )
}
