import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Megaphone,
  Plus,
  Pin,
  Clock,
} from 'lucide-react'
import { useLeaderHeader } from '@/components/leader-layout'
import { Button } from '@/components/button'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { useAuth } from '@/hooks/use-auth'
import {
  useAnnouncements,
  type AnnouncementWithAuthor,
} from '@/hooks/use-announcements'
import { useQueryClient } from '@tanstack/react-query'

/* ------------------------------------------------------------------ */
/*  Animation                                                          */
/* ------------------------------------------------------------------ */

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

/* ------------------------------------------------------------------ */
/*  Time helper                                                        */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = Date.now()
  const diff = Math.floor((now - date.getTime()) / 1000)

  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: diff > 31536000 ? 'numeric' : undefined,
  })
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LeaderAnnouncementsPage() {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  const queryClient = useQueryClient()
  const { data: announcements, isLoading } = useAnnouncements()

  useLeaderHeader('Announcements')

  if (isLoading) {
    return <Skeleton variant="list-item" count={4} />
  }

  if (!announcements || announcements.length === 0) {
    return (
      <EmptyState
        illustration="empty"
        title="No announcements"
        description="Share updates, reminders, and news with your collective."
        action={{ label: 'Create Announcement', to: '/announcements/create' }}
      />
    )
  }

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['announcements'] })}>
      {/* New button below hero */}
      <div className="flex justify-end mb-4">
        <Button
          variant="primary"
          size="sm"
          icon={<Plus size={14} />}
          onClick={() => navigate('/announcements/create')}
        >
          New Announcement
        </Button>
      </div>

      <motion.div
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
        className="space-y-3"
      >
        {announcements.map((a: AnnouncementWithAuthor) => (
          <motion.div
            key={a.id}
            variants={shouldReduceMotion ? undefined : fadeUp}
            className={cn(
              'rounded-2xl bg-white shadow-sm p-4',
              'hover:shadow-md transition-shadow duration-150',
              a.is_pinned && 'ring-1 ring-moss-200 bg-moss-50/30',
            )}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-2.5">
              <Avatar
                src={a.author?.avatar_url}
                name={a.author?.display_name ?? ''}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary-800 truncate">
                  {a.author?.display_name ?? 'Unknown'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-primary-400 flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(a.created_at)}
                  </span>
                  {a.is_pinned && (
                    <span className="text-[10px] font-semibold text-moss-600 flex items-center gap-0.5">
                      <Pin size={10} />
                      Pinned
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Title */}
            {a.title && (
              <p className="font-heading text-sm font-bold text-primary-800 mb-1.5">
                {a.title}
              </p>
            )}

            {/* Body */}
            <p className="text-sm text-primary-600 leading-relaxed line-clamp-4">
              {a.content}
            </p>

            {/* Image */}
            {a.image_url && (
              <img
                src={a.image_url}
                alt=""
                className="w-full h-40 object-cover rounded-xl mt-3"
              />
            )}
          </motion.div>
        ))}
      </motion.div>
    </PullToRefresh>
  )
}
