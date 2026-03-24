import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  ArrowLeft,
  Layers,
  Save,
  Send,
  Plus,
  Trash2,
  GripVertical,
  Clock,
  Check,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Toggle } from '@/components/toggle'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { AudiencePicker } from '@/components/development/audience-picker'
import { SaveSuccessBanner } from '@/components/development/save-success-banner'
import {
  useCreateSection,
  useSaveSectionModules,
  useDevModules,
  useDevSections,
  type DevCategory,
  type DevModule,
} from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORY_OPTIONS = [
  { value: 'learning', label: 'Learning' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'onboarding', label: 'Onboarding' },
]

/* ------------------------------------------------------------------ */
/*  Sortable module item                                               */
/* ------------------------------------------------------------------ */

interface ModuleItem {
  _key: string
  module: DevModule
  is_required: boolean
}

function SortableModuleItem({
  item,
  onToggleRequired,
  onRemove,
}: {
  item: ModuleItem
  onToggleRequired: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item._key,
  })

  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm',
        isDragging && 'shadow-md ring-2 ring-primary-300/50 z-10',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-primary-300 hover:text-primary-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-800 truncate">{item.module.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-primary-500 capitalize">
            {item.module.category.replace('_', ' ')}
          </span>
          <span className="flex items-center gap-0.5 text-xs text-primary-400">
            <Clock size={10} />
            {item.module.estimated_minutes}m
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleRequired}
        className={cn(
          'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors',
          item.is_required
            ? 'bg-moss-100 text-moss-700'
            : 'bg-primary-50 text-primary-400',
        )}
      >
        {item.is_required && <Check size={10} />}
        {item.is_required ? 'Required' : 'Optional'}
      </button>

      <button
        type="button"
        onClick={onRemove}
        className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Module picker sheet                                                */
/* ------------------------------------------------------------------ */

function ModulePicker({
  modules,
  selectedIds,
  onSelect,
}: {
  modules: DevModule[]
  selectedIds: Set<string>
  onSelect: (module: DevModule) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return modules
      .filter((m) => m.status === 'published')
      .filter((m) => !selectedIds.has(m.id))
      .filter((m) => !q || m.title.toLowerCase().includes(q))
  }, [modules, selectedIds, search])

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search modules..."
        className="text-sm"
      />
      {filtered.length === 0 ? (
        <p className="text-xs text-primary-400 text-center py-4">
          {search ? 'No matching modules' : 'All published modules are already added'}
        </p>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-1.5">
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect(m)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-primary-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-800 truncate">{m.title}</p>
                <p className="text-xs text-primary-500 capitalize">{m.category.replace('_', ' ')} · {m.estimated_minutes}m</p>
              </div>
              <Plus size={16} className="text-primary-400 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminCreateSectionPage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  useAdminHeader('Create Section')

  const createSection = useCreateSection()
  const saveSectionModules = useSaveSectionModules()
  const { data: allModules = [] } = useDevModules()
  const { data: allSections = [] } = useDevSections()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DevCategory>('learning')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [prerequisiteId, setPrerequisiteId] = useState<string>('')
  const [moduleItems, setModuleItems] = useState<ModuleItem[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [targetRoles, setTargetRoles] = useState<string[]>(['leader', 'co_leader', 'assist_leader'])
  const [saved, setSaved] = useState<{ status: 'draft' | 'published'; id: string } | null>(null)

  const selectedIds = useMemo(() => new Set(moduleItems.map((m) => m.module.id)), [moduleItems])
  const prerequisiteOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...allSections
        .filter((s) => s.status === 'published')
        .map((s) => ({ value: s.id, label: s.title })),
    ],
    [allSections],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = moduleItems.findIndex((m) => m._key === active.id)
      const newIndex = moduleItems.findIndex((m) => m._key === over.id)
      setModuleItems(arrayMove(moduleItems, oldIndex, newIndex))
    }
  }

  const addModule = (module: DevModule) => {
    setModuleItems((prev) => [
      ...prev,
      { _key: `sm-${Date.now()}-${module.id}`, module, is_required: true },
    ])
  }

  const isSaving = createSection.isPending || saveSectionModules.isPending
  const canPublish = title.trim().length > 0 && moduleItems.length > 0

  const handleSave = useCallback(
    async (status: 'draft' | 'published') => {
      if (!user) return
      if (!title.trim()) {
        toast.error('Title is required')
        return
      }

      try {
        const section = await createSection.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          thumbnail_url: thumbnailUrl || undefined,
          status,
          prerequisite_section_id: prerequisiteId || null,
          target_roles: targetRoles,
          created_by: user.id,
        })

        if (moduleItems.length > 0) {
          await saveSectionModules.mutateAsync({
            sectionId: section.id,
            modules: moduleItems.map((m, i) => ({
              module_id: m.module.id,
              sort_order: i,
              is_required: m.is_required,
            })),
          })
        }

        setSaved({ status, id: section.id })
      } catch {
        toast.error('Failed to save section')
      }
    },
    [user, title, description, category, thumbnailUrl, prerequisiteId, moduleItems, createSection, saveSectionModules, toast, navigate],
  )

  if (saved) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto py-8">
        <SaveSuccessBanner
          show
          message={saved.status === 'published' ? 'Section published!' : 'Draft saved!'}
          subtitle={`"${title}" has been ${saved.status === 'published' ? 'published and is visible to the target audience' : 'saved as a draft'}.`}
          editPath={`/admin/development/sections/${saved.id}/edit`}
          onDismiss={() => {
            setSaved(null)
            setTitle('')
            setDescription('')
            setModuleItems([])
            setTargetRoles(['leader', 'co_leader', 'assist_leader'])
          }}
        />
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Back */}
      <motion.div variants={fadeUp}>
        <button
          type="button"
          onClick={() => navigate('/admin/development')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </motion.div>

      {/* Details card */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-gradient-to-br from-white to-primary-50/40 border border-white/60 shadow-sm p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <Layers size={18} className="text-primary-500" />
          <h2 className="font-heading text-base font-bold text-primary-800">Section Details</h2>
        </div>

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Onboarding Pathway"
          required
        />

        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Description</label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this pathway cover?"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dropdown
            label="Category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(v) => setCategory(v as DevCategory)}
          />
          <Dropdown
            label="Prerequisite Section"
            options={prerequisiteOptions}
            value={prerequisiteId}
            onChange={setPrerequisiteId}
          />
        </div>

        <Input
          label="Thumbnail URL (optional)"
          value={thumbnailUrl}
          onChange={(e) => setThumbnailUrl(e.target.value)}
          placeholder="Upload to dev-assets bucket first"
        />
      </motion.div>

      {/* Audience targeting */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-gradient-to-br from-white to-amber-50/30 border border-white/60 shadow-sm p-5"
      >
        <AudiencePicker selectedRoles={targetRoles} onRolesChange={setTargetRoles} />
      </motion.div>

      {/* Module list */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">
            Modules
          </h2>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowPicker(!showPicker)}
          >
            Add Modules
          </Button>
        </div>

        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 mb-4"
          >
            <ModulePicker
              modules={allModules}
              selectedIds={selectedIds}
              onSelect={(m) => addModule(m)}
            />
          </motion.div>
        )}

        {moduleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
            <Layers size={32} className="text-primary-300 mb-3" />
            <p className="text-sm font-medium text-primary-500 mb-1">No modules added</p>
            <p className="text-xs text-primary-400">Add modules to build this pathway</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={moduleItems.map((m) => m._key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {moduleItems.map((item) => (
                  <SortableModuleItem
                    key={item._key}
                    item={item}
                    onToggleRequired={() =>
                      setModuleItems((prev) =>
                        prev.map((m) =>
                          m._key === item._key ? { ...m, is_required: !m.is_required } : m,
                        ),
                      )
                    }
                    onRemove={() =>
                      setModuleItems((prev) => prev.filter((m) => m._key !== item._key))
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </motion.div>

      {/* Sticky bottom bar */}
      <motion.div
        variants={fadeUp}
        className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/90 backdrop-blur-md border-t border-primary-100 flex items-center justify-between gap-3"
      >
        <p className="text-xs text-primary-500">
          {moduleItems.length} module{moduleItems.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/development')}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Save size={14} />}
            onClick={() => handleSave('draft')}
            loading={isSaving}
            disabled={!title.trim()}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Send size={14} />}
            onClick={() => handleSave('published')}
            loading={isSaving}
            disabled={!canPublish}
          >
            Publish
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
