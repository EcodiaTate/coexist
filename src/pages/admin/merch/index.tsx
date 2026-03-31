import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import { useAdminHeader } from '@/components/admin-layout'
import { TabBar } from '@/components/tab-bar'
import { Package, ShoppingCart, BarChart3, Settings, Warehouse, Store } from 'lucide-react'

import ProductsTab from './products-tab'
import OrdersTab from './orders-tab'
import InventoryTab from './inventory-tab'
import AnalyticsTab from './analytics-tab'
import PromosTab from './promos-tab'
import ShippingTab from './shipping-tab'

/* Combined tab components */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200/40 to-transparent" />
      <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-[0.12em]">{label}</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200/40 to-transparent" />
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
]

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  products: ProductsTab,
  orders: OrdersTab,
  inventory: InventoryTab,
  analytics: AnalyticsTab,
  operations: OperationsTab,
}

/* ------------------------------------------------------------------ */
/*  Wave divider                                                       */
/* ------------------------------------------------------------------ */

const WAVE_PATH =
  'M0,25 C60,22 100,18 140,20 C180,22 200,15 220,18 L228,8 L234,5 L240,10 C280,18 340,24 400,20 C440,16 470,22 510,25 C560,28 600,20 640,22 C670,24 690,18 710,20 L718,10 L722,6 L728,12 C760,20 820,26 880,22 C920,18 950,24 990,26 C1020,28 1050,20 1080,18 C1100,16 1120,22 1140,24 L1148,12 L1153,7 L1158,9 L1165,16 C1200,22 1260,26 1320,22 C1360,18 1400,24 1440,22 L1440,70 L0,70 Z'

export default function AdminMerchPage() {
  useAdminHeader('Shop', { fullBleed: true })
  const [activeTab, setActiveTab] = useState('products')
  const shouldReduceMotion = useReducedMotion()
  const ActiveComponent = TAB_COMPONENTS[activeTab]

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="min-h-full">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-moss-700 via-primary-800 to-secondary-800">
        {/* Decorative elements */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute right-8 bottom-8 w-20 h-20 rounded-full border border-white/10" />

        <div
          className="relative z-10 px-6 pt-10 pb-14 text-center"
          style={{ paddingTop: '2.5rem' }}
        >
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/15 mb-4"
          >
            <Store size={28} className="text-white" />
          </motion.div>

          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 block mb-1.5">
              Shop Management
            </span>
            <span className="font-heading text-2xl sm:text-3xl font-bold text-white block">
              Merch &amp; Store
            </span>
            <p className="text-sm text-white/60 mt-2 max-w-sm mx-auto leading-relaxed">
              Manage products, fulfil orders, track inventory, and run promotions.
            </p>
          </motion.div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <svg
            viewBox="0 0 1440 70"
            preserveAspectRatio="none"
            className="w-full h-7 sm:h-10 block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d={WAVE_PATH} className="fill-neutral-50" />
          </svg>
        </div>
      </div>

      <motion.div variants={fadeUp} className="px-3 sm:px-4 pt-3 sticky top-0 z-20 bg-gradient-to-b from-neutral-50 via-neutral-50 to-neutral-50/0 pb-1">
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
        className="px-3 sm:px-4 pt-2 pb-4 sm:pb-6"
      >
        <ActiveComponent />
      </motion.div>
    </motion.div>
  )
}
