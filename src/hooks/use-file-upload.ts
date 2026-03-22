import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { uploadWithProgress } from '@/lib/image-utils'

interface UseFileUploadOptions {
  bucket: string
  pathPrefix?: string
  /** Max file size in MB (default 20) */
  maxSizeMB?: number
}

interface UseFileUploadReturn {
  upload: (file: File) => Promise<{ url: string; path: string; fileName: string }>
  uploading: boolean
  progress: number | null
  error: string | null
  reset: () => void
}

/**
 * General-purpose file upload (PDFs, docs, images — no compression).
 * Uploads directly to Supabase Storage and returns the public URL.
 */
export function useFileUpload({
  bucket,
  pathPrefix = '',
  maxSizeMB = 20,
}: UseFileUploadOptions): UseFileUploadReturn {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setUploading(false)
    setProgress(null)
    setError(null)
  }, [])

  const upload = useCallback(
    async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      if (file.size > maxSizeMB * 1024 * 1024) {
        const msg = `File too large (max ${maxSizeMB}MB)`
        setError(msg)
        throw new Error(msg)
      }

      setUploading(true)
      setError(null)
      setProgress(0)

      try {
        const uid = user.id
        const prefix = pathPrefix ? `${pathPrefix}/` : ''
        const ts = Date.now()
        const rand = Math.random().toString(36).slice(2, 8)
        // Preserve original extension
        const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
        const path = `${uid}/${prefix}${ts}-${rand}.${ext}`

        const result = await uploadWithProgress({
          bucket,
          path,
          file,
          onProgress: (p) => setProgress(p),
        })

        setProgress(100)
        return { url: result.url, path: result.path, fileName: file.name }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed'
        setError(msg)
        throw e
      } finally {
        setUploading(false)
      }
    },
    [user, bucket, pathPrefix, maxSizeMB],
  )

  return { upload, uploading, progress, error, reset }
}
