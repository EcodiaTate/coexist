#!/usr/bin/env node
/* Flatten decorative 3D gradients -> solid brand fills, and retire the
   off-brand amber accent -> bark (warm earthy brown, on-brand). Admin scope
   only. Image-legibility overlays (from-black..to-transparent) and the merch
   sticky-header scrim fade (..to-neutral-50/0) are deliberately NOT in the
   list -> left intact. Literal global replaces, ordered so prefixed gradient
   fragments resolve before the bare constant-map values. */
import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const ROOT = '/Users/ecodia/.code/coexist'
const files = execSync(
  `find ${ROOT}/src/pages/admin ${ROOT}/src/components/admin -name '*.tsx'; ` +
  `echo ${ROOT}/src/components/admin-hero-stat.tsx; ` +
  `echo ${ROOT}/src/components/admin-layout.tsx`,
).toString().trim().split('\n').filter(Boolean)

// Applied in order. Each entry is a literal [find, replace].
const repl = [
  // (0) off-brand amber -> bark, before gradient fragments reference it
  ['-amber-', '-bark-'],

  // (1) prefixed gradient fragments -> solid (3-stop first)
  ['bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950', 'bg-primary-900'],
  ['bg-gradient-to-br from-primary-900 via-primary-950 to-neutral-900', 'bg-primary-950'],
  ['bg-gradient-to-br from-moss-600 via-moss-700 to-primary-800', 'bg-primary-800'],
  ['bg-gradient-to-br from-moss-700 via-primary-800 to-primary-900', 'bg-primary-800'],
  ['bg-gradient-to-r from-error-50 via-error-50/60 to-white', 'bg-error-50'],
  // 2-stop br
  ['bg-gradient-to-br from-bark-400 to-bark-600', 'bg-bark-600'],
  ['bg-gradient-to-br from-bark-500 to-bark-700', 'bg-bark-700'],
  ['bg-gradient-to-br from-moss-400 to-moss-600', 'bg-moss-600'],
  ['bg-gradient-to-br from-moss-500 to-moss-700', 'bg-moss-700'],
  ['bg-gradient-to-br from-secondary-400 to-secondary-600', 'bg-secondary-600'],
  ['bg-gradient-to-br from-secondary-500 to-secondary-700', 'bg-secondary-700'],
  ['bg-gradient-to-br from-primary-500 to-primary-700', 'bg-primary-700'],
  ['bg-gradient-to-br from-primary-50 to-primary-100', 'bg-primary-100'],
  ['bg-gradient-to-br from-warning-50 to-warning-100/60', 'bg-warning-50'],
  ['bg-gradient-to-br from-info-50 to-info-100/60', 'bg-info-50'],
  ['bg-gradient-to-br from-neutral-50 to-neutral-100/60', 'bg-neutral-50'],
  ['bg-gradient-to-br from-success-500 to-success-600', 'bg-success-600'],
  // 2-stop r
  ['bg-gradient-to-r from-primary-600 to-primary-700', 'bg-primary-700'],
  ['bg-gradient-to-r from-primary-400 to-primary-500', 'bg-primary-500'],
  ['bg-gradient-to-r from-sprout-400 to-sprout-500', 'bg-sprout-500'],
  ['bg-gradient-to-r from-warning-400 to-warning-500', 'bg-warning-500'],
  ['bg-gradient-to-r from-moss-400 to-moss-500', 'bg-moss-500'],
  ['bg-gradient-to-r from-success-500 to-sprout-500', 'bg-success-500'],
  ['bg-gradient-to-r from-error-400 to-error-500', 'bg-error-500'],
  // b
  ['bg-gradient-to-b from-neutral-50 to-white', 'bg-neutral-50'],

  // (2) className-literal bg-gradient prefixes whose stops come from a var ->
  //     remove the now stop-less prefix (the solidified var supplies the bg)
  ["'bg-gradient-to-br transition-[background] duration-700 ease-in-out'",
   "'transition-[background] duration-700 ease-in-out'"],
  ['rounded-md p-5 shadow-sm bg-gradient-to-br relative overflow-hidden',
   'rounded-md p-5 shadow-sm relative overflow-hidden'],
  ['h-full rounded-full bg-gradient-to-r', 'h-full rounded-full'],
  // admin main content wash -> flat surface
  ['bg-gradient-to-b from-primary-50/40 via-white to-primary-50/20', 'bg-neutral-50'],

  // (3) bare constant-map values -> solid
  //   BRAND_HERO* (admin-layout page headers)
  ['from-primary-700 via-primary-800 to-primary-900', 'bg-primary-800'],
  ['from-primary-800 via-primary-900 to-primary-950', 'bg-primary-900'],
  ['from-moss-700 via-primary-800 to-primary-900', 'bg-moss-800'],
  //   ICON_TO_BAR + impact bars (from-X-400 to-X-500)
  ['from-moss-400 to-moss-500', 'bg-moss-500'],
  ['from-sprout-400 to-sprout-500', 'bg-sprout-500'],
  ['from-bark-400 to-bark-500', 'bg-bark-500'],
  ['from-info-400 to-info-500', 'bg-info-500'],
  ['from-warning-400 to-warning-500', 'bg-warning-500'],
  ['from-plum-400 to-plum-500', 'bg-plum-500'],
  ['from-primary-400 to-primary-500', 'bg-primary-500'],
  ['from-coral-400 to-coral-500', 'bg-coral-500'],
  //   CARD_GRADIENTS (promos)
  ['from-info-500/90 to-info-700', 'bg-info-600'],
  ['from-success-500/90 to-success-700', 'bg-success-600'],
  ['from-plum-500/90 to-plum-700', 'bg-plum-600'],
]

let changed = 0
for (const f of files) {
  let src = readFileSync(f, 'utf8')
  const before = src
  for (const [find, rep] of repl) src = src.split(find).join(rep)
  if (src !== before) { writeFileSync(f, src); changed++ }
}
console.log(`changed ${changed} files`)
