import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DollarSign, ShoppingBag, TrendingUp } from 'lucide-react'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { useSalesAnalytics } from '@/hooks/use-admin-merch'
import { formatPrice } from '@/types/merch'
import { cn } from '@/lib/cn'

const PERIODS = [
  { value: 'week' as const, label: 'This week' },
  { value: 'month' as const, label: 'This month' },
  { value: 'year' as const, label: 'This year' },
]

export default function AnalyticsTab() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const { data: analytics, isLoading } = useSalesAnalytics(period)
  const shouldReduceMotion = useReducedMotion()

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="card" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    )
  }

  if (!analytics) {
    return (
      <EmptyState
        illustration="empty"
        title="No data yet"
        description="Sales data will appear once orders start coming in"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border',
              period === p.value
                ? 'border-primary-500 bg-white text-primary-400'
                : 'border-primary-200 text-primary-400',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
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
      </div>

      {/* By product */}
      {analytics.by_product.length > 0 && (
        <section>
          <h3 className="font-heading font-semibold text-primary-800 mb-3">By product</h3>
          <div className="space-y-2">
            {analytics.by_product.map((row) => (
              <div
                key={row.product_id}
                className="flex items-center justify-between p-3 bg-white rounded-xl border border-primary-100"
              >
                <div>
                  <p className="text-sm font-medium text-primary-800">{row.product_name}</p>
                  <p className="text-xs text-primary-400">{row.units} units</p>
                </div>
                <span className="font-heading font-bold text-sm text-primary-800 tabular-nums">
                  {formatPrice(row.revenue_cents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* By period */}
      {analytics.by_period.length > 0 && (
        <section>
          <h3 className="font-heading font-semibold text-primary-800 mb-3">Timeline</h3>
          <div className="space-y-1.5">
            {analytics.by_period.map((row) => (
              <div
                key={row.date}
                className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-sm"
              >
                <span className="text-primary-400">{row.date}</span>
                <div className="flex gap-3">
                  <span className="text-primary-400">{row.orders} orders</span>
                  <span className="font-semibold tabular-nums">{formatPrice(row.revenue_cents)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
