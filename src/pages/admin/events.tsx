import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  MapPin,
  Users,
  ChevronRight,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAdminHeader } from '@/components/admin-layout'
import { Input } from '@/components/input'
import { Dropdown } from '@/components/dropdown'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { StaggeredList, StaggeredItem } from '@/components/scroll-reveal'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

const statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
]

function useAdminEvents(search: string, status: string) {
  return useQuery({
    queryKey: ['admin-events', search, status],
    queryFn: async () => {
      const now = new Date().toISOString()
      let query = supabase
        .from('events')
        .select(
          'id, title, start_date, location_name, cover_image_url, collective_id, collectives(name)' as any,
        )
        .order('start_date' as any, { ascending: false })
        .limit(50)

      if (search) {
        query = query.ilike('title', `%${search}%`)
      }

      if (status === 'upcoming') {
        query = query.gte('start_date' as any, now)
      } else if (status === 'past') {
        query = query.lt('start_date' as any, now)
      }

      const { data, error } = await query
      if (error) throw error

      // Get registration counts
      const enriched = await Promise.all(
        ((data ?? []) as any[]).map(async (event: any) => {
          const { count } = await supabase
            .from('event_registrations')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)

          return { ...event, registrationCount: count ?? 0 }
        }),
      )

      return enriched
    },
    staleTime: 60 * 1000,
  })
}

export default function AdminEventsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')

  const { data: events, isLoading, isError } = useAdminEvents(search, status)

  useAdminHeader('Events')

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            type="search"
            label="Search events"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Event name..."
          />
        </div>
        <Dropdown
          options={statusOptions}
          value={status}
          onChange={setStatus}
          label="Status"
          className="w-40"
        />
      </div>

      {isLoading ? (
        <Skeleton variant="list-item" count={6} />
      ) : isError ? (
        <EmptyState
          illustration="empty"
          title="Failed to load events"
          description="Something went wrong. Please try again."
        />
      ) : !events?.length ? (
        <EmptyState
          illustration="empty"
          title="No events found"
          description="Try adjusting your filters"
        />
      ) : (
        <StaggeredList className="space-y-2">
          {events.map((event: any) => {
            const isPast = new Date(event.start_date) < new Date()
            return (
              <StaggeredItem key={event.id}>
              <Link
                to={`/events/${event.id}`}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl',
                  'bg-white border border-primary-100 shadow-sm',
                  'hover:shadow-md transition-shadow duration-150',
                  isPast && 'opacity-70',
                )}
              >
                {event.cover_image_url ? (
                  <img
                    src={event.cover_image_url}
                    alt=""
                    className="w-14 h-10 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                    <CalendarDays size={18} className="text-primary-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-800 truncate">
                    {event.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-primary-400">
                    <span>
                      {new Date(event.start_date).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {(event as any).collectives?.name && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} />
                        {(event as any).collectives.name}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Users size={10} />
                      {event.registrationCount} registered
                    </span>
                  </div>
                </div>

                <span
                  className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
                    isPast
                      ? 'bg-white text-primary-400'
                      : 'bg-success-100 text-success-700',
                  )}
                >
                  {isPast ? 'Past' : 'Upcoming'}
                </span>
                <ChevronRight size={16} className="text-primary-300 shrink-0" />
              </Link>
              </StaggeredItem>
            )
          })}
        </StaggeredList>
      )}
    </>
  )
}
