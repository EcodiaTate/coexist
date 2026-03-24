import { useState, useCallback } from 'react'
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
import {
  GripVertical,
  FileText,
  Video,
  FileDown,
  Images,
  CircleDot,
  Trash2,
  Pencil,
  Plus,
  Type,
  X,
  Upload,
  Link as LinkIcon,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { cn } from '@/lib/cn'
import type { ContentBlockInput, DevContentType } from '@/hooks/use-admin-development'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BLOCK_TYPES: { type: DevContentType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'text', label: 'Text', icon: <Type size={16} />, color: 'bg-primary-100 text-primary-700' },
  { type: 'video', label: 'Video', icon: <Video size={16} />, color: 'bg-sky-100 text-sky-700' },
  { type: 'file', label: 'File', icon: <FileDown size={16} />, color: 'bg-bark-100 text-bark-700' },
  { type: 'slideshow', label: 'Slideshow', icon: <Images size={16} />, color: 'bg-secondary-100 text-secondary-700' },
  { type: 'quiz', label: 'Quiz', icon: <CircleDot size={16} />, color: 'bg-moss-100 text-moss-700' },
]

function blockIcon(type: DevContentType) {
  return BLOCK_TYPES.find((bt) => bt.type === type)?.icon ?? <FileText size={16} />
}

function blockColor(type: DevContentType) {
  return BLOCK_TYPES.find((bt) => bt.type === type)?.color ?? 'bg-gray-100 text-gray-700'
}

function blockLabel(type: DevContentType) {
  return BLOCK_TYPES.find((bt) => bt.type === type)?.label ?? type
}

/* ------------------------------------------------------------------ */
/*  Sortable block card                                                */
/* ------------------------------------------------------------------ */

function SortableBlock({
  block,
  index,
  onEdit,
  onRemove,
}: {
  block: ContentBlockInput & { _key: string }
  index: number
  onEdit: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block._key,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const preview = getBlockPreview(block)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-start gap-3 rounded-xl border border-white/60 bg-white/80 p-4 shadow-sm transition-shadow',
        isDragging && 'shadow-md ring-2 ring-primary-300/50 z-10',
      )}
    >
      <button
        type="button"
        className="mt-0.5 cursor-grab touch-none text-primary-300 hover:text-primary-500 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={18} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold', blockColor(block.content_type))}>
            {blockIcon(block.content_type)}
            {blockLabel(block.content_type)}
          </span>
          <span className="text-xs text-primary-400 tabular-nums">#{index + 1}</span>
          {block.title && (
            <span className="text-sm font-medium text-primary-700 truncate">{block.title}</span>
          )}
        </div>
        {preview && (
          <p className="text-xs text-primary-500 line-clamp-2 mt-1">{preview}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-primary-100/60 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100/60 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

function getBlockPreview(block: ContentBlockInput): string {
  switch (block.content_type) {
    case 'text':
      return block.text_content?.slice(0, 120) ?? ''
    case 'video':
      return block.video_url ?? 'No video URL set'
    case 'file':
      return block.file_name ?? 'No file attached'
    case 'slideshow':
      return `${block.image_urls?.length ?? 0} image${(block.image_urls?.length ?? 0) !== 1 ? 's' : ''}`
    case 'quiz':
      return block.quiz_id ? 'Quiz attached' : 'No quiz linked'
    default:
      return ''
  }
}

/* ------------------------------------------------------------------ */
/*  Block editor (inline edit form)                                    */
/* ------------------------------------------------------------------ */

function BlockEditForm({
  block,
  onSave,
  onCancel,
}: {
  block: ContentBlockInput
  onSave: (updated: ContentBlockInput) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<ContentBlockInput>({ ...block })

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold', blockColor(draft.content_type))}>
            {blockIcon(draft.content_type)}
            {blockLabel(draft.content_type)}
          </span>
          <span className="text-sm font-semibold text-primary-700">Edit Block</span>
        </div>
        <button type="button" onClick={onCancel} className="text-primary-400 hover:text-primary-600">
          <X size={18} />
        </button>
      </div>

      <Input
        label="Block Title (optional)"
        value={draft.title ?? ''}
        onChange={(e) => setDraft({ ...draft, title: e.target.value || null })}
        placeholder="e.g. Introduction"
      />

      {draft.content_type === 'text' && (
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">Content (Markdown)</label>
          <textarea
            className="w-full min-h-[160px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={draft.text_content ?? ''}
            onChange={(e) => setDraft({ ...draft, text_content: e.target.value })}
            placeholder="Write your content in Markdown..."
          />
        </div>
      )}

      {draft.content_type === 'video' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">Video Source</label>
            <div className="flex gap-2">
              {(['youtube', 'vimeo', 'upload'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setDraft({ ...draft, video_provider: provider })}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                    draft.video_provider === provider
                      ? 'bg-sky-200 text-sky-800'
                      : 'bg-white text-primary-500 hover:bg-sky-50',
                  )}
                >
                  {provider === 'youtube' ? 'YouTube' : provider === 'vimeo' ? 'Vimeo' : 'Upload'}
                </button>
              ))}
            </div>
          </div>
          <Input
            label={draft.video_provider === 'upload' ? 'Video URL (from storage)' : 'Embed URL'}
            value={draft.video_url ?? ''}
            onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
            placeholder={
              draft.video_provider === 'youtube'
                ? 'https://www.youtube.com/watch?v=...'
                : draft.video_provider === 'vimeo'
                  ? 'https://vimeo.com/...'
                  : 'Paste the storage URL after uploading'
            }
            icon={draft.video_provider === 'upload' ? <Upload size={14} /> : <LinkIcon size={14} />}
          />
        </div>
      )}

      {draft.content_type === 'file' && (
        <div className="space-y-3">
          <Input
            label="File URL"
            value={draft.file_url ?? ''}
            onChange={(e) => setDraft({ ...draft, file_url: e.target.value })}
            placeholder="Upload a file first, then paste the URL"
          />
          <Input
            label="File Name"
            value={draft.file_name ?? ''}
            onChange={(e) => setDraft({ ...draft, file_name: e.target.value })}
            placeholder="e.g. Leadership Guide.pdf"
          />
        </div>
      )}

      {draft.content_type === 'slideshow' && (
        <div>
          <label className="block text-sm font-medium text-primary-700 mb-1">
            Image URLs (one per line)
          </label>
          <textarea
            className="w-full min-h-[100px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={(draft.image_urls ?? []).join('\n')}
            onChange={(e) =>
              setDraft({
                ...draft,
                image_urls: e.target.value.split('\n').filter(Boolean),
              })
            }
            placeholder="https://storage.example.com/image1.jpg&#10;https://storage.example.com/image2.jpg"
          />
          <label className="block text-sm font-medium text-primary-700 mb-1 mt-3">
            Captions (one per line, matching image order)
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-primary-800 placeholder:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-y"
            value={(draft.image_captions ?? []).join('\n')}
            onChange={(e) =>
              setDraft({
                ...draft,
                image_captions: e.target.value.split('\n'),
              })
            }
            placeholder="Caption for image 1&#10;Caption for image 2"
          />
        </div>
      )}

      {draft.content_type === 'quiz' && (
        <Input
          label="Quiz ID"
          value={draft.quiz_id ?? ''}
          onChange={(e) => setDraft({ ...draft, quiz_id: e.target.value || null })}
          placeholder="Create a quiz first, then paste its ID here"
        />
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={() => onSave(draft)}>
          Save Block
        </Button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main block editor component                                        */
/* ------------------------------------------------------------------ */

interface BlockEditorProps {
  blocks: (ContentBlockInput & { _key: string })[]
  onChange: (blocks: (ContentBlockInput & { _key: string })[]) => void
  className?: string
}

let nextKey = 0
export function generateBlockKey() {
  return `block-${Date.now()}-${nextKey++}`
}

export function BlockEditor({ blocks, onChange, className }: BlockEditorProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [showTypePicker, setShowTypePicker] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        const oldIndex = blocks.findIndex((b) => b._key === active.id)
        const newIndex = blocks.findIndex((b) => b._key === over.id)
        const reordered = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
          ...b,
          sort_order: i,
        }))
        onChange(reordered)
      }
    },
    [blocks, onChange],
  )

  const addBlock = (type: DevContentType) => {
    const newBlock: ContentBlockInput & { _key: string } = {
      _key: generateBlockKey(),
      content_type: type,
      sort_order: blocks.length,
      title: null,
      text_content: type === 'text' ? '' : null,
      video_url: null,
      video_provider: type === 'video' ? 'youtube' : null,
      file_url: null,
      file_name: null,
      file_size_bytes: null,
      image_urls: [],
      image_captions: [],
      quiz_id: null,
    }
    onChange([...blocks, newBlock])
    setEditingKey(newBlock._key)
    setShowTypePicker(false)
  }

  const updateBlock = (key: string, updated: ContentBlockInput) => {
    onChange(blocks.map((b) => (b._key === key ? { ...updated, _key: key } : b)))
    setEditingKey(null)
  }

  const removeBlock = (key: string) => {
    onChange(
      blocks
        .filter((b) => b._key !== key)
        .map((b, i) => ({ ...b, sort_order: i })),
    )
    if (editingKey === key) setEditingKey(null)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b._key)} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {blocks.map((block, index) => (
              <motion.div
                key={block._key}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {editingKey === block._key ? (
                  <BlockEditForm
                    block={block}
                    onSave={(updated) => updateBlock(block._key, updated)}
                    onCancel={() => setEditingKey(null)}
                  />
                ) : (
                  <SortableBlock
                    block={block}
                    index={index}
                    onEdit={() => setEditingKey(block._key)}
                    onRemove={() => removeBlock(block._key)}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {blocks.length === 0 && !showTypePicker && (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/30">
          <FileText size={32} className="text-primary-300 mb-3" />
          <p className="text-sm font-medium text-primary-500 mb-1">No content blocks yet</p>
          <p className="text-xs text-primary-400 mb-4">Add blocks to build your module</p>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowTypePicker(true)}>
            Add First Block
          </Button>
        </div>
      )}

      {/* Add block picker */}
      {(blocks.length > 0 || showTypePicker) && (
        <div className="pt-1">
          {showTypePicker ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 p-3 rounded-xl bg-primary-50/60 border border-primary-100"
            >
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  type="button"
                  onClick={() => addBlock(bt.type)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]',
                    bt.color,
                    'hover:brightness-95',
                  )}
                >
                  {bt.icon}
                  {bt.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowTypePicker(false)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-primary-400 hover:text-primary-600 transition-colors"
              >
                <X size={14} />
                Cancel
              </button>
            </motion.div>
          ) : (
            <button
              type="button"
              onClick={() => setShowTypePicker(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dashed border-primary-300 text-sm font-semibold text-primary-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50/40 transition-all active:scale-[0.98] w-full justify-center"
            >
              <Plus size={15} />
              Add Block
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default BlockEditor
