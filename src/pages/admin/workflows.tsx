import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Plus,
  ClipboardCheck,
  Calendar,
  CalendarDays,
  CalendarClock,
  Repeat,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { SearchBar } from '@/components/search-bar'
import { Dropdown } from '@/components/dropdown'
import { Modal } from '@/components/modal'
import { Input } from '@/components/input'
import { Toggle } from '@/components/toggle'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import {
  useAdminTaskTemplates,
  useAdminCreateTemplate,
  useAdminUpdateTemplate,
  useAdminToggleTemplate,
  useAdminDeleteTemplate,
  useAdminKpiDashboard,
  formatSchedule,
  TASK_CATEGORIES,
  CATEGORY_COLORS,
  type TaskTemplate,
} from '@/hooks/use-admin-tasks'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function useAllCollectives() {
  return useQuery({
    queryKey: ['admin-all-collectives-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('id, name, slug, state')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

const scheduleTypeOptions = [
  { value: '', label: 'All Schedules' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'event_relative', label: 'Event Relative' },
]

const scopeOptions = [
  { value: 'all', label: 'All Scopes' },
  { value: 'global', label: 'Global (All Collectives)' },
]

const assigneeRoleOptions = [
  { value: 'assist_leader', label: 'Assist Leader+' },
  { value: 'co_leader', label: 'Co-Leader+' },
  { value: 'leader', label: 'Leader Only' },
]

const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const dayOfMonthOptions = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}))

const SCHEDULE_ICONS: Record<string, typeof Calendar> = {
  weekly: Repeat,
  monthly: CalendarDays,
  event_relative: CalendarClock,
}

const tabs = [
  { id: 'templates', label: 'Templates', icon: <ClipboardCheck size={14} /> },
  { id: 'kpi', label: 'KPI Dashboard', icon: <BarChart3 size={14} /> },
]

/* ------------------------------------------------------------------ */
/*  Template Create/Edit Modal                                         */
/* ------------------------------------------------------------------ */

function TemplateModal({
  open,
  onClose,
  template,
  collectives,
}: {
  open: boolean
  onClose: () => void
  template?: TaskTemplate | null
  collectives: { id: string; name: string; state: string | null }[]
}) {
  const { toast } = useToast()
  const createMutation = useAdminCreateTemplate()
  const updateMutation = useAdminUpdateTemplate()

  const [title, setTitle] = useState(template?.title ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [category, setCategory] = useState(template?.category ?? 'general')
  const [scheduleType, setScheduleType] = useState(template?.schedule_type ?? 'weekly')
  const [dayOfWeek, setDayOfWeek] = useState(String(template?.day_of_week ?? 1))
  const [dayOfMonth, setDayOfMonth] = useState(String(template?.day_of_month ?? 1))
  const [eventOffsetDays, setEventOffsetDays] = useState(String(template?.event_offset_days ?? -3))
  const [assigneeRole, setAssigneeRole] = useState(template?.assignee_role ?? 'assist_leader')
  const [collectiveId, setCollectiveId] = useState(template?.collective_id ?? '')
  const [sortOrder, setSortOrder] = useState(String(template?.sort_order ?? 0))

  const isEdit = !!template

  const collectiveOptions = useMemo(() => [
    { value: '', label: 'All Collectives (Global)' },
    ...collectives.map((c) => ({ value: c.id, label: `${c.name}${c.state ? ` (${c.state})` : ''}` })),
  ], [collectives])

  const handleSave = () => {
    const input = {
      title: title.trim(),
      description: description.trim() || undefined,
      collective_id: collectiveId || null,
      category,
      schedule_type: scheduleType,
      day_of_week: scheduleType === 'weekly' ? parseInt(dayOfWeek) : null,
      day_of_month: scheduleType === 'monthly' ? parseInt(dayOfMonth) : null,
      event_offset_days: scheduleType === 'event_relative' ? parseInt(eventOffsetDays) : null,
      assignee_role: assigneeRole,
      sort_order: parseInt(sortOrder) || 0,
    }

    if (isEdit) {
      updateMutation.mutate(
        { id: template.id, ...input },
        {
          onSuccess: () => { toast.success('Template updated'); onClose() },
          onError: () => toast.error('Failed to update template'),
        },
      )
    } else {
      createMutation.mutate(
        input,
        {
          onSuccess: () => { toast.success('Template created'); onClose() },
          onError: () => toast.error('Failed to create template'),
        },
      )
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Template' : 'Create Task Template'}
      size="lg"
    >
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Post pre-event Instagram reel"
          required
        />
        <Input
          label="Description"
          type="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Instructions or details for this task..."
        />
        <Dropdown
          options={collectiveOptions}
          value={collectiveId}
          onChange={setCollectiveId}
          label="Scope"
        />
        <div className="grid grid-cols-2 gap-3">
          <Dropdown
            options={TASK_CATEGORIES}
            value={category}
            onChange={setCategory}
            label="Category"
          />
          <Dropdown
            options={assigneeRoleOptions}
            value={assigneeRole}
            onChange={setAssigneeRole}
            label="Assigned To"
          />
        </div>

        {/* Schedule */}
        <div>
          <p className="text-sm font-medium text-primary-800 mb-2">Schedule</p>
          <div className="flex gap-2 mb-3">
            {(['weekly', 'monthly', 'event_relative'] as const).map((type) => {
              const Icon = SCHEDULE_ICONS[type]
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScheduleType(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer',
                    'transition-colors duration-150',
                    scheduleType === type
                      ? 'bg-primary-100 text-primary-700 font-medium'
                      : 'bg-white text-primary-400 hover:bg-primary-50',
                  )}
                >
                  <Icon size={14} />
                  {type === 'event_relative' ? 'Event' : type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              )
            })}
          </div>
          {scheduleType === 'weekly' && (
            <Dropdown options={dayOfWeekOptions} value={dayOfWeek} onChange={setDayOfWeek} label="Day of Week" />
          )}
          {scheduleType === 'monthly' && (
            <Dropdown options={dayOfMonthOptions} value={dayOfMonth} onChange={setDayOfMonth} label="Day of Month" />
          )}
          {scheduleType === 'event_relative' && (
            <Input
              label="Days offset (negative = before event)"
              type="number"
              value={eventOffsetDays}
              onChange={(e) => setEventOffsetDays(e.target.value)}
              placeholder="-3"
            />
          )}
        </div>

        <Input
          label="Sort Order"
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          placeholder="0"
        />

        <Button
          variant="primary"
          fullWidth
          onClick={handleSave}
          loading={createMutation.isPending || updateMutation.isPending}
          disabled={!title.trim()}
        >
          {isEdit ? 'Save Changes' : 'Create Template'}
        </Button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/*  KPI Dashboard Tab                                                  */
/* ------------------------------------------------------------------ */

function KpiDashboard() {
  const [collectiveFilter, setCollectiveFilter] = useState('')
  const { data: collectives } = useAllCollectives()

  // Default to last 30 days
  const dateFrom = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString()
  }, [])

  const { data, isLoading } = useAdminKpiDashboard({
    collectiveId: collectiveFilter || undefined,
    dateFrom,
  })

  const collectiveOptions = useMemo(() => [
    { value: '', label: 'All Collectives' },
    ...(collectives ?? []).map((c: any) => ({ value: c.id, label: c.name })),
  ], [collectives])

  return (
    <div className="space-y-4">
      <Dropdown
        options={collectiveOptions}
        value={collectiveFilter}
        onChange={setCollectiveFilter}
        placeholder="All Collectives"
        className="max-w-xs"
      />

      {isLoading ? (
        <Skeleton variant="list-item" count={4} />
      ) : !data ? (
        <EmptyState illustration="empty" title="No data" description="No task instances found for this period" />
      ) : (
        <>
          {/* Overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} className="text-primary-400" />
                <p className="text-xs text-primary-400">Total Tasks</p>
              </div>
              <p className="text-2xl font-bold text-primary-800">{data.totals.total}</p>
            </div>
            <div className="p-4 rounded-xl bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-success-500" />
                <p className="text-xs text-primary-400">Completed</p>
              </div>
              <p className="text-2xl font-bold text-success-600">{data.totals.completed}</p>
            </div>
            <div className="p-4 rounded-xl bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-error-500" />
                <p className="text-xs text-primary-400">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-error-600">{data.totals.overdue}</p>
            </div>
            <div className="p-4 rounded-xl bg-white shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={14} className="text-primary-400" />
                <p className="text-xs text-primary-400">Completion Rate</p>
              </div>
              <p className="text-2xl font-bold text-primary-800">{data.totals.rate}%</p>
            </div>
          </div>

          {/* Per-collective table */}
          {data.stats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100/40">
                    <th className="text-left py-3 px-3 text-primary-400 font-medium">Collective</th>
                    <th className="text-center py-3 px-2 text-primary-400 font-medium">Total</th>
                    <th className="text-center py-3 px-2 text-primary-400 font-medium">Done</th>
                    <th className="text-center py-3 px-2 text-primary-400 font-medium">Overdue</th>
                    <th className="text-center py-3 px-2 text-primary-400 font-medium">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stats.map((stat) => (
                    <tr key={stat.collective_id} className="border-b border-primary-100/40 hover:bg-primary-50">
                      <td className="py-2.5 px-3 font-medium text-primary-800">{stat.collective_name}</td>
                      <td className="text-center py-2.5 px-2 text-primary-600">{stat.total}</td>
                      <td className="text-center py-2.5 px-2 text-success-600">{stat.completed}</td>
                      <td className="text-center py-2.5 px-2 text-error-600">{stat.overdue}</td>
                      <td className="text-center py-2.5 px-2">
                        <span
                          className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full',
                            stat.rate >= 80
                              ? 'bg-success-100 text-success-700'
                              : stat.rate >= 50
                                ? 'bg-warning-100 text-warning-700'
                                : 'bg-error-100 text-error-700',
                          )}
                        >
                          {stat.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminWorkflowsPage() {
  const [activeTab, setActiveTab] = useState('templates')
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [scheduleFilter, setScheduleFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTemplate, setEditTemplate] = useState<TaskTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { toast } = useToast()
  const { data: collectives } = useAllCollectives()
  const { data: templates, isLoading } = useAdminTaskTemplates({
    scope: scopeFilter,
    scheduleType: scheduleFilter || undefined,
    search: search || undefined,
  })

  const toggleMutation = useAdminToggleTemplate()
  const deleteMutation = useAdminDeleteTemplate()

  const shouldReduceMotion = useReducedMotion()

  // Extend scope options with per-collective options
  const fullScopeOptions = useMemo(() => [
    ...scopeOptions,
    ...(collectives ?? []).map((c: any) => ({ value: c.id, label: c.name })),
  ], [collectives])

  const heroActions = useMemo(() =>
    activeTab === 'templates' ? (
      <Button
        variant="primary"
        size="sm"
        icon={<Plus size={16} />}
        onClick={() => setShowCreate(true)}
        className="!bg-white/15 !border-white/10 hover:!bg-white/25 !text-white"
      >
        Create Template
      </Button>
    ) : undefined,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [activeTab])

  useAdminHeader('Workflows', { actions: heroActions })

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp}>
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
      </motion.div>

      {activeTab === 'templates' && (
        <>
          {/* Filters */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-4">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search templates..."
              compact
              className="flex-1"
            />
            <Dropdown
              options={fullScopeOptions}
              value={scopeFilter}
              onChange={setScopeFilter}
              placeholder="All Scopes"
              className="sm:w-48"
            />
            <Dropdown
              options={scheduleTypeOptions}
              value={scheduleFilter}
              onChange={setScheduleFilter}
              placeholder="All Schedules"
              className="sm:w-40"
            />
          </motion.div>

          {/* Template list */}
          <motion.div variants={fadeUp}>
            {isLoading ? (
              <Skeleton variant="list-item" count={6} />
            ) : !templates?.length ? (
              <EmptyState
                illustration="empty"
                title="No task templates"
                description="Create recurring task templates for your collective staff"
                action={{ label: 'Create Template', onClick: () => setShowCreate(true) }}
              />
            ) : (
              <StaggeredList className="space-y-2">
                {templates.map((template) => {
                  const ScheduleIcon = SCHEDULE_ICONS[template.schedule_type] ?? Calendar
                  return (
                    <StaggeredItem
                      key={template.id}
                      className={cn(
                        'p-4 rounded-xl bg-white shadow-sm',
                        !template.is_active && 'opacity-50',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-primary-800 truncate">
                              {template.title}
                            </p>
                            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', CATEGORY_COLORS[template.category])}>
                              {template.category.replace('_', ' ')}
                            </span>
                          </div>
                          {template.description && (
                            <p className="text-xs text-primary-400 line-clamp-1 mb-1.5">{template.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-primary-400">
                            <span className="flex items-center gap-1">
                              <ScheduleIcon size={12} />
                              {formatSchedule(template)}
                            </span>
                            <span className="text-primary-200">·</span>
                            <span>{template.collective?.name ?? 'All Collectives'}</span>
                            <span className="text-primary-200">·</span>
                            <span>{template.assignee_role.replace('_', ' ')}+</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Toggle
                            checked={template.is_active}
                            onChange={(v) =>
                              toggleMutation.mutate(
                                { id: template.id, is_active: v },
                                {
                                  onSuccess: () => toast.success(v ? 'Activated' : 'Deactivated'),
                                  onError: () => toast.error('Failed to toggle'),
                                },
                              )
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setEditTemplate(template)}
                            className="p-1.5 rounded-lg text-primary-400 hover:bg-primary-50 cursor-pointer"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(template.id)}
                            className="p-1.5 rounded-lg text-primary-400 hover:bg-error-50 hover:text-error-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </StaggeredItem>
                  )
                })}
              </StaggeredList>
            )}
          </motion.div>
        </>
      )}

      {activeTab === 'kpi' && (
        <motion.div variants={fadeUp}>
          <KpiDashboard />
        </motion.div>
      )}

      {/* Create modal */}
      {showCreate && (
        <TemplateModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          collectives={collectives ?? []}
        />
      )}

      {/* Edit modal */}
      {editTemplate && (
        <TemplateModal
          open={!!editTemplate}
          onClose={() => setEditTemplate(null)}
          template={editTemplate}
          collectives={collectives ?? []}
        />
      )}

      {/* Delete confirmation */}
      <ConfirmationSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => { toast.success('Template deleted'); setDeleteTarget(null) },
              onError: () => toast.error('Failed to delete'),
            })
          }
        }}
        title="Delete Template"
        description="This will permanently delete this task template and all its generated instances. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </motion.div>
  )
}
