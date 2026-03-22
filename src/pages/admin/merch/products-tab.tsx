import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Plus, Edit3, Archive, AlertTriangle, Search, X,
  ChevronDown, ChevronUp, ImagePlus, GripVertical, Trash2,
} from 'lucide-react'
import { useAppImage } from '@/hooks/use-app-images'
import { useImageUpload } from '@/hooks/use-image-upload'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
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
import { formatPrice, variantLabel, type Product, type ProductStatus, type ProductVariant } from '@/types/merch'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Variant option input — type values, press Enter/comma to add       */
/* ------------------------------------------------------------------ */

interface VariantOption {
  name: string      // e.g. "Size", "Colour"
  values: string[]  // e.g. ["S", "M", "L", "XL"]
}

function VariantOptionRow({
  option,
  onChange,
  onRemove,
}: {
  option: VariantOption
  onChange: (o: VariantOption) => void
  onRemove: () => void
}) {
  const [inputValue, setInputValue] = useState('')

  const addValue = useCallback((raw: string) => {
    const v = raw.trim()
    if (!v || option.values.includes(v)) return
    onChange({ ...option, values: [...option.values, v] })
    setInputValue('')
  }, [option, onChange])

  const removeValue = useCallback((idx: number) => {
    onChange({ ...option, values: option.values.filter((_, i) => i !== idx) })
  }, [option, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      e.stopPropagation()
      addValue(inputValue)
    }
    if (e.key === 'Backspace' && !inputValue && option.values.length > 0) {
      removeValue(option.values.length - 1)
    }
  }, [inputValue, option.values, addValue, removeValue])

  const handleBlur = useCallback(() => {
    if (inputValue.trim()) addValue(inputValue)
  }, [inputValue, addValue])

  return (
    <div className="p-3.5 bg-white/70 rounded-xl border border-primary-200/20 space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={option.name}
          onChange={(e) => onChange({ ...option, name: e.target.value })}
          placeholder="Option name (e.g. Size)"
          className="flex-1 h-9 px-3 rounded-lg bg-primary-50/50 text-sm font-semibold text-primary-800 placeholder:text-primary-400/50 outline-none focus:ring-2 focus:ring-primary-300/50"
        />
        <button
          type="button"
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-primary-400 hover:text-error-600 hover:bg-error-50 cursor-pointer transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Values as pills + inline input */}
      <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] px-3 py-2 rounded-lg bg-white border border-primary-200/30 focus-within:ring-2 focus-within:ring-primary-300/50">
        {option.values.map((val, idx) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-lg text-xs font-medium"
          >
            {val}
            <button
              type="button"
              onClick={() => removeValue(idx)}
              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-primary-200 cursor-pointer"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={option.values.length === 0 ? 'Type values, press Enter or comma' : 'Add more...'}
          className="flex-1 min-w-[100px] h-7 bg-transparent text-sm text-primary-800 placeholder:text-primary-400/50 outline-none"
        />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Build the variant matrix from options                               */
/* ------------------------------------------------------------------ */

function buildVariantMatrix(
  options: VariantOption[],
  existingVariants: ProductVariant[],
  baseSlug: string,
  basePriceCents: number,
): ProductVariant[] {
  // Only use options that have a name and at least one value
  const valid = options.filter((o) => o.name.trim() && o.values.length > 0)

  if (valid.length === 0) return existingVariants

  // Generate all combinations
  const combos: Record<string, string>[] = [{}]
  for (const opt of valid) {
    const expanded: Record<string, string>[] = []
    for (const existing of combos) {
      for (const val of opt.values) {
        expanded.push({ ...existing, [opt.name.toLowerCase()]: val })
      }
    }
    combos.length = 0
    combos.push(...expanded)
  }

  // Map combos to variants, reusing existing ones where they match
  return combos.map((combo) => {
    const size = combo['size'] ?? combo['sizes'] ?? null
    const colour = combo['colour'] ?? combo['color'] ?? combo['colours'] ?? null

    // Try to find existing variant with same size+colour
    const existing = existingVariants.find(
      (v) => (v.size ?? null) === size && (v.colour ?? null) === colour,
    )

    if (existing) return existing

    const parts = Object.values(combo).filter(Boolean)
    const skuSuffix = parts.map((p) => p.toUpperCase().replace(/\s+/g, '')).join('-')

    return {
      id: crypto.randomUUID(),
      product_id: '',
      size,
      colour,
      sku: `${baseSlug}-${skuSuffix}`.toUpperCase(),
      price_cents: basePriceCents,
      stock: 0,
      low_stock_threshold: 5,
      is_active: true,
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Extract options back from existing variants                        */
/* ------------------------------------------------------------------ */

function extractOptionsFromVariants(variants: ProductVariant[]): VariantOption[] {
  const opts: VariantOption[] = []
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[]
  const colours = [...new Set(variants.map((v) => v.colour).filter(Boolean))] as string[]
  if (sizes.length > 0) opts.push({ name: 'Size', values: sizes })
  if (colours.length > 0) opts.push({ name: 'Colour', values: colours })
  return opts
}

/* ------------------------------------------------------------------ */
/*  Product form sheet                                                 */
/* ------------------------------------------------------------------ */

const SNAP_POINTS_FORM = [0.92]

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
  const { upload, uploading, progress } = useImageUpload({ bucket: 'merch-images', pathPrefix: 'products' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [basePriceCents, setBasePriceCents] = useState('')
  const [status, setStatus] = useState<ProductStatus>('draft')
  const [images, setImages] = useState<string[]>([])
  const [options, setOptions] = useState<VariantOption[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // Populate form
  useEffect(() => {
    if (open) {
      setName(product?.name ?? '')
      setSlug(product?.slug ?? '')
      setDescription(product?.description ?? '')
      setCategory(product?.category ?? '')
      setBasePriceCents(product ? String(product.base_price_cents / 100) : '')
      setStatus(product?.status ?? 'draft')
      setImages(product?.images ?? [])
      setOptions(product?.variants?.length ? extractOptionsFromVariants(product.variants) : [])
    }
  }, [open, product])

  // Auto-generate matrix preview
  const generatedVariants = useMemo(() => {
    const priceNum = Math.round(Number(basePriceCents || '0') * 100)
    const slugBase = slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-') || 'product'
    return buildVariantMatrix(options, product?.variants ?? [], slugBase, priceNum)
  }, [options, product?.variants, basePriceCents, slug, name])

  const handleAddImages = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      for (const file of Array.from(files)) {
        const result = await upload(file)
        setImages((prev) => [...prev, result.url])
      }
    } catch {
      toast.error('Failed to upload image')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [upload, toast])

  const handleRemoveImage = useCallback((idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleMoveImage = useCallback((from: number, to: number) => {
    setImages((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }, [])

  const handleSave = useCallback(async () => {
    const priceNum = Math.round(Number(basePriceCents) * 100)
    if (!name.trim() || priceNum <= 0) {
      toast.error('Name and price are required')
      return
    }

    setSaving(true)
    try {
      const productSlug = slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-')
      const variantsToSave = generatedVariants.map((v) => ({
        ...v,
        price_cents: v.price_cents || priceNum,
      }))

      if (product) {
        await updateProduct.mutateAsync({
          id: product.id,
          name: name.trim(),
          slug: productSlug,
          description: description.trim(),
          category: category.trim() || null,
          base_price_cents: priceNum,
          status,
          images,
        })
        // Update variants as full JSONB replace
        await supabase
          .from('merch_products')
          .update({ variants: variantsToSave as any })
          .eq('id', product.id)
      } else {
        const created = await createProduct.mutateAsync({
          name: name.trim(),
          slug: productSlug,
          description: description.trim(),
          category: category.trim() || null,
          base_price_cents: priceNum,
          status,
          images,
        })
        const newId = (created as any)?.id
        if (newId && variantsToSave.length > 0) {
          await supabase
            .from('merch_products')
            .update({ variants: variantsToSave.map((v) => ({ ...v, product_id: newId })) as any })
            .eq('id', newId)
        }
      }

      toast.success(product ? 'Product updated' : 'Product created')
      onClose()
    } catch {
      toast.error('Failed to save product')
    } finally {
      setSaving(false)
    }
  }, [name, slug, description, category, basePriceCents, status, images, generatedVariants, product, createProduct, updateProduct, toast, onClose])

  const isPending = saving || createProduct.isPending || updateProduct.isPending

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault()
    }
  }, [])

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={SNAP_POINTS_FORM}>
      <div className="space-y-5" onKeyDown={handleKeyDown}>
        <h3 className="font-heading font-semibold text-lg text-primary-800">
          {product ? 'Edit product' : 'New product'}
        </h3>

        {/* ---- Images ---- */}
        <div>
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2.5">
            Images
            {images.length > 0 && <span className="ml-1 text-primary-400 normal-case font-normal">({images.length})</span>}
          </p>
          <div className="flex gap-2.5 flex-wrap">
            {images.map((url, idx) => (
              <div
                key={url + idx}
                className={cn(
                  'relative group w-20 h-20 rounded-xl overflow-hidden border-2 transition-all',
                  idx === 0 ? 'border-primary-400 shadow-md' : 'border-primary-200/30',
                  dragIdx === idx && 'opacity-50 scale-95',
                )}
                draggable
                onDragStart={() => setDragIdx(idx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null && dragIdx !== idx) handleMoveImage(dragIdx, idx)
                  setDragIdx(null)
                }}
                onDragEnd={() => setDragIdx(null)}
              >
                <img src={url} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-primary-500/90 text-white text-[9px] font-bold rounded-md">
                    Main
                  </span>
                )}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={14} className="text-white drop-shadow-lg" />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-error-500"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'w-20 h-20 rounded-xl border-2 border-dashed border-primary-300/50 flex flex-col items-center justify-center gap-1',
                'text-primary-400 hover:text-primary-600 hover:border-primary-400/60 hover:bg-primary-50/40',
                'cursor-pointer transition-all duration-150',
                uploading && 'opacity-60 pointer-events-none',
              )}
            >
              {uploading ? (
                <span className="text-xs font-bold tabular-nums">{progress ?? 0}%</span>
              ) : (
                <>
                  <ImagePlus size={20} />
                  <span className="text-[10px] font-semibold">Add</span>
                </>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddImages(e.target.files)}
            />
          </div>
          {images.length > 1 && (
            <p className="text-[11px] text-primary-400 mt-1.5">Drag to reorder. First image is the main photo.</p>
          )}
        </div>

        <Divider />

        {/* ---- Product details ---- */}
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          helperText="URL-friendly identifier (auto-generated if blank)"
        />
        <Input
          type="textarea"
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input
            label="Base price ($)"
            value={basePriceCents}
            onChange={(e) => setBasePriceCents(e.target.value)}
            required
          />
        </div>

        {/* Status selector */}
        <div>
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2">Status</p>
          <div className="flex gap-2">
            {(['draft', 'active', 'archived'] as ProductStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize cursor-pointer transition-all duration-150',
                  status === s && s === 'active' && 'bg-success-100 text-success-700 ring-2 ring-success-300 shadow-sm',
                  status === s && s === 'draft' && 'bg-warning-100 text-warning-700 ring-2 ring-warning-300 shadow-sm',
                  status === s && s === 'archived' && 'bg-primary-100 text-primary-600 ring-2 ring-primary-300 shadow-sm',
                  status !== s && 'bg-primary-50/60 text-primary-400 hover:bg-primary-100/60',
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Divider />

        {/* ---- Variant options ---- */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
              Variant options
            </p>
            <button
              type="button"
              onClick={() => setOptions((prev) => [...prev, { name: '', values: [] }])}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-primary-600 hover:bg-primary-100/60 cursor-pointer transition-colors"
            >
              <Plus size={14} />
              Add option
            </button>
          </div>

          {options.length === 0 ? (
            <div className="p-4 rounded-xl bg-primary-50/40 text-center">
              <p className="text-sm text-primary-400">No variant options</p>
              <p className="text-xs text-primary-400 mt-1">Add options like Size or Colour to auto-generate variants</p>
            </div>
          ) : (
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <VariantOptionRow
                  key={idx}
                  option={opt}
                  onChange={(o) => setOptions((prev) => prev.map((p, i) => (i === idx ? o : p)))}
                  onRemove={() => setOptions((prev) => prev.filter((_, i) => i !== idx))}
                />
              ))}
            </div>
          )}
        </div>

        {/* ---- Generated matrix preview ---- */}
        {generatedVariants.length > 0 && options.some((o) => o.values.length > 0) && (
          <div>
            <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2">
              Generated variants
              <span className="ml-1 text-primary-400 normal-case font-normal">({generatedVariants.length})</span>
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl">
              {generatedVariants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-white/70 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary-800">{variantLabel(v)}</span>
                    <span className="text-primary-400 font-mono text-[10px]">{v.sku}</span>
                  </div>
                  <span className="text-primary-500 tabular-nums font-semibold">{formatPrice(v.price_cents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Save ---- */}
        <div className="pt-2">
          <Button
            variant="primary"
            fullWidth
            loading={isPending}
            onClick={handleSave}
          >
            {product ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Variant summary — grouped by option type (product list cards)      */
/* ------------------------------------------------------------------ */

function VariantSummary({
  product,
  onAdjustStock,
}: {
  product: Product
  onAdjustStock: (variantId: string, stock: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  if (product.variants.length === 0) return null

  const sizes = [...new Set(product.variants.map((v) => v.size).filter(Boolean))] as string[]
  const colours = [...new Set(product.variants.map((v) => v.colour).filter(Boolean))] as string[]

  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0)
  const lowStockCount = product.variants.filter(
    (v) => v.stock > 0 && v.stock <= v.low_stock_threshold,
  ).length
  const outOfStockCount = product.variants.filter((v) => v.stock === 0).length

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white/80 rounded-xl text-xs cursor-pointer hover:bg-white transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {sizes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-primary-500 uppercase tracking-wider text-[10px]">Sizes</span>
              <div className="flex gap-1">
                {sizes.map((s) => (
                  <span key={s} className="px-2 py-0.5 bg-info-50 text-info-700 rounded-md font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
          {colours.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-primary-500 uppercase tracking-wider text-[10px]">Colours</span>
              <div className="flex gap-1">
                {colours.map((c) => (
                  <span key={c} className="px-2 py-0.5 bg-plum-50 text-plum-700 rounded-md font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className="tabular-nums text-primary-600 font-semibold">{totalStock} total</span>
          {lowStockCount > 0 && (
            <span className="px-1.5 py-0.5 bg-warning-100 text-warning-700 rounded-md font-semibold">{lowStockCount} low</span>
          )}
          {outOfStockCount > 0 && (
            <span className="px-1.5 py-0.5 bg-error-100 text-error-700 rounded-md font-semibold">{outOfStockCount} out</span>
          )}
          {expanded ? <ChevronUp size={14} className="text-primary-400" /> : <ChevronDown size={14} className="text-primary-400" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {product.variants.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between px-3.5 py-2.5 bg-white/60 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-primary-800 font-medium">{variantLabel(v)}</span>
                    <span className="text-primary-400 font-mono text-[10px]">{v.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary-400 tabular-nums">{formatPrice(v.price_cents)}</span>
                    <span
                      className={cn(
                        'tabular-nums font-semibold px-2 py-0.5 rounded-md',
                        v.stock === 0
                          ? 'bg-error-50 text-error-600'
                          : v.stock <= v.low_stock_threshold
                            ? 'bg-warning-50 text-warning-600'
                            : 'text-primary-500',
                      )}
                    >
                      {v.stock} in stock
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(v.id, v.stock)}
                      className="text-primary-500 hover:text-primary-700 font-semibold cursor-pointer hover:underline"
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
      await adjustStock.mutateAsync({ productId: variantId, variantKey: variantId, adjustment: adj } as any)
      toast.success(`Stock adjusted by ${adj > 0 ? '+' : ''}${adj}`)
      onClose()
    } catch {
      toast.error('Failed to adjust stock')
    }
  }, [variantId, adjustment, reason, adjustStock, toast, onClose])

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="space-y-5">
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
        <Button variant="primary" fullWidth loading={adjustStock.isPending} onClick={handleSave}>
          Adjust
        </Button>
      </div>
    </BottomSheet>
  )
}

/* ------------------------------------------------------------------ */
/*  Products tab                                                       */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<ProductStatus, string> = {
  active: 'bg-success-100 text-success-700',
  draft: 'bg-warning-100 text-warning-700',
  archived: 'bg-primary-100 text-primary-500',
}

export default function ProductsTab() {
  const { data: products, isLoading } = useAdminProducts()
  const updateProduct = useUpdateProduct()
  const { toast } = useToast()
  const placeholderMerch = useAppImage('placeholder_merch')

  const [formOpen, setFormOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | undefined>()
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null)
  const [stockTarget, setStockTarget] = useState<{ variantId: string; stock: number } | null>(null)
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const archivedCount = useMemo(() => products?.filter((p) => p.status === 'archived').length ?? 0, [products])

  const filteredProducts = useMemo(() => {
    if (!products) return []
    let list = products
    if (!showArchived) list = list.filter((p) => p.status !== 'archived')
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q),
      )
    }
    return list
  }, [products, search, showArchived])

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
      {/* Header */}
      <motion.div variants={fadeUp} className="flex justify-between items-center mb-4">
        <h2 className="font-heading font-semibold text-lg text-primary-800">
          Products
          <span className="ml-2 text-sm font-normal text-primary-400">
            {filteredProducts.length}{search ? ` of ${products?.length ?? 0}` : ''}
          </span>
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
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp} className="mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-400/70 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className={cn(
              'w-full h-11 pl-10 pr-10 rounded-xl',
              'bg-white text-primary-800 placeholder:text-primary-400/60',
              'text-[16px] sm:text-sm',
              'outline-none border-none',
              'shadow-sm focus:shadow-md focus:ring-2 focus:ring-primary-300/50',
              'transition-all duration-200',
            )}
          />
          <AnimatePresence>
            {search && (
              <motion.button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-primary-400 hover:text-primary-600 hover:bg-primary-100/60 cursor-pointer"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.15 }}
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
        {archivedCount > 0 && (
          <button
            type="button"
            onClick={() => setShowArchived((p) => !p)}
            className="mt-2 text-xs font-medium text-primary-400 hover:text-primary-600 cursor-pointer transition-colors"
          >
            {showArchived ? 'Hide' : 'Show'} {archivedCount} archived
          </button>
        )}
      </motion.div>

      {/* Product list */}
      <motion.div variants={fadeUp}>
        {filteredProducts.length === 0 ? (
          <EmptyState
            illustration="empty"
            title={search ? 'No matches' : 'No products'}
            description={search ? 'Try a different search term' : 'Add your first merch product'}
          />
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="p-5 bg-gradient-to-br from-[#f0f4ea] via-[#edf1e7] to-[#e8ecdf] border border-primary-200/20 rounded-2xl shadow-[0_4px_20px_-4px_rgba(61,77,51,0.08),0_1px_4px_rgba(61,77,51,0.03)]"
              >
                <div className="flex gap-4">
                  <img
                    src={product.images[0] ?? placeholderMerch}
                    alt={product.name}
                    className="w-18 h-18 rounded-xl object-cover shrink-0 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-heading font-semibold text-[15px] text-primary-800 truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-primary-400 mt-0.5">
                          {product.slug}
                          {product.category && (
                            <span className="ml-2 px-1.5 py-0.5 bg-primary-100/60 rounded text-[10px] font-medium text-primary-500">
                              {product.category}
                            </span>
                          )}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize shrink-0',
                          STATUS_BADGE[product.status],
                        )}
                      >
                        {product.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <span className="font-heading font-bold text-sm text-primary-800 tabular-nums">
                        {formatPrice(product.base_price_cents)}
                      </span>
                      <span className="text-xs text-primary-400">
                        {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                      </span>
                      {product.review_count > 0 && (
                        <span className="text-xs text-primary-400">
                          {product.avg_rating?.toFixed(1)} ({product.review_count})
                        </span>
                      )}
                    </div>

                    {product.variants.some((v) => v.stock > 0 && v.stock <= v.low_stock_threshold) && (
                      <div className="flex items-center gap-1.5 mt-2 text-warning-600">
                        <AlertTriangle size={12} />
                        <span className="text-xs font-semibold">Low stock on some variants</span>
                      </div>
                    )}
                  </div>
                </div>

                <VariantSummary
                  product={product}
                  onAdjustStock={(variantId, stock) => setStockTarget({ variantId, stock })}
                />

                <div className="flex gap-2 mt-4 pt-3 border-t border-primary-200/20">
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
      </motion.div>

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
    </motion.div>
  )
}
