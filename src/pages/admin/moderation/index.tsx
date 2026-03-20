import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Shield,
  Check,
  Trash2,
  AlertTriangle,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Filter,
} from 'lucide-react'
import { AdminLayout } from '@/components/admin-layout'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { TabBar } from '@/components/tab-bar'
import { EmptyState } from '@/components/empty-state'
import { Skeleton } from '@/components/skeleton'
import { ConfirmationSheet } from '@/components/confirmation-sheet'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { useToast } from '@/components/toast'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { ContentReport, Profile, Enums } from '@/types/database.types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ReportWithReporter extends ContentReport {
  reporter: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

/* ------------------------------------------------------------------ */
/*  Content type config                                                */
/* ------------------------------------------------------------------ */

const contentTypeConfig: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  post: { icon: FileText, label: 'Post', color: 'text-blue-600 bg-blue-100' },
  photo: { icon: ImageIcon, label: 'Photo', color: 'text-purple-600 bg-purple-100' },
  chat_message: { icon: MessageSquare, label: 'Chat Message', color: 'text-green-600 bg-green-100' },
  comment: { icon: MessageSquare, label: 'Comment', color: 'text-amber-600 bg-amber-100' },
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useModerationQueue(status: Enums<'report_status'>) {
  return useQuery({
    queryKey: ['moderation-queue', status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_reports')
        .select(`
          *,
          reporter:profiles!content_reports_reporter_id_fkey(id, display_name, avatar_url)
        `)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      return (data ?? []) as ReportWithReporter[]
    },
    staleTime: 30 * 1000,
  })
}

function useReviewReport() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId, action }: { reportId: string; action: Enums<'report_status'> }) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('content_reports')
        .update({
          status: action,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reportId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderation-queue'] })
    },
  })
}

/* ------------------------------------------------------------------ */
/*  Time helper                                                        */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ------------------------------------------------------------------ */
/*  Report card                                                        */
/* ------------------------------------------------------------------ */

function ReportCard({
  report,
  onApprove,
  onRemove,
  onDismiss,
}: {
  report: ReportWithReporter
  onApprove: () => void
  onRemove: () => void
  onDismiss: () => void
}) {
  const shouldReduceMotion = useReducedMotion()
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const config = contentTypeConfig[report.content_type] ?? contentTypeConfig.post
  const TypeIcon = config.icon

  return (
    <>
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-md overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <div
            className={cn(
              'flex items-center justify-center w-9 h-9 rounded-full',
              config.color,
            )}
          >
            <TypeIcon size={16} aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-primary-800">
                {config.label} Report
              </span>
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                report.status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : report.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : report.status === 'removed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-white text-primary-400',
              )}>
                {report.status}
              </span>
            </div>
            <span className="text-xs text-primary-400">
              {formatDate(report.created_at)}
            </span>
          </div>
        </div>

        {/* Reason */}
        <div className="px-4 py-2">
          <div className="bg-white rounded-xl px-3 py-2.5">
            <p className="text-xs font-medium text-primary-400 mb-1">Reason</p>
            <p className="text-sm text-primary-800">{report.reason}</p>
          </div>
        </div>

        {/* Reporter */}
        <div className="flex items-center gap-2 px-4 py-2">
          <Avatar
            src={report.reporter?.avatar_url}
            name={report.reporter?.display_name ?? 'Reporter'}
            size="xs"
          />
          <span className="text-xs text-primary-400">
            Reported by{' '}
            <span className="font-medium text-primary-800">
              {report.reporter?.display_name ?? 'Unknown'}
            </span>
          </span>
        </div>

        {/* Content ID reference */}
        <div className="px-4 py-1">
          <span className="text-xs text-primary-400 font-mono">
            ID: {report.content_id.slice(0, 8)}...
          </span>
        </div>

        {/* Actions */}
        {report.status === 'pending' && (
          <div className="flex gap-2 px-4 py-3 border-t border-primary-100">
            <Button
              variant="ghost"
              size="sm"
              icon={<Check size={14} />}
              onClick={onApprove}
              className="flex-1 !text-green-600 hover:!bg-green-50"
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 size={14} />}
              onClick={() => setShowRemoveConfirm(true)}
              className="flex-1 !text-red-600 hover:!bg-red-50"
            >
              Remove
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="flex-1"
            >
              Dismiss
            </Button>
          </div>
        )}
      </motion.div>

      <ConfirmationSheet
        open={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={onRemove}
        title="Remove this content?"
        description="The content will be hidden from all users. The author will be notified."
        confirmLabel="Remove Content"
        variant="danger"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Moderation page                                                    */
/* ------------------------------------------------------------------ */

const statusTabs = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'removed', label: 'Removed' },
  { id: 'dismissed', label: 'Dismissed' },
]

export default function ModerationQueuePage() {
  const { toast } = useToast()
  const [activeStatus, setActiveStatus] = useState<Enums<'report_status'>>('pending')
  const { data: reports, isLoading, refetch } = useModerationQueue(activeStatus)
  const reviewReport = useReviewReport()

  const handleAction = (reportId: string, action: Enums<'report_status'>) => {
    reviewReport.mutate(
      { reportId, action },
      {
        onSuccess: () => {
          const label = action === 'approved'
            ? 'Content approved'
            : action === 'removed'
              ? 'Content removed'
              : 'Report dismissed'
          toast.success(label)
        },
        onError: () => toast.error('Failed to update report'),
      },
    )
  }

  const handleRefresh = useCallback(async () => {
    await refetch()
  }, [refetch])

  const isEmpty = !isLoading && (reports ?? []).length === 0

  return (
    <AdminLayout title="Content Moderation">
      <TabBar
        tabs={statusTabs}
        activeTab={activeStatus}
        onChange={(id) => setActiveStatus(id as Enums<'report_status'>)}
        aria-label="Report status filter"
        className="mb-4"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton variant="card" />
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          illustration="empty"
          title={activeStatus === 'pending' ? 'No pending reports' : `No ${activeStatus} reports`}
          description={
            activeStatus === 'pending'
              ? 'All content has been reviewed. Check back later.'
              : `No reports with status "${activeStatus}"`
          }
        />
      ) : (
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="space-y-4">
            {/* Stats header for pending */}
            {activeStatus === 'pending' && (
              <div className="flex items-center gap-2 px-1">
                <AlertTriangle size={14} className="text-amber-500" aria-hidden="true" />
                <span className="text-sm font-medium text-primary-800">
                  {reports?.length ?? 0} report{(reports?.length ?? 0) !== 1 ? 's' : ''} pending review
                </span>
              </div>
            )}

            {(reports ?? []).map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onApprove={() => handleAction(report.id, 'approved')}
                onRemove={() => handleAction(report.id, 'removed')}
                onDismiss={() => handleAction(report.id, 'dismissed')}
              />
            ))}
          </div>
        </PullToRefresh>
      )}
    </AdminLayout>
  )
}
