import { useState } from 'react'
import {
  FileText,
  Search,
  User,
  Clock,
  Filter,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { AdminLayout } from '@/components/admin-layout'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { Avatar } from '@/components/avatar'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

const actionTypeOptions = [
  { value: 'all', label: 'All Actions' },
  { value: 'user_updated', label: 'User Updated' },
  { value: 'user_suspended', label: 'User Suspended' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'role_changed', label: 'Role Changed' },
  { value: 'collective_created', label: 'Collective Created' },
  { value: 'collective_archived', label: 'Collective Archived' },
  { value: 'event_created', label: 'Event Created' },
  { value: 'challenge_created', label: 'Challenge Created' },
  { value: 'survey_created', label: 'Survey Created' },
  { value: 'feature_flag_toggled', label: 'Feature Flag Toggled' },
  { value: 'impersonation_started', label: 'Impersonation Started' },
]

const actionColors: Record<string, string> = {
  user_deleted: 'text-red-600 bg-red-50',
  user_suspended: 'text-amber-600 bg-amber-50',
  role_changed: 'text-purple-600 bg-purple-50',
  impersonation_started: 'text-red-600 bg-red-50',
  default: 'text-primary-400 bg-white',
}

function useAuditLog(search: string, actionFilter: string, page: number) {
  const pageSize = 25
  return useQuery({
    queryKey: ['admin-audit-log', search, actionFilter, page],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*, profiles!audit_logs_user_id_fkey(display_name, avatar_url)', {
          count: 'exact',
        })
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (search) {
        query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%`)
      }

      if (actionFilter && actionFilter !== 'all') {
        query = query.eq('action', actionFilter)
      }

      const { data, error, count } = await query
      if (error) throw error
      return { logs: data ?? [], total: count ?? 0 }
    },
    staleTime: 30 * 1000,
  })
}

export default function AdminAuditLogPage() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(0)

  const { data, isLoading } = useAuditLog(search, actionFilter, page)
  const pageSize = 25
  const totalPages = data ? Math.ceil(data.total / pageSize) : 0

  return (
    <AdminLayout title="Audit Log">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            label="Search actions"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Search..."
          />
        </div>
        <Dropdown
          options={actionTypeOptions}
          value={actionFilter}
          onChange={(v) => {
            setActionFilter(v)
            setPage(0)
          }}
          label="Action Type"
          className="w-48"
        />
      </div>

      {/* Log list */}
      {isLoading ? (
        <Skeleton variant="list-item" count={8} />
      ) : !data?.logs.length ? (
        <EmptyState
          illustration="empty"
          title="No audit logs"
          description={search || actionFilter !== 'all' ? 'Try different filters' : 'Admin actions will appear here'}
        />
      ) : (
        <>
          <StaggeredList className="space-y-1">
            {data.logs.map((log) => {
              const profile = (log as any).profiles
              const colorClass =
                actionColors[log.action] ?? actionColors.default

              return (
                <StaggeredItem
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white border border-primary-100"
                >
                  <Avatar
                    src={profile?.avatar_url}
                    name={profile?.display_name ?? 'System'}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-primary-800">
                        {profile?.display_name ?? 'System'}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                          colorClass,
                        )}
                      >
                        {log.action?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-primary-400 mt-0.5 line-clamp-2">
                        {log.details}
                      </p>
                    )}
                    {log.target_type && log.target_id && (
                      <p className="text-[10px] text-primary-400 mt-0.5">
                        {log.target_type}: {log.target_id}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-primary-400 shrink-0 flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(log.created_at).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </StaggeredItem>
              )
            })}
          </StaggeredList>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer',
                  page === 0
                    ? 'text-primary-300 cursor-not-allowed'
                    : 'text-primary-400 hover:bg-primary-50',
                )}
              >
                Previous
              </button>
              <span className="text-sm text-primary-400">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer',
                  page >= totalPages - 1
                    ? 'text-primary-300 cursor-not-allowed'
                    : 'text-primary-400 hover:bg-primary-50',
                )}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}
