import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import { Page } from '@/components/page'
import { Button } from '@/components/button'
import { useCart } from '@/hooks/use-cart'
import { cn } from '@/lib/cn'

export default function OrderConfirmationPage() {
  const [searchParams] = useSearchParams()
  const shouldReduceMotion = useReducedMotion()
  const clearCart = useCart((s) => s.clear)
  const orderId = searchParams.get('order_id')

  // Only clear cart if we have a valid order_id (indicating a real completed order)
  useEffect(() => {
    if (orderId) {
      clearCart()
    }
  }, [orderId, clearCart])

  return (
    <Page>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex flex-col items-center justify-center flex-1 py-12 text-center"
      >
        <motion.div
          initial={shouldReduceMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-success-100">
            <CheckCircle size={36} className="text-success-600" />
          </div>
        </motion.div>

        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-heading text-2xl font-bold text-primary-800"
        >
          Order confirmed!
        </motion.h1>

        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-2 text-sm text-primary-400 max-w-xs"
        >
          Thanks for supporting Co-Exist! You'll receive a confirmation email shortly.
        </motion.p>

        {orderId && (
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={cn(
              'mt-4 px-4 py-2 rounded-xl text-sm',
              'bg-white border border-primary-200 text-primary-400',
            )}
          >
            Order ID: <span className="font-mono font-medium">{orderId.slice(0, 8)}</span>
          </motion.p>
        )}

        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 w-full max-w-xs space-y-3"
        >
          {orderId && (
            <Link to={`/shop/orders/${orderId}`} tabIndex={-1}>
              <Button variant="primary" fullWidth icon={<Package size={16} />}>
                Track order
              </Button>
            </Link>
          )}
          <Link to="/shop" tabIndex={-1}>
            <Button variant="ghost" fullWidth icon={<ArrowRight size={16} />}>
              Continue shopping
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </Page>
  )
}
