import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { useAdminHeader } from '@/components/admin-layout'
import { TabBar } from '@/components/tab-bar'
import { Package, ShoppingCart, BarChart3, Tag, RotateCcw, Star, Settings } from 'lucide-react'

import ProductsTab from './products-tab'
import OrdersTab from './orders-tab'
import AnalyticsTab from './analytics-tab'
import PromosTab from './promos-tab'
import ReturnsTab from './returns-tab'
import ReviewsTab from './reviews-tab'
import ShippingTab from './shipping-tab'

const TABS = [
  { id: 'products', label: 'Products', icon: <Package size={14} /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
  { id: 'promos', label: 'Promos', icon: <Tag size={14} /> },
  { id: 'returns', label: 'Returns', icon: <RotateCcw size={14} /> },
  { id: 'reviews', label: 'Reviews', icon: <Star size={14} /> },
  { id: 'shipping', label: 'Shipping', icon: <Settings size={14} /> },
]

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  products: ProductsTab,
  orders: OrdersTab,
  analytics: AnalyticsTab,
  promos: PromosTab,
  returns: ReturnsTab,
  reviews: ReviewsTab,
  shipping: ShippingTab,
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
