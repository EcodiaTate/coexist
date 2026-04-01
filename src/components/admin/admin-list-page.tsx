import { type ReactNode, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { adminVariants } from '@/lib/admin-motion'
import { useAdminHeader } from '@/components/admin-layout'
import { AdminHeroStatRow } from '@/components/admin-hero-stat'
import { SearchBar } from '@/components/search-bar'
import { Skeleton } from '@/components/skeleton'
import { useDelayedLoading } from '@/hooks/use-delayed-loading'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminListPageProps {
  /** Page title — passed to useAdminHeader */
  title: string
  /** Optional subtitle beneath the title */
  subtitle?: string
  /** Hero stat row content. Pass <AdminHeroStat> children wrapped in <AdminHeroStatRow>. */
  heroContent?: ReactNode
  /** Action buttons rendered in the top-right of the header */
  actions?: ReactNode
  /** Current search string */
  search: string
  /** Called when the user types in the search bar */
  onSearch: (value: string) => void
  /** Placeholder for the search input */
  searchPlaceholder?: string
  /** Optional filter controls rendered beside the search bar */
  filters?: ReactNode
  /** Whether data is still loading — shows skeletons when true */
  isLoading?: boolean
  /** Variant passed to <Skeleton> when isLoading is true */
  skeletonVariant?: 'list-item' | 'card' | 'text'
  /** Number of skeleton items to show while loading */
  skeletonCount?: number
  /** Page content — shown once loading is complete */
  children: ReactNode
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * Shared wrapper for admin list pages. Handles:
 * - useAdminHeader registration (title, heroContent, actions)
 * - SearchBar + optional filter controls row
 * - Staggered enter animation via adminVariants
 * - Skeleton loading state
 *
 * Usage:
 * ```tsx
 * <AdminListPage
 *   title="Collectives"
 *   heroContent={<AdminHeroStatRow>...</AdminHeroStatRow>}
 *   actions={<Button onClick={openCreate}>Create</Button>}
 *   search={search}
 *   onSearch={setSearch}
 *   isLoading={isLoading}
 * >
 *   {items.map(item => <CollectiveRow key={item.id} item={item} />)}
 * </AdminListPage>
 * ```
 */
export function AdminListPage({
  title,
  subtitle,
  heroContent,
  actions,
  search,
  onSearch,
  searchPlaceholder = 'Search…',
  filters,
  isLoading = false,
  skeletonVariant = 'list-item',
  skeletonCount = 5,
  children,
}: AdminListPageProps) {
  const shouldReduceMotion = useReducedMotion()
  const showLoading = useDelayedLoading(isLoading)

  // Memoised hero so useAdminHeader deps stay stable across renders
  const heroContentMemo = useMemo(() => heroContent, [heroContent])
  const actionsMemo = useMemo(() => actions, [actions])

  useAdminHeader(title, { subtitle, heroContent: heroContentMemo, actions: actionsMemo })

  const { stagger, fadeUp } = adminVariants(!!shouldReduceMotion)

  return (
    <div>
      <motion.div variants={stagger} initial="hidden" animate="visible">
        {/* Search + filters row */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4"
        >
          <SearchBar
            value={search}
            onChange={onSearch}
            placeholder={searchPlaceholder}
            compact
            className="flex-1"
          />
          {filters}
        </motion.div>

        {/* Content / loading */}
        <motion.div variants={fadeUp}>
          {showLoading ? (
            <Skeleton variant={skeletonVariant} count={skeletonCount} />
          ) : (
            children
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}

/* Re-export AdminHeroStatRow so import sites only need this one module */
export { AdminHeroStatRow }
