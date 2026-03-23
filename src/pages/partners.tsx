import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { Handshake, Globe, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Page } from '@/components/page'
import { Skeleton } from '@/components/skeleton'
import { EmptyState } from '@/components/empty-state'
import { cn } from '@/lib/cn'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
}

/* ------------------------------------------------------------------ */
/*  Data hook                                                          */
/* ------------------------------------------------------------------ */

function usePartnerOrganisations() {
  return useQuery({
    queryKey: ['public-partners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organisations')
        .select('id, name, description, logo_url, website, type')
        .order('name')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60 * 1000,
  })
}

/* ------------------------------------------------------------------ */
/*  Partner type badge                                                 */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  corporate: 'Corporate',
  ngo: 'NGO',
  government: 'Government',
  community: 'Community',
}

function TypeBadge({ type }: { type: string }) {
  const label = TYPE_LABELS[type] ?? type
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full',
        'text-[10px] font-semibold uppercase tracking-wider',
        type === 'corporate' && 'bg-sky-50 text-sky-600',
        type === 'ngo' && 'bg-sprout-50 text-sprout-600',
        type === 'government' && 'bg-plum-50 text-plum-600',
        type === 'community' && 'bg-warning-50 text-warning-600',
        !['corporate', 'ngo', 'government', 'community'].includes(type) && 'bg-primary-50 text-primary-600',
      )}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function PartnersSkeleton() {
  return (
    <div className="space-y-4 pb-10">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-surface-0 shadow-sm p-5 flex items-start gap-4">
          <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PartnersPage() {
  const shouldReduceMotion = useReducedMotion()
  const { data: partners, isLoading } = usePartnerOrganisations()

  return (
    <Page
      header={
        <header
          className="sticky top-0 z-40 px-5 pt-2 pb-3"
          style={{ paddingTop: 'calc(var(--safe-top, 0px) + 0.5rem)' }}
        >
          <h1 className="font-heading text-2xl font-bold text-primary-900">
            Our Partners
          </h1>
          <p className="text-[13px] text-primary-400 mt-0.5">
            Organisations powering conservation with Co-Exist
          </p>
        </header>
      }
      className="bg-surface-1"
    >
      {isLoading ? (
        <PartnersSkeleton />
      ) : !partners?.length ? (
        <EmptyState
          illustration={<Handshake size={40} className="text-primary-300" />}
          title="No partners yet"
          description="Check back soon - we're growing our network of conservation partners."
        />
      ) : (
        <motion.div
          className="space-y-3 pb-10"
          initial="hidden"
          animate="visible"
          variants={shouldReduceMotion ? undefined : stagger}
        >
          {partners.map((partner) => (
            <motion.div
              key={partner.id}
              variants={shouldReduceMotion ? undefined : fadeUp}
              className="rounded-2xl bg-surface-0 shadow-sm overflow-hidden"
            >
              <div className="p-5 flex items-start gap-4">
                {/* Logo */}
                <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center shrink-0 overflow-hidden">
                  {partner.logo_url ? (
                    <img
                      src={partner.logo_url}
                      alt={partner.name}
                      className="w-full h-full object-contain p-1.5"
                    />
                  ) : (
                    <Handshake size={24} className="text-primary-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-heading text-[15px] font-semibold text-primary-900 leading-tight">
                      {partner.name}
                    </h3>
                    {partner.type && <TypeBadge type={partner.type} />}
                  </div>

                  {partner.description && (
                    <p className="text-[13px] text-primary-500 leading-relaxed line-clamp-3">
                      {partner.description}
                    </p>
                  )}

                  {partner.website && (
                    <a
                      href={partner.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1.5 mt-2',
                        'text-[12px] font-medium text-primary-600',
                        'hover:text-primary-800 transition-colors',
                      )}
                    >
                      <Globe size={13} />
                      <span className="truncate max-w-[200px]">
                        {partner.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </Page>
  )
}
