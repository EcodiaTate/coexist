import { lazy, Suspense } from 'react'
import { cn } from '@/lib/cn'
import type { DevModuleContent } from '@/hooks/use-admin-development'

const MarkdownRenderer = lazy(() => import('./markdown-renderer'))
const VideoPlayer = lazy(() => import('./video-player'))
const PdfViewer = lazy(() => import('./pdf-viewer'))
const Slideshow = lazy(() => import('./slideshow'))

interface ContentBlockRendererProps {
  block: DevModuleContent
  className?: string
}

const BlockFallback = () => <div className="h-24 animate-pulse rounded-lg bg-white" />

export function ContentBlockRenderer({ block, className }: ContentBlockRendererProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Optional block title */}
      {block.title && (
        <h3 className="font-heading text-lg font-bold text-primary-800">{block.title}</h3>
      )}

      {/* Text block */}
      {block.content_type === 'text' && block.text_content && (
        <Suspense fallback={<BlockFallback />}>
          <MarkdownRenderer content={block.text_content} />
        </Suspense>
      )}

      {/* Video block */}
      {block.content_type === 'video' && block.video_url && (
        <Suspense fallback={<BlockFallback />}>
          <VideoPlayer
            url={block.video_url}
            provider={block.video_provider}
          />
        </Suspense>
      )}

      {/* File block */}
      {block.content_type === 'file' && block.file_url && (
        <Suspense fallback={<BlockFallback />}>
          <PdfViewer
            url={block.file_url}
            fileName={block.file_name}
            fileSizeBytes={block.file_size_bytes}
          />
        </Suspense>
      )}

      {/* Slideshow block */}
      {block.content_type === 'slideshow' && block.image_urls.length > 0 && (
        <Suspense fallback={<BlockFallback />}>
          <Slideshow
            images={block.image_urls}
            captions={block.image_captions}
          />
        </Suspense>
      )}

      {/* Quiz block  rendered separately by the parent page */}
      {block.content_type === 'quiz' && (
        <div className="rounded-xl bg-moss-50 border border-moss-200 p-4 text-center">
          <p className="text-sm font-semibold text-moss-700">Quiz section</p>
          <p className="text-xs text-moss-500 mt-0.5">Complete the quiz below to continue</p>
        </div>
      )}
    </div>
  )
}

export default ContentBlockRenderer
