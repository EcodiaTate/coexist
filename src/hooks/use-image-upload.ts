import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { uploadImage, type UploadImageResult } from '@/lib/image-utils'

interface UseImageUploadOptions {
  bucket: string
  /** Path prefix within the bucket (user ID is prepended automatically) */
  pathPrefix?: string
}

interface UseImageUploadReturn {
  /** Upload a single file. Returns URLs on success. */
  upload: (file: Blob, customPath?: string) => Promise<UploadImageResult>
  /** Upload multiple files in parallel. */
  uploadMultiple: (files: Blob[]) => Promise<UploadImageResult[]>
  /** 0–100 for current upload(s). Null when idle. */
  progress: number | null
  /** Whether an upload is in flight */
  uploading: boolean
  /** Last error, cleared on next upload */
  error: string | null
  /** Reset state */
  reset: () => void
}

/**
 * Unified hook for image uploads with compression + progress.
 *
 * Usage:
 * ```ts
 * const { upload, progress, uploading } = useImageUpload({ bucket: 'post-images' })
 * const result = await upload(file)
 * // result.url, result.thumbnailUrl, result.mediumUrl
 * ```
 */
export function useImageUpload({
  bucket,
  pathPrefix = '',
}: UseImageUploadOptions): UseImageUploadReturn {
  const { user } = useAuth()
  const [progress, setProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setProgress(null)
    setUploading(false)
    setError(null)
  }, [])

  const buildPath = useCallback(
    (customPath?: string) => {
      if (customPath) return customPath
      const uid = user?.id ?? 'anon'
      const prefix = pathPrefix ? `${pathPrefix}/` : ''
      const ts = Date.now()
      const rand = Math.random().toString(36).slice(2, 8)
      return `${uid}/${prefix}${ts}-${rand}.jpg`
    },
    [user?.id, pathPrefix],
  )

  const upload = useCallback(
    async (file: Blob, customPath?: string): Promise<UploadImageResult> => {
      if (!user) throw new Error('Not authenticated')
      setUploading(true)
      setError(null)
      setProgress(0)

      try {
        const path = buildPath(customPath)
        const result = await uploadImage(file, bucket, path, (p) =>
          setProgress(p),
        )
        setProgress(100)
        return result
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed'
        setError(msg)
        throw e
      } finally {
        setUploading(false)
      }
    },
    [user, bucket, buildPath],
  )

  const uploadMultiple = useCallback(
    async (files: Blob[]): Promise<UploadImageResult[]> => {
      if (!user) throw new Error('Not authenticated')
      setUploading(true)
      setError(null)
      setProgress(0)

      const total = files.length
      const fileProgress = new Array(total).fill(0)

      try {
        const settled = await Promise.allSettled(
          files.map((file, i) => {
            const path = buildPath()
            return uploadImage(file, bucket, path, (p) => {
              fileProgress[i] = p
              const avg = Math.round(
                fileProgress.reduce((a, b) => a + b, 0) / total,
              )
              setProgress(avg)
            })
          }),
        )
        const results: UploadImageResult[] = []
        const errors: string[] = []
        for (const outcome of settled) {
          if (outcome.status === 'fulfilled') {
            results.push(outcome.value)
          } else {
            errors.push(outcome.reason instanceof Error ? outcome.reason.message : 'Upload failed')
          }
        }
        if (errors.length > 0) {
          setError(`${errors.length} upload(s) failed: ${errors.join(', ')}`)
        }
        setProgress(100)
        return results
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed'
        setError(msg)
        throw e
      } finally {
        setUploading(false)
      }
    },
    [user, bucket, buildPath],
  )

  return { upload, uploadMultiple, progress, uploading, error, reset }
}
