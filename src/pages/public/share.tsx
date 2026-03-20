import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'framer-motion'
import { Award, TreePine, ExternalLink, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/button'
import { Skeleton } from '@/components/skeleton'
import { OGMeta } from '@/components/og-meta'
import { WebFooter } from '@/components/web-footer'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/cn'

/**
 * Public share page for badges and milestones.
 * Route: /share/badge/:id  or  /share/milestone/:id
 */
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
}

export default function PublicSharePage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const shouldReduceMotion = useReducedMotion()

  const isBadge = type === 'badge'
  const isMilestone = type === 'milestone'

  const { data: badge, isLoading, error } = useQuery({
    queryKey: ['public-share', type, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badges')
        .select('id, name, description, icon_url, category')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id && (isBadge || isMilestone),
  })

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white">
        <div className="mx-auto max-w-md p-8 space-y-4">
          <Skeleton variant="title" />
          <Skeleton variant="text" count={3} />
        </div>
      </div>
    )
  }

  if (error || !badge) {
    const label = isBadge ? 'Badge' : 'Milestone'
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white p-6">
        <OGMeta title={`${label} Not Found`} description={`This ${label.toLowerCase()} doesn't exist or is no longer available.`} />
        <h1 className="font-heading text-2xl font-bold text-primary-800">{label} not found</h1>
        <p className="mt-2 text-primary-400">This {label.toLowerCase()} doesn't exist.</p>
        <Button variant="primary" className="mt-6" onClick={() => window.location.href = '/download'}>
          Get the {APP_NAME} App
        </Button>
      </div>
    )
  }

  const pageUrl = `${window.location.origin}/share/${type}/${badge.id}`
  const Icon = isBadge ? Award : TreePine
  const gradient = isBadge ? 'from-warning-500 to-warning-700' : 'from-secondary-600 to-secondary-800'

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <OGMeta
        title={badge.name}
        description={badge.description || `${isBadge ? 'Badge' : 'Milestone'} on Co-Exist`}
        url={pageUrl}
        image={badge.icon_url || undefined}
      />

      <motion.div
        className="flex flex-1 flex-col items-center justify-center px-4 py-16"
        variants={shouldReduceMotion ? undefined : stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Card */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className={cn(
            'relative w-full max-w-sm overflow-hidden rounded-2xl',
            'bg-gradient-to-br text-white shadow-xl',
            gradient,
            'p-8 text-center',
          )}
        >
          {/* Icon / image */}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            {badge.icon_url ? (
              <img src={badge.icon_url} alt={badge.name} className="h-16 w-16 object-contain" />
            ) : (
              <Icon size={40} className="text-white" />
            )}
          </div>

          <h1 className="mt-5 font-heading text-2xl font-bold">{badge.name}</h1>
          {badge.description && (
            <p className="mt-2 text-sm text-white/80 leading-relaxed">{badge.description}</p>
          )}

          <p className="mt-4 text-xs font-semibold text-white/60 uppercase tracking-wider">
            {isBadge ? 'Badge' : 'Milestone'} on {APP_NAME}
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="mt-8 flex w-full max-w-sm flex-col gap-3"
        >
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<ExternalLink size={18} />}
            onClick={() => {
              const deepPath = isBadge ? `badges/${badge.id}` : `milestones/${badge.id}`
              window.location.href = `coexist://${deepPath}`
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
