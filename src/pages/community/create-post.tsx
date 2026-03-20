import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Image as ImageIcon, X, Tag, Users } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { UploadProgress } from '@/components/upload-progress'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import { useCreatePost } from '@/hooks/use-feed'
import { useImageUpload } from '@/hooks/use-image-upload'
import { compressImage } from '@/lib/image-utils'

/* ------------------------------------------------------------------ */
/*  Create post page                                                   */
/* ------------------------------------------------------------------ */

export default function CreatePostPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const createPost = useCreatePost()
  const shouldReduceMotion = useReducedMotion()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const postUpload = useImageUpload({ bucket: 'post-images' })

  const [caption, setCaption] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])

  // TODO: populate from user's collectives
  const [collectiveId] = useState<string | null>(null)

  const canPost = caption.trim().length > 0 || selectedFiles.length > 0

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

  const handleSubmit = async () => {
    if (!user || !canPost) return

    try {
      // Upload images via unified pipeline (compress + progress)
      let imageUrls: string[] = []
      if (selectedFiles.length > 0) {
        const results = await postUpload.uploadMultiple(selectedFiles)
        imageUrls = results.map((r) => r.url)
      }

      await createPost.mutateAsync({
        content: caption.trim(),
        images: imageUrls,
        collectiveId: collectiveId ?? '',
        type: 'photo',
      })

      toast.success('Post shared!')
      navigate('/community')
    } catch {
      toast.error('Failed to create post')
    }
  }

  const isSubmitting = postUpload.uploading || createPost.isPending

  return (
    <Page
      header={
        <Header
          title="Create Post"
          back
          rightActions={
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              loading={isSubmitting}
              disabled={!canPost || isSubmitting}
            >
              Post
            </Button>
          }
        />
      }
    >
      <div className="flex-1 px-4 pt-4">
        {/* Author row */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar
            src={profile?.avatar_url}
            name={profile?.display_name ?? 'You'}
            size="md"
          />
          <div>
            <p className="font-heading font-semibold text-sm text-primary-800">
              {profile?.display_name ?? 'You'}
            </p>
            {collectiveId && (
              <p className="text-xs text-primary-400">
                Posting to collective
              </p>
            )}
          </div>
        </div>

        {/* Caption */}
        <div className="rounded-2xl bg-white border border-primary-100 p-4 mb-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Share a moment, story, or update..."
            rows={5}
            maxLength={2000}
            className={cn(
              'w-full resize-none text-base text-primary-800',
              'placeholder:text-primary-300',
              'bg-transparent border-none outline-none',
              'leading-relaxed',
            )}
            aria-label="Post caption"
            autoFocus
          />

          {/* Character count */}
          <div className="flex justify-end pt-2 border-t border-primary-50">
            <span className={cn(
              'text-xs',
              caption.length > 1800 ? 'text-warning' : 'text-primary-300',
            )}>
              {caption.length}/2000
            </span>
          </div>
        </div>

        {/* Image previews */}
        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
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
                    'flex items-center justify-center w-6 h-6 rounded-full',
                    'bg-black/60 text-white',
                    'cursor-pointer select-none',
                    'hover:bg-black/80 transition-colors duration-150',
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

        {/* Upload progress */}
        <UploadProgress
          progress={postUpload.progress}
          uploading={postUpload.uploading}
          error={postUpload.error}
          className="mb-3"
        />

        {/* Action buttons */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={selectedFiles.length >= 10}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-2',
              'py-5 rounded-2xl',
              'bg-primary-50 border-2 border-primary-100',
              'active:scale-[0.97] transition-all duration-150',
              'cursor-pointer select-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
            )}
          >
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <ImageIcon size={20} className="text-primary-600" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-primary-700">
              Photos
              {selectedFiles.length > 0 && (
                <span className="text-primary-400 font-normal"> ({selectedFiles.length}/10)</span>
              )}
            </span>
          </button>

          <button
            type="button"
            disabled
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-2',
              'py-5 rounded-2xl',
              'bg-white border-2 border-primary-100',
              'opacity-40 cursor-not-allowed',
            )}
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Tag size={20} className="text-primary-400" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-primary-400">Tag Event</span>
          </button>

          <button
            type="button"
            disabled
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-2',
              'py-5 rounded-2xl',
              'bg-white border-2 border-primary-100',
              'opacity-40 cursor-not-allowed',
            )}
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <Users size={20} className="text-primary-400" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-primary-400">Tag People</span>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
          aria-hidden="true"
        />

        {/* Bottom buffer */}
        <div className="h-24" />
      </div>
    </Page>
  )
}
