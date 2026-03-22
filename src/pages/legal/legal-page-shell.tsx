import { motion, useReducedMotion } from 'framer-motion'
import DOMPurify from 'dompurify'
import { Page } from '@/components/page'
import { OGMeta } from '@/components/og-meta'
import { Skeleton } from '@/components/skeleton'
import { useLegalPage } from '@/hooks/use-legal-page'

interface LegalPageShellProps {
  slug: string
  fallbackTitle: string
  fallbackDescription: string
}

/**
 * Shared shell for all public legal/policy pages.
 * Fetches content from the legal_pages Supabase table and renders sanitised HTML.
 * Content is sanitised with DOMPurify before rendering to prevent XSS.
 */
export default function LegalPageShell({ slug, fallbackTitle, fallbackDescription }: LegalPageShellProps) {
  const { data: page, isLoading, error } = useLegalPage(slug)
  const shouldReduceMotion = useReducedMotion()

  const title = page?.title ?? fallbackTitle
  const description = page?.summary ?? fallbackDescription

  // Sanitise HTML content with DOMPurify — only staff can author content
  // but we still sanitise as defence-in-depth against stored XSS.
  const sanitisedHtml = page?.content ? DOMPurify.sanitize(page.content) : ''

  return (
    <Page>
      <OGMeta
        title={title}
        description={description}
        canonicalPath={`/${slug}`}
      />
      <motion.div
        className="py-8 space-y-6 max-w-3xl mx-auto"
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className="font-heading text-2xl font-bold text-primary-800 text-center">
          {title}
        </h1>

        {isLoading && (
          <div className="space-y-4">
            <Skeleton variant="text" count={3} />
            <Skeleton variant="text" count={4} />
            <Skeleton variant="text" count={2} />
          </div>
        )}

        {error && (
          <p className="text-sm text-primary-400 leading-relaxed text-center">
            {fallbackDescription} For questions contact{' '}
            <a
              href="mailto:hello@coexistaus.org"
              className="text-primary-500 font-medium hover:underline"
            >
              hello@coexistaus.org
            </a>
          </p>
        )}

        {page && !page.content && (
          <p className="text-sm text-primary-400 leading-relaxed text-center">
            This page is being updated. For questions contact{' '}
            <a
              href="mailto:hello@coexistaus.org"
              className="text-primary-500 font-medium hover:underline"
            >
              hello@coexistaus.org
            </a>
          </p>
        )}

        {sanitisedHtml && (
          <div
            className="legal-content max-w-none text-sm text-primary-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sanitisedHtml }}
          />
        )}

        {page && (
          <p className="text-xs text-primary-300 text-center pt-4 border-t border-primary-100">
            Last updated: {new Date(page.updated_at).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        )}
      </motion.div>
    </Page>
  )
}
