import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, Users, ChevronRight } from 'lucide-react'
import { Page } from '@/components/page'
import { Header } from '@/components/header'
import { Avatar } from '@/components/avatar'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { cn } from '@/lib/cn'
import { useMyCollectives } from '@/hooks/use-collective'
import { useUnreadCounts } from '@/hooks/use-chat'

/* ------------------------------------------------------------------ */
/*  Chat list page - shows all collectives the user is in              */
/* ------------------------------------------------------------------ */

export default function ChatListPage() {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const { data: myCollectives, isLoading } = useMyCollectives()
  const { data: unreadCounts = {} } = useUnreadCounts()

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-collectives'] }),
      queryClient.invalidateQueries({ queryKey: ['unread-counts'] }),
    ])
  }, [queryClient])

  if (isLoading) {
    return (
      <Page header={<Header title="Chat" />}>
        <div className="py-4">
          <Skeleton variant="list-item" count={5} />
        </div>
      </Page>
    )
  }

  if (!myCollectives?.length) {
    return (
      <Page header={<Header title="Chat" />}>
        <EmptyState
          illustration="empty"
          title="No group chats yet"
          description="Join a collective to access group chat with other members"
          action={{ label: 'Explore Collectives', to: '/collectives' }}
        />
      </Page>
    )
  }

  // If user is only in 1 collective, show that chat directly
  // The router handles redirect; this is for the list case
  if (myCollectives.length === 1) {
    const c = myCollectives[0]
    const collective = c.collectives as { id: string; name: string; slug: string; cover_image_url: string | null; region: string | null; state: string | null; member_count: number } | null
    if (collective) {
      // Redirect handled by router - but also render for navigation back
    }
  }

  return (
    <Page header={<Header title="Chat" />}>
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="py-4">
        <div className="space-y-3">
          {myCollectives.map((membership, i) => {
            const collective = membership.collectives as {
              id: string
              name: string
              slug: string
              cover_image_url: string | null
              region: string | null
              state: string | null
              member_count: number
            } | null

            if (!collective) return null

            const unread = unreadCounts[membership.collective_id] ?? 0
            const hasUnread = unread > 0

            return (
              <motion.div
                key={membership.collective_id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.25), duration: 0.25, ease: 'easeOut' }}
              >
                <Link
                  to={`/chat/${membership.collective_id}`}
                  className={cn(
                    'group relative flex items-center gap-3.5 rounded-2xl p-3.5',
                    'transition-all duration-150 active:scale-[0.98]',
                    hasUnread
                      ? 'bg-primary-50 ring-1 ring-primary-200/60 shadow-sm'
                      : 'bg-white ring-1 ring-primary-100/50 shadow-sm hover:shadow-md hover:ring-primary-200/60',
                  )}
                >
                  {/* Collective avatar with online-style ring for unread */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={cn(
                        'h-13 w-13 overflow-hidden rounded-2xl',
                        hasUnread
                          ? 'ring-2 ring-primary-400 ring-offset-2 ring-offset-primary-50'
                          : 'ring-1 ring-primary-100',
                      )}
                    >
                      {collective.cover_image_url ? (
                        <img
                          src={collective.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                          <Users size={22} className="text-primary-500" />
                        </div>
                      )}
                    </div>

                    {/* Unread dot indicator */}
                    {hasUnread && (
                      <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-primary-600 ring-2 ring-primary-50" />
                    )}
                  </div>

                  {/* Name + subtitle + location */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm truncate leading-snug',
                        hasUnread
                          ? 'font-bold text-primary-900'
                          : 'font-semibold text-primary-800',
                      )}
                    >
                      {collective.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users size={12} className="text-primary-400 shrink-0" />
                      <span className="text-xs text-primary-400">
                        {collective.member_count} members
                      </span>
                      {(collective.region || collective.state) && (
                        <>
                          <span className="text-primary-300">&middot;</span>
                          <span className="text-xs text-primary-400 truncate">
                            {collective.region ?? collective.state}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right side: unread count or chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {hasUnread ? (
                      <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary-600 px-2 text-xs font-bold text-white shadow-sm">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    ) : (
                      <ChevronRight size={18} className="text-primary-300 transition-transform duration-150 group-hover:translate-x-0.5" />
                    )}
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
      </PullToRefresh>
    </Page>
  )
}
