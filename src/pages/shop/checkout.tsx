import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MapPin, CreditCard, Crown, Clock } from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Divider } from '@/components/divider'
import { Dropdown } from '@/components/dropdown'
import { useToast } from '@/components/toast'
import { useCart } from '@/hooks/use-cart'
import { useMemberAutoDiscount } from '@/hooks/use-member-discount'
import { useCreateMerchCheckout, useSavedAddresses } from '@/hooks/use-orders'
import { useCartReservationSync, useMyReservations, useReservationCountdown } from '@/hooks/use-stock-reservation'
import { redirectToCheckout } from '@/lib/stripe'
import { formatPrice, type ShippingAddress } from '@/types/merch'
import { cn } from '@/lib/cn'

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

export default function CheckoutPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const { toast } = useToast()
  const placeholderMerch = useAppImage('placeholder_merch')

  const items = useCart((s) => s.items)
  const subtotalCents = useCart((s) => s.subtotalCents())
  const memberDiscountCents = useCart((s) => s.memberDiscountCents())
  const discountCents = useCart((s) => s.discountCents())
  const shippingCents = useCart((s) => s.shippingCents())
  const totalCents = useCart((s) => s.totalCents())
  const clearCart = useCart((s) => s.clear)

  // Keep member discount synced
  useMemberAutoDiscount()

  // Keep stock reservations alive while on checkout
  const { releaseAll } = useCartReservationSync(items)
  const { reservations } = useMyReservations()

  // Find the earliest expiring reservation to show a countdown
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
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Pre-fill from saved address
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

    // Block checkout if reservations have expired
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

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/shop/cart', { replace: true })
    }
  }, [items.length, navigate])

  if (items.length === 0) {
    return null
  }

  return (
    <Page
      header={<Header title="Checkout" back />}
      footer={
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
      }
    >
      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="py-5 space-y-6"
      >
        {/* Reservation countdown banner */}
        {reservationSecondsLeft !== null && reservationSecondsLeft > 0 && (
          <motion.div
            variants={fadeUp}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl',
              reservationExpiring
                ? 'bg-warning-50 ring-1 ring-warning-200/50'
                : 'bg-primary-50 ring-1 ring-primary-200/50',
            )}
          >
            <Clock size={16} className={reservationExpiring ? 'text-warning-600 shrink-0' : 'text-primary-500 shrink-0'} />
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold', reservationExpiring ? 'text-warning-800' : 'text-primary-800')}>
                Items reserved for you
              </p>
              <p className={cn('text-xs', reservationExpiring ? 'text-warning-600' : 'text-primary-500')}>
                Complete checkout within {Math.floor(reservationSecondsLeft / 60)}:{(reservationSecondsLeft % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </motion.div>
        )}
        {reservationExpired && (
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-error-50 ring-1 ring-error-200/50"
          >
            <Clock size={16} className="text-error-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-error-800">Reservations expired</p>
              <p className="text-xs text-error-600">
                Go back to your cart to re-reserve items
              </p>
            </div>
          </motion.div>
        )}

        {/* Saved addresses */}
        {savedAddresses && savedAddresses.length > 0 && (
          <motion.section variants={fadeUp}>
            <h3 className="font-heading font-semibold text-primary-800 mb-3">
              Saved addresses
            </h3>
            <div className="space-y-2">
              {savedAddresses.map((saved, i) => (
                <button
                  key={saved.id ?? i}
                  type="button"
                  onClick={() => handleSelectSaved(saved)}
                  className={cn(
                    'w-full text-left p-3 min-h-11 rounded-xl cursor-pointer select-none active:scale-[0.97] transition-all duration-150',
                    address.line1 === saved.line1 && address.postcode === saved.postcode
                      ? 'ring-2 ring-primary-500 bg-white shadow-sm'
                      : 'bg-primary-50/60',
                  )}
                >
                  <p className="text-sm font-medium text-primary-800">{saved.full_name}</p>
                  <p className="text-xs text-primary-400 mt-0.5">
                    {saved.line1}, {saved.city} {saved.state} {saved.postcode}
                  </p>
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Shipping address form */}
        <motion.section variants={fadeUp}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} className="text-primary-400" />
            <h3 className="font-heading font-semibold text-primary-800">
              Shipping address
            </h3>
          </div>
          <div className="space-y-3">
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

        <Divider />

        {/* Order summary */}
        <motion.section variants={fadeUp}>
          <h3 className="font-heading font-semibold text-primary-800 mb-3">
            Order summary
          </h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.variant.id} className="flex items-center gap-3">
                <img
                  src={item.product.images[0] ?? placeholderMerch}
                  alt={item.product.name}
                  className="w-12 h-12 object-cover rounded-lg shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary-800 truncate">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-primary-400">
                    x{item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary-800 tabular-nums">
                  {formatPrice(item.variant.price_cents * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2 text-sm">
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
            <div className="flex justify-between font-heading font-bold text-primary-800 text-base">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(totalCents)}</span>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </Page>
  )
}
