import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
    Eye,
    Image as ImageIcon,
    Pin,
    AlertTriangle,
    Users,
    Globe,
    Shield,
    X, FileText
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { BottomSheet } from '@/components/bottom-sheet'
import { UploadProgress } from '@/components/upload-progress'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCreateAnnouncement } from '@/hooks/use-announcements'
import { useMyCollectives } from '@/hooks/use-collective'
import { useImageUpload } from '@/hooks/use-image-upload'
import type { Enums } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Target audience options                                            */
/* ------------------------------------------------------------------ */

const audienceOptions: {
  value: Enums<'announcement_target'>
  label: string
  description: string
  icon: typeof Globe
}[] = [
  {
    value: 'all',
    label: 'All Users',
    description: 'Every Co-Exist member',
    icon: Globe,
  },
  {
    value: 'leaders',
    label: 'Leaders Only',
    description: 'Collective leaders, co-leaders, and assist-leaders',
    icon: Shield,
  },
  {
    value: 'collective_specific',
    label: 'Specific Collective',
    description: 'Target one collective',
    icon: Users,
  },
]

/* ------------------------------------------------------------------ */
/*  Create announcement page – blog-post style, admin-only             */
/* ------------------------------------------------------------------ */

export default function CreateAnnouncementPage() {
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()
  const { toast } = useToast()
  const createAnnouncement = useCreateAnnouncement()
  const annUpload = useImageUpload({ bucket: 'announcements' })
  const { data: myCollectives } = useMyCollectives()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<Enums<'announcement_priority'>>('normal')
  const [targetAudience, setTargetAudience] = useState<Enums<'announcement_target'>>('all')
  const [selectedCollectiveId, setSelectedCollectiveId] = useState<string | null>(null)
  const [isPinned, setIsPinned] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Only admin staff can create announcements
  if (!isAdmin) {
    return (
      <Page
        swipeBack
        header={<Header title="Not Authorised" back />}
      >
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Shield size={48} className="text-primary-300 mb-4" />
          <h2 className="font-heading text-lg font-bold text-primary-800 mb-2">Admin Only</h2>
          <p className="text-sm text-primary-500 text-center max-w-xs">
            Only admin staff can create announcements. Contact your admin if you need to post an update.
          </p>
        </div>
      </Page>
    )
  }

  const canSubmit =
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (targetAudience !== 'collective_specific' || !!selectedCollectiveId)

  /* ---- Multi-image handling ---- */

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files).slice(0, 10 - selectedFiles.length)
    setSelectedFiles((prev) => [...prev, ...newFiles])

    for (const file of newFiles) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviews((prev) => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
    setPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  /* ---- Submit ---- */

  const handleSubmit = async () => {
    if (!canSubmit) return

    try {
      let imageUrls: string[] = []
      if (selectedFiles.length > 0) {
        const results = await annUpload.uploadMultiple(selectedFiles)
        imageUrls = results.map((r) => r.url)
      }

      await createAnnouncement.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        imageUrls,
        priority,
        targetAudience,
        targetCollectiveId: targetAudience === 'collective_specific' ? selectedCollectiveId ?? undefined : undefined,
        isPinned,
      })

      toast.success('Announcement published!')
      navigate('/announcements')
    } catch {
      toast.error('Failed to publish announcement')
    }
  }

  const isSubmitting = annUpload.uploading || createAnnouncement.isPending

  return (
    <Page
      swipeBack
      header={
        <Header
          title="New Announcement"
          back
          rightActions={
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              disabled={!canSubmit}
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full',
                'text-primary-400 hover:bg-primary-50',
                'transition-colors duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label="Preview announcement"
            >
              <Eye size={20} />
            </button>
          }
        />
      }
      footer={
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit || isSubmitting}
        >
          Publish Announcement
        </Button>
      }
    >
      <motion.div
        className="pt-4 space-y-5"
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {/* Blog-post type hint */}
        <div className="flex items-center gap-2 px-1">
          <FileText size={16} className="text-primary-400" />
          <span className="text-xs font-semibold text-primary-500 uppercase tracking-wider">
            Blog Post / Announcement
          </span>
        </div>

        {/* Title – large blog-style input */}
        <div>
          <input
            id="ann-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give it a title..."
            maxLength={200}
            className={cn(
              'w-full px-3 py-2 rounded-xl',
              'bg-white text-primary-800 placeholder:text-primary-300',
              'border-none outline-none',
              'focus:ring-2 focus:ring-primary-300',
              'font-heading text-xl font-bold leading-tight',
            )}
          />
        </div>

        {/* Content – rich textarea for blog-style posts */}
        <div>
          <label
            htmlFor="ann-content"
            className="block text-sm font-semibold text-primary-800 mb-1.5"
          >
            Content
          </label>
          <p className="text-xs text-primary-400 mb-2">
            Write your update, invite, recap, or anything you'd like to share. Use blank lines for paragraphs.
          </p>
          <textarea
            id="ann-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your announcement...&#10;&#10;Share updates, event invites, recaps, news - anything the community needs to know."
            rows={12}
            maxLength={10000}
            className={cn(
              'w-full px-4 py-4 rounded-xl text-sm resize-none',
              'bg-white text-primary-800 placeholder:text-primary-400',
              'border-none outline-none leading-relaxed',
              'focus:ring-2 focus:ring-primary-300',
            )}
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-primary-300">{content.length}/10,000</span>
          </div>
        </div>

        {/* Images – multi-upload grid */}
        <div>
          <label className="block text-sm font-semibold text-primary-800 mb-1.5">
            Images ({selectedFiles.length}/10)
          </label>
          <p className="text-xs text-primary-400 mb-2">
            Add up to 10 images - photos, infographics, flyers, event recaps.
          </p>

          {/* Preview grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {previews.map((src, i) => (
                <motion.div
                  key={i}
                  initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-xl overflow-hidden"
                >
                  <img
                    src={src}
                    alt={`Selected photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className={cn(
                      'absolute top-1.5 right-1.5',
                      'flex items-center justify-center w-7 h-7 rounded-full',
                      'bg-black/60 text-white',
                      'cursor-pointer select-none',
                      'hover:bg-black/80 active:scale-[0.97] transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                    )}
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X size={14} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Add images button */}
          {selectedFiles.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center justify-center gap-2 w-full h-20 rounded-xl bg-primary-50/60',
                'text-sm text-primary-400 font-medium',
                'cursor-pointer hover:bg-primary-100/60 hover:text-primary-500 hover:shadow-sm',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              )}
            >
              <ImageIcon size={18} aria-hidden="true" />
              {previews.length > 0 ? 'Add more images' : 'Upload images'}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFilesSelected(e.target.files)}
            className="hidden"
            aria-hidden="true"
          />

          <UploadProgress
            progress={annUpload.progress}
            uploading={annUpload.uploading}
            error={annUpload.error}
            className="mt-2"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-semibold text-primary-800 mb-2">
            Priority
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPriority('normal')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium',
                'transition-all duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                priority === 'normal'
                  ? 'bg-primary-100 text-primary-800 shadow-sm ring-2 ring-primary-500'
                  : 'bg-primary-50/60 text-primary-400 hover:bg-primary-100/60',
              )}
              aria-pressed={priority === 'normal'}
            >
              Normal
            </button>
            <button
              type="button"
              onClick={() => setPriority('urgent')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium',
                'transition-all duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                priority === 'urgent'
                  ? 'bg-accent-100 text-primary-800 shadow-sm ring-2 ring-accent-500'
                  : 'bg-primary-50/60 text-primary-400 hover:bg-primary-100/60',
              )}
              aria-pressed={priority === 'urgent'}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              Urgent
            </button>
          </div>
        </div>

        {/* Target audience – admin sees all options */}
        <div>
          <label className="block text-sm font-semibold text-primary-800 mb-2">
            Target Audience
          </label>
          <div className="space-y-2">
            {audienceOptions.map((opt) => {
              const Icon = opt.icon
              const isSelected = targetAudience === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTargetAudience(opt.value)}
                  className={cn(
                    'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left',
                    'transition-all duration-150 cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    isSelected
                      ? 'bg-primary-100 shadow-sm ring-2 ring-primary-500'
                      : 'bg-primary-50/60 hover:bg-primary-100/60',
                  )}
                  aria-pressed={isSelected}
                >
                  <Icon
                    size={18}
                    className="text-primary-400"
                    aria-hidden="true"
                  />
                  <div>
                    <p className={cn(
                      'text-sm font-medium',
                      isSelected ? 'text-primary-400' : 'text-primary-800',
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-primary-400">{opt.description}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Collective picker */}
          {targetAudience === 'collective_specific' && (
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-semibold text-primary-400 uppercase tracking-wider">
                Select collective
              </label>
              {(myCollectives ?? []).map((m) => {
                const collective = m.collectives as any
                if (!collective) return null
                const isSelected = selectedCollectiveId === m.collective_id
                return (
                  <button
                    key={m.collective_id}
                    type="button"
                    onClick={() => setSelectedCollectiveId(m.collective_id)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left',
                      'transition-all duration-150 cursor-pointer select-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                      isSelected
                        ? 'bg-primary-100 shadow-sm ring-2 ring-primary-500'
                        : 'bg-primary-50/60 hover:bg-primary-100/60',
                    )}
                    aria-pressed={isSelected}
                  >
                    {collective.cover_image_url ? (
                      <img
                        src={collective.cover_image_url}
                        alt=""
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-primary-200/60 flex items-center justify-center shrink-0">
                        <Users size={16} className="text-primary-400" />
                      </div>
                    )}
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isSelected ? 'text-primary-400' : 'text-primary-800',
                      )}>
                        {collective.name}
                      </p>
                      {collective.region && (
                        <p className="text-xs text-primary-400">{collective.region}, {collective.state}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Pin toggle */}
        <button
          type="button"
          onClick={() => setIsPinned(!isPinned)}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-3 rounded-xl',
            'transition-all duration-150 cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            isPinned
              ? 'bg-primary-100 shadow-sm ring-2 ring-primary-500'
              : 'bg-primary-50/60 hover:bg-primary-100/60',
          )}
          aria-pressed={isPinned}
        >
          <Pin
            size={18}
            className="text-primary-400"
            aria-hidden="true"
          />
          <div className="text-left">
            <p className={cn(
              'text-sm font-medium',
              isPinned ? 'text-primary-400' : 'text-primary-800',
            )}>
              Pin to top
            </p>
            <p className="text-xs text-primary-400">Stays at the top of the feed</p>
          </div>
        </button>
      </motion.div>

      {/* Preview sheet – blog-post style */}
      <BottomSheet
        open={showPreview}
        onClose={() => setShowPreview(false)}
        snapPoints={[0.85]}
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto">
          <h3 className="font-heading text-lg font-bold text-primary-800 text-center">
            Preview
          </h3>

          <div
            className={cn(
              'rounded-2xl shadow-md overflow-hidden',
              priority === 'urgent'
                ? 'bg-gradient-to-br from-white to-accent-100'
                : 'bg-white',
            )}
          >
            {isPinned && (
              <div className="flex items-center gap-1 px-4 pt-3">
                <Pin size={12} className="text-primary-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary-400">Pinned</span>
              </div>
            )}

            {/* Preview images */}
            {previews.length > 0 && (
              <div className="mx-4 mt-3">
                {previews.length === 1 ? (
                  <div className="rounded-xl overflow-hidden">
                    <img
                      src={previews[0]}
                      alt=""
                      className="w-full aspect-[16/9] object-cover"
                    />
                  </div>
                ) : (
                  <div className={cn(
                    'grid gap-1.5 rounded-xl overflow-hidden',
                    previews.length === 2 ? 'grid-cols-2' : 'grid-cols-3',
                  )}>
                    {previews.slice(0, 6).map((src, i) => (
                      <div key={i} className={cn(
                        'relative overflow-hidden',
                        previews.length === 2 ? 'aspect-[4/3]' :
                        i === 0 && previews.length >= 3 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square',
                      )}>
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {i === 5 && previews.length > 6 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">+{previews.length - 6}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="px-4 pt-3 pb-4">
              <h4 className="font-heading font-bold text-lg text-primary-800 leading-tight">
                {title || 'Announcement title'}
              </h4>
              <div className="mt-3 text-sm text-primary-500 leading-relaxed whitespace-pre-wrap">
                {content || 'Announcement content will appear here...'}
              </div>
              <div className="flex items-center gap-2.5 mt-4 pt-3 border-t border-primary-100">
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? 'Staff'}
                  size="xs"
                />
                <span className="text-xs font-semibold text-primary-800">
                  {profile?.display_name ?? 'You'}
                </span>
                <span className="text-xs text-primary-400">Just now</span>
              </div>
            </div>
          </div>
        </div>
      </BottomSheet>
    </Page>
  )
}
