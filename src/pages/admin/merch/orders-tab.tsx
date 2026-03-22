import { useState, useCallback, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
    Download,
    Truck,
    RefreshCw,
    Package,
    CheckCircle2,
    Clock,
    MapPin,
    Copy,
    ExternalLink,
    StickyNote,
} from 'lucide-react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { TabBar } from '@/components/tab-bar'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { SearchBar } from '@/components/search-bar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { Divider } from '@/components/divider'
import { Avatar } from '@/components/avatar'
import { useToast } from '@/components/toast'
import {
    useAdminOrders,
    useUpdateOrderStatus,
    useRefundOrder,
    useUpdateOrderNotes,
    exportOrdersCsv,
} from '@/hooks/use-admin-merch'
import { formatPrice, type OrderStatus, type Order } from '@/types/merch'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
]

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-warning-100 text-warning-800',
  processing: 'bg-info-100 text-info-800',
  shipped: 'bg-plum-100 text-plum-800',
  delivered: 'bg-success-100 text-success-800',
  cancelled: 'bg-white text-primary-400',
  refunded: 'bg-error-100 text-error-700',
}

const STATUS_ICONS: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  processing: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: RefreshCw,
  refunded: RefreshCw,
}

const STATUS_FLOW: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered']

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ------------------------------------------------------------------ */
/*  Order timeline                                                     */
/* ------------------------------------------------------------------ */

function OrderTimeline({ status, createdAt, updatedAt }: { status: OrderStatus; createdAt: string; updatedAt: string }) {
  const currentIdx = STATUS_FLOW.indexOf(status)
  const isFinal = status === 'cancelled' || status === 'refunded'

  if (isFinal) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-error-50/60">
        <RefreshCw size={14} className="text-error-500" />
        <span className="text-xs font-medium text-error-700 capitalize">{status}</span>
        <span className="text-xs text-error-400 ml-auto">{formatDateTime(updatedAt)}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {STATUS_FLOW.map((s, i) => {
        const Icon = STATUS_ICONS[s]
        const isActive = i <= currentIdx
        const isCurrent = i === currentIdx

        return (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                'flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors',
                isCurrent
                  ? 'bg-primary-500 text-white shadow-sm'
                  : isActive
                    ? 'bg-primary-200 text-primary-700'
                    : 'bg-primary-50 text-primary-300',
              )}
            >
              <Icon size={12} />
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-colors',
                  i < currentIdx ? 'bg-primary-300' : 'bg-primary-100',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary counts                                                     */
/* ------------------------------------------------------------------ */

type OrderWithProfile = Order & { profiles: { display_name: string | null; avatar_url: string | null } | null }

function OrderCounts({ orders }: { orders: OrderWithProfile[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, processing: 0, shipped: 0, delivered: 0 }
    for (const o of orders) {
      if (c[o.status] !== undefined) c[o.status]++
    }
    return c
  }, [orders])

  const cards = [
    { label: 'Pending', count: counts.pending, color: 'text-warning-600 bg-warning-50' },
    { label: 'Processing', count: counts.processing, color: 'text-info-600 bg-info-50' },
    { label: 'Shipped', count: counts.shipped, color: 'text-plum-600 bg-plum-50' },
    { label: 'Delivered', count: counts.delivered, color: 'text-success-600 bg-success-50' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
      {cards.map((c) => (
        <div key={c.label} className={cn('p-3 rounded-2xl text-center shadow-sm border border-primary-100/15', c.color)}>
          <p className="font-heading text-lg font-bold tabular-nums">{c.count}</p>
          <p className="text-[11px] font-semibold mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Orders tab                                                         */
/* ------------------------------------------------------------------ */

export default function OrdersTab() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<OrderWithProfile | null>(null)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [refundTarget, setRefundTarget] = useState<Order | null>(null)

  const { toast } = useToast()
  const shouldReduceMotion = useReducedMotion()
  const { data: orders, isLoading, isFetching } = useAdminOrders(
    statusFilter === 'all' ? undefined : statusFilter,
  )
  const showLoading = useDelayedLoading(isLoading)
  const updateStatus = useUpdateOrderStatus()
  const refundOrder = useRefundOrder()
  const updateNotes = useUpdateOrderNotes()

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    if (!search) return orders
    const q = search.toLowerCase()
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.profiles?.display_name ?? '').toLowerCase().includes(q),
    )
  }, [orders, search])

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

  const handleSaveNotes = useCallback(async () => {
    if (!selectedOrder) return
    try {
      await updateNotes.mutateAsync({ orderId: selectedOrder.id, notes: adminNotes })
      toast.success('Notes saved')
    } catch {
      toast.error('Failed to save notes')
    }
  }, [selectedOrder, adminNotes, updateNotes, toast])

  const handleRefund = useCallback(async () => {
    if (!refundTarget) return
    try {
      await refundOrder.mutateAsync(refundTarget.id)
      toast.success('Refund initiated - process via Stripe dashboard')
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

  const handleCopyId = useCallback(
    (id: string) => {
      navigator.clipboard.writeText(id)
      toast.success('Order ID copied')
    },
    [toast],
  )

  const openOrder = useCallback(
    (order: OrderWithProfile) => {
      setSelectedOrder(order)
      setTrackingNumber(order.tracking_number ?? '')
      setAdminNotes((order as any).admin_notes ?? '')
    },
    [],
  )

  // Only show skeleton on first ever load, not on tab/filter switches
  if (showLoading && !orders) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="stat-card" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    )
  }
  if (isLoading && !orders) return null

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible">
      {/* Summary counts */}
      {orders && orders.length > 0 && (
        <motion.div variants={fadeUp}>
          <OrderCounts orders={orders} />
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeUp} className="mb-3">
        <TabBar
          tabs={STATUS_OPTIONS.map((opt) => ({ id: opt.value, label: opt.label }))}
          activeTab={statusFilter}
          onChange={(id) => setStatusFilter(id as OrderStatus | 'all')}
          aria-label="Order status filter"
        />
      </motion.div>

      {/* Search + export */}
      <motion.div variants={fadeUp} className="flex gap-2 mb-5">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search orders..."
          compact
          className="flex-1 [&>*+*]:!bg-white"
        />
        <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={handleExport}>
          CSV
        </Button>
      </motion.div>

      {/* Order list */}
      <motion.div variants={fadeUp}>
        {filteredOrders.length === 0 ? (
          <EmptyState
            illustration="empty"
            title="No orders"
            description={search ? 'Try a different search' : 'Orders will appear here'}
          />
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order)}
                className="w-full text-left p-5 bg-gradient-to-br from-[#f0f4ea] via-[#edf1e7] to-[#e8ecdf] border border-primary-200/20 rounded-2xl shadow-[0_4px_20px_-4px_rgba(61,77,51,0.08),0_1px_4px_rgba(61,77,51,0.03)] cursor-pointer hover:shadow-[0_6px_28px_-4px_rgba(61,77,51,0.14)] transition-[color,background-color,box-shadow,transform] duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={order.profiles?.avatar_url}
                      name={order.profiles?.display_name ?? 'Unknown'}
                      size="xs"
                    />
                    <span className="text-sm font-semibold text-primary-800">
                      {order.profiles?.display_name ?? 'Unknown'}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize',
                      STATUS_COLORS[order.status],
                    )}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Mini timeline */}
                <OrderTimeline
                  status={order.status}
                  createdAt={order.created_at}
                  updatedAt={order.updated_at}
                />

                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs text-primary-400">
                    #{order.id.slice(0, 8)} · {order.items.length} item
                    {order.items.length !== 1 ? 's' : ''} · {formatDate(order.created_at)}
                  </span>
                  <span className="font-heading font-bold text-sm text-primary-800 tabular-nums">
                    {formatPrice(order.total_cents)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* ---- Order detail sheet ---- */}
      <BottomSheet
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        snapPoints={[0.9]}
      >
        {selectedOrder && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-lg text-primary-800">
                  Order #{selectedOrder.id.slice(0, 8)}
                </h3>
                <p className="text-xs text-primary-400 mt-0.5">
                  {formatDateTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleCopyId(selectedOrder.id)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary-400 hover:bg-primary-50 cursor-pointer"
              >
                <Copy size={12} />
                Copy ID
              </button>
            </div>

            {/* Timeline */}
            <OrderTimeline
              status={selectedOrder.status}
              createdAt={selectedOrder.created_at}
              updatedAt={selectedOrder.updated_at}
            />

            <Divider />

            {/* Customer */}
            <div className="flex items-center gap-3">
              <Avatar
                src={selectedOrder.profiles?.avatar_url}
                name={selectedOrder.profiles?.display_name ?? 'Unknown'}
                size="sm"
              />
              <div>
                <p className="text-sm font-semibold text-primary-800">
                  {selectedOrder.profiles?.display_name ?? 'Unknown'}
                </p>
              </div>
            </div>

            <Divider />

            {/* Items */}
            <div>
              <h4 className="text-xs font-semibold text-primary-800 uppercase tracking-wider mb-2">
                Items
              </h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-xl bg-primary-50/40">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary-800 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-primary-400">
                        {item.variant_label} x{item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary-800 tabular-nums shrink-0">
                      {formatPrice(item.price_cents * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-1 px-1">
              {selectedOrder.subtotal_cents !== undefined && (
                <div className="flex justify-between text-sm text-primary-400">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatPrice(selectedOrder.subtotal_cents)}</span>
                </div>
              )}
              {selectedOrder.shipping_cents !== undefined && selectedOrder.shipping_cents > 0 && (
                <div className="flex justify-between text-sm text-primary-400">
                  <span>Shipping</span>
                  <span className="tabular-nums">{formatPrice(selectedOrder.shipping_cents)}</span>
                </div>
              )}
              {selectedOrder.discount_cents !== undefined && selectedOrder.discount_cents > 0 && (
                <div className="flex justify-between text-sm text-success-600">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatPrice(selectedOrder.discount_cents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-primary-800 pt-1">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(selectedOrder.total_cents)}</span>
              </div>
            </div>

            <Divider />

            {/* Shipping address */}
            <div>
              <h4 className="text-xs font-semibold text-primary-800 uppercase tracking-wider mb-2">
                Shipping
              </h4>
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-50/40">
                <MapPin size={14} className="text-primary-400 shrink-0 mt-0.5" />
                <div className="text-sm text-primary-600">
                  <p className="font-medium">{selectedOrder.shipping_address?.full_name}</p>
                  <p>{selectedOrder.shipping_address?.line1}</p>
                  {selectedOrder.shipping_address?.line2 && (
                    <p>{selectedOrder.shipping_address.line2}</p>
                  )}
                  <p>
                    {selectedOrder.shipping_address?.city} {selectedOrder.shipping_address?.state}{' '}
                    {selectedOrder.shipping_address?.postcode}
                  </p>
                  {selectedOrder.shipping_address?.phone && (
                    <p className="mt-1 text-primary-400">{selectedOrder.shipping_address.phone}</p>
                  )}
                </div>
              </div>

              {/* Tracking */}
              {selectedOrder.tracking_number && (
                <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl bg-plum-50">
                  <Truck size={14} className="text-plum-600 shrink-0" />
                  <span className="text-sm font-medium text-plum-800 font-mono">
                    {selectedOrder.tracking_number}
                  </span>
                  <a
                    href={`https://auspost.com.au/mypost/track/#/details/${selectedOrder.tracking_number}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto text-plum-600 hover:text-plum-800"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </div>

            <Divider />

            {/* Admin notes */}
            <div>
              <h4 className="text-xs font-semibold text-primary-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <StickyNote size={12} />
                Admin Notes
              </h4>
              <Input
                type="textarea"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Internal notes about this order..."
                rows={2}
              />
              {adminNotes !== ((selectedOrder as any).admin_notes ?? '') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  loading={updateNotes.isPending}
                  onClick={handleSaveNotes}
                >
                  Save notes
                </Button>
              )}
            </div>

            <Divider />

            {/* ---- Fulfilment actions ---- */}
            <div className="space-y-2">
              {selectedOrder.status === 'pending' && (
                <Button
                  variant="primary"
                  fullWidth
                  icon={<Package size={16} />}
                  loading={updateStatus.isPending}
                  onClick={() => handleStatusUpdate(selectedOrder.id, 'processing')}
                >
                  Start Processing
                </Button>
              )}

              {selectedOrder.status === 'processing' && (
                <>
                  <Input
                    label="Tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. AP123456789AU"
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
                </>
              )}

              {selectedOrder.status === 'shipped' && (
                <Button
                  variant="primary"
                  fullWidth
                  icon={<CheckCircle2 size={16} />}
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
                  Refund Order
                </Button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Refund confirmation */}
      <ConfirmationSheet
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        onConfirm={handleRefund}
        title="Refund order?"
        description={`This will mark the order as refunded (${formatPrice(refundTarget?.total_cents ?? 0)}). Process the actual refund via Stripe dashboard.`}
        confirmLabel="Refund"
        variant="danger"
      />
    </motion.div>
  )
}
