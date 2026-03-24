import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import {
  ArrowLeft,
  BookOpen,
  Eye,
  EyeOff,
  Save,
  Send,
} from 'lucide-react'
import { useAdminHeader } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import {
  useCreateModule,
  useSaveModuleContent,
  type DevCategory,
  type ContentBlockInput,
} from '@/hooks/use-admin-development'
import { BlockEditor, generateBlockKey } from '@/components/development/block-editor'
import { AudiencePicker } from '@/components/development/audience-picker'
import { SaveSuccessBanner } from '@/components/development/save-success-banner'

/* ------------------------------------------------------------------ */
/*  Category options                                                   */
/* ------------------------------------------------------------------ */

const CATEGORY_OPTIONS = [
  { value: 'learning', label: 'Learning' },
  { value: 'leadership_development', label: 'Leadership Development' },
  { value: 'onboarding', label: 'Onboarding' },
]

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminCreateModulePage() {
  const shouldReduceMotion = useReducedMotion()
  const rm = !!shouldReduceMotion
  const { stagger, fadeUp } = adminVariants(rm)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  useAdminHeader('Create Module')

  const createModule = useCreateModule()
  const saveContent = useSaveModuleContent()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<DevCategory>('learning')
  const [estimatedMinutes, setEstimatedMinutes] = useState(10)
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [targetRoles, setTargetRoles] = useState<string[]>(['leader', 'co_leader', 'assist_leader'])
  const [isPreview, setIsPreview] = useState(false)
  const [blocks, setBlocks] = useState<(ContentBlockInput & { _key: string })[]>([])

  // Save success state
  const [saved, setSaved] = useState<{ status: 'draft' | 'published'; id: string } | null>(null)

  const isSaving = createModule.isPending || saveContent.isPending
  const canPublish = title.trim().length > 0 && blocks.length > 0

  const handleSave = useCallback(
    async (status: 'draft' | 'published') => {
      if (!user) return
      if (status === 'published' && !canPublish) {
        toast.error('Add a title and at least one content block to publish')
        return
      }
      if (!title.trim()) {
        toast.error('Title is required')
        return
      }

      try {
        const mod = await createModule.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          category,
          estimated_minutes: estimatedMinutes,
          thumbnail_url: thumbnailUrl || undefined,
          status,
          target_roles: targetRoles,
          created_by: user.id,
        })

        if (blocks.length > 0) {
          await saveContent.mutateAsync({
            moduleId: mod.id,
            blocks: blocks.map(({ _key, ...rest }) => rest),
          })
        }

        setSaved({ status, id: mod.id })
      } catch {
        toast.error('Failed to save module')
      }
    },
    [user, title, description, category, estimatedMinutes, thumbnailUrl, targetRoles, blocks, canPublish, createModule, saveContent, toast],
  )

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCategory('learning')
    setEstimatedMinutes(10)
    setThumbnailUrl('')
    setTargetRoles(['leader', 'co_leader', 'assist_leader'])
    setBlocks([])
    setSaved(null)
  }

  // Show success state
  if (saved) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-3xl mx-auto py-8"
      >
        <SaveSuccessBanner
          show
          message={saved.status === 'published' ? 'Module published!' : 'Draft saved!'}
          subtitle={
            saved.status === 'published'
              ? `"${title}" is now live and visible to the target audience`
              : `"${title}" has been saved. You can continue editing or publish it later.`
          }
          editPath={`/admin/development/modules/${saved.id}/edit`}
          onDismiss={resetForm}
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
      {/* Back + preview toggle */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/development')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button
          type="button"
          onClick={() => setIsPreview(!isPreview)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 hover:text-primary-700 transition-colors"
        >
          {isPreview ? <EyeOff size={16} /> : <Eye size={16} />}
          {isPreview ? 'Edit' : 'Preview'}
        </button>
      </motion.div>

      {/* Details card */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-gradient-to-br from-white to-primary-50/40 border border-white/60 shadow-sm p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <BookOpen size={18} className="text-primary-500" />
          <h2 className="font-heading text-base font-bold text-primary-800">Module Details</h2>
        </div>

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Welcome to Co-Exist Leadership"
          required
        />

        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Description</label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will leaders learn in this module?"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Dropdown
            label="Category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(v) => setCategory(v as DevCategory)}
          />
          <Input
            label="Estimated Minutes"
            type="number"
            value={String(estimatedMinutes)}
            onChange={(e) => setEstimatedMinutes(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </motion.div>

      {/* Audience targeting */}
      <motion.div
        variants={fadeUp}
        className="rounded-2xl bg-gradient-to-br from-white to-amber-50/30 border border-white/60 shadow-sm p-5"
      >
        <AudiencePicker
          selectedRoles={targetRoles}
          onRolesChange={setTargetRoles}
        />
      </motion.div>

      {/* Content blocks */}
      <motion.div variants={fadeUp}>
        <h2 className="flex items-center gap-2 font-heading text-[13px] font-bold text-primary-700/60 uppercase tracking-widest mb-3">
          Content Blocks
        </h2>
        <BlockEditor blocks={blocks} onChange={setBlocks} />
      </motion.div>

      {/* Sticky bottom bar */}
      <motion.div
        variants={fadeUp}
        className="sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-white/90 backdrop-blur-md border-t border-primary-100 flex items-center justify-between gap-3"
      >
        <p className="text-xs text-primary-500">
          {blocks.length} block{blocks.length !== 1 ? 's' : ''}
          {targetRoles.length > 0 && ` · ${targetRoles.length} role${targetRoles.length !== 1 ? 's' : ''}`}
          {!title.trim() && ' · Add a title'}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/development')}
          >
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
