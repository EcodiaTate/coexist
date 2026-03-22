import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAdminHeader } from '@/components/admin-layout'
import { TabBar } from '@/components/tab-bar'
import { Package, ShoppingCart, BarChart3, Star, Settings, Warehouse } from 'lucide-react'

import ProductsTab from './products-tab'
import OrdersTab from './orders-tab'
import InventoryTab from './inventory-tab'
import AnalyticsTab from './analytics-tab'
import PromosTab from './promos-tab'
import ReturnsTab from './returns-tab'
import ReviewsTab from './reviews-tab'
import ShippingTab from './shipping-tab'

/* Combined tab components */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200/40 to-transparent" />
      <span className="text-[11px] font-bold text-primary-500 uppercase tracking-[0.12em]">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-200/40 to-transparent" />
    </div>
  )
}

function FeedbackTab() {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader label="Returns" />
        <ReturnsTab />
      </section>
      <section>
        <SectionHeader label="Reviews" />
        <ReviewsTab />
      </section>
    </div>
  )
}

function OperationsTab() {
  return (
    <div className="space-y-8">
      <section>
        <SectionHeader label="Promotions" />
        <PromosTab />
      </section>
      <section>
        <SectionHeader label="Shipping" />
        <ShippingTab />
      </section>
    </div>
  )
}

const TABS = [
  { id: 'products', label: 'Products', icon: <Package size={14} /> },
  { id: 'orders', label: 'Orders', icon: <ShoppingCart size={14} /> },
  { id: 'inventory', label: 'Inventory', icon: <Warehouse size={14} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
  { id: 'operations', label: 'Operations', icon: <Settings size={14} /> },
  { id: 'feedback', label: 'Feedback', icon: <Star size={14} /> },
]

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  products: ProductsTab,
  orders: OrdersTab,
  inventory: InventoryTab,
  analytics: AnalyticsTab,
  operations: OperationsTab,
  feedback: FeedbackTab,
}

export default function AdminMerchPage() {
  useAdminHeader('Shop')
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
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible" className="min-h-full">
      <motion.div variants={fadeUp} className="px-4 pt-3 sticky top-0 z-20 bg-gradient-to-b from-white via-white to-white/0 pb-2">
        <TabBar
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          aria-label="Merch admin tabs"
        />
      </motion.div>
      <motion.div
        key={activeTab}
        initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="px-4 py-5"
      >
        <ActiveComponent />
      </motion.div>
    </motion.div>
  )
}
