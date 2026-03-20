import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { MapPin, Users, Calendar, ExternalLink, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { OGMeta } from '@/components/og-meta'
import { APP_NAME } from '@/lib/constants'
import { WebFooter } from '@/components/web-footer'

export default function PublicCollectivePage() {
  const { slug } = useParams<{ slug: string }>()
  const shouldReduceMotion = useReducedMotion()

  const { data: collective, isLoading, error } = useQuery({
    queryKey: ['public-collective', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectives')
        .select('*')
        .eq('slug', slug!)
        .eq('is_active', true)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!slug,
  })

  const { data: upcomingEvents } = useQuery({
    queryKey: ['public-collective-events', collective?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, date_start, activity_type, address')
        .eq('collective_id', collective!.id)
        .eq('is_public', true)
        .eq('status', 'published')
        .gte('date_start', new Date().toISOString())
        .order('date_start', { ascending: true })
        .limit(5)
      if (error) throw error
      return data
    },
    enabled: !!collective?.id,
  })

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white">
        <div className="h-48 animate-pulse bg-white" />
        <div className="mx-auto max-w-2xl p-6 space-y-4">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={3} />
        </div>
      </div>
    )
  }

  if (error || !collective) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white p-6">
        <OGMeta title="Collective Not Found" description="This collective doesn't exist or is no longer active." />
        <h1 className="font-heading text-2xl font-bold text-primary-800">Collective not found</h1>
        <p className="mt-2 text-primary-400">This collective doesn't exist or is no longer active.</p>
        <Button variant="primary" className="mt-6" onClick={() => window.location.href = '/download'}>
          Get the {APP_NAME} App
        </Button>
      </div>
    )
  }

  const pageUrl = `${window.location.origin}/collective/${collective.slug}`

  return (
    <div className="min-h-dvh bg-white">
      <OGMeta
        title={collective.name}
        description={collective.description || `Join ${collective.name} - a Co-Exist conservation collective`}
        url={pageUrl}
        image={collective.cover_image_url || undefined}
      />

      {/* Hero */}
      <div className="relative h-48 sm:h-64 bg-primary-800 overflow-hidden">
        {collective.cover_image_url ? (
          <img
            src={collective.cover_image_url}
            alt={collective.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800">
            <Users size={56} className="text-primary-200" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="font-heading text-2xl font-bold text-white sm:text-3xl drop-shadow-md">
            {collective.name}
          </h1>
          {collective.region && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/90">
              <MapPin size={14} />
              {collective.region}{collective.state ? `, ${collective.state}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <motion.div
          initial={shouldReduceMotion ? false : { y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.25 }}
        >
          {/* Stats */}
          <div className="flex gap-6">
            <div>
              <p className="font-heading text-2xl font-bold text-primary-800">{collective.member_count ?? 0}</p>
              <p className="text-sm text-primary-400">Members</p>
            </div>
            {upcomingEvents && (
              <div>
                <p className="font-heading text-2xl font-bold text-primary-800">{upcomingEvents.length}</p>
                <p className="text-sm text-primary-400">Upcoming events</p>
              </div>
            )}
          </div>

          {/* Description */}
          {collective.description && (
            <div className="mt-6">
              <h2 className="font-heading text-lg font-semibold text-primary-800">About</h2>
              <p className="mt-2 whitespace-pre-line text-primary-400 leading-relaxed">
                {collective.description}
              </p>
            </div>
          )}

          {/* Upcoming events */}
          {upcomingEvents && upcomingEvents.length > 0 && (
            <div className="mt-8">
              <h2 className="font-heading text-lg font-semibold text-primary-800">Upcoming Events</h2>
              <div className="mt-3 space-y-3">
                {upcomingEvents.map((evt) => (
                  <a
                    key={evt.id}
                    href={`/event/${evt.id}`}
                    className={cn(
                      'flex items-center gap-3 rounded-xl bg-white p-4',
                      'shadow-sm border border-primary-100',
                      'hover:shadow-md transition-shadow duration-150',
                    )}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-primary-400">
                      <Calendar size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary-800 truncate">{evt.title}</p>
                      <p className="text-sm text-primary-400">
                        {new Date(evt.date_start).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                        {evt.address ? ` · ${evt.address}` : ''}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.25 }}
          className={cn(
            'mt-8 flex flex-col gap-3',
            'sticky bottom-4 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur-sm',
            'sm:relative sm:bottom-auto sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none',
          )}
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ExternalLink size={18} />}
            onClick={() => {
              window.location.href = `coexist://collectives/${collective.id}`
              setTimeout(() => {
                window.location.href = '/download'
              }, 1500)
            }}
          >
            Open in App
          </Button>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={<Download size={18} />}
            onClick={() => window.location.href = '/download'}
          >
            Download {APP_NAME}
          </Button>
        </motion.div>

      </div>

      <WebFooter />
    </div>
  )
}
