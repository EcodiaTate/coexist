import { useRef } from 'react'
import { Camera, Upload } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useImageUpload } from '@/hooks/use-image-upload'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/button'
import { UploadProgress } from '@/components/upload-progress'
import { cn } from '@/lib/cn'

interface StepProfilePhotoProps {
  avatarUrl: string | null
  onUpload: (url: string) => void
  onNext: () => void
  onSkip: () => void
}

export function StepProfilePhoto({ avatarUrl, onUpload, onNext, onSkip }: StepProfilePhotoProps) {
  const shouldReduceMotion = useReducedMotion()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, progress, uploading, error } = useImageUpload({ bucket: 'avatars' })

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await upload(file)
      onUpload(result.url)
    } catch {
      // error state is managed by the hook
    }

    // Reset the input so re-selecting the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex-1 flex flex-col px-6 pt-8">
      <div className="flex-1 flex flex-col items-center">
        <h2 className="font-heading text-2xl font-bold text-primary-800 text-center">
          Add a profile photo
        </h2>
        <p className="mt-2 text-primary-400 text-center max-w-xs">
          Show your collective who you are. You can always change this later.
        </p>

        <motion.button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          className={cn(
            'relative mt-10 rounded-full cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-4',
          )}
          aria-label="Upload profile photo"
        >
          {avatarUrl ? (
            <Avatar src={avatarUrl} name="You" size="xl" />
          ) : (
            <div className="w-28 h-28 rounded-full bg-primary-100 flex items-center justify-center">
              <Camera className="w-10 h-10 text-primary-400" />
            </div>
          )}
          <span className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-800 flex items-center justify-center shadow-md">
            <Upload size={14} className="text-white" />
          </span>
        </motion.button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />

        <div className="mt-4 w-40">
          <UploadProgress progress={progress} uploading={uploading} error={error} />
        </div>
      </div>

      <div
        className="py-6 space-y-3"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Button variant="primary" size="lg" fullWidth onClick={onNext} disabled={!avatarUrl}>
          Continue
        </Button>
        <Button variant="ghost" size="lg" fullWidth onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </div>
  )
}
