import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Heart,
  Save,
  CheckCircle,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { supabase } from '@/lib/supabase'

function useCharitySettings() {
  return useQuery({
    queryKey: ['charity-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('charity_settings' as any)
        .select('*')
      if (error) throw error

      // Convert array of key-value pairs to object
      const settings: Record<string, string> = {}
      for (const row of (data ?? []) as any[]) {
        settings[row.key] = row.value
      }
      return settings
    },
    staleTime: 5 * 60 * 1000,
  })
}

export default function AdminCharityPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: settings, isLoading } = useCharitySettings()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    abn: '',
    dgr_status: 'no',
    charity_subtype: '',
    registration_date: '',
    charity_name: 'Co-Exist Australia',
    acnc_registration_number: '',
  })

  useEffect(() => {
    if (settings) {
      setForm({
        abn: settings.abn ?? '',
        dgr_status: settings.dgr_status ?? 'no',
        charity_subtype: settings.charity_subtype ?? '',
        registration_date: settings.registration_date ?? '',
        charity_name: settings.charity_name ?? 'Co-Exist Australia',
        acnc_registration_number: settings.acnc_registration_number ?? '',
      })
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Upsert each key-value pair
      const entries = Object.entries(form)
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from('charity_settings' as any)
          .upsert({ key, value }, { onConflict: 'key' })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charity-settings'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
    onError: () => toast.error('Failed to save charity settings'),
  })

  if (isLoading) {
    return (
      <AdminLayout title="Charity Settings">
        <div className="space-y-4 max-w-xl">
          <Skeleton variant="text" count={6} />
        </div>
      </AdminLayout>
    )
  }

  const shouldReduceMotion = useReducedMotion()

  return (
    <AdminLayout title="Charity Settings">
      <motion.div
        className="max-w-xl space-y-6"
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Info banner */}
        <div className="p-4 rounded-xl bg-white border border-primary-200">
          <div className="flex items-start gap-3">
            <Heart size={18} className="text-primary-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-primary-900">
                ACNC Charity Details
              </h3>
              <p className="text-xs text-primary-400 mt-1">
                These details are used in official reports, donation receipts, and compliance
                documents. Ensure they are accurate and up to date.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            label="Charity Name"
            value={form.charity_name}
            onChange={(e) => setForm((p) => ({ ...p, charity_name: e.target.value }))}
          />

          <Input
            label="ABN (Australian Business Number)"
            value={form.abn}
            onChange={(e) => setForm((p) => ({ ...p, abn: e.target.value }))}
            placeholder="XX XXX XXX XXX"
          />

          <Input
            label="ACNC Registration Number"
            value={form.acnc_registration_number}
            onChange={(e) =>
              setForm((p) => ({ ...p, acnc_registration_number: e.target.value }))
            }
          />

          <Dropdown
            options={[
              { value: 'no', label: 'Not DGR endorsed' },
              { value: 'yes', label: 'DGR endorsed' },
              { value: 'pending', label: 'DGR application pending' },
            ]}
            value={form.dgr_status}
            onChange={(v) => setForm((p) => ({ ...p, dgr_status: v }))}
            label="DGR Status (Deductible Gift Recipient)"
          />

          <Input
            label="Charity Subtype"
            value={form.charity_subtype}
            onChange={(e) => setForm((p) => ({ ...p, charity_subtype: e.target.value }))}
            placeholder="e.g. Advancing natural environment"
          />

          <Input
            label="Registration Date"
            value={form.registration_date}
            onChange={(e) =>
              setForm((p) => ({ ...p, registration_date: e.target.value }))
            }
            placeholder="YYYY-MM-DD"
          />
        </div>

        {/* Save */}
        <Button
          variant="primary"
          icon={saved ? <CheckCircle size={16} /> : <Save size={16} />}
          onClick={() => saveMutation.mutate()}
          loading={saveMutation.isPending}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </motion.div>
    </AdminLayout>
  )
}
