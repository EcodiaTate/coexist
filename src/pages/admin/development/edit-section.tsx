import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import { ArrowLeft, Layers, Save, Send, Plus, Trash2, GripVertical, Clock, Check } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import {
  useDevSection,
  useDevSectionModules,
  useUpdateSection,
  useSaveSectionModules,
  useDevModules,
  useDevSections,
  type DevCategory,
  type DevModule,
} from '@/hooks/use-admin-development'

const CATEGORY_OPTIONS = [
  { value: 'learning', label: 'Learning' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'onboarding', label: 'Onboarding' },
]

interface ModuleItem { _key: string; module: DevModule; is_required: boolean }

function SortableModuleItem({ item, onToggleRequired, onRemove }: { item: ModuleItem; onToggleRequired: () => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item._key })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className={cn('group flex items-center gap-3 rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm', isDragging && 'shadow-md ring-2 ring-primary-300/50 z-10')}>
      <button type="button" className="cursor-grab touch-none text-primary-300 hover:text-primary-500" {...attributes} {...listeners}><GripVertical size={18} /></button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-primary-800 truncate">{item.module.title}</p>
        <span className="flex items-center gap-0.5 text-xs text-primary-400"><Clock size={10} />{item.module.estimated_minutes}m</span>
      </div>
      <button type="button" onClick={onToggleRequired} className={cn('px-2 py-1 rounded-lg text-xs font-semibold', item.is_required ? 'bg-moss-100 text-moss-700' : 'bg-primary-50 text-primary-400')}>
        {item.is_required ? 'Required' : 'Optional'}
      </button>
      <button type="button" onClick={onRemove} className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
    </div>
  )
}

export default function AdminEditSectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const navigate = useNavigate()
  const { toast } = useToast()
  useAdminHeader('Edit Section')

  const { data: section, isLoading: sectionLoading } = useDevSection(sectionId)
  const { data: existingSectionModules = [], isLoading: smLoading } = useDevSectionModules(sectionId)
  const updateSection = useUpdateSection()
  const saveSectionModules = useSaveSectionModules()
  const { data: allModules = [] } = useDevModules()
  const { data: allSections = [] } = useDevSections()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DevCategory>('learning')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [prerequisiteId, setPrerequisiteId] = useState('')
  const [moduleItems, setModuleItems] = useState<ModuleItem[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (section && !initialized) {
      setTitle(section.title)
      setDescription(section.description ?? '')
      setCategory(section.category)
      setThumbnailUrl(section.thumbnail_url ?? '')
      setPrerequisiteId(section.prerequisite_section_id ?? '')
    }
  }, [section, initialized])

  useEffect(() => {
    if (existingSectionModules.length > 0 && !initialized) {
      setModuleItems(existingSectionModules.filter((sm) => sm.module).map((sm) => ({
        _key: `sm-${sm.id}`,
        module: sm.module!,
        is_required: sm.is_required,
      })))
      setInitialized(true)
    }
  }, [existingSectionModules, initialized])

  const selectedIds = useMemo(() => new Set(moduleItems.map((m) => m.module.id)), [moduleItems])
  const prerequisiteOptions = useMemo(() => [
    { value: '', label: 'None' },
    ...allSections.filter((s) => s.status === 'published' && s.id !== sectionId).map((s) => ({ value: s.id, label: s.title })),
  ], [allSections, sectionId])

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

  const isSaving = updateSection.isPending || saveSectionModules.isPending

  const handleSave = useCallback(async (status: 'draft' | 'published') => {
    if (!sectionId) return
    try {
      await updateSection.mutateAsync({
        id: sectionId,
        title: title.trim(),
        description: description.trim() || null,
        category,
        thumbnail_url: thumbnailUrl || null,
        status,
        prerequisite_section_id: prerequisiteId || null,
      })
      await saveSectionModules.mutateAsync({
        sectionId,
        modules: moduleItems.map((m, i) => ({ module_id: m.module.id, sort_order: i, is_required: m.is_required })),
      })
      toast.success('Section updated')
      navigate('/admin/development')
    } catch { toast.error('Failed to update section') }
  }, [sectionId, title, description, category, thumbnailUrl, prerequisiteId, moduleItems, updateSection, saveSectionModules, toast, navigate])

  if (sectionLoading || smLoading) return <div className="max-w-3xl mx-auto py-20 text-center text-primary-400">Loading...</div>

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="max-w-3xl mx-auto space-y-6">
      <motion.div variants={fadeUp}>
        <button type="button" onClick={() => navigate('/admin/development')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700"><ArrowLeft size={16} /> Back</button>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl bg-gradient-to-br from-white to-primary-50/40 border border-white/60 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1"><Layers size={18} className="text-primary-500" /><h2 className="font-heading text-base font-bold text-primary-800">Section Details</h2></div>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div><label className="block text-sm font-medium text-primary-700 mb-1">Description</label><textarea className="w-full min-h-[80px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dropdown label="Category" options={CATEGORY_OPTIONS} value={category} onChange={(v) => setCategory(v as DevCategory)} />
          <Dropdown label="Prerequisite" options={prerequisiteOptions} value={prerequisiteId} onChange={setPrerequisiteId} />
        </div>
        <Input label="Thumbnail URL" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
      </motion.div>

      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest">Modules</h2>
          <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setShowPicker(!showPicker)}>Add</Button>
        </div>
        {showPicker && (
          <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 mb-4 max-h-60 overflow-y-auto space-y-1.5">
            {allModules.filter((m) => m.status === 'published' && !selectedIds.has(m.id)).map((m) => (
              <button key={m.id} type="button" onClick={() => setModuleItems((prev) => [...prev, { _key: `sm-${Date.now()}-${m.id}`, module: m, is_required: true }])} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-primary-50 text-left">
                <span className="text-sm text-primary-800 truncate flex-1">{m.title}</span><Plus size={14} className="text-primary-400" />
              </button>
            ))}
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={moduleItems.map((m) => m._key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {moduleItems.map((item) => (
                <SortableModuleItem key={item._key} item={item}
                  onToggleRequired={() => setModuleItems((prev) => prev.map((m) => m._key === item._key ? { ...m, is_required: !m.is_required } : m))}
                  onRemove={() => setModuleItems((prev) => prev.filter((m) => m._key !== item._key))} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </motion.div>

      <motion.div variants={fadeUp} className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/90 backdrop-blur-md border-t border-primary-100 flex items-center justify-between gap-3">
        <p className="text-xs text-primary-500">{moduleItems.length} module{moduleItems.length !== 1 ? 's' : ''}</p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/development')}>Cancel</Button>
          <Button variant="secondary" size="sm" icon={<Save size={14} />} onClick={() => handleSave('draft')} loading={isSaving}>Save Draft</Button>
          <Button variant="primary" size="sm" icon={<Send size={14} />} onClick={() => handleSave('published')} loading={isSaving} disabled={!title.trim()}>Publish</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
