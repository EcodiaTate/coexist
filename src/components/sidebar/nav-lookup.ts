import type { NavCategory, NavItem } from './types'

/**
 * Reading the sidebar's nav data as the single source of truth for a
 * destination's path and label.
 *
 * The desktop sidebar already does the right thing: admin-nav.ts,
 * leader-nav.ts and member-nav.ts are pure data composed by one renderer. The
 * mobile bottom tab bars did not share it (CA3 finding 3.F5): admin-layout and
 * leader-layout each hand-wrote a four-item Tab[] with its own path and label
 * strings, so `/admin/collectives` was spelled out in two files and a rename
 * or a route move would reach the sidebar and leave the tab bar pointing at a
 * dead path.
 *
 * The finding proposed deriving each bar from "the first N items" of the
 * matching category list. Measured, that does not hold: of the four admin
 * tabs, three (`/`, `/chat`, `/more`) are app-level destinations that appear
 * in no admin nav category at all, and the one that does overlap is not in the
 * position a first-N slice would take. So the shared thing is a LOOKUP, not a
 * slice, and each bar keeps its own composition and its own icon sizes.
 */

/** Every item across a role's categories, in nav order. */
export function navItems(categories: readonly NavCategory[]): NavItem[] {
  return categories.flatMap((category) => category.items)
}

/**
 * The path and label the sidebar gives this destination.
 *
 * THROWS when the path is not in the nav data, and that is the point. A bottom
 * tab silently keeping a stale hand-typed path is exactly the failure this
 * lookup exists to prevent, so a route move fails loudly at module load rather
 * than shipping a tab that 404s on a phone.
 */
export function navEntry(
  categories: readonly NavCategory[],
  path: string,
): { path: string; label: string } {
  const found = navItems(categories).find((item) => item.path === path)
  if (!found) {
    throw new Error(
      `navEntry: no sidebar nav item for "${path}". A bottom tab points at a path the sidebar no longer has.`,
    )
  }
  return { path: found.path, label: found.label }
}
