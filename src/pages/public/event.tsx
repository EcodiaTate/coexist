import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, MapPin, Users, Clock, TreePine, ExternalLink, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/cn'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { OGMeta } from '@/components/og-meta'
import { APP_NAME } from '@/lib/constants'
import { WebFooter } from '@/components/web-footer'

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

const ACTIVITY_LABELS: Record<string, string> = {
  tree_planting: 'Tree Planting',
  beach_cleanup: 'Beach Cleanup',
  habitat_restoration: 'Habitat Restoration',
  nature_walk: 'Nature Walk',
  education: 'Education',
  wildlife_survey: 'Wildlife Survey',
  seed_collecting: 'Seed Collecting',
  weed_removal: 'Weed Removal',
  waterway_cleanup: 'Waterway Cleanup',
  community_garden: 'Community Garden',
  other: 'Other',
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export default function PublicEventPage() {
  const { id } = useParams<{ id: string }>()
  const shouldReduceMotion = useReducedMotion()

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['public-event', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*, collectives(name, slug)')
        .eq('id', id!)
        .eq('is_public', true)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white">
        <div className="h-64 animate-pulse bg-white" />
        <div className="mx-auto max-w-2xl p-6 space-y-4">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={4} />
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white p-6">
        <OGMeta title="Event Not Found" description="This event doesn't exist or is no longer available." />
        <h1 className="font-heading text-2xl font-bold text-primary-800">Event not found</h1>
        <p className="mt-2 text-primary-400">This event doesn't exist or is no longer public.</p>
        <Button variant="primary" className="mt-6" onClick={() => window.location.href = '/download'}>
          Get the {APP_NAME} App
        </Button>
      </div>
    )
  }

  const collectiveName = (event as Record<string, unknown>).collectives
    ? ((event as Record<string, unknown>).collectives as { name: string }).name
    : undefined

  const pageUrl = `${window.location.origin}/event/${event.id}`

  return (
    <div className="min-h-dvh bg-white">
      <OGMeta
        title={event.title}
        description={event.description || `Join this ${ACTIVITY_LABELS[event.activity_type] || 'conservation'} event with Co-Exist`}
        url={pageUrl}
        image={event.cover_image_url || undefined}
      />

      {/* Hero image */}
      <div className="relative h-64 sm:h-80 bg-primary-800 overflow-hidden">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <TreePine size={64} className="text-primary-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Activity badge */}
        <motion.div
          initial={shouldReduceMotion ? false : { y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-4 left-4"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-primary-400 shadow-md backdrop-blur-sm">
            <TreePine size={14} />
            {ACTIVITY_LABELS[event.activity_type] || event.activity_type}
          </span>
        </motion.div>
      </div>

      {/* Content */}
      <motion.div
        className="mx-auto max-w-2xl px-4 py-6 sm:px-6"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Title */}
        <motion.div variants={shouldReduceMotion ? undefined : fadeUp}>
          <h1 className="font-heading text-2xl font-bold text-primary-800 sm:text-3xl">
            {event.title}
          </h1>

          {collectiveName && (
            <p className="mt-1 text-sm font-medium text-primary-400">
              Hosted by {collectiveName}
            </p>
          )}
        </motion.div>

        {/* Details grid */}
        <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mt-6 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar size={20} className="mt-0.5 shrink-0 text-primary-500" />
            <div>
              <p className="font-medium text-primary-800">{formatDate(event.date_start)}</p>
              <p className="text-sm text-primary-400">
                {formatTime(event.date_start)}
                {event.date_end && ` - ${formatTime(event.date_end)}`}
              </p>
            </div>
          </div>

          {event.address && (
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 shrink-0 text-primary-500" />
              <p className="text-primary-800">{event.address}</p>
            </div>
          )}

          {event.capacity && (
            <div className="flex items-start gap-3">
              <Users size={20} className="mt-0.5 shrink-0 text-primary-500" />
              <p className="text-primary-800">{event.capacity} spots</p>
            </div>
          )}
        </motion.div>

        {/* Description */}
        {event.description && (
          <motion.div variants={shouldReduceMotion ? undefined : fadeUp} className="mt-6">
            <h2 className="font-heading text-lg font-semibold text-primary-800">About this event</h2>
            <p className="mt-2 whitespace-pre-line text-primary-400 leading-relaxed">
              {event.description}
            </p>
          </motion.div>
        )}

        {/* CTAs */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
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
              // Try to open in-app, fallback to app store
              window.location.href = `coexist://events/${event.id}`
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

      </motion.div>

      <WebFooter />
    </div>
  )
}
