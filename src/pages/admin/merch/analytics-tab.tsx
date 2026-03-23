import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { TabBar } from '@/components/tab-bar'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useSalesAnalytics } from '@/hooks/use-admin-merch'
import { formatPrice } from '@/types/merch'

const PERIODS = [
  { value: 'week' as const, label: 'This week' },
  { value: 'month' as const, label: 'This month' },
  { value: 'year' as const, label: 'This year' },
]

const PRODUCT_GRADIENTS = [
  'from-primary-600/90 to-primary-800',
  'from-moss-600/90 to-moss-800',
  'from-sky-500/90 to-sky-700',
  'from-sprout-600/90 to-sprout-800',
  'from-plum-500/90 to-plum-700',
  'from-bark-500/90 to-bark-700',
]

export default function AnalyticsTab() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const { data: analytics, isLoading } = useSalesAnalytics(period)
  const showLoading = useDelayedLoading(isLoading)
  const shouldReduceMotion = useReducedMotion()

  // Only show skeleton on first ever load, not on period tab switches
  if (showLoading && !analytics) {
    return (
      <div className="space-y-3">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    )
  }
  if (isLoading && !analytics) return null

  if (!analytics) {
    return (
      <EmptyState
        illustration="empty"
        title="No data yet"
        description="Sales data will appear once orders start coming in"
      />
    )
  }

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <motion.div className="space-y-5" variants={stagger} initial="hidden" animate="visible">
      {/* Period selector */}
      <motion.div variants={fadeUp}>
        <TabBar
          tabs={PERIODS.map((p) => ({ id: p.value, label: p.label }))}
          activeTab={period}
          onChange={(id) => setPeriod(id as 'week' | 'month' | 'year')}
          aria-label="Analytics period"
        />
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          value={formatPrice(analytics.total_revenue_cents)}
          label="Revenue"
          icon={<DollarSign size={20} />}
        />
        <StatCard
          value={analytics.total_orders}
          label="Orders"
          icon={<ShoppingBag size={20} />}
        />
        <StatCard
          value={analytics.total_units_sold}
          label="Units sold"
          icon={<TrendingUp size={20} />}
        />
      </motion.div>

      {/* By product — rich colored cards */}
      {analytics.by_product.length > 0 && (
        <motion.div variants={fadeUp}><section>
          <h3 className="font-heading font-semibold text-primary-800 mb-3">By product</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analytics.by_product.map((row, idx) => (
              <div
                key={row.product_id}
                className={`rounded-2xl p-5 shadow-lg bg-gradient-to-br ${PRODUCT_GRADIENTS[idx % PRODUCT_GRADIENTS.length]}`}
              >
                <p className="text-sm font-bold text-white">{row.product_name}</p>
                <p className="text-xs text-white/60 mt-0.5">{row.units} units sold</p>
                <p className="font-heading font-bold text-lg text-white mt-2 tabular-nums">
                  {formatPrice(row.revenue_cents)}
                </p>
              </div>
            ))}
          </div>
        </section></motion.div>
      )}

      {/* By period — alternating warm tones */}
      {analytics.by_period.length > 0 && (
        <motion.div variants={fadeUp}><section>
          <h3 className="font-heading font-semibold text-primary-800 mb-3">Timeline</h3>
          <div className="space-y-1.5">
            {analytics.by_period.map((row, idx) => (
              <div
                key={row.date}
                className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border shadow-sm ${
                  idx % 2 === 0
                    ? 'bg-gradient-to-r from-sprout-50 to-primary-50/60 border-sprout-200/30'
                    : 'bg-gradient-to-r from-moss-50 to-primary-50/60 border-moss-200/30'
                }`}
              >
                <span className="text-primary-500 font-medium">{row.date}</span>
                <div className="flex gap-3">
                  <span className="text-primary-400">{row.orders} orders</span>
                  <span className="font-semibold text-primary-800 tabular-nums">{formatPrice(row.revenue_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </section></motion.div>
      )}
    </motion.div>
  )
}
