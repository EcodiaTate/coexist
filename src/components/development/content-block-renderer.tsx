import { MarkdownRenderer } from './markdown-renderer'
import { VideoPlayer } from './video-player'
import { PdfViewer } from './pdf-viewer'
import { Slideshow } from './slideshow'
import { cn } from '@/lib/cn'
import type { DevModuleContent } from '@/hooks/use-admin-development'

interface ContentBlockRendererProps {
  block: DevModuleContent
  className?: string
}

export function ContentBlockRenderer({ block, className }: ContentBlockRendererProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Optional block title */}
      {block.title && (
        <h3 className="font-heading text-lg font-bold text-primary-800">{block.title}</h3>
      )}

      {/* Text block */}
      {block.content_type === 'text' && block.text_content && (
        <MarkdownRenderer content={block.text_content} />
      )}

      {/* Video block */}
      {block.content_type === 'video' && block.video_url && (
        <VideoPlayer
          url={block.video_url}
          provider={block.video_provider}
        />
      )}

      {/* File block */}
      {block.content_type === 'file' && block.file_url && (
        <PdfViewer
          url={block.file_url}
          fileName={block.file_name}
          fileSizeBytes={block.file_size_bytes}
        />
      )}

      {/* Slideshow block */}
      {block.content_type === 'slideshow' && block.image_urls.length > 0 && (
        <Slideshow
          images={block.image_urls}
          captions={block.image_captions}
        />
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
