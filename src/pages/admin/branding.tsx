import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Image,
  Upload,
  Trash2,
  Check,
  Loader2,
  ImagePlus,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Skeleton } from '@/components/skeleton'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/image-utils'

/* ------------------------------------------------------------------ */
/*  Image slot definitions                                             */
/* ------------------------------------------------------------------ */

interface ImageSlot {
  key: string
  label: string
  description: string
  aspectHint: string
  recommendedSize: string
}

const IMAGE_SLOTS: ImageSlot[] = [
  {
    key: 'home_hero',
    label: 'Home Hero Banner',
    description: 'Full-width banner at the top of the home feed',
    aspectHint: '21:9',
    recommendedSize: '1200 × 514',
  },
  {
    key: 'placeholder_event',
    label: 'Default Event Image',
    description: 'Shown when an event has no cover image',
    aspectHint: '16:9',
    recommendedSize: '1200 × 675',
  },
  {
    key: 'placeholder_merch',
    label: 'Default Product Image',
    description: 'Shown when a shop product has no image',
    aspectHint: '1:1',
    recommendedSize: '800 × 800',
  },
  {
    key: 'hero_welcome',
    label: 'Welcome Page Hero',
    description: 'Hero image on the sign-in / welcome screen',
    aspectHint: '16:9',
    recommendedSize: '1200 × 675',
  },
  {
    key: 'hero_download',
    label: 'Download Page Hero',
    description: 'Hero image on the public download page',
    aspectHint: '16:9',
    recommendedSize: '1200 × 675',
  },
  {
    key: 'placeholder_collective',
    label: 'Default Collective Image',
    description: 'Shown when a collective has no cover image',
    aspectHint: '16:9',
    recommendedSize: '1200 × 675',
  },
  {
    key: 'onboarding_bg',
    label: 'Onboarding Background',
    description: 'Background image during the onboarding flow',
    aspectHint: '9:16',
    recommendedSize: '750 × 1334',
  },
  {
    key: 'email_header',
    label: 'Email Header Image',
    description: 'Header image used in email templates',
    aspectHint: '3:1',
    recommendedSize: '600 × 200',
  },
]

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */

function useAppImagesAdmin() {
  return useQuery({
    queryKey: ['app-images'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_images' as any)
        .select('*')
      if (error) throw error
      const map: Record<string, { url: string; label: string }> = {}
      for (const row of (data ?? []) as any[]) {
        map[row.key] = { url: row.url, label: row.label }
      }
      return map
    },
    staleTime: 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Single image slot card                                             */
/* ------------------------------------------------------------------ */

function ImageSlotCard({
  slot,
  currentUrl,
}: {
  slot: ImageSlot
  currentUrl: string
}) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [justSaved, setJustSaved] = useState(false)

  const updateMutation = useMutation({
    mutationFn: async (url: string) => {
      const { error } = await supabase
        .from('app_images' as any)
        .upsert({ key: slot.key, url, label: slot.label } as any, { onConflict: 'key' })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-images'] })
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    },
    onError: () => toast.error('Failed to save image'),
  })

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Reset input so same file can be re-selected
      e.target.value = ''

      setUploading(true)
      setUploadProgress(0)

      try {
        const result = await uploadImage(
          file,
          'app-images',
          `${slot.key}_${Date.now()}.jpg`,
          (p) => setUploadProgress(p),
        )
        updateMutation.mutate(result.url)
        toast.success(`${slot.label} updated`)
      } catch {
        toast.error('Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [slot, updateMutation, toast],
  )

  const handleRemove = useCallback(() => {
    updateMutation.mutate('')
    toast.success(`${slot.label} removed`)
  }, [slot, updateMutation, toast])

  return (
    <motion.div
      layout
      className="rounded-2xl ring-1 ring-primary-100/60 bg-white overflow-hidden shadow-sm"
    >
      {/* Preview area */}
      <div className="relative bg-neutral-100">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt={slot.label}
            className="w-full h-44 object-cover"
          />
        ) : (
          <div className="w-full h-44 flex flex-col items-center justify-center text-neutral-400">
            <ImagePlus size={32} className="mb-2" />
            <p className="text-xs">No image set</p>
          </div>
        )}

        {/* Upload overlay */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center"
            >
              <Loader2 size={24} className="text-white animate-spin mb-2" />
              <p className="text-sm text-white font-medium">{uploadProgress}%</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved indicator */}
        <AnimatePresence>
          {justSaved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-500 text-white text-xs font-semibold"
            >
              <Check size={12} />
              Saved
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info + actions */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-primary-900">{slot.label}</h3>
        <p className="text-xs text-primary-500 mt-0.5">{slot.description}</p>
        <p className="text-[11px] text-primary-400 mt-1">
          {slot.aspectHint} · {slot.recommendedSize}px
        </p>

        <div className="flex gap-2 mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-semibold transition-colors active:scale-[0.97]',
              'bg-primary-100 text-primary-700 active:bg-primary-200',
            )}
          >
            <Upload size={16} />
            {currentUrl ? 'Replace' : 'Upload'}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading || updateMutation.isPending}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-error-50 text-error-500 active:bg-error-100 transition-colors active:scale-[0.97]"
              title="Remove image"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AdminBrandingPage() {
  useAdminHeader('Branding & Images')
  const { data: images, isLoading } = useAppImagesAdmin()
  const shouldReduceMotion = useReducedMotion()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div
      variants={shouldReduceMotion ? undefined : stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.p
        variants={fadeUp}
        className="text-sm text-primary-500 mb-6"
      >
        Upload and manage the images used across the app. Changes take effect
        immediately for all users.
      </motion.p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="card" className="h-72" />
          ))}
        </div>
      ) : (
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {IMAGE_SLOTS.map((slot) => (
            <ImageSlotCard
              key={slot.key}
              slot={slot}
              currentUrl={images?.[slot.key]?.url ?? ''}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  )
}
