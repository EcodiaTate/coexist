import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  Ban,
  XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { StatCard } from '@/components/stat-card'
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
  useAdminHeader('Email & Delivery')
  const [activeTab, setActiveTab] = useState('bounces')
  const { data: stats, isLoading: statsLoading } = useEmailStats()
  const { data: bounces, isLoading: bouncesLoading } = useEmailBounces()
  const { data: complaints, isLoading: complaintsLoading } = useEmailComplaints()

  const shouldReduceMotion = useReducedMotion()

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04 } },
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  }

  return (
    <motion.div variants={shouldReduceMotion ? undefined : stagger} initial="hidden" animate="visible">
      {/* Stats (always visible) */}
      <motion.div variants={fadeUp} className="mb-4">
        {statsLoading ? (
          <div className="grid grid-cols-3 gap-3">
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
            <Skeleton variant="stat-card" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              value={stats?.bounces ?? 0}
              label="Bounces"
              icon={<XCircle size={20} />}
              className="from-error-50 to-error-100/50"
            />
            <StatCard
              value={stats?.complaints ?? 0}
              label="Complaints"
              icon={<AlertTriangle size={20} />}
              className="from-warning-50 to-warning-100/50"
            />
            <StatCard
              value={stats?.suppressed ?? 0}
              label="Suppressed"
              icon={<Ban size={20} />}
              className="from-white to-primary-100/50"
            />
          </div>
        )}
      </motion.div>

      <motion.div variants={fadeUp}>
        <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />
      </motion.div>

      {/* Bounces */}
      {activeTab === 'bounces' && (
        <motion.div variants={fadeUp}>
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
        <motion.div variants={fadeUp}>
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
    </motion.div>
  )
}
