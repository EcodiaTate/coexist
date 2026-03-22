import { useState, useMemo, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, PackageX, Search, ArrowUpDown } from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { TabBar } from '@/components/tab-bar'
import { SearchBar } from '@/components/search-bar'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { BottomSheet } from '@/components/bottom-sheet'
import { useToast } from '@/components/toast'
import { useAdminProducts, useAdjustStock } from '@/hooks/use-admin-merch'
import { formatPrice, variantLabel, type Product, type ProductVariant } from '@/types/merch'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type StockFilter = 'all' | 'low' | 'out'
type SortMode = 'stock-asc' | 'name' | 'product'

interface FlatVariant {
  product: Product
  variant: ProductVariant
}

/* ------------------------------------------------------------------ */
/*  Filter & sort pills                                                */
/* ------------------------------------------------------------------ */

const STOCK_FILTERS: { value: StockFilter; label: string; icon?: typeof AlertTriangle }[] = [
  { value: 'all', label: 'All' },
  { value: 'low', label: 'Low Stock', icon: AlertTriangle },
  { value: 'out', label: 'Out of Stock', icon: PackageX },
]

/* ------------------------------------------------------------------ */
/*  Stock adjust sheet (reusable)                                      */
/* ------------------------------------------------------------------ */

function StockAdjustSheet({
  open,
  onClose,
  item,
}: {
  open: boolean
  onClose: () => void
  item: FlatVariant | null
}) {
  const { toast } = useToast()
  const adjustStock = useAdjustStock()
  const [adjustment, setAdjustment] = useState('')

  const handleSave = useCallback(async () => {
    if (!item) return
    const adj = Number(adjustment)
    if (isNaN(adj) || adj === 0) {
      toast.error('Enter a valid adjustment amount')
      return
    }
    try {
      await adjustStock.mutateAsync({
        productId: item.product.id,
        variantKey: item.variant.sku || item.variant.id,
        adjustment: adj,
      })
      toast.success(
        `${item.product.name} (${variantLabel(item.variant)}) adjusted by ${adj > 0 ? '+' : ''}${adj}`,
      )
      setAdjustment('')
      onClose()
    } catch {
      toast.error('Failed to adjust stock')
    }
  }, [item, adjustment, adjustStock, toast, onClose])

  if (!item) return null

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-primary-800">Adjust Stock</h3>

        <div className="p-3 rounded-xl bg-primary-50/50">
          <p className="text-sm font-semibold text-primary-800">{item.product.name}</p>
          <p className="text-xs text-primary-400 mt-0.5">
            {variantLabel(item.variant)} · Currently{' '}
            <span className="font-semibold tabular-nums">{item.variant.stock}</span> in stock
          </p>
        </div>

        <Input
          label="Adjustment (+/-)"
          value={adjustment}
          onChange={(e) => setAdjustment(e.target.value)}
          helperText="Positive to add, negative to remove"
          required
        />

        <Button
          variant="primary"
          fullWidth
          loading={adjustStock.isPending}
          onClick={handleSave}
        >
          Apply Adjustment
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Inventory summary cards                                            */
/* ------------------------------------------------------------------ */

function SummaryCards({ items }: { items: FlatVariant[] }) {
  const totalVariants = items.length
  const outOfStock = items.filter((i) => i.variant.stock === 0).length
  const lowStock = items.filter(
    (i) => i.variant.stock > 0 && i.variant.stock <= i.variant.low_stock_threshold,
  ).length
  const healthy = totalVariants - outOfStock - lowStock

  const cards = [
    { label: 'Total SKUs', value: totalVariants, color: 'text-primary-800' },
    { label: 'Healthy', value: healthy, color: 'text-success-600' },
    { label: 'Low Stock', value: lowStock, color: 'text-warning-600' },
    { label: 'Out of Stock', value: outOfStock, color: 'text-error-600' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="p-3 rounded-xl bg-gradient-to-br from-[#eef2e8] to-[#e6eadf] border border-primary-200/25 shadow-sm text-center">
          <p className={cn('font-heading text-xl font-bold tabular-nums', c.color)}>
            {c.value}
          </p>
          <p className="text-[10px] text-primary-500 font-semibold mt-0.5">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main inventory tab                                                 */
/* ------------------------------------------------------------------ */

export default function InventoryTab() {
  const { data: products, isLoading } = useAdminProducts()
  const shouldReduceMotion = useReducedMotion()
  const placeholderMerch = useAppImage('placeholder_merch')

  const [filter, setFilter] = useState<StockFilter>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('stock-asc')
  const [adjustTarget, setAdjustTarget] = useState<FlatVariant | null>(null)

  // Flatten all products into variant-level rows
  const allItems: FlatVariant[] = useMemo(() => {
    if (!products) return []
    return products
      .filter((p) => p.status !== 'archived')
      .flatMap((product) =>
        product.variants.map((variant) => ({ product, variant })),
      )
  }, [products])

  // Apply filters
  const filtered = useMemo(() => {
    let items = allItems

    // Stock filter
    if (filter === 'low') {
      items = items.filter(
        (i) => i.variant.stock > 0 && i.variant.stock <= i.variant.low_stock_threshold,
      )
    } else if (filter === 'out') {
      items = items.filter((i) => i.variant.stock === 0)
    }

    // Search
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (i) =>
          i.product.name.toLowerCase().includes(q) ||
          variantLabel(i.variant).toLowerCase().includes(q) ||
          (i.variant.sku ?? '').toLowerCase().includes(q),
      )
    }

    // Sort
    items = [...items].sort((a, b) => {
      switch (sort) {
        case 'stock-asc':
          return a.variant.stock - b.variant.stock
        case 'name':
          return a.product.name.localeCompare(b.product.name)
        case 'product':
          return (
            a.product.name.localeCompare(b.product.name) ||
            variantLabel(a.variant).localeCompare(variantLabel(b.variant))
          )
        default:
          return 0
      }
    })

    return items
  }, [allItems, filter, search, sort])

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.03 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="stat-card" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
    )
  }

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : stagger}
      initial="hidden"
      animate="visible"
    >
      {/* Summary cards */}
      <motion.div variants={fadeUp}>
        <SummaryCards items={allItems} />
      </motion.div>

      {/* Filter tabs + sort */}
      <motion.div variants={fadeUp} className="flex items-end gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <TabBar
            tabs={STOCK_FILTERS.map((f) => ({ id: f.value, label: f.label }))}
            activeTab={filter}
            onChange={(id) => setFilter(id as StockFilter)}
            aria-label="Stock filter"
          />
        </div>
        <button
          type="button"
          onClick={() =>
            setSort((s) =>
              s === 'stock-asc' ? 'name' : s === 'name' ? 'product' : 'stock-asc',
            )
          }
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap bg-gradient-to-br from-[#eef2e8] to-[#e6eadf] border border-primary-200/30 text-secondary-700 cursor-pointer transition-all hover:shadow-sm active:scale-[0.97] shrink-0 mb-px"
        >
          <ArrowUpDown size={12} />
          {sort === 'stock-asc' ? 'Stock ↑' : sort === 'name' ? 'A-Z' : 'Product'}
        </button>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search products or SKUs..."
          compact
        />
      </motion.div>

      {/* Inventory list */}
      <motion.div variants={fadeUp}>
        {filtered.length === 0 ? (
          <EmptyState
            illustration={filter === 'out' ? 'success' : 'search'}
            title={
              filter === 'out'
                ? 'No out-of-stock items'
                : filter === 'low'
                  ? 'No low stock items'
                  : 'No items found'
            }
            description={
              filter !== 'all'
                ? 'All your inventory looks healthy'
                : search
                  ? 'Try a different search term'
                  : 'Add products to see inventory here'
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => {
              const isOOS = item.variant.stock === 0
              const isLow =
                !isOOS && item.variant.stock <= item.variant.low_stock_threshold

              return (
                <button
                  key={`${item.product.id}-${item.variant.id}`}
                  type="button"
                  onClick={() => setAdjustTarget(item)}
                  className="w-full text-left flex items-center gap-3 p-3 bg-gradient-to-br from-[#eef2e8] to-[#e6eadf] border border-primary-200/25 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                  {/* Product image */}
                  <img
                    src={item.product.images[0] ?? placeholderMerch}
                    alt={item.product.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-primary-400 truncate">
                      {variantLabel(item.variant)}
                      {item.variant.sku ? ` · ${item.variant.sku}` : ''}
                    </p>
                  </div>

                  {/* Stock badge */}
                  <div className="flex flex-col items-end shrink-0">
                    <span
                      className={cn(
                        'text-sm font-bold tabular-nums',
                        isOOS
                          ? 'text-error-600'
                          : isLow
                            ? 'text-warning-600'
                            : 'text-primary-800',
                      )}
                    >
                      {item.variant.stock}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5',
                        isOOS
                          ? 'bg-error-100 text-error-700'
                          : isLow
                            ? 'bg-warning-100 text-warning-700'
                            : 'bg-success-100 text-success-700',
                      )}
                    >
                      {isOOS ? 'Out' : isLow ? 'Low' : 'OK'}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* Stock adjust sheet */}
      <StockAdjustSheet
        open={!!adjustTarget}
        onClose={() => setAdjustTarget(null)}
        item={adjustTarget}
      />
    </motion.div>
  )
}
