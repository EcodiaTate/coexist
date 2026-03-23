import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MapPin, CreditCard, Clock, Truck, Tag, Shield, Lock, ArrowLeft } from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { useToast } from '@/components/toast'
import { useCart } from '@/hooks/use-cart'
import { useCreateMerchCheckout, useSavedAddresses } from '@/hooks/use-orders'
import { useCartReservationSync, useMyReservations, useReservationCountdown } from '@/hooks/use-stock-reservation'
import { redirectToCheckout } from '@/lib/stripe'
import { formatPrice, type ShippingAddress } from '@/types/merch'
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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const AU_STATES = [
  { label: 'NSW', value: 'NSW' },
  { label: 'VIC', value: 'VIC' },
  { label: 'QLD', value: 'QLD' },
  { label: 'WA', value: 'WA' },
  { label: 'SA', value: 'SA' },
  { label: 'TAS', value: 'TAS' },
  { label: 'ACT', value: 'ACT' },
  { label: 'NT', value: 'NT' },
]

const EMPTY_ADDRESS: ShippingAddress = {
  full_name: '',
  line1: '',
  line2: null,
  city: '',
  state: '',
  postcode: '',
  country: 'AU',
  phone: null,
}

/* ------------------------------------------------------------------ */
/*  Checkout page                                                      */
/* ------------------------------------------------------------------ */

export default function CheckoutPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { toast } = useToast()
  const placeholderMerch = useAppImage('placeholder_merch')

  const items = useCart((s) => s.items)
  const subtotalCents = useCart((s) => s.subtotalCents())
  const discountCents = useCart((s) => s.discountCents())
  const shippingCents = useCart((s) => s.shippingCents())
  const totalCents = useCart((s) => s.totalCents())
  const clearCart = useCart((s) => s.clear)

  const { releaseAll } = useCartReservationSync(items)
  const { reservations } = useMyReservations()

  const earliestExpiry = reservations.length > 0
    ? reservations.reduce<string | undefined>((earliest, r) =>
        !earliest || new Date(r.expires_at) < new Date(earliest) ? r.expires_at : earliest,
      undefined)
    : undefined
  const { secondsLeft: reservationSecondsLeft, isExpiring: reservationExpiring, isExpired: reservationExpired } =
    useReservationCountdown(earliestExpiry)

  const { data: savedAddresses } = useSavedAddresses()
  const checkout = useCreateMerchCheckout()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
  }

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSelectSaved = useCallback((saved: ShippingAddress) => {
    setAddress(saved)
    setErrors({})
  }, [])

  const updateField = useCallback((field: keyof ShippingAddress, value: string) => {
    setAddress((a) => ({ ...a, [field]: value || null }))
    setErrors((e) => ({ ...e, [field]: '' }))
  }, [])

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {}
    if (!address.full_name.trim()) errs.full_name = 'Name is required'
    if (!address.line1.trim()) errs.line1 = 'Address is required'
    if (!address.city.trim()) errs.city = 'City is required'
    if (!address.state) errs.state = 'State is required'
    if (!address.postcode.trim()) errs.postcode = 'Postcode is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [address])

  const handleCheckout = useCallback(async () => {
    if (!validate()) return
    if (reservationExpired) {
      toast.error('Your reservations have expired. Please go back to your cart and try again.')
      return
    }
    try {
      const result = await checkout.mutateAsync({ shippingAddress: address })
      if (result.url) {
        window.location.href = result.url
      } else if (result.session_id) {
        await redirectToCheckout(result.session_id)
      }
    } catch {
      toast.error('Checkout failed. Please try again.')
    }
  }, [validate, checkout, address, toast, reservationExpired])

  useEffect(() => {
    if (items.length === 0) {
      navigate('/shop/cart', { replace: true })
    }
  }, [items.length, navigate])

  if (items.length === 0) return null

  const reservationMins = reservationSecondsLeft !== null ? Math.floor(reservationSecondsLeft / 60) : 0
  const reservationSecs = reservationSecondsLeft !== null ? (reservationSecondsLeft % 60).toString().padStart(2, '0') : '00'

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
            icon={<CreditCard size={18} />}
            loading={checkout.isPending}
            disabled={reservationExpired}
            onClick={handleCheckout}
          >
            {reservationExpired ? 'Reservations Expired' : `Pay ${formatPrice(totalCents)}`}
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
            <Lock size={22} className="text-white/90" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold text-white">
              Secure checkout
            </h1>
            <p className="text-xs text-white/50 mt-0.5">
              {items.length} {items.length === 1 ? 'item' : 'items'} &middot; {formatPrice(totalCents)}
            </p>
          </div>
        </div>

        <WaveDivider />
      </div>

      {/* ── Checkout body ── */}
      <div className="bg-surface-1 min-h-[50dvh]">
        <motion.div
          variants={rm ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="px-4 pt-4 pb-6 space-y-4"
        >
          {/* Reservation countdown */}
          {reservationSecondsLeft !== null && reservationSecondsLeft > 0 && (
            <motion.div
              variants={fadeUp}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 rounded-xl',
                reservationExpiring
                  ? 'bg-gradient-to-r from-warning-100/70 to-warning-50/50 ring-1 ring-warning-200/50'
                  : 'bg-gradient-to-r from-primary-200/50 to-primary-100/30 ring-1 ring-primary-200/40',
              )}
            >
              <Clock size={16} className={reservationExpiring ? 'text-warning-600 shrink-0' : 'text-primary-600 shrink-0'} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold', reservationExpiring ? 'text-warning-800' : 'text-primary-800')}>
                  Items reserved for you
                </p>
                <p className={cn('text-xs', reservationExpiring ? 'text-warning-600' : 'text-primary-500')}>
                  Complete within {reservationMins}:{reservationSecs}
                </p>
              </div>
            </motion.div>
          )}
          {reservationExpired && (
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-error-50 ring-1 ring-error-200/50"
            >
              <Clock size={16} className="text-error-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-error-800">Reservations expired</p>
                <p className="text-xs text-error-600">Go back to your cart to re-reserve items</p>
              </div>
            </motion.div>
          )}

          {/* Saved addresses */}
          {savedAddresses && savedAddresses.length > 0 && (
            <motion.section variants={fadeUp}>
              <h3 className="font-heading font-semibold text-sm text-primary-700 mb-3">
                Saved addresses
              </h3>
              <div className="space-y-2">
                {savedAddresses.map((saved, i) => {
                  const isSelected = address.line1 === saved.line1 && address.postcode === saved.postcode
                  return (
                    <button
                      key={saved.id ?? i}
                      type="button"
                      onClick={() => handleSelectSaved(saved)}
                      className={cn(
                        'w-full text-left p-3.5 min-h-11 rounded-xl cursor-pointer select-none active:scale-[0.98] transition-all duration-150',
                        isSelected
                          ? 'ring-2 ring-primary-500 bg-gradient-to-br from-primary-100/50 to-surface-2 shadow-sm'
                          : 'bg-gradient-to-br from-surface-2 to-surface-3/40 ring-1 ring-primary-200/25 hover:ring-primary-300/40',
                      )}
                    >
                      <p className="text-sm font-medium text-primary-800">{saved.full_name}</p>
                      <p className="text-xs text-primary-400 mt-0.5">
                        {saved.line1}, {saved.city} {saved.state} {saved.postcode}
                      </p>
                    </button>
                  )
                })}
              </div>
            </motion.section>
          )}

          {/* Shipping address form */}
          <motion.section
            variants={fadeUp}
            className="rounded-2xl overflow-hidden ring-1 ring-primary-200/25 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="bg-gradient-to-r from-primary-200/50 to-surface-3 px-4 py-3 flex items-center gap-2 border-b border-primary-200/25">
              <MapPin size={16} className="text-primary-600" />
              <h3 className="font-heading font-semibold text-sm text-primary-800">
                Shipping address
              </h3>
            </div>
            <div className="bg-gradient-to-b from-surface-2 to-surface-1 px-4 py-4 space-y-3">
              <Input
                label="Full name"
                value={address.full_name}
                onChange={(e) => updateField('full_name', e.target.value)}
                error={errors.full_name}
                required
                autoComplete="name"
              />
              <Input
                label="Address line 1"
                value={address.line1}
                onChange={(e) => updateField('line1', e.target.value)}
                error={errors.line1}
                required
                autoComplete="address-line1"
              />
              <Input
                label="Address line 2 (optional)"
                value={address.line2 ?? ''}
                onChange={(e) => updateField('line2', e.target.value)}
                autoComplete="address-line2"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City"
                  value={address.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  error={errors.city}
                  required
                  autoComplete="address-level2"
                />
                <Input
                  label="State"
                  value={address.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  error={errors.state}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Postcode"
                  value={address.postcode}
                  onChange={(e) => updateField('postcode', e.target.value)}
                  error={errors.postcode}
                  required
                  autoComplete="postal-code"
                />
                <Input
                  label="Phone (optional)"
                  value={address.phone ?? ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
          </motion.section>

          {/* Order summary */}
          <motion.section
            variants={fadeUp}
            className="rounded-2xl overflow-hidden ring-1 ring-primary-200/25 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="bg-gradient-to-r from-primary-200/50 to-surface-3 px-4 py-3 border-b border-primary-200/25">
              <h3 className="font-heading font-semibold text-sm text-primary-800">Order summary</h3>
            </div>

            <div className="bg-gradient-to-b from-surface-2 to-surface-1 px-4 py-4 space-y-4">
              {/* Item thumbnails */}
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.variant.id} className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-surface-3/40 transition-colors">
                    <div className="relative rounded-lg overflow-hidden ring-1 ring-primary-900/[0.06] shrink-0">
                      <img
                        src={item.product.images[0] ?? placeholderMerch}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover"
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-black/[0.04] rounded-lg pointer-events-none" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary-800 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-primary-400">x{item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-primary-700 tabular-nums">
                      {formatPrice(item.variant.price_cents * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-primary-200/25" />

              {/* Totals */}
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-primary-500">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-medium">{formatPrice(subtotalCents)}</span>
                </div>
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

              {/* Total highlight */}
              <div className="-mx-4 px-4 py-3.5 bg-gradient-to-r from-primary-200/40 via-primary-100/30 to-surface-2 border-t border-primary-200/25 flex justify-between items-center">
                <span className="font-heading font-bold text-primary-800">Total</span>
                <span className="font-heading font-bold text-lg text-primary-800 tabular-nums">
                  {formatPrice(totalCents)}
                </span>
              </div>
            </div>
          </motion.section>

          {/* Trust badges */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-1.5 text-primary-400">
              <Shield size={13} />
              <span className="text-xs font-medium">SSL encrypted</span>
            </div>
            <div className="w-px h-3.5 bg-primary-200/40" />
            <div className="flex items-center gap-1.5 text-primary-400">
              <CreditCard size={13} />
              <span className="text-xs font-medium">Stripe powered</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Page>
  )
}
