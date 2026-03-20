import { useState, useCallback, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { useShippingConfig } from '@/hooks/use-merch'
import { useUpdateShippingConfig } from '@/hooks/use-admin-merch'

export default function ShippingTab() {
  const { data: config, isLoading } = useShippingConfig()
  const updateConfig = useUpdateShippingConfig()
  const { toast } = useToast()

  const [flatRate, setFlatRate] = useState('')
  const [freeThreshold, setFreeThreshold] = useState('')

  useEffect(() => {
    if (config) {
      setFlatRate(String(config.flat_rate_cents / 100))
      setFreeThreshold(
        config.free_shipping_threshold_cents
          ? String(config.free_shipping_threshold_cents / 100)
          : '',
      )
    }
  }, [config])

  const handleSave = useCallback(async () => {
    try {
      await updateConfig.mutateAsync({
        flat_rate_cents: Math.round(Number(flatRate) * 100),
        free_shipping_threshold_cents: freeThreshold
          ? Math.round(Number(freeThreshold) * 100)
          : null,
      })
      toast.success('Shipping config updated')
    } catch {
      toast.error('Failed to update shipping config')
    }
  }, [flatRate, freeThreshold, updateConfig, toast])

  if (isLoading) {
    return <Skeleton variant="text" count={3} />
  }

  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className="space-y-4"
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <h2 className="font-heading font-semibold text-primary-800">Shipping configuration</h2>
      <Input
        label="Flat rate ($)"
        value={flatRate}
        onChange={(e) => setFlatRate(e.target.value)}
        helperText="Standard shipping cost"
      />
      <Input
        label="Free shipping threshold ($)"
        value={freeThreshold}
        onChange={(e) => setFreeThreshold(e.target.value)}
        helperText="Orders above this amount get free shipping. Leave empty for no threshold."
      />
      <Button
        variant="primary"
        fullWidth
        loading={updateConfig.isPending}
        onClick={handleSave}
      >
        Save
      </Button>
    </motion.div>
  )
}
