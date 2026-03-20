import { useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Trash2, Minus, Plus, Tag, ArrowRight } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { EmptyState } from '@/components/empty-state'
import { Divider } from '@/components/divider'
import { useToast } from '@/components/toast'
import { useCart } from '@/hooks/use-cart'
import { validatePromoCode } from '@/hooks/use-merch'
import { formatPrice, variantLabel } from '@/types/merch'
import { cn } from '@/lib/cn'

export default function CartPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { toast } = useToast()

  const items = useCart((s) => s.items)
  const removeItem = useCart((s) => s.removeItem)
  const updateQuantity = useCart((s) => s.updateQuantity)
  const promoCode = useCart((s) => s.promoCode)
  const setPromoCode = useCart((s) => s.setPromoCode)
  const subtotalCents = useCart((s) => s.subtotalCents())
  const discountCents = useCart((s) => s.discountCents())
  const shippingCents = useCart((s) => s.shippingCents())
  const totalCents = useCart((s) => s.totalCents())

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
                src={item.product.images[0] ?? '/img/placeholder-merch.jpg'}
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

                {/* Quantity + remove */}
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center gap-2 bg-white rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
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
                      onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                      className="flex items-center justify-center min-w-11 min-h-11 rounded-xl text-primary-400 hover:bg-primary-50 cursor-pointer select-none active:scale-[0.97] transition-all duration-150"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variant.id)}
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

        {/* Summary */}
        <motion.div variants={fadeUp} className="space-y-2 text-sm">
          <div className="flex justify-between text-primary-400">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(subtotalCents)}</span>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-primary-400">
              <span>Discount</span>
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
