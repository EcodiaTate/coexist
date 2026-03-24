import { FileDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PdfViewerProps {
  url: string
  fileName?: string | null
  fileSizeBytes?: number | null
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function PdfViewer({ url, fileName, fileSizeBytes, className }: PdfViewerProps) {
  const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('application/pdf')

  return (
    <div className={cn('rounded-xl overflow-hidden border border-primary-200', className)}>
      {/* Inline viewer for PDFs */}
      {isPdf && (
        <div className="w-full aspect-[3/4] max-h-[600px] bg-primary-50">
          <iframe
            src={`${url}#toolbar=1&navpanes=0`}
            title={fileName ?? 'PDF Document'}
            className="w-full h-full"
          />
        </div>
      )}

      {/* File info bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-bark-100 shrink-0">
          <FileDown size={16} className="text-bark-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-800 truncate">
            {fileName ?? 'Document'}
          </p>
          {fileSizeBytes && (
            <p className="text-xs text-primary-400">{formatFileSize(fileSizeBytes)}</p>
          )}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download={fileName ?? undefined}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-100 text-primary-700 text-xs font-semibold hover:bg-primary-200 transition-colors"
        >
          <ExternalLink size={12} />
          {isPdf ? 'Open' : 'Download'}
        </a>
      </div>
    </div>
  )
}

export default PdfViewer
