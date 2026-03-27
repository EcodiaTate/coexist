import { useState, useCallback } from 'react'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { adminVariants as getAdminVariants } from '@/lib/admin-motion'
import {
    Plus,
    Save,
    GripVertical,
    ChevronUp,
    ChevronDown,
    Trash2,
    Pencil,
    X,
    TreePine,
    Trash2 as TrashIcon,
    Waves,
    Leaf,
    Eye,
    Ruler,
    Sprout,
    Clock,
    Sparkles,
    Droplets,
    Mountain,
    Flower2,
    Bug,
    Flame,
    Fish,
    Wind,
} from 'lucide-react'
import {
    useAllImpactMetricDefs,
    useUpsertMetricDef,
    useDeleteMetricDef,
    useReorderMetricDefs,
} from '@/hooks/use-impact-metric-defs'
import { isBuiltinMetric } from '@/lib/impact-metrics'
import type { ImpactMetricDef } from '@/lib/impact-metrics'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------ */
/*  Icon options for the dropdown                                      */
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

const iconComponents: Record<string, React.ReactNode> = {
  tree: <TreePine size={16} className="text-success-600" />,
  trash: <TrashIcon size={16} className="text-error-500" />,
  wave: <Waves size={16} className="text-info-500" />,
  leaf: <Leaf size={16} className="text-primary-500" />,
  eye: <Eye size={16} className="text-warning-500" />,
  area: <Ruler size={16} className="text-plum-500" />,
  weed: <Sprout size={16} className="text-moss-600" />,
  clock: <Clock size={16} className="text-primary-400" />,
  sparkle: <Sparkles size={16} className="text-warning-400" />,
  droplet: <Droplets size={16} className="text-info-400" />,
  mountain: <Mountain size={16} className="text-bark-500" />,
  flower: <Flower2 size={16} className="text-primary-500" />,
  bug: <Bug size={16} className="text-moss-500" />,
  flame: <Flame size={16} className="text-error-400" />,
  fish: <Fish size={16} className="text-info-600" />,
  wind: <Wind size={16} className="text-primary-300" />,
}

/* ------------------------------------------------------------------ */
/*  Empty form state                                                   */
/* ------------------------------------------------------------------ */

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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminImpactMetricsPage() {
  useAdminHeader('Impact Metrics')
  const shouldReduceMotion = useReducedMotion()
  const adminVariants = getAdminVariants(!!shouldReduceMotion)
  const { toast } = useToast()

  const { data: defs, isLoading } = useAllImpactMetricDefs()
  const showLoading = useDelayedLoading(isLoading)
  const upsertMutation = useUpsertMetricDef()
  const deleteMutation = useDeleteMetricDef()
  const reorderMutation = useReorderMetricDefs()

  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<ReturnType<typeof emptyForm>>(emptyForm())
  const [showAdd, setShowAdd] = useState(false)

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
    // Validate key format
    if (!/^[a-z][a-z0-9_]*$/.test(form.key)) {
      toast.error('Key must be lowercase alphanumeric with underscores (e.g. coral_fragments)')
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
  }, [form, editing, metrics.length, upsertMutation, toast, cancelEdit])

  const handleDelete = useCallback(async (key: string) => {
    if (isBuiltinMetric(key)) {
      toast.error('Built-in metrics cannot be deleted - toggle them inactive instead')
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
    try {
      await upsertMutation.mutateAsync({
        key: def.key,
        is_active: !def.is_active,
      })
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
      variants={adminVariants.stagger}
      initial="hidden"
      animate="visible"
      className="w-full max-w-2xl mx-auto py-6 space-y-6"
    >
      {/* Header */}
      <motion.div variants={adminVariants.fadeUp} className="flex items-center justify-between">
        <div>
          <p className="text-sm text-primary-400">
            Configure which impact metrics are available across the app.
            Built-in metrics map to database columns. Custom metrics are stored in the event's custom data field.
          </p>
        </div>
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

      {/* Add form */}
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

      {/* Metric list */}
      <motion.div variants={adminVariants.fadeUp} className="space-y-2">
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
                  'flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-primary-100/40',
                  !def.is_active && 'opacity-50',
                )}
              >
                <GripVertical size={14} className="text-primary-300 shrink-0" />

                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 shrink-0">
                  {iconComponents[def.icon] ?? <Leaf size={16} className="text-primary-400" />}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-primary-800 truncate">
                      {def.label}
                    </span>
                    {isBuiltinMetric(def.key) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-500 font-medium shrink-0">
                        built-in
                      </span>
                    )}
                    {!isBuiltinMetric(def.key) && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-plum-100 text-plum-600 font-medium shrink-0">
                        custom
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-primary-400 truncate">
                    {def.key} · {def.unit}{def.decimal ? ' (decimal)' : ''}{!def.survey_linkable ? ' · not survey-linkable' : ''}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    className="min-w-8 min-h-8 flex items-center justify-center rounded text-primary-400 hover:text-primary-600 disabled:opacity-30 cursor-pointer"
                    aria-label="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === metrics.length - 1}
                    className="min-w-8 min-h-8 flex items-center justify-center rounded text-primary-400 hover:text-primary-600 disabled:opacity-30 cursor-pointer"
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
                    className="min-w-8 min-h-8 flex items-center justify-center rounded text-primary-400 hover:text-primary-600 cursor-pointer"
                    aria-label={`Edit ${def.label}`}
                  >
                    <Pencil size={14} />
                  </button>

                  {!isBuiltinMetric(def.key) && (
                    <button
                      onClick={() => handleDelete(def.key)}
                      className="min-w-8 min-h-8 flex items-center justify-center rounded text-primary-400 hover:text-error-500 cursor-pointer"
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
          <p className="text-sm text-primary-400 text-center py-8">
            No metrics configured. Add one to get started.
          </p>
        )}
      </motion.div>

      {/* Info */}
      <motion.div variants={adminVariants.fadeUp} className="rounded-xl bg-primary-50/60 p-4 text-sm text-primary-500 space-y-1">
        <p className="font-medium text-primary-700">How it works</p>
        <p>Built-in metrics (trees planted, rubbish collected, etc.) are stored as dedicated database columns for fast aggregation.</p>
        <p>Custom metrics you add here are stored in a flexible data field on each event's impact log. They appear in the log-impact form, survey builder, and all dashboards automatically.</p>
        <p>Toggling a metric inactive hides it everywhere but preserves existing data.</p>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Inline edit / add form                                             */
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
    <div className="rounded-xl bg-white border-2 border-primary-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary-800">
          {isNew ? 'Add Metric' : 'Edit Metric'}
        </h3>
        <button
          onClick={onCancel}
          className="min-w-8 min-h-8 flex items-center justify-center text-primary-400 hover:text-primary-600 cursor-pointer"
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
          <span className="text-xs font-medium text-primary-500">Options</span>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-primary-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.decimal ?? false}
                onChange={(e) => onChange({ ...form, decimal: e.target.checked })}
                className="rounded border-primary-300"
              />
              Decimal values
            </label>
            <label className="flex items-center gap-2 text-xs text-primary-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.survey_linkable ?? true}
                onChange={(e) => onChange({ ...form, survey_linkable: e.target.checked })}
                className="rounded border-primary-300"
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
