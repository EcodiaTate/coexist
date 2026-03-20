import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { MessageCircle, Users } from 'lucide-react'
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
        <div className="p-4">
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
      <div className="p-4">
        <div className="space-y-2">
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

            return (
              <motion.div
                key={membership.collective_id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.2), duration: 0.2 }}
              >
                <Link
                  to={`/chat/${membership.collective_id}`}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.98]"
                >
                  {/* Collective avatar */}
                  <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-primary-100">
                    {collective.cover_image_url ? (
                      <img
                        src={collective.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Users size={20} className="text-primary-400" />
                      </div>
                    )}
                  </div>

                  {/* Name + member count */}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm font-semibold text-primary-800 truncate">
                      {collective.name}
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      {collective.member_count} members
                    </p>
                  </div>

                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-primary-800 px-1.5 text-xs font-bold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
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
