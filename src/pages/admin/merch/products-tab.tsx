import { useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Plus, Edit3, Archive, Package, ImagePlus, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { BottomSheet } from '@/components/bottom-sheet'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { Divider } from '@/components/divider'
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useUpsertVariant,
  useAdjustStock,
} from '@/hooks/use-admin-merch'
import { formatPrice, variantLabel, type Product, type ProductStatus } from '@/types/merch'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Product form sheet                                                 */
/* ------------------------------------------------------------------ */

function ProductFormSheet({
  open,
  onClose,
  product,
}: {
  open: boolean
  onClose: () => void
  product?: Product
}) {
  const { toast } = useToast()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()

  const [name, setName] = useState(product?.name ?? '')
  const [slug, setSlug] = useState(product?.slug ?? '')
  const [description, setDescription] = useState(product?.description ?? '')
  const [category, setCategory] = useState(product?.category ?? '')
  const [basePriceCents, setBasePriceCents] = useState(
    product ? String(product.base_price_cents / 100) : '',
  )
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'draft')

  const handleSave = useCallback(async () => {
    const priceNum = Math.round(Number(basePriceCents) * 100)
    if (!name.trim() || !slug.trim() || priceNum <= 0) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          category: category.trim() || null,
          base_price_cents: priceNum,
          status,
        })
        toast.success('Product updated')
      } else {
        await createProduct.mutateAsync({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
          category: category.trim() || null,
          base_price_cents: priceNum,
          status,
          images: [],
        })
        toast.success('Product created')
      }
      onClose()
    } catch {
      toast.error('Failed to save product')
    }
  }, [name, slug, description, category, basePriceCents, status, product, createProduct, updateProduct, toast, onClose])

  const isPending = createProduct.isPending || updateProduct.isPending

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.85]}>
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-lg text-primary-800">
          {product ? 'Edit product' : 'New product'}
        </h3>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          helperText="URL-friendly identifier"
          required
        />
        <Input
          type="textarea"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input
          label="Base price ($)"
          value={basePriceCents}
          onChange={(e) => setBasePriceCents(e.target.value)}
          required
        />
        <div className="flex gap-3">
          {(['draft', 'active', 'archived'] as ProductStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'flex-1 py-2 rounded-lg border-2 text-sm font-medium capitalize cursor-pointer transition-colors',
                status === s
                  ? 'border-primary-500 bg-white text-primary-400'
                  : 'border-primary-200 text-primary-400',
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          fullWidth
          loading={isPending}
          onClick={handleSave}
        >
          {product ? 'Update' : 'Create'}
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Stock adjustment sheet                                             */
/* ------------------------------------------------------------------ */

function StockAdjustSheet({
  open,
  onClose,
  variantId,
  currentStock,
}: {
  open: boolean
  onClose: () => void
  variantId: string
  currentStock: number
}) {
  const { toast } = useToast()
  const adjustStock = useAdjustStock()
  const [adjustment, setAdjustment] = useState('')
  const [reason, setReason] = useState('')

  const handleSave = useCallback(async () => {
    const adj = Number(adjustment)
    if (isNaN(adj) || adj === 0 || !reason.trim()) return
    try {
      await adjustStock.mutateAsync({ variantId, adjustment: adj, reason: reason.trim() })
      toast.success(`Stock adjusted by ${adj > 0 ? '+' : ''}${adj}`)
      onClose()
    } catch {
      toast.error('Failed to adjust stock')
    }
  }, [variantId, adjustment, reason, adjustStock, toast, onClose])

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-primary-800">Adjust stock</h3>
        <p className="text-sm text-primary-400">Current stock: {currentStock}</p>
        <Input
          label="Adjustment (+/-)"
          value={adjustment}
          onChange={(e) => setAdjustment(e.target.value)}
          helperText="Positive to add, negative to remove"
          required
        />
        <Input
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        <Button
          variant="primary"
          fullWidth
          loading={adjustStock.isPending}
          onClick={handleSave}
        >
          Adjust
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Products tab                                                       */
/* ------------------------------------------------------------------ */

export default function ProductsTab() {
  const { data: products, isLoading } = useAdminProducts()
  const updateProduct = useUpdateProduct()
  const { toast } = useToast()

  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | undefined>()
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)
  const [stockTarget, setStockTarget] = useState<{ variantId: string; stock: number } | null>(null)

  const handleArchive = useCallback(async () => {
    if (!archiveTarget) return
    try {
      await updateProduct.mutateAsync({ id: archiveTarget.id, status: 'archived' })
      toast.success('Product archived')
    } catch {
      toast.error('Failed to archive product')
    }
    setArchiveTarget(null)
  }, [archiveTarget, updateProduct, toast])

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
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading font-semibold text-primary-800">
          Products ({products?.length ?? 0})
        </h2>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => {
            setEditProduct(undefined)
            setFormOpen(true)
          }}
        >
          Add
        </Button>
      </div>

      {!products || products.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No products"
          description="Add your first merch product"
        />
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-white rounded-2xl border border-primary-100 shadow-sm"
            >
              <div className="flex gap-3">
                <img
                  src={product.images[0] ?? '/img/placeholder-merch.jpg'}
                  alt={product.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-sm text-primary-800 truncate">
                      {product.name}
                    </h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                        product.status === 'active' && 'bg-success-100 text-success-800',
                        product.status === 'draft' && 'bg-warning-100 text-warning-800',
                        product.status === 'archived' && 'bg-white text-primary-400',
                      )}
                    >
                      {product.status}
                    </span>
                  </div>
                  <p className="text-xs text-primary-400 mt-0.5">
                    {formatPrice(product.base_price_cents)} · {product.variants.length} variant
                    {product.variants.length !== 1 ? 's' : ''}
                  </p>

                  {/* Low stock warning */}
                  {product.variants.some((v) => v.stock > 0 && v.stock <= v.low_stock_threshold) && (
                    <div className="flex items-center gap-1 mt-1 text-warning-600">
                      <AlertTriangle size={12} />
                      <span className="text-xs font-medium">Low stock on some variants</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Variants */}
              {product.variants.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {product.variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-3 py-2 bg-white rounded-lg text-xs"
                    >
                      <span className="text-primary-800 font-medium">
                        {variantLabel(v)}
                      </span>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'tabular-nums font-semibold',
                            v.stock <= v.low_stock_threshold ? 'text-warning-600' : 'text-primary-400',
                          )}
                        >
                          {v.stock} in stock
                        </span>
                        <button
                          type="button"
                          onClick={() => setStockTarget({ variantId: v.id, stock: v.stock })}
                          className="text-primary-400 hover:underline cursor-pointer"
                        >
                          Adjust
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Edit3 size={14} />}
                  onClick={() => {
                    setEditProduct(product)
                    setFormOpen(true)
                  }}
                >
                  Edit
                </Button>
                {product.status !== 'archived' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Archive size={14} />}
                    onClick={() => setArchiveTarget(product)}
                  >
                    Archive
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editProduct}
      />

      <ConfirmationSheet
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchive}
        title="Archive product?"
        description={`"${archiveTarget?.name}" will be hidden from the store.`}
        confirmLabel="Archive"
        variant="warning"
      />

      {stockTarget && (
        <StockAdjustSheet
          open
          onClose={() => setStockTarget(null)}
          variantId={stockTarget.variantId}
          currentStock={stockTarget.stock}
        />
      )}
    </>
  )
}
