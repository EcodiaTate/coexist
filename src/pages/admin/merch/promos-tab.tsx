import { useState, useCallback } from 'react'
import { Plus, Edit3, Ban } from 'lucide-react'
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

  const [code, setCode] = useState(promo?.code ?? '')
  const [type, setType] = useState<PromoType>(promo?.type ?? 'percentage')
  const [value, setValue] = useState(promo ? String(promo.value) : '')
  const [maxUses, setMaxUses] = useState(promo?.max_uses ? String(promo.max_uses) : '')
  const [expiresAt, setExpiresAt] = useState(promo?.expires_at?.slice(0, 10) ?? '')
  const [isActive, setIsActive] = useState(promo?.is_active ?? true)

  const handleSave = useCallback(async () => {
    if (!code.trim() || !value) {
      toast('Code and value are required', 'error')
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
      toast(promo ? 'Promo updated' : 'Promo created', 'success')
      onClose()
    } catch {
      toast('Failed to save promo', 'error')
    }
  }, [code, type, value, maxUses, expiresAt, isActive, promo, upsert, toast, onClose])

  return (
    <BottomSheet open={open} onClose={onClose} snapPoints={[0.75]}>
      <div className="space-y-4">
        <h3 className="font-heading font-semibold text-lg text-primary-800">
          {promo ? 'Edit promo' : 'New promo code'}
        </h3>
        <Input
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
        <div className="flex gap-2">
          {(['percentage', 'flat', 'free_shipping'] as PromoType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex-1 py-2 rounded-lg border-2 text-xs font-medium cursor-pointer transition-colors',
                type === t
                  ? 'border-primary-500 bg-white text-primary-400'
                  : 'border-primary-200 text-primary-400',
              )}
            >
              {t === 'percentage' ? '% Off' : t === 'flat' ? '$ Off' : 'Free Ship'}
            </button>
          ))}
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
          label="Expires (YYYY-MM-DD)"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <Toggle label="Active" checked={isActive} onChange={setIsActive} />
        <Button variant="primary" fullWidth loading={upsert.isPending} onClick={handleSave}>
          {promo ? 'Update' : 'Create'}
        </Button>
      </div>
    </BottomSheet>
  )
}

export default function PromosTab() {
  const { data: promos, isLoading } = useAdminPromoCodes()
  const [formOpen, setFormOpen] = useState(false)
  const [editPromo, setEditPromo] = useState<PromoCode | undefined>()

  if (isLoading) {
    return <Skeleton variant="text" count={5} />
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-heading font-semibold text-primary-800">
          Promo Codes ({promos?.length ?? 0})
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
      </div>

      {!promos || promos.length === 0 ? (
        <EmptyState
          illustration="empty"
          title="No promo codes"
          description="Create promo codes for discounts and campaigns"
        />
      ) : (
        <StaggeredList className="space-y-2">
          {promos.map((promo) => (
            <StaggeredItem
              key={promo.id}
              className="flex items-center justify-between p-3 bg-white rounded-xl border border-primary-100"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-sm text-primary-800">
                    {promo.code}
                  </span>
                  {!promo.is_active && (
                    <span className="px-1.5 py-0.5 bg-white text-primary-400 text-[10px] rounded-full font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-primary-400 mt-0.5">
                  {promo.type === 'percentage' && `${promo.value}% off`}
                  {promo.type === 'flat' && `${formatPrice(promo.value)} off`}
                  {promo.type === 'free_shipping' && 'Free shipping'}
                  {' · '}
                  {promo.uses}{promo.max_uses ? `/${promo.max_uses}` : ''} uses
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

      <PromoFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        promo={editPromo}
      />
    </>
  )
}
