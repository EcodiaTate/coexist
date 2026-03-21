import { useState, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { supabase } from '@/lib/supabase'

const tabs = [
  { id: 'bounces', label: 'Bounces', icon: <XCircle size={14} /> },
  { id: 'complaints', label: 'Complaints', icon: <AlertTriangle size={14} /> },
]

function useEmailStats() {
  return useQuery({
    queryKey: ['admin-email-stats'],
    queryFn: async () => {
      // Email delivery data from email_events table
      const [bouncesRes, complaintsRes, suppressedRes] = await Promise.all([
        supabase
          .from('email_events' as any)
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'bounce'),
        supabase
          .from('email_events' as any)
          .select('id', { count: 'exact', head: true })
          .eq('event_type', 'complaint'),
        supabase
          .from('email_suppressions' as any)
          .select('id', { count: 'exact', head: true }),
      ])

      return {
        bounces: bouncesRes.count ?? 0,
        complaints: complaintsRes.count ?? 0,
        suppressed: suppressedRes.count ?? 0,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}

function useEmailBounces() {
  return useQuery({
    queryKey: ['admin-email-bounces'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events' as any)
        .select('*')
        .eq('event_type', 'bounce')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as any[]
    },
    staleTime: 60 * 1000,
  })
}

function useEmailComplaints() {
  return useQuery({
    queryKey: ['admin-email-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_events' as any)
        .select('*')
        .eq('event_type', 'complaint')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as any[]
    },
    staleTime: 60 * 1000,
  })
}

export default function AdminEmailPage() {
  const [activeTab, setActiveTab] = useState('bounces')
  const { data: stats, isLoading: statsLoading } = useEmailStats()
  const { data: bounces, isLoading: bouncesLoading } = useEmailBounces()
  const { data: complaints, isLoading: complaintsLoading } = useEmailComplaints()

  const shouldReduceMotion = useReducedMotion()

  const heroStats = useMemo(() => (
    statsLoading ? (
      <div className="flex items-center gap-3">
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
        <Skeleton variant="stat-card" />
      </div>
    ) : stats ? (
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Bounces</p>
          <p className="text-xl font-bold text-white tabular-nums">{stats.bounces}</p>
        </div>
        <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Complaints</p>
          <p className="text-xl font-bold text-white tabular-nums">{stats.complaints}</p>
        </div>
        <div className="rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-0.5">Suppressed</p>
          <p className="text-xl font-bold text-white tabular-nums">{stats.suppressed}</p>
        </div>
      </div>
    ) : null
  ), [stats, statsLoading])

  useAdminHeader('Email & Delivery', { heroContent: heroStats })

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <div>
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2 }}
      >
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
      </motion.div>

      {/* Bounces */}
      {activeTab === 'bounces' && (
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.25 }}
        >
          {bouncesLoading ? (
            <Skeleton variant="list-item" count={5} />
          ) : !bounces?.length ? (
            <EmptyState
              illustration="empty"
              title="No bounces"
              description="Email bounces from SendGrid will appear here"
            />
          ) : (
            <StaggeredList className="space-y-1">
              {bounces.map((event) => (
                <StaggeredItem
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-error-100 shrink-0">
                    <XCircle size={16} className="text-error-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {event.email}
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      {event.reason ?? 'Hard bounce'} &middot;{' '}
                      {new Date(event.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-error-100 text-error-700 shrink-0">
                    Suppressed
                  </span>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </motion.div>
      )}

      {/* Complaints */}
      {activeTab === 'complaints' && (
        <motion.div
          initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.25 }}
        >
          {complaintsLoading ? (
            <Skeleton variant="list-item" count={5} />
          ) : !complaints?.length ? (
            <EmptyState
              illustration="empty"
              title="No complaints"
              description="Spam complaints from SendGrid will appear here"
            />
          ) : (
            <StaggeredList className="space-y-1">
              {complaints.map((event) => (
                <StaggeredItem
                  key={event.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning-100 shrink-0">
                    <AlertTriangle size={16} className="text-warning-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 truncate">
                      {event.email}
                    </p>
                    <p className="text-xs text-primary-400 mt-0.5">
                      Spam complaint &middot;{' '}
                      {new Date(event.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning-100 text-warning-700 shrink-0">
                    Suppressed
                  </span>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </motion.div>
      )}
    </div>
  )
}
