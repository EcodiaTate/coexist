import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { navItems, navEntry } from '@/components/sidebar/nav-lookup'
import { adminNavCategories } from '@/components/sidebar/admin-nav'
import { leaderNavCategories } from '@/components/sidebar/leader-nav'

/* ------------------------------------------------------------------ */
/*  CA3 finding 3.F5. The bottom tab bars read the sidebar's nav data. */
/*                                                                     */
/*  The desktop sidebar is already one renderer over pure per-role      */
/*  data. The two mobile bottom bars were not: each hand-wrote its      */
/*  four Tab entries with its own path and label strings.               */
/* ------------------------------------------------------------------ */

const read = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8')
const adminLayout = read('src/components/admin-layout.tsx')
const leaderLayout = read('src/components/leader-layout.tsx')

describe('navEntry', () => {
  it('returns the sidebar path and label for a destination it owns', () => {
    expect(navEntry(adminNavCategories, '/admin/collectives')).toEqual({
      path: '/admin/collectives',
      label: 'Collectives',
    })
    expect(navEntry(leaderNavCategories, '/leader/events')).toEqual({
      path: '/leader/events',
      label: 'Events',
    })
  })

  // The whole point of a throw rather than a fallback: a bottom tab quietly
  // keeping a stale path is the failure this lookup exists to prevent, and a
  // route move should fail at module load, not on a phone.
  it('throws for a path the sidebar does not have', () => {
    expect(() => navEntry(adminNavCategories, '/admin/gone')).toThrow(/no sidebar nav item/)
  })

  it('flattens categories in nav order', () => {
    const items = navItems(adminNavCategories)
    expect(items.length).toBeGreaterThan(5)
    expect(items[0].path).toBe('/admin/collectives')
    expect(new Set(items.map((i) => i.path)).size).toBe(items.length)
  })
})

describe('the two bars derive what the sidebar owns', () => {
  it('neither layout re-types a path the sidebar already has', () => {
    expect(adminLayout).toContain("navEntry(adminNavCategories, '/admin/collectives')")
    expect(adminLayout).not.toContain("path: '/admin/collectives'")
    expect(leaderLayout).toContain("navEntry(leaderNavCategories, '/leader/events')")
    expect(leaderLayout).not.toContain("path: '/leader/events'")
  })

  // THE MEASUREMENT THAT CORRECTS THE FINDING. It proposed deriving each bar
  // from "the first N items" of the matching category list. Three of the four
  // admin tabs are app-level destinations that appear in NO admin nav
  // category, so a first-N slice would have replaced App / Chat / More with
  // Events / Shop / Users and changed the bar entirely. Pinned so the idea is
  // not retried from the finding text alone.
  it('the app-level tabs are deliberately absent from the nav data', () => {
    const adminPaths = new Set(navItems(adminNavCategories).map((i) => i.path))
    const leaderPaths = new Set(navItems(leaderNavCategories).map((i) => i.path))
    for (const appLevel of ['/', '/chat', '/more']) {
      expect(adminPaths.has(appLevel), `${appLevel} should not be in admin nav`).toBe(false)
      expect(leaderPaths.has(appLevel), `${appLevel} should not be in leader nav`).toBe(false)
    }
    // /leader is the sidebar's leaderHomeItem, not a category item, and the
    // bar deliberately labels it "Dashboard" rather than "Leader Home".
    expect(leaderPaths.has('/leader')).toBe(false)
    expect(leaderLayout).toContain("label: 'Dashboard'")
  })

  it('each bar still has exactly four tabs, ending in More', () => {
    for (const [name, src] of [['admin', adminLayout], ['leader', leaderLayout]] as const) {
      const keys = [...src.matchAll(/^\s{4}key: '([^']+)',$/gm)].map((m) => m[1])
      expect(keys.length, `${name} bar tab count`).toBe(4)
      expect(keys[0], `${name} first tab`).toBe('back')
      expect(keys[3], `${name} last tab`).toBe('more')
    }
  })
})
