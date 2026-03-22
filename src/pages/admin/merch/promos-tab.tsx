import { useState, useCallback, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import { Plus, Edit3 } from 'lucide-react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { BottomSheet } from '@/components/bottom-sheet'
import { useToast } from '@/components/toast'
import { useAdminPromoCodes, useUpsertPromoCode } from '@/hooks/use-admin-merch'
import { formatPrice, type PromoCode, type PromoType } from '@/types/merch'
import { cn } from '@/lib/cn'

const SNAP_POINTS_75 = [0.75]

const TYPE_LABELS: Record<PromoType, string> = {
  percentage: '% Off',
  flat: '$ Off',
  free_shipping: 'Free Ship',
}

const TYPE_COLOURS: Record<PromoType, string> = {
  percentage: 'bg-info-100 text-info-700 ring-info-300',
  flat: 'bg-success-100 text-success-700 ring-success-300',
  free_shipping: 'bg-plum-100 text-plum-700 ring-plum-300',
}

function PromoFormSheet({
  open,
  onClose,
  promo,
}: {
  open: boolean
  onClose: () => void
  promo?: PromoCode
}) {
  const { toast } = useToast()
  const upsert = useUpsertPromoCode()

  const [code, setCode] = useState('')
  const [type, setType] = useState<PromoType>('percentage')
  const [value, setValue] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Populate form when opening
  useEffect(() => {
    if (open) {
      setCode(promo?.code ?? '')
      setType(promo?.type ?? 'percentage')
      setValue(promo ? String(promo.value) : '')
      setMaxUses(promo?.max_uses ? String(promo.max_uses) : '')
      setExpiresAt(promo?.expires_at?.slice(0, 10) ?? '')
      setIsActive(promo?.is_active ?? true)
    }
  }, [open, promo])

  const handleSave = useCallback(async () => {
    if (!code.trim() || !value) {
      toast.error('Code and value are required')
      return
    }
    try {
      await upsert.mutateAsync({
        ...(promo ? { id: promo.id } : {}),
        code: code.toUpperCase().trim(),
        type,
        value: Number(value),
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
        is_active: isActive,
      })
      toast.success(promo ? 'Promo updated' : 'Promo created')
      onClose()
    } catch {
      toast.error('Failed to save promo')
    }
  }, [code, type, value, maxUses, expiresAt, isActive, promo, upsert, toast, onClose])

  // Prevent Enter key from bubbling out of inputs
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault()
    }
  }, [])

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={SNAP_POINTS_75}>
      <div className="space-y-5" onKeyDown={handleKeyDown}>
        <h3 className="font-heading font-semibold text-lg text-primary-800">
          {promo ? 'Edit promo' : 'New promo code'}
        </h3>
        <Input
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />

        {/* Type selector with richer colours */}
        <div>
          <p className="text-xs font-semibold text-primary-500 uppercase tracking-wider mb-2">Type</p>
          <div className="flex gap-2">
            {(['percentage', 'flat', 'free_shipping'] as PromoType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-[color,background-color,box-shadow] duration-150',
                  type === t
                    ? `${TYPE_COLOURS[t]} ring-2 shadow-sm`
                    : 'bg-primary-50/60 text-primary-400 hover:bg-primary-100/60',
                )}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {type !== 'free_shipping' && (
          <Input
            label={type === 'percentage' ? 'Percentage' : 'Amount (cents)'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        )}
        <Input
          label="Max uses (optional)"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
        />
        <Input
          label="Expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <Toggle label="Active" checked={isActive} onChange={setIsActive} />
        <div className="pt-1">
          <Button variant="primary" fullWidth loading={upsert.isPending} onClick={handleSave}>
            {promo ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  )
}

export default function PromosTab() {
  const { data: promos, isLoading } = useAdminPromoCodes()
  const showLoading = useDelayedLoading(isLoading)
  const shouldReduceMotion = useReducedMotion()
  const [formOpen, setFormOpen] = useState(false)
  const [editPromo, setEditPromo] = useState<PromoCode | undefined>()

  if (showLoading) {
    return <Skeleton variant="text" count={5} />
  }
  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} className="flex justify-between items-center mb-5">
        <h2 className="font-heading font-semibold text-primary-800">
          Promo Codes
          <span className="ml-2 text-sm font-normal text-primary-400">{promos?.length ?? 0}</span>
        </h2>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => {
            setEditPromo(undefined)
            setFormOpen(true)
          }}
        >
          Add
        </Button>
      </motion.div>

      <motion.div variants={fadeUp}>
      {!promos || promos.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No promo codes"
          description="Create promo codes for discounts and campaigns"
        />
      ) : (
        <StaggeredList className="space-y-3">
          {promos.map((promo) => (
            <StaggeredItem
              key={promo.id}
              className="flex items-center justify-between p-4 bg-gradient-to-br from-[#f0f4ea] via-[#edf1e7] to-[#e8ecdf] border border-primary-200/20 rounded-2xl shadow-[0_4px_20px_-4px_rgba(61,77,51,0.08)]"
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-bold text-sm text-primary-800">
                    {promo.code}
                  </span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-lg text-[10px] font-bold',
                    promo.type === 'percentage' && 'bg-info-100 text-info-700',
                    promo.type === 'flat' && 'bg-success-100 text-success-700',
                    promo.type === 'free_shipping' && 'bg-plum-100 text-plum-700',
                  )}>
                    {promo.type === 'percentage' && `${promo.value}%`}
                    {promo.type === 'flat' && formatPrice(promo.value)}
                    {promo.type === 'free_shipping' && 'Free ship'}
                  </span>
                  {!promo.is_active && (
                    <span className="px-2 py-0.5 bg-error-50 text-error-600 text-[10px] rounded-lg font-bold">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-primary-400 mt-1.5">
                  {promo.uses}{promo.max_uses ? ` / ${promo.max_uses}` : ''} uses
                  {promo.expires_at && (
                    <span className="ml-2">
                      Expires {new Date(promo.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Edit3 size={14} />}
                onClick={() => {
                  setEditPromo(promo)
                  setFormOpen(true)
                }}
              >
                Edit
              </Button>
            </StaggeredItem>
          ))}
        </StaggeredList>
      )}
      </motion.div>

      <PromoFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        promo={editPromo}
      />
    </motion.div>
  )
}
