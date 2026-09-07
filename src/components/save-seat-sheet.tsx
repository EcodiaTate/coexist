import { useState, useEffect, startTransition } from 'react'
import { Car, MapPin } from 'lucide-react'
import { BottomSheet } from '@/components/bottom-sheet'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { SheetHeader } from '@/components/sheet-header'

interface SaveSeatSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { pickup_address_text: string }) => void
  loading?: boolean
  /** Optional: name of the carpool driver to give context */
  driverName?: string | null
  /** Optional: short label of the linked event for context */
  eventTitle?: string | null
}

export function SaveSeatSheet({
  open,
  onClose,
  onSubmit,
  loading,
  driverName,
  eventTitle,
}: SaveSeatSheetProps) {
  const [pickupAddress, setPickupAddress] = useState('')

  // Reset on open
  useEffect(() => {
    if (open) {
      startTransition(() => setPickupAddress(''))
    }
  }, [open])

  // Reset on close (after exit animation)
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setPickupAddress(''), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  const canSubmit = pickupAddress.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({ pickup_address_text: pickupAddress.trim() })
    // pickup_lat / pickup_lng are nullable on the schema; v1 ships text-only.
    // Map-pin / geocoder selection lands in v2 - see SHARED-SPEC.md "Out of scope".
  }

  return (
    <BottomSheet data-eos-id="src/components/save-seat-sheet.tsx#0" data-eos-v="2" open={open} onClose={onClose}>
      <div data-eos-id="src/components/save-seat-sheet.tsx#1" className="pb-4 max-h-[80vh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <SheetHeader
          variant="panel"
          icon={<Car size={20} />}
          iconClassName="bg-success-50 text-success-600"
          title="Save me a seat"
          truncate
          subtitle={
            driverName
              ? `Riding with ${driverName}`
              : eventTitle
                ? `For ${eventTitle}`
                : 'Tell the driver where to pick you up'
          }
        />

        {/* Privacy reminder */}
        <div data-eos-id="src/components/save-seat-sheet.tsx#8" className="mb-3 rounded-sm bg-neutral-50 px-3.5 py-2.5 ring-1 ring-neutral-100">
          <div data-eos-id="src/components/save-seat-sheet.tsx#9" className="flex items-start gap-2">
            <MapPin data-eos-id="src/components/save-seat-sheet.tsx#10" size={14} className="text-neutral-400 shrink-0 mt-0.5" />
            <p data-eos-id="src/components/save-seat-sheet.tsx#11" className="text-[11px] text-neutral-500 leading-relaxed">
              Your pickup address is only visible to you and the driver. Other collective members can&apos;t see it.
            </p>
          </div>
        </div>

        {/* Pickup address */}
        <div data-eos-id="src/components/save-seat-sheet.tsx#12" className="mb-4">
          <Input data-eos-id="src/components/save-seat-sheet.tsx#13"
            label="Pickup address"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="e.g. 12 Wattle St, Buderim"
            maxLength={200}
            autoComplete="street-address"
          />
        </div>

        {/* Submit */}
        <Button data-eos-id="src/components/save-seat-sheet.tsx#14"
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          loading={loading}
        >
          Save my seat
        </Button>
      </div>
    </BottomSheet>
  )
}
