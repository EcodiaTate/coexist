import { useState, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Search, Download, Truck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Divider } from '@/components/divider'
import { useToast } from '@/components/toast'
import {
  useAdminOrders,
  useUpdateOrderStatus,
  useRefundOrder,
  exportOrdersCsv,
} from '@/hooks/use-admin-merch'
import { formatPrice, type OrderStatus, type Order } from '@/types/merch'
import { cn } from '@/lib/cn'

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
]

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-white text-primary-400',
  refunded: 'bg-red-100 text-red-700',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

export default function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [refundTarget, setRefundTarget] = useState<Order | null>(null)

  const { toast } = useToast()
  const shouldReduceMotion = useReducedMotion()
  const { data: orders, isLoading } = useAdminOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  )
  const updateStatus = useUpdateOrderStatus()
  const refundOrder = useRefundOrder()

  const filteredOrders = orders?.filter((o) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.id.toLowerCase().includes(q) ||
      (o.profiles?.display_name ?? '').toLowerCase().includes(q)
    )
  })

  const handleStatusUpdate = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        await updateStatus.mutateAsync({
          orderId,
          status,
          trackingNumber: status === 'shipped' ? trackingNumber : undefined,
        })
        toast.success(`Order marked as ${status}`)
        setSelectedOrder(null)
        setTrackingNumber('')
      } catch {
        toast.error('Failed to update order')
      }
    },
    [updateStatus, trackingNumber, toast],
  )

  const handleRefund = useCallback(async () => {
    if (!refundTarget) return
    try {
      await refundOrder.mutateAsync(refundTarget.id)
      toast.success('Refund initiated')
    } catch {
      toast.error('Failed to process refund')
    }
    setRefundTarget(null)
  }, [refundTarget, refundOrder, toast])

  const handleExport = useCallback(async () => {
    try {
      await exportOrdersCsv(statusFilter === 'all' ? undefined : statusFilter)
      toast.success('CSV downloaded')
    } catch {
      toast.error('Export failed')
    }
  }, [statusFilter, toast])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Filters */}
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-none">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setStatusFilter(opt.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors',
              'border',
              statusFilter === opt.value
                ? 'border-primary-500 bg-white text-primary-400'
                : 'border-primary-200 text-primary-400',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            label="Search orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExport}>
          CSV
        </Button>
      </div>

      {!filteredOrders || filteredOrders.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No orders"
          description={search ? 'Try a different search' : 'Orders will appear here'}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelectedOrder(order)}
              className="w-full text-left p-4 bg-white rounded-2xl border border-primary-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-primary-400 font-mono">
                  #{order.id.slice(0, 8)}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                    STATUS_COLORS[order.status],
                  )}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm font-medium text-primary-800">
                {order.profiles?.display_name ?? 'Unknown'}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-primary-400">
                  {order.items.length} items · {formatDate(order.created_at)}
                </span>
                <span className="font-heading font-bold text-sm text-primary-800 tabular-nums">
                  {formatPrice(order.total_cents)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Order detail sheet */}
      <BottomSheet
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        snapPoints={[0.8]}
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-primary-800">
                Order #{selectedOrder.id.slice(0, 8)}
              </h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  STATUS_COLORS[selectedOrder.status],
                )}
              >
                {selectedOrder.status}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <span className="text-primary-400">
                    {item.product_name} ({item.variant_label}) x{item.quantity}
                  </span>
                  <span className="ml-auto font-semibold tabular-nums">
                    {formatPrice(item.price_cents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Divider />
            <p className="text-sm font-bold">
              Total: {formatPrice(selectedOrder.total_cents)}
            </p>

            {/* Shipping address */}
            <div className="text-sm text-primary-400">
              <p className="font-medium">{selectedOrder.shipping_address.full_name}</p>
              <p>{selectedOrder.shipping_address.line1}, {selectedOrder.shipping_address.city} {selectedOrder.shipping_address.state} {selectedOrder.shipping_address.postcode}</p>
            </div>

            <Divider />

            {/* Status actions */}
            {selectedOrder.status === 'pending' && (
              <Button
                variant="primary"
                fullWidth
                loading={updateStatus.isPending}
                onClick={() => handleStatusUpdate(selectedOrder.id, 'processing')}
              >
                Mark as Processing
              </Button>
            )}
            {selectedOrder.status === 'processing' && (
              <div className="space-y-2">
                <Input
                  label="Tracking number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
                <Button
                  variant="primary"
                  fullWidth
                  icon={<Truck size={16} />}
                  loading={updateStatus.isPending}
                  onClick={() => handleStatusUpdate(selectedOrder.id, 'shipped')}
                >
                  Mark as Shipped
                </Button>
              </div>
            )}
            {selectedOrder.status === 'shipped' && (
              <Button
                variant="primary"
                fullWidth
                loading={updateStatus.isPending}
                onClick={() => handleStatusUpdate(selectedOrder.id, 'delivered')}
              >
                Mark as Delivered
              </Button>
            )}
            {['pending', 'processing'].includes(selectedOrder.status) && (
              <Button
                variant="danger"
                fullWidth
                icon={<RefreshCw size={16} />}
                onClick={() => setRefundTarget(selectedOrder)}
              >
                Refund order
              </Button>
            )}
          </div>
        )}
      </BottomSheet>

      <ConfirmationSheet
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleRefund}
        title="Refund order?"
        description={`This will refund ${formatPrice(refundTarget?.total_cents ?? 0)} via Stripe.`}
        confirmLabel="Refund"
        variant="danger"
      />
    </>
  )
}
