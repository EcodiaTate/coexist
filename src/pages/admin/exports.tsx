import { useState, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  Download,
  Users,
  CalendarDays,
  TreePine,
  ClipboardList,
  DollarSign,
  ShoppingBag,
  FileText,
  Receipt,
  BarChart3,
  Calendar,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Dropdown } from '@/components/dropdown'
import { Input } from '@/components/input'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Export types                                                       */
/* ------------------------------------------------------------------ */

interface ExportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  formats: ('csv' | 'pdf')[]
  color: string
}

const exportTypes: ExportType[] = [
  {
    id: 'members',
    title: 'Member List',
    description: 'Name, email, join date, events attended, total hours',
    icon: <Users size={20} />,
    formats: ['csv'],
    color: 'bg-primary-400/25 text-primary-900',
  },
  {
    id: 'attendance',
    title: 'Event Attendance',
    description: 'Per event: name, checked in Y/N, time',
    icon: <CalendarDays size={20} />,
    formats: ['csv'],
    color: 'bg-moss-400/25 text-moss-900',
  },
  {
    id: 'impact-pdf',
    title: 'Impact Report (Branded)',
    description: 'Branded template with charts and summary stats',
    icon: <TreePine size={20} />,
    formats: ['pdf'],
    color: 'bg-secondary-400/25 text-secondary-900',
  },
  {
    id: 'impact-csv',
    title: 'Impact Data (Raw)',
    description: 'Raw impact data per event for analysis',
    icon: <BarChart3 size={20} />,
    formats: ['csv'],
    color: 'bg-primary-400/30 text-primary-900',
  },
  {
    id: 'survey',
    title: 'Survey Results',
    description: 'All survey responses with question data',
    icon: <ClipboardList size={20} />,
    formats: ['csv'],
    color: 'bg-plum-400/25 text-plum-900',
  },
  {
    id: 'financial',
    title: 'Donation Report',
    description: 'All donations received with donor details',
    icon: <DollarSign size={20} />,
    formats: ['csv'],
    color: 'bg-bark-400/25 text-bark-900',
  },
  {
    id: 'orders',
    title: 'Merch Orders',
    description: 'Order list for fulfilment with shipping details',
    icon: <ShoppingBag size={20} />,
    formats: ['csv'],
    color: 'bg-moss-400/30 text-moss-900',
  },
  {
    id: 'charity-annual',
    title: 'Charity Annual Report',
    description: 'ACNC-formatted annual report for compliance',
    icon: <FileText size={20} />,
    formats: ['pdf'],
    color: 'bg-secondary-400/30 text-secondary-900',
  },
  {
    id: 'reconciliation',
    title: 'Financial Reconciliation',
    description: 'Compare Stripe payments vs Supabase records',
    icon: <Receipt size={20} />,
    formats: ['csv'],
    color: 'bg-bark-400/30 text-bark-900',
  },
  {
    id: 'gst',
    title: 'GST Report',
    description: 'Australian GST on merch sales, BAS-ready format',
    icon: <Receipt size={20} />,
    formats: ['csv'],
    color: 'bg-plum-400/30 text-plum-900',
  },
  {
    id: 'donation-tax',
    title: 'Donation Tax Report',
    description: 'Annual summary of tax-deductible donations per donor (DGR)',
    icon: <DollarSign size={20} />,
    formats: ['csv', 'pdf'],
    color: 'bg-primary-400/25 text-primary-900',
  },
]

const scopeOptions = [
  { value: 'national', label: 'National' },
  { value: 'collective', label: 'Specific Collective' },
]

/* ------------------------------------------------------------------ */
/*  CSV helpers                                                        */
/* ------------------------------------------------------------------ */

function escapeCsv(val: unknown): string {
  const s = String(val ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n')
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminExportsPage() {
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [scope, setScope] = useState('national')
  const [generating, setGenerating] = useState<string | null>(null)
  const { toast } = useToast()

  const heroStats = useMemo(() => (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Available Exports</p>
        <p className="text-xl font-bold text-white tabular-nums">{exportTypes.length}</p>
      </div>
    </div>
  ), [])

  useAdminHeader('Export Centre', { heroContent: heroStats })

  const handleExport = async (exportId: string, format: 'csv' | 'pdf') => {
    setGenerating(exportId)
    try {
      if (format === 'pdf') {
        const { data, error } = await supabase.functions.invoke('generate-pdf', {
          body: { exportId, dateStart, dateEnd, scope },
        })
        if (error) throw error
        if (data?.url) {
          window.open(data.url, '_blank')
        }
        toast.success('PDF generated')
        return
      }

      let csv = ''
      const fname = `co-exist-${exportId}-${new Date().toISOString().slice(0, 10)}.csv`

      if (exportId === 'members') {
        let query = supabase
          .from('profiles')
          .select('display_name, role, created_at')
          .order('created_at', { ascending: false })
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['Name', 'Role', 'Join Date'],
          ((data ?? []) as any[]).map((r: any) => [r.display_name, r.role, r.created_at]),
        )
      } else if (exportId === 'attendance') {
        let query = supabase
          .from('event_registrations')
          .select('event_id, user_id, checked_in, checked_in_at, events(title), profiles(display_name)' as any)
          .order('checked_in_at' as any, { ascending: false })
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['Event', 'Name', 'Checked In', 'Check-in Time'],
          (data ?? []).map((r: any) => [
            r.events?.title, r.profiles?.display_name,
            r.checked_in ? 'Yes' : 'No', r.checked_in_at ?? '',
          ]),
        )
      } else if (exportId === 'impact-csv') {
        let query = supabase
          .from('event_impact')
          .select('event_id, trees_planted, hours_total, rubbish_kg, coastline_cleaned_m, area_restored_sqm, native_plants, wildlife_sightings, logged_at, events(title)')
          .order('logged_at', { ascending: false })
        if (dateStart) query = query.gte('logged_at', dateStart)
        if (dateEnd) query = query.lte('logged_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['Event', 'Trees', 'Hours', 'Rubbish (kg)', 'Coastline (m)', 'Area Restored (m2)', 'Native Plants', 'Wildlife Sightings', 'Date'],
          (data ?? []).map((r: any) => [
            r.events?.title ?? r.event_id, r.trees_planted ?? 0,
            r.hours_total ?? 0, r.rubbish_kg ?? 0, r.coastline_cleaned_m ?? 0,
            r.area_restored_sqm ?? 0, r.native_plants ?? 0, r.wildlife_sightings ?? 0, r.logged_at,
          ]),
        )
      } else if (exportId === 'survey') {
        const { data, error } = await supabase
          .from('survey_responses')
          .select('id, survey_id, user_id, answers, created_at, surveys(title)' as any)
          .order('created_at', { ascending: false })
        if (error) throw error
        csv = toCsv(
          ['Response ID', 'Survey', 'User ID', 'Answers', 'Submitted'],
          (data ?? []).map((r: any) => [
            r.id, r.surveys?.title ?? r.survey_id, r.user_id, JSON.stringify(r.answers), r.created_at,
          ]),
        )
      } else if (exportId === 'financial') {
        let query = supabase
          .from('donations' as any)
          .select('id, amount_cents, currency, donor_name, donor_email, receipt_number, created_at')
          .order('created_at', { ascending: false })
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['ID', 'Amount', 'Currency', 'Donor Name', 'Donor Email', 'Receipt #', 'Date'],
          ((data ?? []) as any[]).map((r: any) => [
            r.id, ((r.amount_cents ?? 0) / 100).toFixed(2), r.currency ?? 'AUD',
            r.donor_name, r.donor_email, r.receipt_number, r.created_at,
          ]),
        )
      } else if (exportId === 'orders') {
        let query = supabase
          .from('merch_orders')
          .select('id, status, total_cents, shipping_name, shipping_address, shipping_city, shipping_state, shipping_postcode, created_at' as any)
          .order('created_at', { ascending: false })
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['Order ID', 'Status', 'Total', 'Name', 'Address', 'City', 'State', 'Postcode', 'Date'],
          ((data ?? []) as any[]).map((r: any) => [
            r.id, r.status, ((r.total_cents ?? 0) / 100).toFixed(2),
            r.shipping_name, r.shipping_address, r.shipping_city,
            r.shipping_state, r.shipping_postcode, r.created_at,
          ]),
        )
      } else if (exportId === 'reconciliation') {
        let query = supabase
          .from('payments' as any)
          .select('id, stripe_payment_id, amount_cents, status, type, created_at')
          .order('created_at', { ascending: false })
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['ID', 'Stripe Payment ID', 'Amount', 'Status', 'Type', 'Date'],
          ((data ?? []) as any[]).map((r: any) => [
            r.id, r.stripe_payment_id, ((r.amount_cents ?? 0) / 100).toFixed(2),
            r.status, r.type, r.created_at,
          ]),
        )
      } else if (exportId === 'gst') {
        let query = supabase
          .from('merch_orders')
          .select('id, total_cents, gst_cents, status, created_at' as any)
          .eq('status', 'completed' as any)
          .order('created_at', { ascending: false })
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        csv = toCsv(
          ['Order ID', 'Total (ex GST)', 'GST', 'Total (inc GST)', 'Date'],
          ((data ?? []) as any[]).map((r: any) => {
            const gst = (r.gst_cents ?? 0) / 100
            const total = (r.total_cents ?? 0) / 100
            return [r.id, (total - gst).toFixed(2), gst.toFixed(2), total.toFixed(2), r.created_at]
          }),
        )
      } else if (exportId === 'donation-tax') {
        let query = supabase
          .from('donations' as any)
          .select('donor_name, donor_email, amount_cents, receipt_number, created_at')
          .order('donor_email')
        if (dateStart) query = query.gte('created_at', dateStart)
        if (dateEnd) query = query.lte('created_at', dateEnd + 'T23:59:59')
        const { data, error } = await query
        if (error) throw error
        // Group by donor
        const byDonor: Record<string, { name: string; email: string; total: number; count: number }> = {}
        for (const d of (data ?? []) as any[]) {
          const key = d.donor_email ?? 'unknown'
          if (!byDonor[key]) byDonor[key] = { name: d.donor_name ?? '', email: key, total: 0, count: 0 }
          byDonor[key].total += (d.amount_cents ?? 0)
          byDonor[key].count++
        }
        csv = toCsv(
          ['Donor Name', 'Email', 'Total Donated', 'Donation Count'],
          Object.values(byDonor).map((d) => [d.name, d.email, (d.total / 100).toFixed(2), d.count]),
        )
      }

      if (!csv) {
        toast.error('No data to export')
        return
      }

      downloadCsv(csv, fname)
      toast.success('Export downloaded')
    } catch (err) {
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGenerating(null)
    }
  }

  const shouldReduceMotion = useReducedMotion()
  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <div>
      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="visible">
        {/* Filters */}
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 p-4 bg-white rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-primary-400 shrink-0">
            <Calendar size={16} />
            Filters:
          </div>
          <Input
            label="Start Date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="flex-1"
          />
          <Input
            label="End Date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            placeholder="YYYY-MM-DD"
            className="flex-1"
          />
          <Dropdown
            options={scopeOptions}
            value={scope}
            onChange={setScope}
            label="Scope"
            className="w-40"
          />
        </motion.div>

        {/* Export cards */}
        <motion.div variants={fadeUp}>
        <StaggeredList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {exportTypes.map((exp) => (
            <StaggeredItem
              key={exp.id}
              className={cn(
                'p-4 rounded-xl shadow-sm',
                exp.color.split(' ')[0],
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-lg shrink-0',
                    exp.color.split(' ')[0],
                    exp.color.split(' ')[1],
                  )}
                >
                  {exp.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-sm font-semibold text-primary-800">
                    {exp.title}
                  </h3>
                  <p className="text-xs text-primary-400 mt-0.5">
                    {exp.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                {exp.formats.map((format) => (
                  <Button
                    key={format}
                    variant="secondary"
                    size="sm"
                    icon={<Download size={14} />}
                    onClick={() => handleExport(exp.id, format)}
                    loading={generating === exp.id}
                  >
                    {format.toUpperCase()}
                  </Button>
                ))}
              </div>
            </StaggeredItem>
          ))}
        </StaggeredList>
        </motion.div>
      </motion.div>
    </div>
  )
}
