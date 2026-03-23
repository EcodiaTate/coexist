import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
    FileText,
    Download, BarChart3,
    Clock,
    Check, Mail
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { useAdminHeader, useIsAdminLayout } from '@/components/admin-layout'
import { useLeaderHeader, useIsLeaderLayout } from '@/components/leader-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { Toggle } from '@/components/toggle'
import { Chip } from '@/components/chip'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

type ReportType = 'collective' | 'national' | 'event' | 'annual' | 'donor'

const reportTypes: { value: ReportType; label: string; description: string }[] = [
  { value: 'collective', label: 'Collective Impact', description: 'Per-collective report with all impact metrics' },
  { value: 'national', label: 'National Impact', description: 'All collectives aggregated for board/grants' },
  { value: 'event', label: 'Per-Event', description: 'Individual event detail with attendees and impact' },
  { value: 'annual', label: 'Annual Charity (ACNC)', description: 'Formatted for registered charity annual reporting' },
  { value: 'donor', label: 'Donor Impact', description: 'How donations were used, linked to conservation outcomes' },
]

const datePresets = [
  { value: 'this-month', label: 'This Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-fy', label: 'Last Financial Year' },
  { value: 'custom', label: 'Custom Range' },
]

const scopeOptions = [
  { value: 'national', label: 'National' },
  { value: 'state', label: 'By State/Region' },
  { value: 'collective', label: 'Specific Collective' },
]

const impactMetrics = [
  'Event attendances',
  'Volunteer hours',
  'Trees planted',
  'Invasive weeds pulled',
  'Rubbish collected (tonnes)',
  'Cleanup events held',
  'Number of collectives',
  'Young adult leaders trained',
]

const tabs = [
  { id: 'builder', label: 'Report Builder', icon: <BarChart3 size={14} /> },
  { id: 'history', label: 'Report History', icon: <Clock size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useCollectivesList() {
  return useQuery({
    queryKey: ['collectives-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

function useReportHistory() {
  return useQuery({
    queryKey: ['report-history'],
    queryFn: async () => {
      // report_history table not yet created  return empty until migration is run
      return [] as any[]
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const isAdmin = useIsAdminLayout()
  const isLeader = useIsLeaderLayout()
  useAdminHeader('Reports')
  useLeaderHeader('Reports')
  const shouldReduceMotion = useReducedMotion()
  const [activeTab, setActiveTab] = useState('builder')
  const [reportType, setReportType] = useState<ReportType>('collective')
  const [datePreset, setDatePreset] = useState('this-month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [scope, setScope] = useState('national')
  const [selectedCollective, setSelectedCollective] = useState('')
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(impactMetrics),
  )
  const [scheduleRecurring, setScheduleRecurring] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [generating, setGenerating] = useState(false)

  const { data: collectives } = useCollectivesList()
  const { data: history, isLoading: historyLoading } = useReportHistory()
  const showHistoryLoading = useDelayedLoading(historyLoading)

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) => {
      const next = new Set(prev)
      if (next.has(metric)) next.delete(metric)
      else next.add(metric)
      return next
    })
  }

  const generateReport = async (format: 'pdf' | 'csv') => {
    setGenerating(true)
    try {
      // In production: call edge function to generate report
      // For now, simulate CSV download
      if (format === 'csv') {
        const csv = 'Metric,Value\n' + Array.from(selectedMetrics).map((m) => `${m},0`).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `co-exist-report-${reportType}-${datePreset}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
      // TODO: Log report generation once report_history table is created
    } finally {
      setGenerating(false)
    }
  }

  const content = (
      <motion.div
        className="py-4 space-y-4 pb-8"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp}>
          <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
        </motion.div>

        {activeTab === 'builder' && (
          <div className="space-y-6">
            {/* Report type */}
            <motion.section variants={fadeUp}>
              <h2 className="font-heading text-sm font-semibold text-primary-800 mb-2">
                Report Type
              </h2>
              <div className="space-y-2">
                {reportTypes.map((rt) => (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setReportType(rt.value)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-xl text-left min-h-11',
                      'active:scale-[0.97] transition-all duration-150 cursor-pointer select-none',
                      reportType === rt.value
                        ? 'bg-white ring-1 ring-primary-300 shadow-sm'
                        : 'bg-white shadow-sm hover:bg-primary-50',
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-5 h-5 rounded-full border-2 mt-0.5 shrink-0',
                        reportType === rt.value
                          ? 'border-primary-600 bg-primary-800'
                          : 'border-primary-200',
                      )}
                    >
                      {reportType === rt.value && (
                        <Check size={12} className="text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary-800">{rt.label}</p>
                      <p className="text-xs text-primary-400 mt-0.5">{rt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>

            {/* Date range */}
            <motion.section variants={fadeUp}>
              <h2 className="font-heading text-sm font-semibold text-primary-800 mb-2">
                Date Range
              </h2>
              <Dropdown
                options={datePresets}
                value={datePreset}
                onChange={setDatePreset}
              />
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input
                    label="Start Date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                  <Input
                    label="End Date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
              )}
            </motion.section>

            {/* Scope */}
            <motion.section variants={fadeUp}>
              <h2 className="font-heading text-sm font-semibold text-primary-800 mb-2">
                Scope
              </h2>
              <Dropdown
                options={scopeOptions}
                value={scope}
                onChange={setScope}
              />
              {scope === 'collective' && collectives && (
                <Dropdown
                  options={collectives.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                  value={selectedCollective}
                  onChange={setSelectedCollective}
                  placeholder="Select collective..."
                  className="mt-3"
                />
              )}
            </motion.section>

            {/* Metric selector */}
            <motion.section variants={fadeUp}>
              <h2 className="font-heading text-sm font-semibold text-primary-800 mb-2">
                Metrics to Include
              </h2>
              <div className="flex flex-wrap gap-2">
                {impactMetrics.map((metric) => (
                  <Chip
                    key={metric}
                    label={metric}
                    selected={selectedMetrics.has(metric)}
                    onSelect={() => toggleMetric(metric)}
                  />
                ))}
              </div>
            </motion.section>

            {/* Schedule */}
            <motion.section variants={fadeUp}>
              <Toggle
                checked={scheduleRecurring}
                onChange={setScheduleRecurring}
                label="Schedule recurring report"
                description="Email this report monthly to the board"
              />
              {scheduleRecurring && (
                <div className="mt-3 p-3 rounded-lg bg-white">
                  <p className="text-xs text-primary-400 flex items-center gap-1">
                    <Mail size={12} />
                    Monthly email will be sent to registered board members
                  </p>
                </div>
              )}
            </motion.section>

            {/* Export buttons */}
            <motion.div variants={fadeUp} className="flex gap-3">
              <Button
                variant="primary"
                icon={<Download size={16} />}
                onClick={() => generateReport('pdf')}
                loading={generating}
              >
                Export PDF
              </Button>
              <Button
                variant="secondary"
                icon={<Download size={16} />}
                onClick={() => generateReport('csv')}
                loading={generating}
              >
                Export CSV
              </Button>
            </motion.div>
          </div>
        )}

        {activeTab === 'history' && (
          <>
            {showHistoryLoading ? (
              <Skeleton variant="list-item" count={5} />
            ) : historyLoading ? null : !history?.length ? (
              <EmptyState
                illustration="empty"
                title="No reports generated"
                description="Generated reports will appear here"
                action={{ label: 'Build a Report', onClick: () => setActiveTab('builder') }}
              />
            ) : (
              <StaggeredList className="space-y-2">
                {history.map((report) => (
                  <StaggeredItem
                    key={report.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-100 shrink-0">
                      <FileText size={16} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary-800 capitalize truncate">
                        {report.report_type?.replace(/_/g, ' ')} Report
                      </p>
                      <p className="text-xs text-primary-400 mt-0.5">
                        {report.scope} &middot; {report.date_range} &middot;{' '}
                        {report.format?.toUpperCase()} &middot;{' '}
                        {new Date(report.created_at).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" icon={<Download size={14} />}>
                      Re-download
                    </Button>
                  </StaggeredItem>
                ))}
              </StaggeredList>
            )}
          </>
        )}
      </motion.div>
  )

  if (isAdmin || isLeader) return content

  return (
    <Page swipeBack header={<Header title="Impact Reports" back />}>
      {content}
    </Page>
  )
}
