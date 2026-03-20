import { useState } from 'react'
import {
  Mail,
  AlertTriangle,
  Ban,
  XCircle,
  TrendingUp,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { StatCard } from '@/components/stat-card'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { TabBar } from '@/components/tab-bar'
import { supabase } from '@/lib/supabase'

const tabs = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp size={14} /> },
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
  const [activeTab, setActiveTab] = useState('overview')
  const { data: stats, isLoading: statsLoading } = useEmailStats()
  const { data: bounces, isLoading: bouncesLoading } = useEmailBounces()
  const { data: complaints, isLoading: complaintsLoading } = useEmailComplaints()

  return (
    <AdminLayout title="Email & Delivery">
      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-4" />

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
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
                label="Total Bounces"
                icon={<XCircle size={20} />}
                className="from-red-50 to-red-100/50 border-red-100"
              />
              <StatCard
                value={stats?.complaints ?? 0}
                label="Spam Complaints"
                icon={<AlertTriangle size={20} />}
                className="from-amber-50 to-amber-100/50 border-amber-100"
              />
              <StatCard
                value={stats?.suppressed ?? 0}
                label="Suppressed Addresses"
                icon={<Ban size={20} />}
                className="from-white to-primary-100/50 border-primary-200"
              />
            </div>
          )}

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">
                  SendGrid Integration
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  Bounced and complained addresses are automatically added to the suppression
                  list. Emails to suppressed addresses are blocked to protect sender reputation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bounces */}
      {activeTab === 'bounces' && (
        <>
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
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-primary-100"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 shrink-0">
                    <XCircle size={16} className="text-red-500" />
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
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 shrink-0">
                    Suppressed
                  </span>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      )}

      {/* Complaints */}
      {activeTab === 'complaints' && (
        <>
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
                  className="flex items-center gap-3 p-3 rounded-xl bg-white border border-primary-100"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 shrink-0">
                    <AlertTriangle size={16} className="text-amber-500" />
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
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                    Suppressed
                  </span>
                </StaggeredItem>
              ))}
            </StaggeredList>
          )}
        </>
      )}
    </AdminLayout>
  )
}
