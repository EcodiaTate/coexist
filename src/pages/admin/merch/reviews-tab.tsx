import { useCallback } from 'react'
import { Check, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { Avatar } from '@/components/avatar'
import { useToast } from '@/components/toast'
import { useAdminReviews, useModerateReview } from '@/hooks/use-admin-merch'
import { cn } from '@/lib/cn'

export default function ReviewsTab() {
  const { data: reviews, isLoading } = useAdminReviews()
  const moderate = useModerateReview()
  const { toast } = useToast()

  const handleModerate = useCallback(
    async (reviewId: string, status: 'approved' | 'removed') => {
      try {
        await moderate.mutateAsync({ reviewId, status })
        toast.success(`Review ${status}`)
      } catch {
        toast.error('Failed to moderate review')
      }
    },
    [moderate, toast],
  )

  if (isLoading) {
    return <Skeleton variant="text" count={5} />
  }

  if (!reviews || reviews.length === 0) {
    return (
      <EmptyState
        illustration="empty"
        title="No reviews"
        description="Product reviews will appear here for moderation"
      />
    )
  }

  return (
    <StaggeredList className="space-y-3">
      {reviews.map((review) => (
        <StaggeredItem
          key={review.id}
          className="p-4 bg-white rounded-2xl border border-primary-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <Avatar
              src={review.profiles?.avatar_url}
              name={review.profiles?.display_name ?? 'User'}
              size="xs"
            />
            <span className="text-sm font-medium text-primary-800">
              {review.profiles?.display_name ?? 'Anonymous'}
            </span>
            <div className="flex items-center gap-0.5 ml-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={12}
                  className={cn(
                    i < review.rating ? 'text-warning-400 fill-warning-400' : 'text-primary-300',
                  )}
                />
              ))}
            </div>
          </div>
          {review.text && (
            <p className="text-sm text-primary-400 mb-2">{review.text}</p>
          )}
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize',
                review.status === 'approved' && 'bg-success-100 text-success-800',
                review.status === 'pending' && 'bg-warning-100 text-warning-800',
                review.status === 'removed' && 'bg-error-100 text-error-700',
              )}
            >
              {review.status}
            </span>
            <div className="flex gap-2">
              {review.status !== 'approved' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Check size={14} />}
                  loading={moderate.isPending}
                  onClick={() => handleModerate(review.id, 'approved')}
                >
                  Approve
                </Button>
              )}
              {review.status !== 'removed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  loading={moderate.isPending}
                  onClick={() => handleModerate(review.id, 'removed')}
                  className="text-error"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </StaggeredItem>
      ))}
    </StaggeredList>
  )
}
