import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAdminHeader } from '@/components/admin-layout'
import { TabBar } from '@/components/tab-bar'
import { Package, ShoppingCart, BarChart3, Star, Settings } from 'lucide-react'

import ProductsTab from './products-tab'
import OrdersTab from './orders-tab'
import AnalyticsTab from './analytics-tab'
import PromosTab from './promos-tab'
import ReturnsTab from './returns-tab'
import ReviewsTab from './reviews-tab'
import ShippingTab from './shipping-tab'

/* Combined tab components */
function FeedbackTab() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">Returns</h3>
        <ReturnsTab />
      </section>
      <section>
        <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">Reviews</h3>
        <ReviewsTab />
      </section>
    </div>
  )
}

function OperationsTab() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">Promotions</h3>
        <PromosTab />
      </section>
      <section>
        <h3 className="font-heading text-sm font-semibold text-primary-800 mb-3">Shipping</h3>
        <ShippingTab />
      </section>
    </div>
  )
}

const TABS = [
  { id: 'products', label: 'Products', icon: <Package size={14} /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
  { id: 'operations', label: 'Operations', icon: <Settings size={14} /> },
  { id: 'feedback', label: 'Feedback', icon: <Star size={14} /> },
]

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  products: ProductsTab,
  orders: OrdersTab,
  analytics: AnalyticsTab,
  operations: OperationsTab,
  feedback: FeedbackTab,
}

export default function AdminMerchPage() {
  useAdminHeader('Merch Management')
  const [activeTab, setActiveTab] = useState('products')
  const shouldReduceMotion = useReducedMotion()
  const ActiveComponent = TAB_COMPONENTS[activeTab]

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="px-4 pt-3">
        <TabBar
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          aria-label="Merch admin tabs"
        />
      </motion.div>
      <motion.div
        variants={fadeUp}
        key={activeTab}
        initial={shouldReduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="px-4 py-4"
      >
        <ActiveComponent />
      </motion.div>
    </motion.div>
  )
}
