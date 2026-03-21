import { useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Heart,
  Save,
  CheckCircle,
  Building2,
  FileText,
  CalendarDays,
  Shield,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
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
  useAdminHeader('Charity Settings')
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: settings, isLoading } = useCharitySettings()
  const [saved, setSaved] = useState(false)
  const shouldReduceMotion = useReducedMotion()

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
      <div className="flex justify-center py-8">
        <div className="w-full max-w-2xl space-y-6">
          <Skeleton variant="text" count={3} />
          <Skeleton variant="text" count={4} />
        </div>
      </div>
    )
  }

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <div className="flex justify-center py-2 sm:py-6">
      <motion.div
        className="w-full max-w-2xl space-y-6"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Info banner */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100/60 p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Heart size={20} className="text-primary-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-primary-900">
                ACNC Charity Details
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-primary-600">
                These details are used in official reports, donation receipts, and compliance
                documents. Ensure they are accurate and up to date.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Organisation Identity */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Building2 size={16} className="text-primary-700" />
            </div>
            <h2 className="text-sm font-semibold tracking-wide text-primary-900 uppercase">
              Organisation
            </h2>
          </div>

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
          </div>
        </motion.div>

        {/* Registration Details */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <FileText size={16} className="text-primary-700" />
            </div>
            <h2 className="text-sm font-semibold tracking-wide text-primary-900 uppercase">
              Registration
            </h2>
          </div>

          <div className="space-y-4">
            <Input
              label="ACNC Registration Number"
              value={form.acnc_registration_number}
              onChange={(e) =>
                setForm((p) => ({ ...p, acnc_registration_number: e.target.value }))
              }
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
        </motion.div>

        {/* Tax Status */}
        <motion.div variants={fadeUp} className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <Shield size={16} className="text-primary-700" />
            </div>
            <h2 className="text-sm font-semibold tracking-wide text-primary-900 uppercase">
              Tax Status
            </h2>
          </div>

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
        </motion.div>

        {/* Save */}
        <motion.div variants={fadeUp} className="flex justify-end pb-4">
          <Button
            variant="primary"
            size="lg"
            icon={saved ? <CheckCircle size={18} /> : <Save size={18} />}
            onClick={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
