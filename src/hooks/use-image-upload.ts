import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { uploadImage, type UploadImageResult } from '@/lib/image-utils'
import { useUpload } from '@/hooks/use-upload'

interface UseImageUploadOptions {
  bucket: string
  /** Path prefix within the bucket (user ID is prepended automatically) */
  pathPrefix?: string
}

/** A photo that failed to upload and can be retried */
export interface FailedUpload {
  blob: Blob
  error: string
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
  /** Photos that failed to upload (available for retry) */
  failedUploads: FailedUpload[]
  /** Retry a specific failed upload by index */
  retry: (index: number) => Promise<UploadImageResult>
  /** Clear a specific failed upload entry */
  clearFailed: (index: number) => void
  /** Whether any uploads are in a failed state */
  hasFailed: boolean
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
  const [failedUploads, setFailedUploads] = useState<FailedUpload[]>([])

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

  // Base state management from shared hook
  const { uploading, progress, error, reset: resetBase, run } = useUpload<
    { file: Blob; path: string },
    UploadImageResult
  >(
    useCallback(
      ({ file, path }, onProgress) => uploadImage(file, bucket, path, onProgress),
      [bucket],
    ),
  )

  const reset = useCallback(() => {
    resetBase()
    setFailedUploads([])
  }, [resetBase])

  const upload = useCallback(
    async (file: Blob, customPath?: string): Promise<UploadImageResult> => {
      if (!user) throw new Error('Not authenticated')
      const path = buildPath(customPath)
      try {
        return await run({ file, path })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Upload failed'
        setFailedUploads((prev) => [...prev, { blob: file, error: msg }])
        throw e
      }
    },
    [user, buildPath, run],
  )

  const uploadMultiple = useCallback(
    async (files: Blob[]): Promise<UploadImageResult[]> => {
      if (!user) throw new Error('Not authenticated')

      const total = files.length
      const fileProgress = new Array(total).fill(0)

      const settled = await Promise.allSettled(
        files.map((file, i) => {
          const path = buildPath()
          return uploadImage(file, bucket, path, (p) => {
            fileProgress[i] = p
          })
        }),
      )

      const results: UploadImageResult[] = []
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          results.push(outcome.value)
        }
      }

      return results
    },
    [user, bucket, buildPath],
  )

  const retry = useCallback(
    async (index: number): Promise<UploadImageResult> => {
      const failed = failedUploads[index]
      if (!failed) throw new Error('No failed upload at this index')
      setFailedUploads((prev) => prev.filter((_, i) => i !== index))
      return upload(failed.blob)
    },
    [failedUploads, upload],
  )

  const clearFailed = useCallback((index: number) => {
    setFailedUploads((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const hasFailed = failedUploads.length > 0

  return { upload, uploadMultiple, progress, uploading, error, failedUploads, retry, clearFailed, hasFailed, reset }
}
