import { useState } from 'react'
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
} from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import { Avatar } from '@/components/avatar'
import { BottomSheet } from '@/components/bottom-sheet'
import { UploadProgress } from '@/components/upload-progress'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCreateAnnouncement } from '@/hooks/use-announcements'
import { useImageUpload } from '@/hooks/use-image-upload'
import { useCamera } from '@/hooks/use-camera'
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
/*  Create announcement page                                           */
/* ------------------------------------------------------------------ */

export default function CreateAnnouncementPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { toast } = useToast()
  const createAnnouncement = useCreateAnnouncement()
  const { pickFromGallery, loading: cameraLoading } = useCamera()
  const annUpload = useImageUpload({ bucket: 'announcement-images' })

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<Enums<'announcement_priority'>>('normal')
  const [targetAudience, setTargetAudience] = useState<Enums<'announcement_target'>>('all')
  const [isPinned, setIsPinned] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  const canSubmit = title.trim().length > 0 && content.trim().length > 0

  const handleImageChange = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return

    try {
      let imageUrl: string | undefined
      if (imageFile) {
        const uploaded = await annUpload.upload(imageFile)
        imageUrl = uploaded.url
      }

      await createAnnouncement.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        imageUrl,
        priority,
        targetAudience,
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
        {/* Title */}
        <div>
          <label
            htmlFor="ann-title"
            className="block text-sm font-semibold text-primary-800 mb-1.5"
          >
            Title
          </label>
          <input
            id="ann-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement title"
            maxLength={200}
            className={cn(
              'w-full h-11 px-3 rounded-xl text-sm',
              'bg-white text-primary-800 placeholder:text-primary-400',
              'border-none outline-none',
              'focus:ring-2 focus:ring-primary-300',
            )}
          />
        </div>

        {/* Content */}
        <div>
          <label
            htmlFor="ann-content"
            className="block text-sm font-semibold text-primary-800 mb-1.5"
          >
            Content
          </label>
          <textarea
            id="ann-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your announcement..."
            rows={6}
            maxLength={5000}
            className={cn(
              'w-full px-3 py-3 rounded-xl text-sm resize-none',
              'bg-white text-primary-800 placeholder:text-primary-400',
              'border-none outline-none leading-relaxed',
              'focus:ring-2 focus:ring-primary-300',
            )}
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-primary-300">{content.length}/5000</span>
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="block text-sm font-semibold text-primary-800 mb-1.5">
            Image (optional)
          </label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full aspect-[16/9] object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview(null)
                }}
                className={cn(
                  'absolute top-2 right-2 px-2.5 py-1 rounded-lg',
                  'bg-black/60 text-white text-xs font-medium',
                  'cursor-pointer hover:bg-black/80 transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                )}
              >
                Remove
              </button>
            </div>
          ) : (
            <label
              className={cn(
                'flex items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed border-primary-200',
                'text-sm text-primary-400 font-medium',
                'cursor-pointer hover:border-primary-300 hover:text-primary-500',
                'transition-colors duration-150',
              )}
            >
              <ImageIcon size={18} aria-hidden="true" />
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e.target.files)}
                className="hidden"
              />
            </label>
          )}
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
                'border-2 transition-all duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                priority === 'normal'
                  ? 'border-primary-500 bg-white text-primary-400'
                  : 'border-primary-200 text-primary-400 hover:border-primary-200',
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
                'border-2 transition-all duration-150 cursor-pointer select-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                priority === 'urgent'
                  ? 'border-accent-500 bg-white text-primary-800'
                  : 'border-primary-200 text-primary-400 hover:border-primary-200',
              )}
              aria-pressed={priority === 'urgent'}
            >
              <AlertTriangle size={14} aria-hidden="true" />
              Urgent
            </button>
          </div>
        </div>

        {/* Target audience */}
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
                    'border-2 transition-all duration-150 cursor-pointer select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
                    isSelected
                      ? 'border-primary-500 bg-white'
                      : 'border-primary-200 hover:border-primary-200',
                  )}
                  aria-pressed={isSelected}
                >
                  <Icon
                    size={18}
                    className={isSelected ? 'text-primary-400' : 'text-primary-400'}
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
        </div>

        {/* Pin toggle */}
        <button
          type="button"
          onClick={() => setIsPinned(!isPinned)}
          className={cn(
            'flex items-center gap-3 w-full px-4 py-3 rounded-xl',
            'border-2 transition-all duration-150 cursor-pointer select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
            isPinned
              ? 'border-primary-500 bg-white'
              : 'border-primary-200 hover:border-primary-200',
          )}
          aria-pressed={isPinned}
        >
          <Pin
            size={18}
            className={isPinned ? 'text-primary-400' : 'text-primary-400'}
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

      {/* Preview sheet */}
      <BottomSheet
        open={showPreview}
        onClose={() => setShowPreview(false)}
        snapPoints={[0.7]}
      >
        <div className="space-y-4">
          <h3 className="font-heading text-lg font-bold text-primary-800 text-center">
            Preview
          </h3>

          <div
            className={cn(
              'rounded-2xl shadow-md overflow-hidden',
              priority === 'urgent'
                ? 'bg-gradient-to-br from-white to-accent-100 border border-accent-200'
                : 'bg-white border border-primary-200',
            )}
          >
            {isPinned && (
              <div className="flex items-center gap-1 px-4 pt-3">
                <Pin size={12} className="text-primary-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary-400">Pinned</span>
              </div>
            )}

            {imagePreview && (
              <div className="mx-4 mt-3 rounded-xl overflow-hidden">
                <img
                  src={imagePreview}
                  alt=""
                  className="w-full aspect-[16/9] object-cover"
                />
              </div>
            )}

            <div className="px-4 pt-3 pb-4">
              <h4 className="font-heading font-bold text-base text-primary-800">
                {title || 'Announcement title'}
              </h4>
              <p className="mt-2 text-sm text-primary-400 leading-relaxed whitespace-pre-wrap">
                {content || 'Announcement content will appear here...'}
              </p>
              <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-primary-100/60">
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
