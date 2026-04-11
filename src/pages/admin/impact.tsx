import { useState, useMemo, useRef, useCallback, type ReactNode } from 'react'
import { motion, useReducedMotion, useInView, AnimatePresence } from 'framer-motion'
import {
  TreePine,
  Trash2,
  Clock,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Database,
  AlertTriangle,
  Leaf,
  Users,
  Sprout,
  Waves,
  Eye,
  Ruler,
  Sparkles,
  Droplets,
  Mountain,
  Flower2,
  Bug,
  Flame,
  Fish,
  Wind,
  Plus,
  Save,
  GripVertical,
  Pencil,
  X,
  Trash2 as TrashIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStat, AdminHeroStatRow, type HeroStatColor } from '@/components/admin-hero-stat'
import { Dropdown } from '@/components/dropdown'
import { SearchBar } from '@/components/search-bar'
import { Badge } from '@/components/badge'
import { TabBar } from '@/components/tab-bar'
import { adminVariants } from '@/lib/admin-motion'
import { cn } from '@/lib/cn'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import {
  useImpactObservations,
  useYearOverYear,
  useImpactDataQuality,
  useEventsMissingImpact,
  type ObservationFilters,
  type CollectiveBreakdown,
  type EventImpactRow,
  type YearSummary,
} from '@/hooks/use-admin-impact-observations'
import {
  useImpactMetricDefs,
  useAllImpactMetricDefs,
  useUpsertMetricDef,
  useDeleteMetricDef,
  useReorderMetricDefs,
} from '@/hooks/use-impact-metric-defs'
import type { ImpactMetricDef } from '@/lib/impact-metrics'
import { isBuiltinMetric } from '@/lib/impact-metrics'
import { dateRangeOptions, type DateRange } from '@/hooks/use-admin-dashboard'
import { ACTIVITY_TYPE_OPTIONS, ACTIVITY_TYPE_LABELS } from '@/hooks/use-events'
import { useCollectives } from '@/hooks/use-collective'
import { useNotifyLeadersForImpactForm } from '@/hooks/use-impact-form-tasks'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Icon registry                                                       */
/* ------------------------------------------------------------------ */

const METRIC_ICONS: Record<string, (size: number) => ReactNode> = {
  tree:     (s) => <TreePine size={s} />,
  leaf:     (s) => <Leaf size={s} />,
  weed:     (s) => <Sprout size={s} />,
  trash:    (s) => <Trash2 size={s} />,
  wave:     (s) => <Waves size={s} />,
  eye:      (s) => <Eye size={s} />,
  area:     (s) => <Ruler size={s} />,
  clock:    (s) => <Clock size={s} />,
  sparkle:  (s) => <Sparkles size={s} />,
  droplet:  (s) => <Droplets size={s} />,
  mountain: (s) => <Mountain size={s} />,
  flower:   (s) => <Flower2 size={s} />,
  bug:      (s) => <Bug size={s} />,
  flame:    (s) => <Flame size={s} />,
  fish:     (s) => <Fish size={s} />,
  wind:     (s) => <Wind size={s} />,
}

const iconComponents: Record<string, ReactNode> = {
  tree: <TreePine size={16} className="text-success-600" />,
  trash: <TrashIcon size={16} className="text-error-500" />,
  wave: <Waves size={16} className="text-info-500" />,
  leaf: <Leaf size={16} className="text-primary-500" />,
  eye: <Eye size={16} className="text-warning-500" />,
  area: <Ruler size={16} className="text-plum-500" />,
  weed: <Sprout size={16} className="text-moss-600" />,
  clock: <Clock size={16} className="text-neutral-400" />,
  sparkle: <Sparkles size={16} className="text-warning-400" />,
  droplet: <Droplets size={16} className="text-info-400" />,
  mountain: <Mountain size={16} className="text-bark-500" />,
  flower: <Flower2 size={16} className="text-primary-500" />,
  bug: <Bug size={16} className="text-moss-500" />,
  flame: <Flame size={16} className="text-error-400" />,
  fish: <Fish size={16} className="text-info-600" />,
  wind: <Wind size={16} className="text-neutral-400" />,
}

function metricIcon(def: ImpactMetricDef, size = 18): ReactNode {
  return (METRIC_ICONS[def.icon] ?? METRIC_ICONS.leaf)(size)
}

/** Map metric icon keys to hero stat color presets */
const ICON_TO_COLOR: Record<string, HeroStatColor> = {
  tree: 'moss', leaf: 'sprout', weed: 'sprout', trash: 'sky',
  wave: 'info', eye: 'warning', area: 'plum', clock: 'bark',
  sparkle: 'warning', droplet: 'info', mountain: 'bark',
  flower: 'primary', bug: 'moss', flame: 'coral', fish: 'info', wind: 'primary',
}

/** Map metric icon keys to bar chart gradient classes */
const ICON_TO_BAR: Record<string, string> = {
  tree: 'from-moss-400 to-moss-500', leaf: 'from-sprout-400 to-sprout-500',
  weed: 'from-sprout-400 to-sprout-500', trash: 'from-sky-400 to-sky-500',
  wave: 'from-info-400 to-info-500', eye: 'from-warning-400 to-warning-500',
  area: 'from-plum-400 to-plum-500', clock: 'from-bark-400 to-bark-500',
  sparkle: 'from-warning-400 to-warning-500', droplet: 'from-info-400 to-info-500',
  mountain: 'from-bark-400 to-bark-500', flower: 'from-primary-400 to-primary-500',
  bug: 'from-moss-400 to-moss-500', flame: 'from-coral-400 to-coral-500',
  fish: 'from-info-400 to-info-500', wind: 'from-primary-400 to-primary-500',
}

/* ------------------------------------------------------------------ */
/*  Metric form options                                                 */
/* ------------------------------------------------------------------ */

const ICON_OPTIONS = [
  { value: 'tree', label: 'Tree' },
  { value: 'leaf', label: 'Leaf' },
  { value: 'weed', label: 'Sprout' },
  { value: 'trash', label: 'Trash' },
  { value: 'area', label: 'Ruler' },
  { value: 'eye', label: 'Eye' },
  { value: 'wave', label: 'Wave' },
  { value: 'clock', label: 'Clock' },
  { value: 'sparkle', label: 'Sparkle' },
  { value: 'droplet', label: 'Droplet' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'flower', label: 'Flower' },
  { value: 'bug', label: 'Bug' },
  { value: 'flame', label: 'Flame' },
  { value: 'fish', label: 'Fish' },
  { value: 'wind', label: 'Wind' },
]

const emptyForm = (): Partial<ImpactMetricDef> & { key: string } => ({
  key: '',
  label: '',
  unit: '',
  icon: 'leaf',
  decimal: false,
  is_active: true,
  survey_linkable: true,
})

/* ------------------------------------------------------------------ */
/*  Dashboard helpers                                                   */
/* ------------------------------------------------------------------ */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMetric(val: number | null, def: ImpactMetricDef): string {
  if (val == null || val === 0) return '-'
  const s = def.decimal
    ? val.toLocaleString('en-AU', { maximumFractionDigits: 1 })
    : val.toLocaleString('en-AU')
  return def.unit ? `${s} ${def.unit}` : s
}

function fmtNum(n: number | null) {
  if (n == null || n === 0) return '-'
  return n.toLocaleString('en-AU')
}

function activityToBadge(type: string) {
  return type.replace(/_/g, '-') as Parameters<typeof Badge>[0] extends { activity: infer A } ? A : never
}

/* ------------------------------------------------------------------ */
/*  Sort                                                               */
/* ------------------------------------------------------------------ */

type SortDir = 'asc' | 'desc'

function sortRows(rows: EventImpactRow[], field: string, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'date': return m * (new Date(a.date).getTime() - new Date(b.date).getTime())
      case 'title': return m * a.title.localeCompare(b.title)
      case 'collective': return m * a.collectiveName.localeCompare(b.collectiveName)
      case 'hours': return m * ((a.estimatedVolHours ?? 0) - (b.estimatedVolHours ?? 0))
      default: return m * ((a.metrics[field] ?? 0) - (b.metrics[field] ?? 0))
    }
  })
}

function sortCollectives(rows: CollectiveBreakdown[], field: string, dir: SortDir) {
  const m = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    switch (field) {
      case 'name': return m * a.name.localeCompare(b.name)
      case 'events': return m * (a.eventCount - b.eventCount)
      case 'attendees': return m * (a.attendees - b.attendees)
      case 'hours': return m * (a.estimatedHours - b.estimatedHours)
      default: return m * ((a.metrics[field] ?? 0) - (b.metrics[field] ?? 0))
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Sortable header cell                                               */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
  className,
}: {
  label: string
  field: string
  currentField: string
  currentDir: SortDir
  onSort: (f: string) => void
  className?: string
}) {
  const active = currentField === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer select-none',
        active ? 'text-neutral-700' : 'text-neutral-400 hover:text-neutral-600',
        className,
      )}
    >
      {label}
      {active && (currentDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Year-over-year chart                                               */
/* ------------------------------------------------------------------ */

function YoYChart({ data, defs, rm }: { data: YearSummary[]; defs: ImpactMetricDef[]; rm: boolean }) {
  const metricTotals = defs.map((d) => ({
    def: d,
    total: data.reduce((s, y) => s + (y.metrics[d.key] ?? 0), 0),
  })).filter((m) => m.total > 0).sort((a, b) => b.total - a.total)

  const topMetrics = metricTotals.slice(0, 3)

  const bars: { key: string; label: string; color: string; unit: string; getValue: (y: YearSummary) => number }[] = [
    { key: '_attendees', label: 'Attendees', color: 'from-warning-400 to-warning-500', unit: '', getValue: (y) => y.attendees },
    ...topMetrics.map((m) => ({
      key: m.def.key,
      label: m.def.label,
      color: ICON_TO_BAR[m.def.icon] ?? 'from-primary-400 to-primary-500',
      unit: m.def.unit,
      getValue: (y: YearSummary) => y.metrics[m.def.key] ?? 0,
    })),
    { key: '_hours', label: 'Est. Vol Hours', color: 'from-bark-400 to-bark-500', unit: '', getValue: (y) => y.estimatedHours },
  ]

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-neutral-100 p-5">
      <h3 className="font-heading text-sm font-semibold text-neutral-900 mb-5">
        Year-over-Year Impact
      </h3>
      <div className="space-y-4">
        {data.map((d) => (
          <div key={d.year}>
            <span className="text-xs font-bold text-neutral-600 tabular-nums">{d.year}</span>
            <span className="text-[10px] text-neutral-400 ml-2">{d.events} events</span>
            <div className="mt-1.5 space-y-1">
              {bars.map((bar) => {
                const val = bar.getValue(d)
                const max = Math.max(...data.map((x) => bar.getValue(x)), 1)
                return (
                  <div key={bar.key} className="flex items-center gap-2">
                    <div className="w-20 text-[10px] text-neutral-400 text-right truncate">{bar.label}</div>
                    <div className="flex-1 h-3.5 bg-neutral-50 rounded-full overflow-hidden">
                      <motion.div
                        className={cn('h-full rounded-full bg-gradient-to-r', bar.color)}
                        initial={rm ? { width: `${(val / max) * 100}%` } : { width: 0 }}
                        animate={{ width: `${Math.max((val / max) * 100, val > 0 ? 2 : 0)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="w-16 text-[11px] font-semibold text-neutral-700 tabular-nums text-right">
                      {val > 0 ? `${val.toLocaleString()}${bar.unit ? ` ${bar.unit}` : ''}` : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Data quality panel                                                 */
/* ------------------------------------------------------------------ */

function DataQualityPanel() {
  const { data } = useImpactDataQuality()
  if (!data) return null

  const total = data.legacyCount + data.appCount
  const legacyPct = total > 0 ? Math.round((data.legacyCount / total) * 100) : 0

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-neutral-100 p-5">
      <h3 className="flex items-center gap-2 font-heading text-sm font-semibold text-neutral-900 mb-4">
        <Database size={16} className="text-neutral-400" />
        Data Quality
      </h3>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-neutral-500 font-medium">Data Source</span>
            <span className="text-neutral-400">{total} impact logs</span>
          </div>

          <div className="flex h-3 rounded-full overflow-hidden bg-neutral-50">
            <div
              className="bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-500"
              style={{ width: `${legacyPct}%` }}
            />
            <div
              className="bg-gradient-to-r from-sprout-400 to-sprout-500 transition-all duration-500"
              style={{ width: `${100 - legacyPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary-400" />
              <span className="text-neutral-500">Legacy ({data.legacyCount})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sprout-400" />
              <span className="text-neutral-500">App ({data.appCount})</span>
            </span>
          </div>
        </div>

        {data.eventsWithoutImpact > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-50 border border-warning-200/50">
            <AlertTriangle size={14} className="text-warning-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-warning-700">
                {data.eventsWithoutImpact} completed event{data.eventsWithoutImpact !== 1 ? 's' : ''} without impact logs
              </p>
              <p className="text-[11px] text-warning-500 mt-0.5">Leaders haven't submitted impact data yet</p>
            </div>
          </div>
        )}

        {data.zeroMetricEvents > 0 && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
            <Leaf size={14} className="text-neutral-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-neutral-600">
                {data.zeroMetricEvents} log{data.zeroMetricEvents !== 1 ? 's' : ''} with all metrics at zero
              </p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Recreational events or missing data entry</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Metric form (inline add/edit)                                      */
/* ------------------------------------------------------------------ */

function MetricForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  form: Partial<ImpactMetricDef> & { key: string }
  onChange: (f: Partial<ImpactMetricDef> & { key: string }) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew: boolean
}) {
  const isBuiltin = isBuiltinMetric(form.key)

  return (
    <div className="rounded-xl bg-white border-2 border-neutral-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">
          {isNew ? 'Add Metric' : 'Edit Metric'}
        </h3>
        <button
          onClick={onCancel}
          className="min-w-8 min-h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Key (snake_case)"
          value={form.key}
          onChange={(e) => onChange({ ...form, key: e.target.value })}
          placeholder="e.g. coral_fragments"
          disabled={!isNew || isBuiltin}
        />
        <Input
          label="Label"
          value={form.label ?? ''}
          onChange={(e) => onChange({ ...form, label: e.target.value })}
          placeholder="e.g. Coral Fragments"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Unit"
          value={form.unit ?? ''}
          onChange={(e) => onChange({ ...form, unit: e.target.value })}
          placeholder="e.g. fragments"
        />
        <Dropdown
          label="Icon"
          options={ICON_OPTIONS}
          value={form.icon ?? 'leaf'}
          onChange={(v) => onChange({ ...form, icon: v })}
        />
        <div className="space-y-2">
          <span className="text-xs font-medium text-neutral-500">Options</span>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.decimal ?? false}
                onChange={(e) => onChange({ ...form, decimal: e.target.checked })}
                className="rounded border-neutral-100"
              />
              Decimal values
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.survey_linkable ?? true}
                onChange={(e) => onChange({ ...form, survey_linkable: e.target.checked })}
                className="rounded border-neutral-100"
              />
              Survey-linkable
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button
          variant="primary"
          size="sm"
          icon={<Save size={14} />}
          loading={saving}
          onClick={onSave}
        >
          {isNew ? 'Add' : 'Save'}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Metrics tab content                                                */
/* ------------------------------------------------------------------ */

function MetricsTab() {
  const shouldReduceMotion = useReducedMotion()
  const av = adminVariants(!!shouldReduceMotion)
  const { toast } = useToast()

  const { data: defs, isLoading } = useAllImpactMetricDefs()
  const showLoading = useDelayedLoading(isLoading)
  const upsertMutation = useUpsertMetricDef()
  const deleteMutation = useDeleteMetricDef()
  const reorderMutation = useReorderMetricDefs()

  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<ReturnType<typeof emptyForm>>(emptyForm())
  const [showAdd, setShowAdd] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    title: string
    description: string
    confirmLabel: string
    onConfirm: () => void
  } | null>(null)

  const metrics = defs ?? []

  const startEdit = useCallback((def: ImpactMetricDef) => {
    setEditing(def.key)
    setForm({ ...def })
    setShowAdd(false)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditing(null)
    setForm(emptyForm())
    setShowAdd(false)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form.key || !form.label) {
      toast.error('Key and label are required')
      return
    }
    if (!/^[a-z][a-z0-9_]*$/.test(form.key)) {
      toast.error('Key must be lowercase alphanumeric with underscores (e.g. coral_fragments)')
      return
    }
    if (showAdd && isBuiltinMetric(form.key)) {
      toast.error(`"${form.key}" is a built-in metric - edit it instead of creating a new one`)
      return
    }
    try {
      await upsertMutation.mutateAsync({
        ...form,
        sort_order: form.sort_order ?? metrics.length,
      })
      toast.success(editing ? 'Metric updated' : 'Metric added')
      cancelEdit()
    } catch {
      toast.error('Failed to save metric')
    }
  }, [form, editing, metrics.length, upsertMutation, toast, cancelEdit, showAdd])

  const handleDelete = useCallback(async (key: string) => {
    if (isBuiltinMetric(key)) {
      toast.error('Built-in metrics cannot be deleted - toggle them inactive instead')
      return
    }

    const { data: linkedSurveys } = await supabase
      .from('surveys')
      .select('id, title, questions')
      .eq('status', 'active')

    const orphanedSurveys = (linkedSurveys ?? []).filter((s) => {
      const questions = Array.isArray(s.questions) ? s.questions : []
      return questions.some((q) => (q as Record<string, unknown>)?.impact_metric === key)
    })

    if (orphanedSurveys.length > 0) {
      const names = orphanedSurveys.map((s) => `"${s.title}"`).join(', ')
      setConfirmAction({
        title: 'Delete metric?',
        description: `${orphanedSurveys.length} active survey(s) still reference "${key}": ${names}. Deleting will cause those questions to silently stop recording impact data.`,
        confirmLabel: 'Delete anyway',
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(key)
            toast.success('Metric deleted')
          } catch {
            toast.error('Failed to delete metric')
          }
        },
      })
      return
    }

    try {
      await deleteMutation.mutateAsync(key)
      toast.success('Metric deleted')
    } catch {
      toast.error('Failed to delete metric')
    }
  }, [deleteMutation, toast])

  const handleToggleActive = useCallback(async (def: ImpactMetricDef) => {
    if (def.is_active) {
      const { data: linkedSurveys } = await supabase
        .from('surveys')
        .select('id, title, questions')
        .eq('status', 'active')

      const orphanedSurveys = (linkedSurveys ?? []).filter((s) => {
        const questions = Array.isArray(s.questions) ? s.questions : []
        return questions.some((q) => (q as Record<string, unknown>)?.impact_metric === def.key)
      })

      if (orphanedSurveys.length > 0) {
        const names = orphanedSurveys.map((s) => `"${s.title}"`).join(', ')
        setConfirmAction({
          title: 'Deactivate metric?',
          description: `${orphanedSurveys.length} active survey(s) still reference "${def.key}": ${names}. Deactivating will cause those questions to stop recording impact data.`,
          confirmLabel: 'Deactivate anyway',
          onConfirm: async () => {
            try {
              await upsertMutation.mutateAsync({ ...def, is_active: false })
            } catch {
              toast.error('Failed to update metric')
            }
          },
        })
        return
      }
    }

    try {
      await upsertMutation.mutateAsync({ ...def, is_active: !def.is_active })
    } catch {
      toast.error('Failed to update metric')
    }
  }, [upsertMutation, toast])

  const moveUp = useCallback(async (index: number) => {
    if (index === 0) return
    const newOrder = [...metrics]
    const [item] = newOrder.splice(index, 1)
    newOrder.splice(index - 1, 0, item)
    try {
      await reorderMutation.mutateAsync(newOrder.map((d) => d.key))
    } catch {
      toast.error('Failed to reorder')
    }
  }, [metrics, reorderMutation, toast])

  const moveDown = useCallback(async (index: number) => {
    if (index >= metrics.length - 1) return
    const newOrder = [...metrics]
    const [item] = newOrder.splice(index, 1)
    newOrder.splice(index + 1, 0, item)
    try {
      await reorderMutation.mutateAsync(newOrder.map((d) => d.key))
    } catch {
      toast.error('Failed to reorder')
    }
  }, [metrics, reorderMutation, toast])

  if (showLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton variant="text" count={6} />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={av.stagger}
      initial="hidden"
      animate="visible"
      className="w-full max-w-2xl mx-auto py-6 space-y-6"
    >
      <motion.div variants={av.fadeUp} className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          Configure which impact metrics are available across the app.
          Built-in metrics map to database columns. Custom metrics are stored in the event's custom data field.
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={16} />}
          onClick={() => {
            setShowAdd(true)
            setEditing(null)
            setForm(emptyForm())
          }}
        >
          Add Metric
        </Button>
      </motion.div>

      <AnimatePresence>
        {showAdd && !editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <MetricForm
              form={form}
              onChange={setForm}
              onSave={handleSave}
              onCancel={cancelEdit}
              saving={upsertMutation.isPending}
              isNew
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={av.fadeUp} className="space-y-2">
        {metrics.map((def, i) => (
          <div key={def.key}>
            {editing === def.key ? (
              <MetricForm
                form={form}
                onChange={setForm}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={upsertMutation.isPending}
                isNew={false}
              />
            ) : (
              <div
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-neutral-100',
                  !def.is_active && 'opacity-50',
                )}
              >
                <GripVertical size={14} className="text-neutral-300 shrink-0" />

                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 shrink-0">
                  {iconComponents[def.icon] ?? <Leaf size={16} className="text-primary-400" />}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-900 truncate">
                      {def.label}
                    </span>
                    {isBuiltinMetric(def.key) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-medium shrink-0">
                        built-in
                      </span>
                    )}
                    {!isBuiltinMetric(def.key) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-plum-100 text-plum-600 font-medium shrink-0">
                        custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400 truncate">
                    {def.key} · {def.unit}{def.decimal ? ' (decimal)' : ''}{!def.survey_linkable ? ' · not survey-linkable' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="min-w-8 min-h-8 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-600 disabled:opacity-30 cursor-pointer"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === metrics.length - 1}
                    className="min-w-8 min-h-8 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-600 disabled:opacity-30 cursor-pointer"
                    aria-label="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>

                  <Toggle
                    checked={def.is_active}
                    onChange={() => handleToggleActive(def)}
                    size="sm"
                    aria-label={`Toggle ${def.label}`}
                  />

                  <button
                    onClick={() => startEdit(def)}
                    className="min-w-8 min-h-8 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    aria-label={`Edit ${def.label}`}
                  >
                    <Pencil size={14} />
                  </button>

                  {!isBuiltinMetric(def.key) && (
                    <button
                      onClick={() => handleDelete(def.key)}
                      className="min-w-8 min-h-8 flex items-center justify-center rounded text-neutral-400 hover:text-error-500 cursor-pointer"
                      aria-label={`Delete ${def.label}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {metrics.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-8">
            No metrics configured. Add one to get started.
          </p>
        )}
      </motion.div>

      <motion.div variants={av.fadeUp} className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500 space-y-1">
        <p className="font-medium text-neutral-700">How it works</p>
        <p>Built-in metrics (trees planted, rubbish collected, etc.) are stored as dedicated database columns for fast aggregation.</p>
        <p>Custom metrics you add here are stored in a flexible data field on each event's impact log. They appear in the log-impact form, survey builder, and all dashboards automatically.</p>
        <p>Toggling a metric inactive hides it everywhere but preserves existing data.</p>
      </motion.div>

      <ConfirmationSheet
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.onConfirm()}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'Confirm'}
        variant="warning"
      />
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard tab content                                              */
/* ------------------------------------------------------------------ */

function DashboardTab() {
  const rm = !!useReducedMotion()
  const v = adminVariants(rm)

  const { activeDefs } = useImpactMetricDefs()

  const [dateRange, setDateRange] = useState<DateRange>('all')
  const [collectiveId, setCollectiveId] = useState<string>('')
  const [activityType, setActivityType] = useState<string>('')
  const [search, setSearch] = useState('')

  const filters: ObservationFilters = useMemo(
    () => ({
      dateRange,
      collectiveId: collectiveId || undefined,
      activityType: (activityType || undefined) as ObservationFilters['activityType'],
      search: search || undefined,
    }),
    [dateRange, collectiveId, activityType, search],
  )

  const { data, isLoading } = useImpactObservations(filters, activeDefs)
  const { data: yoyData } = useYearOverYear(activeDefs)
  const { data: collectives } = useCollectives({ includeNational: true })
  const { data: missingImpact } = useEventsMissingImpact()
  const notifyLeaders = useNotifyLeadersForImpactForm()
  const { toast } = useToast()
  const [nudgingEvent, setNudgingEvent] = useState<string | null>(null)
  const showLoading = useDelayedLoading(isLoading)

  const visibleDefs = useMemo(() => {
    if (!data) return activeDefs.filter((d) => d.key !== 'hours_total')
    return activeDefs.filter((d) =>
      d.key !== 'hours_total' && data.rows.some((r) => (r.metrics[d.key] ?? 0) > 0),
    )
  }, [activeDefs, data])

  const [eventSort, setEventSort] = useState('date')
  const [eventDir, setEventDir] = useState<SortDir>('desc')
  const [collSort, setCollSort] = useState('events')
  const [collDir, setCollDir] = useState<SortDir>('desc')
  const [showAllEvents, setShowAllEvents] = useState(false)

  const toggleSort = (field: string, current: string, setField: (f: string) => void, dir: SortDir, setDir: (d: SortDir) => void) => {
    if (current === field) setDir(dir === 'asc' ? 'desc' : 'asc')
    else { setField(field); setDir('desc') }
  }

  const sortedEvents = useMemo(
    () => (data ? sortRows(data.rows, eventSort, eventDir) : []),
    [data, eventSort, eventDir],
  )
  const displayEvents = showAllEvents ? sortedEvents : sortedEvents.slice(0, 50)

  const sortedCollectives = useMemo(() => {
    if (!data) return []
    const breakdown = new Map(data.collectiveBreakdown.map((c) => [c.collectiveId, c]))
    for (const c of collectives ?? []) {
      if (!breakdown.has(c.id)) {
        const metrics: Record<string, number> = {}
        for (const d of activeDefs) metrics[d.key] = 0
        breakdown.set(c.id, {
          collectiveId: c.id,
          name: c.name,
          eventCount: 0,
          attendees: 0,
          metrics,
          estimatedHours: 0,
        })
      }
    }
    return sortCollectives([...breakdown.values()], collSort, collDir)
  }, [data, collectives, activeDefs, collSort, collDir])

  const collectiveOptions = useMemo(
    () => [{ value: '', label: 'All Collectives' }, ...(collectives ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [collectives],
  )
  const activityOptions = useMemo(
    () => [{ value: '', label: 'All Types' }, ...ACTIVITY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))],
    [],
  )

  const chartRef = useRef<HTMLDivElement>(null)
  const chartInView = useInView(chartRef, { once: true, margin: '-60px' })

  if (showLoading) {
    return (
      <div className="px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-neutral-50 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-neutral-50 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="px-6 sm:px-8 py-6 space-y-8 pb-24"
      variants={v.stagger}
      initial="hidden"
      animate="visible"
    >
      {/* ── Filter bar ── */}
      <motion.div variants={v.fadeUp} className="flex flex-wrap items-center gap-3">
        <Dropdown options={dateRangeOptions} value={dateRange} onChange={(v) => setDateRange(v as DateRange)} className="w-36" />
        <Dropdown options={collectiveOptions} value={collectiveId} onChange={setCollectiveId} className="w-44" />
        <Dropdown options={activityOptions} value={activityType} onChange={setActivityType} className="w-40" />
        <SearchBar value={search} onChange={setSearch} placeholder="Search events..." compact className="flex-1 min-w-[160px]" />
      </motion.div>

      {/* ── Summary cards ── */}
      <motion.div variants={v.fadeUp}>
        <AdminHeroStatRow className="!max-w-none grid-cols-2 sm:!grid-cols-3 md:!grid-cols-4 lg:!grid-cols-5 xl:!grid-cols-6 2xl:!grid-cols-8">
          <AdminHeroStat value={data?.summary.totalEvents ?? 0} label="Events" icon={<BarChart3 size={18} />} color="primary" reducedMotion={rm} delay={0} />
          <AdminHeroStat value={data?.summary.totalAttendees ?? 0} label="Attendees" icon={<Users size={18} />} color="warning" reducedMotion={rm} delay={0.04} />
          {activeDefs.filter((d) => d.key !== 'hours_total').map((def, i) => {
            const val = data?.summary.metrics[def.key] ?? 0
            if (val === 0 && !data) return null
            return (
              <AdminHeroStat
                key={def.key}
                value={Math.round(val * (def.decimal ? 10 : 1)) / (def.decimal ? 10 : 1)}
                label={`${def.label}${def.unit ? ` (${def.unit})` : ''}`}
                icon={metricIcon(def)}
                color={ICON_TO_COLOR[def.icon] ?? 'glass'}
                reducedMotion={rm}
                delay={0.08 + i * 0.04}
              />
            )
          })}
          <AdminHeroStat value={data?.summary.totalEstimatedHours ?? 0} label="Est. Vol Hours" icon={<Clock size={18} />} color="bark" reducedMotion={rm} delay={0.08 + activeDefs.length * 0.04} />
        </AdminHeroStatRow>
      </motion.div>

      {/* ── Events missing impact ── */}
      {(missingImpact?.length ?? 0) > 0 && (
        <motion.div variants={v.fadeUp}>
          <div className="rounded-2xl bg-warning-50 border border-warning-200/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning-600 shrink-0" />
              <h3 className="text-sm font-semibold text-warning-800">
                {missingImpact!.length} event{missingImpact!.length !== 1 ? 's' : ''} missing impact data
              </h3>
            </div>
            <p className="text-xs text-warning-700">
              These events ended in the last 30 days but no leader has logged impact yet.
            </p>
            <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
              {missingImpact!.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/70">
                  <Link
                    to={`/events/${e.id}/impact`}
                    className="flex-1 min-w-0 hover:opacity-80 active:scale-[0.99] transition-all"
                  >
                    <p className="text-sm font-medium text-neutral-800 truncate">{e.title}</p>
                    <p className="text-[11px] text-neutral-400">
                      {e.collective_name ?? 'Unknown'} · {ACTIVITY_TYPE_LABELS[e.activity_type] ?? e.activity_type} · {e.days_since}d ago
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setNudgingEvent(e.id)
                      notifyLeaders.mutate(
                        { eventId: e.id, eventTitle: e.title, collectiveId: e.collective_id },
                        {
                          onSuccess: (result) => {
                            toast.success(`Reminder sent to ${result?.sent ?? 0} leader${(result?.sent ?? 0) !== 1 ? 's' : ''}`)
                            setNudgingEvent(null)
                          },
                          onError: () => {
                            toast.error('Failed to send reminder')
                            setNudgingEvent(null)
                          },
                        },
                      )
                    }}
                    disabled={nudgingEvent === e.id}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-warning-200 text-warning-800 hover:bg-warning-300 active:scale-[0.97] transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {nudgingEvent === e.id ? 'Sending...' : 'Nudge'}
                  </button>
                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                    e.days_since > 7 ? 'bg-error-100 text-error-700' : e.days_since > 3 ? 'bg-warning-100 text-warning-700' : 'bg-neutral-100 text-neutral-500',
                  )}>
                    {e.days_since}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Per-collective breakdown ── */}
      {sortedCollectives.length > 0 && (
        <motion.div variants={v.fadeUp}>
          <h2 className="font-heading text-[13px] font-bold text-neutral-700/60 uppercase tracking-widest mb-3">By Collective</h2>
          <div className="rounded-2xl bg-white shadow-sm border border-neutral-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-3 text-left">
                      <SortHeader label="Collective" field="name" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Events" field="events" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} className="justify-center" />
                    </th>
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Attendees" field="attendees" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} className="justify-center" />
                    </th>
                    {visibleDefs.map((def) => (
                      <th key={def.key} className="px-3 py-3 text-center">
                        <SortHeader
                          label={`${def.label}${def.unit ? ` (${def.unit})` : ''}`}
                          field={def.key}
                          currentField={collSort}
                          currentDir={collDir}
                          onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)}
                          className="justify-center"
                        />
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center">
                      <SortHeader label="Est. Hours" field="hours" currentField={collSort} currentDir={collDir} onSort={(f) => toggleSort(f, collSort, setCollSort, collDir, setCollDir)} className="justify-center" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCollectives.map((c) => (
                    <tr
                      key={c.collectiveId}
                      className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50 transition-colors cursor-pointer"
                      onClick={() => setCollectiveId(c.collectiveId)}
                    >
                      <td className="px-4 py-3 text-left font-semibold text-neutral-900 text-sm">{c.name}</td>
                      <td className="px-3 py-3 text-center font-medium text-neutral-900 tabular-nums">{c.eventCount}</td>
                      <td className="px-3 py-3 text-center font-medium text-neutral-900 tabular-nums">{fmtNum(c.attendees)}</td>
                      {visibleDefs.map((def) => (
                        <td key={def.key} className="px-3 py-3 text-center font-medium text-neutral-900 tabular-nums">
                          {fmtMetric(c.metrics[def.key] ?? 0, def)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-medium text-neutral-900 tabular-nums">{fmtNum(c.estimatedHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Event impact log ── */}
      <motion.div variants={v.fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-[13px] font-bold text-neutral-500/60 uppercase tracking-widest">Event Impact Log</h2>
          {sortedEvents.length > 0 && (
            <span className="text-xs text-neutral-500 font-medium">{sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="rounded-2xl bg-white shadow-sm border border-neutral-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="px-4 py-3 text-left">
                    <SortHeader label="Date" field="date" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} />
                  </th>
                  <th className="px-3 py-3 text-left min-w-[180px]">
                    <SortHeader label="Event" field="title" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} />
                  </th>
                  <th className="px-3 py-3 text-left">
                    <SortHeader label="Collective" field="collective" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Type</span>
                  </th>
                  {visibleDefs.map((def) => (
                    <th key={def.key} className="px-3 py-3 text-center">
                      <SortHeader
                        label={`${def.label}${def.unit ? ` (${def.unit})` : ''}`}
                        field={def.key}
                        currentField={eventSort}
                        currentDir={eventDir}
                        onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)}
                        className="justify-center"
                      />
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">
                    <SortHeader label="Est. Hours" field="hours" currentField={eventSort} currentDir={eventDir} onSort={(f) => toggleSort(f, eventSort, setEventSort, eventDir, setEventDir)} className="justify-center" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4 + visibleDefs.length + 1} className="px-4 py-12 text-center text-sm text-neutral-500">
                      No impact data matches your filters
                    </td>
                  </tr>
                ) : (
                  displayEvents.map((row) => (
                    <tr key={row.eventId} className="border-b border-neutral-50 last:border-b-0 hover:bg-neutral-50 transition-colors group">
                      <td className="px-4 py-3 text-xs text-neutral-500 tabular-nums whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/events/${row.eventId}`} className="text-sm font-medium text-neutral-900 hover:text-neutral-700 transition-colors line-clamp-1">
                            {row.title}
                          </Link>
                          <ExternalLink size={12} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          {row.isLegacy && <Badge variant="default" size="sm">Legacy</Badge>}
                        </div>
                        {row.attendance != null && <span className="text-[11px] text-neutral-500">{row.attendance} attendees</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">{row.collectiveName}</td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant="activity" activity={activityToBadge(row.activityType)} size="sm">
                          {ACTIVITY_TYPE_LABELS[row.activityType] ?? row.activityType}
                        </Badge>
                      </td>
                      {visibleDefs.map((def) => (
                        <td key={def.key} className="px-3 py-3 text-center font-medium text-neutral-900 tabular-nums">
                          {fmtMetric(row.metrics[def.key] ?? null, def)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-medium text-neutral-900 tabular-nums">
                        {row.estimatedVolHours != null ? `${row.estimatedVolHours.toLocaleString()} hrs` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!showAllEvents && sortedEvents.length > 50 && (
            <div className="border-t border-neutral-100 px-4 py-3 text-center">
              <button type="button" onClick={() => setShowAllEvents(true)} className="text-xs font-semibold text-primary-500 hover:text-primary-700 transition-colors cursor-pointer">
                Show all {sortedEvents.length} events
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Year-over-year + Data quality ── */}
      <div ref={chartRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {yoyData && yoyData.length > 0 && (
          <motion.div variants={v.fadeUp}>
            <YoYChart data={yoyData} defs={activeDefs} rm={rm || !chartInView} />
          </motion.div>
        )}
        <motion.div variants={v.fadeUp}>
          <DataQualityPanel />
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'metrics', label: 'Metrics' },
]

export default function AdminImpactPage() {
  useAdminHeader('Impact')
  const [tab, setTab] = useState('dashboard')

  return (
    <div>
      <div className="px-6 sm:px-8 pt-4 pb-0 border-b border-neutral-100">
        <TabBar tabs={TABS} activeTab={tab} onChange={setTab} aria-label="Impact sections" />
      </div>
      {tab === 'dashboard' ? <DashboardTab /> : <MetricsTab />}
    </div>
  )
}
